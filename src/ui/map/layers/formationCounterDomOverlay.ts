import type { FeatureCollection } from 'geojson';
import { getIconDataUrl, getStackBadgeLabel } from '../map/formationIcons';
import { getFormationCounterIconHeight, type DeckViewportClip } from './buildTacticalDeckLayers';
import { layoutFormationCounters } from './formationCounterLayout';

export { getFormationCounterIconHeight };

export interface FormationCounterDomOverlayItem {
  id: string;
  iconId: string;
  label: string;
  properties: Record<string, unknown>;
  x: number;
  y: number;
  width: number;
  height: number;
  locationOsid: string | null;
  /** Paint slot inside its stack: 0 is the top counter. */
  stackIndex: number;
  /** Units the stack's badge stands for (its members plus any merged neighbours). */
  stackCount: number;
  /** Badge centre and size, on the stack's top counter only. */
  badge: { x: number; y: number; diameter: number } | null;
}

export type FormationCounterSelectionIntent = 'exact' | 'stack-aware';
export type FormationCounterVisualMode = 'fallback' | 'hit-targets';

/**
 * DOM counterparts of the drawn counters, in paint order, from the same layout the Deck
 * icon layer paints — so every hit target and badge sits exactly on a drawn counter.
 */
export function buildFormationCounterDomOverlayItems(args: {
  formationsGeoJson: FeatureCollection;
  formationsVisible: boolean;
  zoom: number;
  viewportClip: DeckViewportClip | null | undefined;
}): FormationCounterDomOverlayItem[] {
  if (!args.formationsVisible || !args.viewportClip) return [];
  const iconHeight = getFormationCounterIconHeight(args.zoom);
  const layout = layoutFormationCounters(args.formationsGeoJson.features, iconHeight, args.viewportClip);
  const items: FormationCounterDomOverlayItem[] = [];
  for (const stack of layout.stacks) {
    if (!stack.anchor) continue;
    const anchor = stack.anchor;
    const memberCount = stack.counters.length;
    stack.counters.forEach((counter, paintIndex) => {
      // The badge stands for the whole stack, merged neighbours included: selection needs the
      // displayed count and the merged settlements, not the counter's own settlement count.
      const properties = {
        ...((counter.feature.properties ?? {}) as Record<string, unknown>),
        stack_count: stack.count,
        merged_osids: [...stack.mergedOsids],
      } as Record<string, unknown>;
      const iconId = String(properties.icon_id ?? '');
      if (!counter.id || !iconId) return;
      const isTop = counter.role === 'stack-top';
      items.push({
        id: counter.id,
        iconId,
        label: String(properties.name ?? properties.display_name ?? counter.id),
        properties,
        x: anchor.x + counter.offset[0],
        y: anchor.y + counter.offset[1],
        width: iconHeight * 2,
        height: iconHeight,
        locationOsid: stack.osid,
        stackIndex: memberCount - 1 - paintIndex,
        stackCount: stack.count,
        badge: isTop && stack.badge
          ? { x: anchor.x + stack.badge.offset[0], y: anchor.y + stack.badge.offset[1], diameter: stack.badge.diameter }
          : null,
      });
    });
  }
  return items;
}

type CounterControl = {
  key: string;
  item: FormationCounterDomOverlayItem;
  intent: FormationCounterSelectionIntent;
  ariaLabel: string;
  stackOsid: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
};

function buildCounterControls(
  items: FormationCounterDomOverlayItem[],
  stackAriaLabel: (count: number, label: string) => string,
): CounterControl[] {
  const controls: CounterControl[] = [];
  for (const item of items) {
    controls.push({
      key: `counter:${item.id}`,
      item,
      intent: 'exact',
      ariaLabel: item.label,
      stackOsid: null,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    });
    if (item.badge && item.locationOsid) {
      controls.push({
        key: `stack:${item.locationOsid}`,
        item,
        intent: 'stack-aware',
        ariaLabel: stackAriaLabel(item.stackCount, item.label),
        stackOsid: item.locationOsid,
        x: item.badge.x,
        y: item.badge.y,
        width: Math.max(24, item.badge.diameter),
        height: Math.max(24, item.badge.diameter),
      });
    }
  }
  return controls;
}

