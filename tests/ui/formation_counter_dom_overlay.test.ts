// @vitest-environment jsdom

import { fireEvent } from '@testing-library/dom';
import { describe, expect, it, vi } from 'vitest';

import {
  installFormationCounterOccluderObserver,
  renderFormationCounterDomOverlay,
} from '../../src/ui/map/layers/formationCounterDomOverlay.js';

function formation(id: string, stackIndex: number, stackCount: number) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [17.8, 44.1] },
    properties: {
      id,
      name: `Formation ${id}`,
      icon_id: `icon-${id}`,
      location_osid: 'op:test:stack',
      stack_index: stackIndex,
      stack_count: stackCount,
      is_stack_top: stackIndex === 0,
    },
  };
}

function stackedFormation(id: string, osid: string, stackIndex: number, coordinates: [number, number]) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates },
    properties: {
      id,
      name: `Formation ${id}`,
      icon_id: `icon-${id}`,
      location_osid: osid,
      stack_index: stackIndex,
      stack_count: 2,
      is_stack_top: stackIndex === 0,
    },
  };
}

function renderFeatures(
  container: HTMLDivElement,
  features: Array<ReturnType<typeof formation>>,
  onCounterSelect = vi.fn(),
  projectX = 200,
) {
  renderFormationCounterDomOverlay({
    container,
    formationsGeoJson: { type: 'FeatureCollection', features } as any,
    formationsVisible: true,
    zoom: 10,
    viewportClip: {
      width: 800,
      height: 600,
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      project: () => ({ x: projectX, y: 240 }),
    },
    visualMode: 'hit-targets',
    stackAriaLabel: (count) => `Review ${count} formations in stack`,
    onCounterSelect,
  });
  return onCounterSelect;
}

function render(container: HTMLDivElement, projectX = 200, onCounterSelect = vi.fn()) {
  return renderFeatures(
    container,
    [formation('a', 0, 3), formation('b', 1, 3), formation('c', 2, 3)],
    onCounterSelect,
    projectX,
  );
}

function dispatchNativeGesture(button: HTMLButtonElement, type: 'pointerdown' | 'pointerup' | 'click') {
  button.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
}

async function observeContainerMutations(
  container: HTMLDivElement,
  action: () => void,
): Promise<MutationRecord[]> {
  const records: MutationRecord[] = [];
  const observer = new MutationObserver((mutations) => records.push(...mutations));
  observer.observe(container, { childList: true, subtree: true });
  action();
  await new Promise((resolve) => setTimeout(resolve, 0));
  observer.disconnect();
  return records;
}

function containerChildListRecords(records: MutationRecord[], container: HTMLDivElement): MutationRecord[] {
  return records.filter((record) => record.target === container);
}

function recordsDetachingControls(records: MutationRecord[], controls: Set<Element>): MutationRecord[] {
  return records.filter((record) => [...record.addedNodes, ...record.removedNodes]
    .some((node) => controls.has(node as Element)));
}

