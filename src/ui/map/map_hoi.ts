/**
 * map_hoi entrypoint — HoI-style operations map.
 * Phase 3.3: HoIMapState + components + DataLoader/GameStateAdapter and IPC.
 */

import { parseGameState } from './data/GameStateAdapter.js';
import { getOsidAdjacency } from './data/operationalContactGraph.js';
import { HoIMapState, TopCommandBarComponent, ArmySidebarComponent, BottomStatusStripComponent, MapModeToolbar } from './map_hoi/index.js';
import { loadedStateToHoIMapState } from './map_hoi/loadedStateToHoIState.js';
import { initMapPlaceholder } from './map_hoi/MapPlaceholder.js';
import { FormationOverlayLayer } from './map_hoi/FormationOverlayLayer.js';
import { HoIMapRenderer } from './renderer/HoIMapRenderer.js';
import type { AssignableFrontSegmentInput, FormationMarkerInput } from './renderer/HoIMapRenderer.js';
import type { FormationView, LoadedGameState } from './types.js';

/** Pending renderer data when save loads before WebGL is ready. */
interface PendingRendererData {
  control: Record<string, string | null> | null;
  edges: { a: string; b: string; side_a?: string | null; side_b?: string | null }[] | null;
  playerFaction: string | null;
  enemyZocByFaction: Record<string, string[]> | null;
  assignableFrontSegments: AssignableFrontSegmentInput[] | null;
  formations: FormationView[] | null;
}

type AwwvBridge = {
  getCurrentGameState?: () => Promise<string | null>;
  setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
  advanceTurn?: (payload?: unknown) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
};

function getBridge(): AwwvBridge | undefined {
  return (window as unknown as { awwv?: AwwvBridge }).awwv;
}

interface FormationSelectionRefs {
  lastFormationsRef: { current: FormationView[] };
  selectedFormationIdRef: { current: string | null };
}

function applyStateJson(
  state: HoIMapState,
  stateJson: string | null,
  rendererRef: { current: HoIMapRenderer | null },
  pendingData?: PendingRendererData,
  refs?: FormationSelectionRefs,
  overlayLayer?: FormationOverlayLayer
): boolean {
  if (!stateJson) return false;
  try {
    const loaded = parseGameState(JSON.parse(stateJson)) as LoadedGameState;
    const update = loadedStateToHoIMapState(loaded);
    state.setState(update);
    const control = loaded.controlBySettlement ?? {};
    const edges = (loaded.frontEdgesOsid ?? loaded.frontEdges ?? []).map((e) => ({ a: e.a, b: e.b, side_a: e.side_a, side_b: e.side_b }));
    const playerFaction = loaded.player_faction ?? null;
    const segments: AssignableFrontSegmentInput[] = (loaded.assignableFrontSegments ?? []).map((s) => ({
      front_id: s.front_id,
      edge_ids: [...(s.edge_ids ?? [])],
    }));
    if (refs) refs.lastFormationsRef.current = loaded.formations ?? [];
    if (overlayLayer) overlayLayer.setState({ formations: loaded.formations ?? [] });
    const r = rendererRef.current;
    if (r) {
      r.setControlBySettlement(control);
      r.setFrontEdges(edges);
      r.setPlayerFaction(playerFaction);
      r.setEnemyZocByFaction(loaded.enemyZocByFaction ?? {});
      r.setAssignableFrontSegments(segments);
      if (refs) {
        refs.selectedFormationIdRef.current = null;
        if (overlayLayer) overlayLayer.setState({ selectedFormationId: null });
        r.setSelectionZocOsids([], null);
      }
    } else if (pendingData) {
      pendingData.control = control;
      pendingData.edges = edges;
      pendingData.playerFaction = playerFaction;
      pendingData.enemyZocByFaction = loaded.enemyZocByFaction ?? {};
      pendingData.assignableFrontSegments = segments;
      pendingData.formations = loaded.formations?.length ? loaded.formations : null;
    }
    return true;
  } catch (e) {
    console.warn('map_hoi: failed to parse game state', e);
    return false;
  }
}