function focusRovingControl(container: HTMLDivElement, key: string): void {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]'));
  for (const button of buttons) {
    const active = button.dataset.awwvCounterRovingKey === key;
    button.tabIndex = active ? 0 : -1;
    if (active) button.focus();
  }
  container.dataset.awwvCounterRovingKey = key;
}

export function renderFormationCounterDomOverlay(args: {
  container: HTMLDivElement | null;
  formationsGeoJson: FeatureCollection;
  formationsVisible: boolean;
  zoom: number;
  viewportClip: DeckViewportClip | undefined;
  visualMode: FormationCounterVisualMode;
  stackAriaLabel: (count: number, label: string) => string;
  onCounterSelect: (item: FormationCounterDomOverlayItem, intent: FormationCounterSelectionIntent) => void;
  onCounterHover?: (item: FormationCounterDomOverlayItem | null, point?: { x: number; y: number }) => void;
}): void {
  const { container } = args;
  if (!container) return;
  const items = buildFormationCounterDomOverlayItems(args);
  const controls = buildCounterControls(items, args.stackAriaLabel);
  const existing = new Map(
    Array.from(container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]'))
      .map((button) => [button.dataset.awwvCounterRovingKey ?? '', button]),
  );
  const focusedKey = container.ownerDocument.activeElement instanceof HTMLButtonElement
    && container.contains(container.ownerDocument.activeElement)
    ? container.ownerDocument.activeElement.dataset.awwvCounterRovingKey ?? null
    : null;
  const priorRovingKey = focusedKey ?? container.dataset.awwvCounterRovingKey ?? null;
  const availableKeys = new Set(controls.map((control) => control.key));
  const rovingKey = priorRovingKey && availableKeys.has(priorRovingKey)
    ? priorRovingKey
    : controls[0]?.key ?? null;

  container.dataset.awwvFormationCounterSourceCount = String(args.formationsGeoJson.features.length);
  container.dataset.awwvFormationCounterRenderedCount = String(items.length);
  container.dataset.awwvFormationCounterVisible = args.formationsVisible ? 'true' : 'false';
  container.dataset.awwvCounterRovingKey = rovingKey ?? '';

  let previousButton: HTMLButtonElement | null = null;
  for (const control of controls) {
    const button: HTMLButtonElement = existing.get(control.key) ?? container.ownerDocument.createElement('button');
    existing.delete(control.key);
    button.type = 'button';
    button.dataset.awwvCounterRovingKey = control.key;
    if (control.intent === 'exact') {
      button.dataset.awwvFormationCounterId = control.item.id;
      delete button.dataset.awwvFormationStackOsid;
    } else {
      delete button.dataset.awwvFormationCounterId;
      button.dataset.awwvFormationStackOsid = control.stackOsid ?? '';
    }
    button.setAttribute('aria-label', control.ariaLabel);
    button.tabIndex = control.key === rovingKey ? 0 : -1;
    button.style.position = 'absolute';
    button.style.left = `${control.x - control.width / 2}px`;
    button.style.top = `${control.y - control.height / 2}px`;
    button.style.width = `${control.width}px`;
    button.style.height = `${control.height}px`;
    button.style.minWidth = '24px';
    button.style.minHeight = '24px';
    button.style.border = '0';
    button.style.padding = '0';
    button.style.background = 'transparent';
    button.style.lineHeight = '0';
    button.style.pointerEvents = 'auto';
    button.style.cursor = 'pointer';
    button.style.zIndex = control.intent === 'stack-aware' ? '2' : '1';
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      args.onCounterSelect(control.item, control.intent);
    };
    button.onpointerenter = (event) => args.onCounterHover?.(control.item, { x: event.clientX, y: event.clientY });
    button.onpointerleave = () => args.onCounterHover?.(null);
    button.onfocus = () => {
      container.dataset.awwvCounterRovingKey = control.key;
      for (const sibling of container.querySelectorAll<HTMLButtonElement>('[data-awwv-counter-roving-key]')) {
        sibling.tabIndex = sibling === button ? 0 : -1;
      }
    };
    button.onkeydown = (event) => {
      if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const ordered = controls.map((entry) => entry.key);
      const currentIndex = Math.max(0, ordered.indexOf(control.key));
      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? ordered.length - 1
          : (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
            ? (currentIndex - 1 + ordered.length) % ordered.length
            : (currentIndex + 1) % ordered.length;
      focusRovingControl(container, ordered[nextIndex]!);
    };

    if (control.intent === 'exact') {
      let img = button.querySelector('img');
      if (!img) {
        img = container.ownerDocument.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.style.display = 'block';
        img.style.pointerEvents = 'none';
        img.style.userSelect = 'none';
        img.style.transform = 'translateZ(0)';
        img.style.filter = 'drop-shadow(0 1px 2px rgba(0,0,0,0.45))';
        button.appendChild(img);
      }
      if (args.visualMode === 'fallback') img.src = getIconDataUrl(control.item.iconId);
      img.style.width = `${control.item.width}px`;
      img.style.height = `${control.item.height}px`;
      img.style.opacity = args.visualMode === 'fallback' ? '1' : '0';
    } else {
      // The visible badge is painted by the Deck icon layer right after its own counter.
      // This span is only the pre-Deck fallback; as a hit target it stays transparent, so
      // a badge can never show where Deck drew no counter (R8, 2026-11-10).
      button.replaceChildren();
      const badge = container.ownerDocument.createElement('span');
      const diameter = control.item.badge?.diameter ?? 18;
      badge.dataset.awwvFormationStackCount = String(control.item.stackCount);
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = getStackBadgeLabel(control.item.stackCount);
      badge.style.display = 'block';
      badge.style.boxSizing = 'border-box';
      badge.style.width = `${diameter}px`;
      badge.style.height = `${diameter}px`;
      badge.style.margin = `${(control.height - diameter) / 2}px ${(control.width - diameter) / 2}px`;
      badge.style.opacity = args.visualMode === 'fallback' ? '1' : '0';
      badge.style.border = '1px solid rgba(245, 203, 92, 0.9)';
      badge.style.borderRadius = '50%';
      badge.style.background = 'rgba(18, 18, 16, 0.96)';
      badge.style.color = '#f8e6ad';
      badge.style.fontSize = `${Math.max(9, Math.round(diameter * 0.58))}px`;
      badge.style.fontWeight = '800';
      badge.style.lineHeight = `${diameter - 2}px`;
      badge.style.textAlign = 'center';
      badge.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.75)';
      badge.style.pointerEvents = 'none';
      button.appendChild(badge);
    }
    if (button.parentNode !== container || button.previousSibling !== previousButton) {
      container.insertBefore(button, previousButton ? previousButton.nextSibling : container.firstChild);
    }
    previousButton = button;
  }

  for (const stale of existing.values()) stale.remove();
  if (focusedKey && availableKeys.has(focusedKey)) focusRovingControl(container, focusedKey);
}

function mutationTouchesOccluder(record: MutationRecord): boolean {
  if (record.target instanceof Element && record.target.closest('[data-awwv-counter-occluder="true"]')) return true;
  return [...record.addedNodes, ...record.removedNodes].some((node) => (
    node instanceof Element
    && (node.matches('[data-awwv-counter-occluder="true"]') || node.querySelector('[data-awwv-counter-occluder="true"]'))
  ));
}

export function installFormationCounterOccluderObserver(root: HTMLElement, onChange: () => void): () => void {
  const view = root.ownerDocument.defaultView;
  const ResizeObserverCtor = view?.ResizeObserver;
  const resizeObserver = ResizeObserverCtor ? new ResizeObserverCtor(onChange) : null;
  const observeOccluders = () => {
    resizeObserver?.disconnect();
    for (const occluder of root.ownerDocument.querySelectorAll('[data-awwv-counter-occluder="true"]')) {
      resizeObserver?.observe(occluder);
    }
  };
  observeOccluders();
  const mutationObserver = new MutationObserver((records) => {
    if (!records.some(mutationTouchesOccluder)) return;
    observeOccluders();
    onChange();
  });
  mutationObserver.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-expanded', 'aria-hidden'],
  });
  return () => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
  };
}
