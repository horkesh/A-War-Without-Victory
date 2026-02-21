/**
 * map_hoi entrypoint — HoI-style operations map.
 * Phase 3.3: HoIMapState + components + DataLoader/GameStateAdapter and IPC.
 */

import { parseGameState } from './data/GameStateAdapter.js';
import { HoIMapState, TopCommandBarComponent, ArmySidebarComponent, BottomStatusStripComponent } from './map_hoi/index.js';
import { loadedStateToHoIMapState } from './map_hoi/loadedStateToHoIState.js';
import { initMapPlaceholder } from './map_hoi/MapPlaceholder.js';
import { HoIMapRenderer } from './renderer/HoIMapRenderer.js';
import type { LoadedGameState } from './types.js';

type AwwvBridge = {
  getCurrentGameState?: () => Promise<string | null>;
  setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
  advanceTurn?: (payload?: unknown) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
};

function getBridge(): AwwvBridge | undefined {
  return (window as unknown as { awwv?: AwwvBridge }).awwv;
}

function applyStateJson(
  state: HoIMapState,
  stateJson: string | null,
  rendererRef: { current: HoIMapRenderer | null },
  pendingData?: { control: Record<string, string | null> | null; edges: { a: string; b: string }[] | null }
): void {
  if (!stateJson) return;
  try {
    const loaded = parseGameState(JSON.parse(stateJson)) as LoadedGameState;
    const update = loadedStateToHoIMapState(loaded);
    state.setState(update);
    const control = loaded.controlBySettlement ?? {};
    const edges = (loaded.frontEdges ?? []).map((e) => ({ a: e.a, b: e.b }));
    const r = rendererRef.current;
    if (r) {
      r.setControlBySettlement(control);
      r.setFrontEdges(edges);
    } else if (pendingData) {
      // Renderer not ready yet — store for later application
      pendingData.control = control;
      pendingData.edges = edges;
    }
  } catch (e) {
    console.warn('map_hoi: failed to parse game state', e);
  }
}

