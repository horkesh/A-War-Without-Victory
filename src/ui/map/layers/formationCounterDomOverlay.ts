import type { Feature, FeatureCollection } from 'geojson';
import { getIconDataUrl } from '../map/formationIcons';
import {
  buildFormationCounterPixelOffsets,
  filterFinalFormationCounterFeatures,
  getCounterFootprintHalfSize,
  getFormationStackPixelOffset,
  selectViewportFormationCounterFeatures,
  type DeckViewportClip,
} from './buildTacticalDeckLayers';

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
  stackIndex: number;
  stackCount: number;
}

export type FormationCounterSelectionIntent = 'exact' | 'stack-aware';
export type FormationCounterVisualMode = 'fallback' | 'hit-targets';

export function getFormationCounterIconHeight(zoom: number): number {
  if (zoom <= 6) return 16;
  if (zoom >= 14) return 40;
  if (zoom < 9) return 16 + (zoom - 6) * (24 - 16) / 3;
  if (zoom < 12) return 24 + (zoom - 9) * (32 - 24) / 3;
  return 32 + (zoom - 12) * (40 - 32) / 2;
}

function featureCoordinates(feature: Feature): [number, number] | null {
  if (feature.geometry?.type !== 'Point') return null;
  const coordinates = feature.geometry.coordinates;
  if (!Array.isArray(coordinates) || typeof coordinates[0] !== 'number' || typeof coordinates[1] !== 'number') {
    return null;
  }
  return [coordinates[0], coordinates[1]];
}

export function buildFormationCounterDomOverlayItems(args: {
  formationsGeoJson: FeatureCollection;
  formationsVisible: boolean;
  zoom: number;
  viewportClip: DeckViewportClip | null | undefined;
}): FormationCounterDomOverlayItem[] {
  if (!args.formationsVisible) return [];
  const iconHeight = getFormationCounterIconHeight(args.zoom);
  const iconHalfSize = getCounterFootprintHalfSize(iconHeight);
  const getFormationPixelOffset = (feature: Feature) => getFormationStackPixelOffset(feature, iconHeight);
  const visibleFeatures = selectViewportFormationCounterFeatures(
    args.formationsGeoJson.features,
    args.viewportClip,
    iconHalfSize,
    getFormationPixelOffset,
  );
  const pixelOffsets = buildFormationCounterPixelOffsets(visibleFeatures, iconHeight, args.viewportClip);
  const finalVisibleFeatures = filterFinalFormationCounterFeatures(
    visibleFeatures,
    pixelOffsets,
    iconHeight,
    args.viewportClip,
  );

  return finalVisibleFeatures.flatMap((feature) => {
    const coordinates = featureCoordinates(feature);
    const point = coordinates && args.viewportClip?.project(coordinates);
    if (!point) return [];
    const id = String(feature.properties?.id ?? '');
    const iconId = String(feature.properties?.icon_id ?? '');
    if (!id || !iconId) return [];
    const offset = pixelOffsets.get(id) ?? getFormationPixelOffset(feature);
    const properties = (feature.properties ?? {}) as Record<string, unknown>;
    const stackIndex = typeof properties.stack_index === 'number' ? Math.max(0, Math.floor(properties.stack_index)) : 0;
    const stackCount = typeof properties.stack_count === 'number' ? Math.max(1, Math.floor(properties.stack_count)) : 1;
    return [{
      id,
      iconId,
      label: String(properties.name ?? properties.display_name ?? id),
      properties,
      x: point.x + offset[0],
      y: point.y + offset[1],
      width: iconHeight * 2,
      height: iconHeight,
      locationOsid: typeof properties.location_osid === 'string' ? properties.location_osid : null,
      stackIndex,
      stackCount,
    }];
  });
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
    if (item.stackIndex === 0 && item.stackCount > 1 && item.locationOsid) {
      controls.push({
        key: `stack:${item.locationOsid}`,
        item,
        intent: 'stack-aware',
        ariaLabel: stackAriaLabel(item.stackCount, item.label),
        stackOsid: item.locationOsid,
        x: item.x + Math.round(item.height * 0.72),
        y: item.y - Math.round(item.height * 0.42),
        width: 24,
        height: 24,
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

  for (const control of controls) {
    const button = existing.get(control.key) ?? container.ownerDocument.createElement('button');
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
      button.replaceChildren();
      const badge = container.ownerDocument.createElement('span');
      badge.dataset.awwvFormationStackCount = String(control.item.stackCount);
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = String(control.item.stackCount);
      badge.style.display = 'block';
      badge.style.width = '20px';
      badge.style.height = '20px';
      badge.style.margin = '2px';
      badge.style.border = '1px solid rgba(245, 203, 92, 0.9)';
      badge.style.borderRadius = '50%';
      badge.style.background = 'rgba(18, 18, 16, 0.96)';
      badge.style.color = '#f8e6ad';
      badge.style.fontSize = '11px';
      badge.style.fontWeight = '800';
      badge.style.lineHeight = '18px';
      badge.style.textAlign = 'center';
      badge.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.75)';
      badge.style.pointerEvents = 'none';
      button.appendChild(badge);
    }
    container.appendChild(button);
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