function init(): void {
  const root = document.getElementById('map-hoi-root');
  if (!root) return;

  const state = new HoIMapState();
  const bridge = getBridge();
  let hasLoadedState = false;

  const topBarEl = document.getElementById('hoi-top-bar');
  const sidebarEl = document.getElementById('hoi-sidebar');
  const statusStripEl = document.getElementById('hoi-status-strip');

  const mapWrapEl = document.getElementById('hoi-map-wrap');
  if (!topBarEl || !sidebarEl || !statusStripEl || !mapWrapEl) return;

  // Show 2D placeholder immediately so the map area is never blank
  initMapPlaceholder(mapWrapEl);

  const rendererRef: { current: HoIMapRenderer | null } = { current: null };
  const pendingData: PendingRendererData = {
    control: null,
    edges: null,
    playerFaction: null,
    enemyZocByFaction: null,
    assignableFrontSegments: null,
    formations: null,
  };
  const lastFormationsRef = { current: [] as FormationView[] };
  const selectedFormationIdRef = { current: null as string | null };
  const adjacencyRef = { current: null as Map<string, string[]> | null };
  const formationRefs: FormationSelectionRefs = { lastFormationsRef, selectedFormationIdRef };
  const overlayLayer = new FormationOverlayLayer(mapWrapEl);
  const applyState = (stateJson: string | null): boolean =>
    applyStateJson(state, stateJson, rendererRef, pendingData, formationRefs, overlayLayer);

  const tryWebGL = async (): Promise<void> => {
    const getBaseUrl = () => (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '');
    const renderer = new HoIMapRenderer({
      container: mapWrapEl,
      getBaseUrl,
    });
    const INIT_TIMEOUT_MS = 25000;
    let ok = false;
    try {
      ok = await Promise.race([
        renderer.init(),
        new Promise<false>((_, reject) =>
          setTimeout(() => reject(new Error('HoI map init timeout')), INIT_TIMEOUT_MS)
        ),
      ]);
    } catch (e) {
      console.warn('map_hoi: WebGL init failed or timed out — keeping 2D placeholder.', e);
    }
    if (ok) {
      getOsidAdjacency(getBaseUrl).then((adj) => {
        adjacencyRef.current = adj;
      }).catch(() => { /* optional */ });
      const placeholder = mapWrapEl.querySelector('.hoi-map-placeholder');
      if (placeholder) (placeholder as HTMLElement).style.display = 'none';
      const placeholderCanvas = mapWrapEl.querySelector('.hoi-map-placeholder-canvas');
      if (placeholderCanvas) placeholderCanvas.remove();
      rendererRef.current = renderer;
      overlayLayer.setRenderer(renderer);
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
      if (pendingData.playerFaction !== null) {
        renderer.setPlayerFaction(pendingData.playerFaction);
        pendingData.playerFaction = null;
      }
      if (pendingData.enemyZocByFaction) {
        renderer.setEnemyZocByFaction(pendingData.enemyZocByFaction);
        pendingData.enemyZocByFaction = null;
      }
      if (pendingData.assignableFrontSegments) {
        renderer.setAssignableFrontSegments(pendingData.assignableFrontSegments);
        pendingData.assignableFrontSegments = null;
      }
      if (pendingData.formations?.length) {
        const TOOLTIP_DELAY_MS = 300;
        const tooltipEl = document.createElement('div');
        tooltipEl.className = 'hoi-tooltip';
        tooltipEl.style.display = 'none';
        document.body.appendChild(tooltipEl);
        let tooltipTimeoutId: ReturnType<typeof setTimeout> | null = null;

        renderer.setHoverCallback((feature, sx, sy) => {
          if (selectedFeatureRef.current) return;
          if (tooltipTimeoutId) {
            clearTimeout(tooltipTimeoutId);
            tooltipTimeoutId = null;
          }
          if (!feature) {
            tooltipEl.style.display = 'none';
            return;
          }
          tooltipTimeoutId = setTimeout(() => {
            tooltipTimeoutId = null;
            showTooltip(feature, sx + 12, sy + 12);
          }, TOOLTIP_DELAY_MS);
        });

        // Selection: click to pin tooltip and highlight borders; formation selection for ZoC/lines (Phase 2–4)
        const selectedFeatureRef: { current: unknown } = { current: null };
        const selectedFormationIdRef: { current: string | null } = { current: null };

        renderer.setClickCallback((feature) => {
          selectedFeatureRef.current = feature;
          if (!feature) {
            tooltipEl.style.display = 'none';
            return;
          }
          // Pin tooltip near center of screen
          const rect = mapWrapEl.getBoundingClientRect();
          showTooltip(feature, rect.left + 12, rect.top + 12);
        });

        overlayLayer.onFormationClick = (formationId: string | null) => {
          selectedFormationIdRef.current = formationId;
          overlayLayer.setState({ selectedFormationId: formationId });
          if (!formationId) {
            renderer.setSelectionZocOsids([], null);
            renderer.setCorpsBrigadeLines([], null);
            return;
          }
          const formations = lastFormationsRef.current;
          const formation = formations.find((f) => f.id === formationId);
          if (!formation) return;
          const adj = adjacencyRef.current;

          if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
            const subordinateIds = formation.subordinateIds ?? formations
              .filter((s) => s.corps_id === formation.id)
              .map((s) => s.id)
              .sort((a, b) => a.localeCompare(b));
            let sumX = 0, sumY = 0, sumZ = 0;
            let count = 0;
            const segments: { from: [number, number, number]; to: [number, number, number] }[] = [];
            for (const bid of subordinateIds) {
              const b = formations.find((f) => f.id === bid);
              if (!b || (b.kind !== 'brigade' && b.kind !== 'og')) continue;
              const loc = b.location_osid ?? b.hq_sid;
              if (!loc) continue;
              const pos = renderer.getWorldPositionForSettlement(loc);
              if (!pos) continue;
              sumX += pos[0]; sumY += pos[1]; sumZ += pos[2];
              count++;
              segments.push({ from: [0, 0, 0], to: pos }); // from filled after centroid
            }
            const corpsPos: [number, number, number] = count > 0
              ? [sumX / count, sumY / count, sumZ / count]
              : [0, 0, 0];
            for (const s of segments) s.from = corpsPos;
            renderer.setCorpsBrigadeLines(segments, formation.faction);
            const zocSet = new Set<string>();
            if (adj) {
              for (const bid of subordinateIds) {
                const b = formations.find((f) => f.id === bid);
                if (!b) continue;
                const loc = b.location_osid ?? b.hq_sid;
                if (!loc) continue;
                for (const osid of adj.get(loc) ?? []) zocSet.add(osid);
              }
            }
            const combinedOsids = Array.from(zocSet).sort((a, b) => a.localeCompare(b));
            renderer.setSelectionZocOsids(combinedOsids, formation.faction);
            return;
          }

          renderer.setCorpsBrigadeLines([], null);
          const loc = formation.location_osid ?? formation.hq_sid;
          if (!loc) {
            renderer.setSelectionZocOsids([], null);
            return;
          }
          if (!adj) return;
          const zocOsids = (adj.get(loc) ?? []).slice().sort((a, b) => a.localeCompare(b));
          renderer.setSelectionZocOsids(zocOsids, formation.faction);
        };

        function showTooltip(feature: { properties?: Record<string, unknown> }, left: number, top: number): void {
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
          tooltipEl.style.left = `${left}px`;
          tooltipEl.style.top = `${top}px`;
        }
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
          hasLoadedState = applyState(text) || hasLoadedState;
        }).catch((e) => console.warn('map_hoi: file read failed', e));
        fileInput.value = '';
      });
    }

    const topBar = new TopCommandBarComponent(topBarEl, {
      onLoadSave: () => { fileInput?.click(); },
      onAdvance: () => {
        if (bridge?.advanceTurn) {
          bridge.advanceTurn().then((r) => {
            if (r?.stateJson) {
              hasLoadedState = applyState(r.stateJson) || hasLoadedState;
            }
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
      bridge.setGameStateUpdatedCallback((stateJson) => {
        hasLoadedState = applyState(stateJson) || hasLoadedState;
      });
    }
    if (bridge?.getCurrentGameState) {
      bridge.getCurrentGameState().then((stateJson) => {
        hasLoadedState = applyState(stateJson ?? null) || hasLoadedState;
      });
    } else {
      // Standalone: auto-load latest scenario run for testing
      fetch(`${window.location.origin}/data/derived/latest_run_final_save.json`)
        .then((r) => r.ok ? r.text() : Promise.reject(new Error(`HTTP ${r.status}`)))
        .then((text) => {
          hasLoadedState = applyState(text) || hasLoadedState;
        })
        .catch(() => { /* no latest run — user can Load Save */ });
    }

    // Auto-load operational political control (OSID-keyed, April 1992 initial)
    fetch(`${window.location.origin}/data/derived/operational/operational_political_control.json`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { by_settlement_id?: Record<string, string | null> }) => {
        // Never overwrite an already loaded save's control map.
        if (hasLoadedState) return;
        const control = data.by_settlement_id ?? {};
        const r = rendererRef.current;
        if (r) {
          r.setControlBySettlement(control);
        } else if (pendingData) {
          pendingData.control = control;
        }
      })
      .catch((e) => console.warn('map_hoi: auto-load operational control failed', e));

    renderFromState();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