describe('accessible formation counter overlay', () => {
  it('keeps exact named targets and exposes a separate stack-picker target', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onCounterSelect = render(container);
    const exact = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="b"]')!;
    const stack = container.querySelector<HTMLButtonElement>('[data-awwv-formation-stack-osid="op:test:stack"]')!;

    fireEvent.click(exact);
    fireEvent.click(stack);

    expect(onCounterSelect.mock.calls.map(([, intent]) => intent)).toEqual(['exact', 'stack-aware']);
    expect(stack.getAttribute('aria-label')).toBe('Review 3 formations in stack');
    const badge = stack.querySelector<HTMLElement>('[data-awwv-formation-stack-count]');
    expect(badge?.textContent).toBe('3');
    expect(badge?.style.opacity).not.toBe('0');
    expect(badge?.getAttribute('aria-hidden')).toBe('true');
    container.remove();
  });

  it('uses one roving tab stop, 24px minimum hit targets, and arrow navigation', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(container);
    const controls = [...container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]')];

    expect(controls.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    expect(controls.every((button) => Number.parseFloat(button.style.minWidth) >= 24)).toBe(true);
    expect(controls.every((button) => Number.parseFloat(button.style.minHeight) >= 24)).toBe(true);

    controls[0]!.focus();
    fireEvent.keyDown(controls[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(controls[1]);
    expect(controls[1]!.tabIndex).toBe(0);
    container.remove();
  });

  it('preserves focused identity across viewport reflow and avoids duplicate Deck visuals', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    render(container, 200);
    const before = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="b"]')!;
    before.focus();

    render(container, 320);

    const after = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="b"]')!;
    expect(after).toBe(before);
    expect(document.activeElement).toBe(after);
    expect(after.querySelector('img')?.style.opacity).toBe('0');
    expect(Number.parseFloat(after.style.left)).toBeGreaterThan(250);
    container.remove();
  });

  it('keeps unchanged keyed controls attached through an identical refresh and held reflow', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const firstSelect = render(container, 200);
    const before = [...container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]')];
    const beforeControls = new Set<Element>(before);
    const focused = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="b"]')!;
    focused.focus();

    const secondSelect = vi.fn();
    const identicalRecords = await observeContainerMutations(container, () => render(container, 200, secondSelect));

    expect(containerChildListRecords(identicalRecords, container)).toHaveLength(0);
    expect(recordsDetachingControls(identicalRecords, beforeControls)).toHaveLength(0);
    const afterIdentical = [...container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]')];
    expect(afterIdentical).toEqual(before);
    expect(document.activeElement).toBe(focused);
    expect(focused.isConnected).toBe(true);

    dispatchNativeGesture(focused, 'click');
    expect(secondSelect).toHaveBeenCalledTimes(1);
    expect(secondSelect.mock.calls[0]![0].id).toBe('b');
    expect(secondSelect.mock.calls[0]![1]).toBe('exact');
    expect(firstSelect).not.toHaveBeenCalled();

    focused.focus();
    dispatchNativeGesture(focused, 'pointerdown');
    const reflowSelect = vi.fn();
    const reflowRecords = await observeContainerMutations(container, () => render(container, 320, reflowSelect));
    dispatchNativeGesture(focused, 'pointerup');

    expect(containerChildListRecords(reflowRecords, container)).toHaveLength(0);
    expect(recordsDetachingControls(reflowRecords, beforeControls)).toHaveLength(0);
    const afterReflow = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="b"]')!;
    expect(afterReflow).toBe(focused);
    expect(document.activeElement).toBe(focused);
    expect(focused.isConnected).toBe(true);
    expect(Number.parseFloat(focused.style.left)).toBeGreaterThan(250);

    dispatchNativeGesture(focused, 'click');
    expect(reflowSelect).toHaveBeenCalledTimes(1);
    expect(reflowSelect.mock.calls[0]![0].id).toBe('b');
    expect(reflowSelect.mock.calls[0]![1]).toBe('exact');
    expect(secondSelect).toHaveBeenCalledTimes(1);
    container.remove();
  });

  it('keeps deterministic order for changed control sets and removes stale controls', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const firstSelect = render(container, 200);
    const beforeA = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="a"]')!;
    const beforeC = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="c"]')!;
    const staleB = container.querySelector<HTMLButtonElement>('[data-awwv-formation-counter-id="b"]')!;

    const secondSelect = vi.fn();
    await observeContainerMutations(container, () => {
      renderFeatures(container, [formation('c', 0, 1), formation('a', 0, 1)], secondSelect);
    });

    const controls = [...container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]')];
    expect(controls.map((button) => button.dataset.awwvCounterRovingKey)).toEqual(['counter:c', 'counter:a']);
    expect(controls[0]).toBe(beforeC);
    expect(controls[1]).toBe(beforeA);
    expect(staleB.isConnected).toBe(false);
    expect(container.querySelector('[data-awwv-formation-counter-id="b"]')).toBeNull();
    expect(container.querySelector('[data-awwv-formation-stack-osid]')).toBeNull();
    expect(controls[1]!.getAttribute('aria-label')).toBe('Formation a');

    dispatchNativeGesture(controls[1]!, 'click');
    expect(secondSelect).toHaveBeenCalledTimes(1);
    expect(secondSelect.mock.calls[0]![0].id).toBe('a');
    expect(secondSelect.mock.calls[0]![1]).toBe('exact');
    expect(firstSelect).not.toHaveBeenCalled();
    container.remove();
  });

  it('deterministically separates stack controls that project onto the same hit area', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const features = [
      stackedFormation('a1', 'op:sarajevo:centar', 0, [17.80, 44.10]),
      stackedFormation('a2', 'op:sarajevo:centar', 1, [17.80, 44.10]),
      stackedFormation('b1', 'op:sarajevo:stari-grad', 0, [17.81, 44.11]),
      stackedFormation('b2', 'op:sarajevo:stari-grad', 1, [17.81, 44.11]),
    ];

    renderFormationCounterDomOverlay({
      container,
      formationsGeoJson: { type: 'FeatureCollection', features } as any,
      formationsVisible: true,
      zoom: 10,
      viewportClip: {
        width: 800,
        height: 600,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        project: () => ({ x: 400, y: 300 }),
      },
      visualMode: 'hit-targets',
      stackAriaLabel: (count) => `Review ${count} formations in stack`,
      onCounterSelect: vi.fn(),
    });

    const stacks = [...container.querySelectorAll<HTMLButtonElement>('[data-awwv-formation-stack-osid]')];
    expect(stacks).toHaveLength(2);
    const rect = (button: HTMLButtonElement) => ({
      left: Number.parseFloat(button.style.left),
      top: Number.parseFloat(button.style.top),
      right: Number.parseFloat(button.style.left) + Number.parseFloat(button.style.width),
      bottom: Number.parseFloat(button.style.top) + Number.parseFloat(button.style.height),
    });
    const [first, second] = stacks.map(rect);
    const overlap = first!.right > second!.left
      && first!.left < second!.right
      && first!.bottom > second!.top
      && first!.top < second!.bottom;
    expect(overlap).toBe(false);

    const positionsByOsid = (buttons: HTMLButtonElement[]) => buttons
      .map((button) => [button.dataset.awwvFormationStackOsid, button.style.left, button.style.top])
      .sort(([left], [right]) => String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0);
    const firstPositions = positionsByOsid(stacks);
    renderFormationCounterDomOverlay({
      container,
      formationsGeoJson: { type: 'FeatureCollection', features: [...features].reverse() } as any,
      formationsVisible: true,
      zoom: 10,
      viewportClip: {
        width: 800,
        height: 600,
        padding: { top: 20, right: 20, bottom: 20, left: 20 },
        project: () => ({ x: 400, y: 300 }),
      },
      visualMode: 'hit-targets',
      stackAriaLabel: (count) => `Review ${count} formations in stack`,
      onCounterSelect: vi.fn(),
    });
    expect(positionsByOsid([...container.querySelectorAll<HTMLButtonElement>('[data-awwv-formation-stack-osid]')]))
      .toEqual(firstPositions);
    container.remove();
  });

  it('refreshes when live occluder layout or visibility changes', async () => {
    const root = document.createElement('div');
    const occluder = document.createElement('div');
    occluder.dataset.awwvCounterOccluder = 'true';
    root.appendChild(occluder);
    document.body.appendChild(root);
    const onChange = vi.fn();
    const disconnect = installFormationCounterOccluderObserver(root, onChange);

    occluder.className = 'collapsed';
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(onChange).toHaveBeenCalled();
    disconnect();
    root.remove();
  });
});