function init(): void {
  const root = document.getElementById('map-hoi-root');
  if (!root) return;

  const state = new HoIMapState();
  const bridge = getBridge();

  const topBarEl = document.getElementById('hoi-top-bar');
  const sidebarEl = document.getElementById('hoi-sidebar');
  const statusStripEl = document.getElementById('hoi-status-strip');

  const mapWrapEl = document.getElementById('hoi-map-wrap');
  if (!topBarEl || !sidebarEl || !statusStripEl || !mapWrapEl) return;

  // Show 2D placeholder immediately so the map area is never blank
  initMapPlaceholder(mapWrapEl);

  const rendererRef: { current: HoIMapRenderer | null } = { current: null };
  // Store pending control/front data in case save loads before renderer is ready
  const pendingData: { control: Record<string, string | null> | null; edges: { a: string; b: string }[] | null } = { control: null, edges: null };

  const tryWebGL = async (): Promise<void> => {
    const renderer = new HoIMapRenderer({
      container: mapWrapEl,
      getBaseUrl: () => (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''),
    });
    const ok = await renderer.init();
    if (ok) {
      const placeholder = mapWrapEl.querySelector('.hoi-map-placeholder');
      if (placeholder) (placeholder as HTMLElement).style.display = 'none';
      const placeholderCanvas = mapWrapEl.querySelector('.hoi-map-placeholder-canvas');
      if (placeholderCanvas) placeholderCanvas.remove();
      rendererRef.current = renderer;
      const onResize = (): void => renderer.resize();
      window.addEventListener('resize', onResize);
      const ro = new ResizeObserver(onResize);
      ro.observe(mapWrapEl);
      renderer.resize();
      requestAnimationFrame(() => renderer.resize());
      // Apply any pending control/front data that loaded before the renderer was ready
      if (pendingData.control) {
        renderer.setControlBySettlement(pendingData.control);
        pendingData.control = null;
      }
      if (pendingData.edges) {
        renderer.setFrontEdges(pendingData.edges);
        pendingData.edges = null;
      }

      // Settlement hover tooltip
      const tooltipEl = document.createElement('div');
      tooltipEl.className = 'hoi-tooltip';
      tooltipEl.style.display = 'none';
      document.body.appendChild(tooltipEl);

      renderer.setHoverCallback((feature, sx, sy) => {
        if (!feature) {
          tooltipEl.style.display = 'none';
          return;
        }
        const p = feature.properties ?? {};
        const controlMap = renderer.getControlBySettlement();
        const controller = controlMap[p.sid as string] ?? controlMap[p.osid as string] ?? '\u2014';
        const constituents = (p.constituent_sids as string[] | undefined) ?? [];

        tooltipEl.innerHTML = `
          <div class="hoi-tooltip-title">${p.settlement_name ?? p.osid ?? '?'}</div>
          <div class="hoi-tooltip-row">OSID: ${p.osid ?? '\u2014'}</div>
          <div class="hoi-tooltip-row">SID: ${p.sid ?? '\u2014'}</div>
          <div class="hoi-tooltip-row">Municipality: ${p.mun1990_name ?? '\u2014'}</div>
          <div class="hoi-tooltip-row">Controller: ${controller}</div>
          <div class="hoi-tooltip-row">Population: ${typeof p.population_total === 'number' ? p.population_total.toLocaleString() : '\u2014'}</div>
          <div class="hoi-tooltip-row">Ethnic key: ${p.ethnic_key ?? '\u2014'}</div>
          <div class="hoi-tooltip-row">Constituents: ${constituents.length <= 5 ? constituents.join(', ') : `${constituents.length} SIDs`}</div>
        `;
        tooltipEl.style.display = 'block';
        tooltipEl.style.left = `${sx + 12}px`;
        tooltipEl.style.top = `${sy + 12}px`;
      });
    }
    // If WebGL failed, placeholder is already visible and loading
  };
  tryWebGL();

  // --- File picker ---
  const fileInput = document.getElementById('hoi-file-input') as HTMLInputElement | null;
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      file.text().then((text) => {
        applyStateJson(state, text, rendererRef, pendingData);
      }).catch((e) => console.warn('map_hoi: file read failed', e));
      fileInput.value = '';
    });
  }

  const topBar = new TopCommandBarComponent(topBarEl, {
    onLoadSave: () => { fileInput?.click(); },
    onAdvance: () => {
      if (bridge?.advanceTurn) {
        bridge.advanceTurn().then((r) => {
          if (r?.stateJson) applyStateJson(state, r.stateJson, rendererRef, pendingData);
        }).catch((e) => console.warn('advanceTurn failed', e));
      }
    },
    onMenu: () => { /* open menu when modal exists */ },
  });
  const sidebar = new ArmySidebarComponent(sidebarEl, {
    onTabChange: (tab) => state.setState({ sidebarTab: tab }),
  });
  const statusStrip = new BottomStatusStripComponent(statusStripEl);

  function renderFromState(): void {
    const s = state.getSnapshot();
    topBar.setData(s.topBar);
    topBar.render();
    sidebar.setActiveTab(s.sidebarTab);
    sidebar.setCorps(s.corps);
    sidebar.render();
    statusStrip.setData(s.statusStrip);
    statusStrip.render();
  }

  state.subscribe(renderFromState);

  if (bridge?.setGameStateUpdatedCallback) {
    bridge.setGameStateUpdatedCallback((stateJson) => applyStateJson(state, stateJson, rendererRef, pendingData));
  }
  if (bridge?.getCurrentGameState) {
    bridge.getCurrentGameState().then((stateJson) =>
      applyStateJson(state, stateJson ?? null, rendererRef, pendingData));
  }

  // Auto-load latest save in standalone mode (no IPC bridge)
  if (!bridge?.getCurrentGameState) {
    fetch(`${window.location.origin}/data/derived/latest_run_final_save.json`)
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((text) => applyStateJson(state, text, rendererRef, pendingData))
      .catch((e) => console.warn('map_hoi: auto-load latest save failed', e));
  }

  renderFromState();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
