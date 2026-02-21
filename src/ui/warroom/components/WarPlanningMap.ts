/**
 * War Planning Map — separate GUI system (not merely an overlay).
 * Currently opened from warroom by wall map click; shows settlements with political control and contested crosshatch.
 * Close via [X] or ESC. Three zoom levels (Strategic / Operational / Tactical).
 */

import type { InvestmentType } from '../../../phase0/investment.js';
import type { FactionId, GameState, MunicipalityId, OrganizationalPenetration } from '../../../state/game_state.js';
import wallMapFrameUrl from '../assets/wall_map_frame_v1.png?url';
import type { InvestmentPanelMunInfo } from './InvestmentPanel.js';
import { InvestmentPanel } from './InvestmentPanel.js';
import { Phase0DirectiveState } from './Phase0DirectiveState.js';
import { SettlementInfoPanel } from './SettlementInfoPanel.js';

/** GeoJSON Position [x, y] or [x, y, z]. */
type Position = [number, number] | [number, number, number];
/** Ring = array of positions. */
type Ring = Position[];
/** Polygon = array of rings (exterior then holes). */
type PolygonCoords = Ring[];
/** MultiPolygon = array of polygons. */
type MultiPolygonCoords = PolygonCoords[];

type GeoFeature = {
    properties?: { sid?: string; municipality_id?: number };
    geometry: { type: 'Polygon'; coordinates: PolygonCoords } | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
};

type PoliticalControlData = {
    by_settlement_id?: Record<string, string | null>;
    control_status_by_settlement_id?: Record<string, string>;
};

type SettlementEdge = { a: string; b: string };

const SIDE_COLORS: Record<string, string> = {
    RBiH: 'rgba(27, 94, 32, 0.65)',
    RS: 'rgba(226, 74, 74, 0.65)',
    HRHB: 'rgba(74, 144, 226, 0.65)',
    null: 'rgba(100, 100, 100, 0.4)'
};

const ETHNICITY_COLORS: Record<string, string> = {
    bosniak: 'rgba(45, 106, 79, 0.70)',
    muslim: 'rgba(45, 106, 79, 0.70)',
    serb: 'rgba(139, 26, 26, 0.70)',
    serbian: 'rgba(139, 26, 26, 0.70)',
    croat: 'rgba(26, 60, 139, 0.70)',
    croatian: 'rgba(26, 60, 139, 0.70)',
    other: 'rgba(136, 136, 136, 0.50)'
};

const ZOOM_FACTORS = [1, 2.5, 5];
const ZOOM_LABELS = ['STRATEGIC', 'OPERATIONAL', 'TACTICAL'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatTurnDate(turn: number): string {
    const start = new Date(1991, 8, 1);
    const d = new Date(start);
    d.setDate(d.getDate() + turn * 7);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export class WarPlanningMap {
    // Data properties
    private container: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private polygons: Map<string, GeoFeature> = new Map();
    private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    private zoomLevel: 0 | 1 | 2 = 0;
    private zoomCenter = { x: 0.5, y: 0.5 };
    private controlData: PoliticalControlData = {};
    private settlementMeta: Array<{ sid: string; mid: string }> | null = null;
    private municipalitiesMeta: Array<{ mid: string; name: string }> | null = null;
    private municipalitiesMap: Map<string, string> = new Map(); // MID -> Name
    private settlementToMidMap: Map<string, string> = new Map(); // SID -> MID
    private layerPoliticalControl = true;
    private layerContested = true;
    private layerEthnicity = false;
    private closeCallback: (() => void) | null = null;
    private hatchPattern: CanvasPattern | null = null;
    private selectedSettlement: GeoFeature | null = null;
    private settlementInfoPanel: SettlementInfoPanel | null = null;
    private settlementNames: { by_census_id?: Record<string, { name: string; mun_code: string }> } | null = null;
    private mun1990Names: { by_municipality_id?: Record<string, { display_name: string; mun1990_id: string }> } | null = null;
    private ethnicityData: { by_settlement_id?: Record<string, { majority?: string; composition?: Record<string, number>; provenance?: string }> } | null = null;
    private gameState: GameState | null = null;
    private settlementEdges: SettlementEdge[] = [];
    private settlementCentroids: Map<string, [number, number]> = new Map();
    private searchIndex: Array<{ sid: string; name: string; bbox: { minX: number; minY: number; maxX: number; maxY: number }; feature: GeoFeature }> = [];
    private searchVisible = false;
    private zoomFactorSmooth = 1;
    private zoomSnapId: ReturnType<typeof setTimeout> | null = null;
    private readonly ZOOM_SNAP_IDLE_MS = 300;
    private readonly ZOOM_WHEEL_SENSITIVITY = 0.0015;
    private layerPanelExpanded = true;
    private legendVisible = true;
    // INVEST layer (Phase 0)
    private layerInvest = false;
    private investmentPanel: InvestmentPanel | null = null;
    private directiveState: Phase0DirectiveState = new Phase0DirectiveState();
    private playerFaction: FactionId = 'RBiH';
    private selectedMunicipality: InvestmentPanelMunInfo | null = null;
    private onInvestmentChanged: (() => void) | null = null;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'war-planning-map-overlay';
        this.container.setAttribute('aria-hidden', 'true');

        const backdrop = document.createElement('div');
        backdrop.className = 'war-planning-map-backdrop';

        const frame = document.createElement('div');
        frame.className = 'war-planning-map-frame';
        frame.style.backgroundImage = `url(${wallMapFrameUrl})`;
        frame.style.backgroundSize = '100% 100%';
        frame.style.backgroundRepeat = 'no-repeat';

        const mapArea = document.createElement('div');
        mapArea.className = 'war-planning-map-area';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        mapArea.appendChild(this.canvas);

        const zoomPill = document.createElement('div');
        zoomPill.className = 'war-planning-map-zoom-pill';
        zoomPill.textContent = ZOOM_LABELS[0];

        const closeBtn = document.createElement('button');
        closeBtn.className = 'war-planning-map-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close map');

        const layerPanel = document.createElement('div');
        layerPanel.className = 'war-planning-map-layer-panel';
        layerPanel.innerHTML = `
            <button type="button" class="war-planning-map-layer-toggle-btn" aria-label="Toggle layers" title="Layers (L)">☰</button>
            <div class="war-planning-map-layer-panel-body">
                <div class="war-planning-map-layers-title">Layers</div>
                <label class="war-planning-map-layer-row" title="Settlement-level control"><input type="checkbox" id="wpm-layer-control" checked> Political control</label>
                <label class="war-planning-map-layer-row"><input type="checkbox" id="wpm-layer-contested" checked> Contested zones</label>
                <div class="war-planning-map-layer-row war-planning-map-layer-placeholder">Command Structure <span class="war-planning-map-phase-badge">[II]</span></div>
                <div class="war-planning-map-layer-row war-planning-map-layer-placeholder">Supply <span class="war-planning-map-phase-badge">[II]</span></div>
                <div class="war-planning-map-layer-row war-planning-map-layer-placeholder">Exhaustion <span class="war-planning-map-phase-badge">[I+]</span></div>
                <div class="war-planning-map-layer-row war-planning-map-layer-placeholder">Stability <span class="war-planning-map-phase-badge">[0+]</span></div>
                <div class="war-planning-map-layer-row war-planning-map-layer-placeholder">Displacement <span class="war-planning-map-phase-badge">[I+]</span></div>
                <label class="war-planning-map-layer-row"><input type="checkbox" id="wpm-layer-ethnicity"> Ethnicity (1991)</label>
                <label class="war-planning-map-layer-row" id="wpm-layer-invest-row" style="display:none"><input type="checkbox" id="wpm-layer-invest"> Invest <span class="war-planning-map-phase-badge">[Phase 0]</span></label>
                <div class="war-planning-map-layer-row war-planning-map-layer-placeholder">Municipality borders</div>
            </div>
        `;

        const zoomControls = document.createElement('div');
        zoomControls.className = 'war-planning-map-zoom-controls';
        zoomControls.innerHTML = `
            <button type="button" class="war-planning-map-zoom-btn" data-action="out" aria-label="Zoom out">−</button>
            <button type="button" class="war-planning-map-zoom-btn" data-action="in" aria-label="Zoom in">+</button>
        `;

        const legendPanel = document.createElement('div');
        legendPanel.className = 'war-planning-map-legend';
        legendPanel.innerHTML = `
            <button type="button" class="war-planning-map-legend-toggle" aria-label="Toggle legend">Legend</button>
            <div class="war-planning-map-legend-body">
                <div class="war-planning-map-legend-control">
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(27,94,32)"></span> RBiH</div>
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(226,74,74)"></span> RS</div>
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(74,144,226)"></span> HRHB</div>
                    <div class="war-planning-map-legend-row">— Contested</div>
                    <div class="war-planning-map-legend-row">— Front line</div>
                </div>
                <div class="war-planning-map-legend-ethnicity" style="display:none">
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(45,106,79)"></span> Bosniak</div>
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(139,26,26)"></span> Serb</div>
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(26,60,139)"></span> Croat</div>
                    <div class="war-planning-map-legend-row"><span class="war-planning-map-legend-swatch" style="background:rgb(136,136,136)"></span> Other</div>
                </div>
            </div>
        `;

        const minimapCanvas = document.createElement('canvas');
        minimapCanvas.className = 'war-planning-map-minimap';
        minimapCanvas.width = 150;
        minimapCanvas.height = 100;
        minimapCanvas.setAttribute('aria-label', 'Minimap');

        const turnDisplay = document.createElement('div');
        turnDisplay.className = 'war-planning-map-turn';
        turnDisplay.setAttribute('aria-live', 'polite');

        mapArea.appendChild(turnDisplay);
        mapArea.appendChild(zoomPill);
        mapArea.appendChild(closeBtn);
        mapArea.appendChild(layerPanel);
        mapArea.appendChild(zoomControls);
        mapArea.appendChild(legendPanel);
        mapArea.appendChild(minimapCanvas);

        const searchOverlay = document.createElement('div');
        searchOverlay.className = 'war-planning-map-search closed';
        searchOverlay.innerHTML = `
            <input type="text" class="war-planning-map-search-input" placeholder="Search settlement..." aria-label="Search settlement">
            <div class="war-planning-map-search-results"></div>
        `;
        mapArea.appendChild(searchOverlay);
        const searchInput = searchOverlay.querySelector('.war-planning-map-search-input') as HTMLInputElement;
        const searchResults = searchOverlay.querySelector('.war-planning-map-search-results') as HTMLDivElement;
        searchInput.addEventListener('input', () => this.updateSearchResults(searchInput.value, searchResults));
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideSearch(searchOverlay, searchInput);
                e.preventDefault();
            }
        });

        const legendToggle = legendPanel.querySelector('.war-planning-map-legend-toggle') as HTMLButtonElement;
        if (legendToggle) {
            legendToggle.addEventListener('click', () => {
                this.legendVisible = !this.legendVisible;
                legendPanel.classList.toggle('collapsed', !this.legendVisible);
            });
        }

        minimapCanvas.addEventListener('click', (e: MouseEvent) => this.onMinimapClick(e, minimapCanvas));
        frame.appendChild(mapArea);

        const panelWrapper = document.createElement('div');
        panelWrapper.className = 'settlement-info-panel-wrapper closed';
        panelWrapper.setAttribute('aria-hidden', 'true');
        this.settlementInfoPanel = new SettlementInfoPanel({
            selectedSettlement: null,
            controlData: {},
            gameState: null,
            polygons: this.polygons,
            settlementNames: null,
            mun1990Names: null,
            ethnicityData: null,
            settlementToMidMap: this.settlementToMidMap,
            municipalitiesMap: this.municipalitiesMap,
            onClose: () => this.setSelectedSettlement(null)
        });
        panelWrapper.appendChild(this.settlementInfoPanel.getElement());
        frame.appendChild(panelWrapper);

        // Investment panel wrapper (Phase 0 INVEST layer)
        const investWrapper = document.createElement('div');
        investWrapper.className = 'investment-panel-wrapper closed';
        investWrapper.setAttribute('aria-hidden', 'true');
        this.investmentPanel = new InvestmentPanel({
            gameState: null,
            playerFaction: this.playerFaction,
            selectedMunicipality: null,
            directiveState: this.directiveState,
            onInvest: (munId: MunicipalityId, investmentType: InvestmentType, coordinated?: boolean) =>
                this.handleInvest(munId, investmentType, coordinated),
            onUndoInvestment: (id: string) => this.handleUndoInvestment(id),
            onClose: () => this.setSelectedMunicipality(null)
        });
        investWrapper.appendChild(this.investmentPanel.getElement());
        frame.appendChild(investWrapper);

        this.container.appendChild(backdrop);
        this.container.appendChild(frame);

        closeBtn.addEventListener('click', () => this.close());
        backdrop.addEventListener('click', () => {
            if (this.selectedSettlement) {
                this.setSelectedSettlement(null);
            } else {
                this.close();
            }
        });
        const layerControl = this.container.querySelector('#wpm-layer-control') as HTMLInputElement;
        const layerContested = this.container.querySelector('#wpm-layer-contested') as HTMLInputElement;
        if (layerControl) layerControl.addEventListener('change', () => {
            this.layerPoliticalControl = layerControl.checked;
            if (this.layerPoliticalControl) {
                this.layerEthnicity = false;
                const ethCb = this.container.querySelector('#wpm-layer-ethnicity') as HTMLInputElement;
                if (ethCb) ethCb.checked = false;
                this.updateLegendForMode();
            }
            this.render();
        });
        if (layerContested) layerContested.addEventListener('change', () => { this.layerContested = layerContested.checked; this.render(); });

        const layerEthnicity = this.container.querySelector('#wpm-layer-ethnicity') as HTMLInputElement;
        if (layerEthnicity) {
            layerEthnicity.addEventListener('change', () => {
                this.layerEthnicity = layerEthnicity.checked;
                if (this.layerEthnicity) {
                    // Mutually exclusive: disable political control
                    this.layerPoliticalControl = false;
                    if (layerControl) layerControl.checked = false;
                }
                if (!this.layerEthnicity && !this.layerPoliticalControl) {
                    // Restore political control when ethnicity is turned off
                    this.layerPoliticalControl = true;
                    if (layerControl) layerControl.checked = true;
                }
                this.updateLegendForMode();
                this.render();
            });
        }

        const layerInvest = this.container.querySelector('#wpm-layer-invest') as HTMLInputElement;
        if (layerInvest) {
            layerInvest.addEventListener('change', () => {
                this.layerInvest = layerInvest.checked;
                if (this.layerInvest) {
                    // INVEST replaces political control
                    this.layerPoliticalControl = true;
                    if (layerControl) layerControl.checked = true;
                    this.layerEthnicity = false;
                    const ethCb = this.container.querySelector('#wpm-layer-ethnicity') as HTMLInputElement;
                    if (ethCb) ethCb.checked = false;
                    this.updateLegendForMode();
                } else {
                    this.setSelectedMunicipality(null);
                }
                this.updateInvestPanelVisibility();
                this.render();
            });
        }

        const layerToggleBtn = this.container.querySelector('.war-planning-map-layer-toggle-btn') as HTMLButtonElement;
        if (layerToggleBtn) {
            layerToggleBtn.addEventListener('click', () => {
                this.layerPanelExpanded = !this.layerPanelExpanded;
                layerPanel.classList.toggle('collapsed', !this.layerPanelExpanded);
            });
        }
        layerPanel.classList.toggle('collapsed', !this.layerPanelExpanded);

        zoomControls.querySelectorAll('.war-planning-map-zoom-btn').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = (btn as HTMLElement).dataset.action;
                if (action === 'in') this.zoomIn();
                else if (action === 'out') this.zoomOut();
            });
        });

        this.canvas.addEventListener('click', (e: MouseEvent) => this.onMapClick(e));
        this.canvas.addEventListener('wheel', (e: WheelEvent) => this.onWheel(e), { passive: false });

        const keyHandler = (e: KeyboardEvent) => this.onKeyDown(e);
        this.container.addEventListener('keydown', keyHandler);
    }

    getContainer(): HTMLDivElement {
        return this.container;
    }

    setCloseCallback(cb: () => void): void {
        this.closeCallback = cb;
    }

    close(): void {
        this.container.classList.remove('war-planning-map-visible');
        this.closeCallback?.();
    }

    show(): void {
        this.container.classList.add('war-planning-map-visible');
        // Double rAF: #map-scene was display:none; first rAF can run before layout runs for the
        // newly visible subtree, so getBoundingClientRect() may be 0×0. Second rAF runs after layout.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.resize();
                this.render();
                (this.container.querySelector('.war-planning-map-close') as HTMLElement)?.focus();
            });
        });
    }

    private resize(): void {
        const mapArea = this.container.querySelector('.war-planning-map-area') as HTMLElement;
        if (!mapArea) return;
        const rect = mapArea.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        // If layout not yet complete (e.g. still 0×0), retry next frame once
        if (w <= 0 || h <= 0) {
            requestAnimationFrame(() => this.resize());
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(w * dpr);
        this.canvas.height = Math.floor(h * dpr);
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
        this.render();
    }

    async loadData(): Promise<void> {
        try {
            const [geoRes, controlRes, edgesRes, namesRes, munRes, ethnicityRes, settMetaRes, munMetaRes] = await Promise.all([
                fetch('/data/derived/settlements_a1_viewer.geojson'),
                fetch('/data/derived/political_control_data.json'),
                fetch('/data/derived/settlement_edges.json').catch(() => null),
                fetch('/data/derived/settlement_names.json').catch(() => null),
                fetch('/data/derived/mun1990_names.json').catch(() => null),
                fetch('/data/derived/settlement_ethnicity_data.json').catch(() => null),
                fetch('/data/derived/settlements_meta.json').catch(() => null),
                fetch('/data/derived/municipalities_meta.json').catch(() => null)
            ]);
            if (!geoRes.ok) throw new Error(`Failed to load GeoJSON: ${geoRes.status} ${geoRes.url}`);
            if (!controlRes.ok) throw new Error(`Failed to load political control data: ${controlRes.status} ${controlRes.url}`);

            const geoText = await geoRes.text();
            const controlText = await controlRes.text();
            if (geoText.trimStart().startsWith('<')) throw new Error(`GeoJSON URL returned HTML (check dev server /data/ serving): ${geoRes.url}`);
            if (controlText.trimStart().startsWith('<')) throw new Error(`Political control URL returned HTML (check dev server /data/ serving): ${controlRes.url}`);
            const geojson = JSON.parse(geoText);
            const controlData = JSON.parse(controlText);
            this.controlData = controlData as PoliticalControlData;

            if (settMetaRes?.ok) {
                this.settlementMeta = await settMetaRes.json();
                if (this.settlementMeta) {
                    this.settlementMeta.forEach(item => {
                        if (item.sid && item.mid) {
                            this.settlementToMidMap.set(item.sid, String(item.mid));
                        }
                    });
                }
            }

            if (munMetaRes?.ok) {
                this.municipalitiesMeta = await munMetaRes.json();
                if (this.municipalitiesMeta) {
                    this.municipalitiesMeta.forEach(item => {
                        if (item.mid) {
                            this.municipalitiesMap.set(String(item.mid), item.name);
                        }
                    });
                }
            }

            this.polygons = new Map();
            for (const feature of (geojson.features || []) as GeoFeature[]) {
                const sid = feature.properties?.sid;
                if (sid) this.polygons.set(sid, feature);
            }
            this.bounds = this.computeBounds(this.polygons);
            this.computeCentroids();
            if (edgesRes?.ok) {
                const edgesData = (await edgesRes.json()) as { edges?: SettlementEdge[] };
                this.settlementEdges = edgesData?.edges ?? [];
            }
            if (namesRes?.ok) this.settlementNames = (await namesRes.json()) as { by_census_id?: Record<string, { name: string; mun_code: string }> };
            this.buildSearchIndex();
            if (munRes?.ok) this.mun1990Names = (await munRes.json()) as { by_municipality_id?: Record<string, { display_name: string; mun1990_id: string }> };
            if (ethnicityRes?.ok) this.ethnicityData = (await ethnicityRes.json()) as { by_settlement_id?: Record<string, { majority?: string; composition?: Record<string, number>; provenance?: string }> };
            this.updateSettlementPanel();
            this.updateTurnDisplay();
        } catch (e) {
            console.error('WarPlanningMap: load error', e);
        }
    }

    setGameState(state: GameState | null): void {
        this.gameState = state;
        this.updateSettlementPanel();
        this.updateTurnDisplay();
        this.updateInvestLayerAvailability();
        if (this.investmentPanel) {
            this.investmentPanel.updateProps({ gameState: state });
        }
    }

    /** Set player faction for investment panel. */
    setPlayerFaction(faction: FactionId): void {
        this.playerFaction = faction;
        if (this.investmentPanel) {
            this.investmentPanel.updateProps({ playerFaction: faction });
        }
    }

    /** Get the directive state for the calendar wiring. */
    getDirectiveState(): Phase0DirectiveState {
        return this.directiveState;
    }

    /** Set callback when investments change (for warroom refresh). */
    setOnInvestmentChanged(cb: () => void): void {
        this.onInvestmentChanged = cb;
    }

    /** Check if INVEST layer is active. */
    isInvestLayerActive(): boolean {
        return this.layerInvest;
    }

    setSelectedSettlement(feature: GeoFeature | null): void {
        this.selectedSettlement = feature;
        const wrapper = this.container.querySelector('.settlement-info-panel-wrapper') as HTMLElement;
        if (wrapper) {
            wrapper.classList.toggle('closed', !feature);
            wrapper.classList.toggle('open', !!feature);
            wrapper.setAttribute('aria-hidden', feature ? 'false' : 'true');
        }
        this.updateSettlementPanel();
        this.render();
    }

    private updateLegendForMode(): void {
        const controlLegend = this.container.querySelector('.war-planning-map-legend-control') as HTMLElement;
        const ethnicityLegend = this.container.querySelector('.war-planning-map-legend-ethnicity') as HTMLElement;
        if (controlLegend) controlLegend.style.display = this.layerEthnicity ? 'none' : '';
        if (ethnicityLegend) ethnicityLegend.style.display = this.layerEthnicity ? '' : 'none';
    }

    private updateTurnDisplay(): void {
        const el = this.container.querySelector('.war-planning-map-turn') as HTMLElement;
        if (!el) return;
        const turn = this.gameState?.meta?.turn ?? 0;
        const date = formatTurnDate(turn);
        el.textContent = `W${turn} — ${date}`;
    }

    private updateSettlementPanel(): void {
        if (!this.settlementInfoPanel) return;
        this.settlementInfoPanel.updateProps({
            selectedSettlement: this.selectedSettlement,
            controlData: this.controlData,
            gameState: this.gameState,
            polygons: this.polygons,
            settlementNames: this.settlementNames,
            mun1990Names: this.mun1990Names,
            ethnicityData: this.ethnicityData,
            settlementToMidMap: this.settlementToMidMap,
            municipalitiesMap: this.municipalitiesMap
        });
    }

    private initSettlementInfoPanel(): void {
        this.settlementInfoPanel = new SettlementInfoPanel({
            selectedSettlement: this.selectedSettlement,
            controlData: this.controlData,
            gameState: this.gameState,
            polygons: this.polygons,
            settlementNames: this.settlementNames,
            mun1990Names: this.mun1990Names,
            ethnicityData: this.ethnicityData,
            settlementToMidMap: this.settlementToMidMap,
            municipalitiesMap: this.municipalitiesMap,
            onClose: () => this.setSelectedSettlement(null)
        });
        this.container.appendChild(this.settlementInfoPanel.getElement());
    }

    /**
     * Drive control layer from current game state (e.g. after Phase I advance).
     * Call from warroom onGameStateChange so the map reflects latest political_controllers.
     */
    setControlFromState(state: GameState): void {
        const pc = state.political_controllers ?? {};
        const bySid: Record<string, string | null> = {};
        for (const [sid, controller] of Object.entries(pc)) {
            bySid[sid] = controller ?? null;
        }
        this.controlData.by_settlement_id = bySid;
        const contested = state.contested_control ?? {};
        const statusBySid: Record<string, string> = {};
        for (const [sid, isContested] of Object.entries(contested)) {
            if (isContested) statusBySid[sid] = 'CONTESTED';
        }
        this.controlData.control_status_by_settlement_id = statusBySid;
        this.render();
    }

    private buildSearchIndex(): void {
        this.searchIndex = [];
        const names = this.settlementNames?.by_census_id ?? {};
        for (const [sid, feature] of this.polygons.entries()) {
            const censusId = sid.startsWith('S') ? sid.slice(1) : sid;
            const name = names[censusId]?.name ?? sid;
            const bbox = this.getFeatureBbox(feature);
            this.searchIndex.push({ sid, name, bbox, feature });
        }
        this.searchIndex.sort((a, b) => a.name.localeCompare(b.name, 'sr'));
    }

    private getFeatureBbox(f: GeoFeature): { minX: number; minY: number; maxX: number; maxY: number } {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const polys: PolygonCoords[] = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
        for (const poly of polys) {
            for (const ring of poly) {
                for (const pos of ring) {
                    minX = Math.min(minX, pos[0]);
                    minY = Math.min(minY, pos[1]);
                    maxX = Math.max(maxX, pos[0]);
                    maxY = Math.max(maxY, pos[1]);
                }
            }
        }
        return { minX, minY, maxX, maxY };
    }

    private computeCentroids(): void {
        this.settlementCentroids = new Map();
        for (const [sid, feature] of this.polygons.entries()) {
            const masterSid = this.getMasterSid(feature);
            if (!masterSid) continue;
            const polys: PolygonCoords[] =
                feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
            let sumX = 0, sumY = 0, count = 0;
            for (const poly of polys) {
                for (const ring of poly) {
                    for (const pos of ring) {
                        sumX += pos[0];
                        sumY += pos[1];
                        count++;
                    }
                }
            }
            if (count > 0) {
                this.settlementCentroids.set(masterSid, [sumX / count, sumY / count]);
            }
        }
    }

    private getFrontEdges(): Array<{ a: string; b: string }> {
        const bySid = this.controlData.by_settlement_id ?? {};
        const front: Array<{ a: string; b: string }> = [];
        for (const edge of this.settlementEdges) {
            const ca = bySid[edge.a] ?? null;
            const cb = bySid[edge.b] ?? null;
            if (ca != null && cb != null && ca !== cb) {
                const [a, b] = edge.a < edge.b ? [edge.a, edge.b] : [edge.b, edge.a];
                front.push({ a, b });
            }
        }
        front.sort((x, y) => x.a !== y.a ? x.a.localeCompare(y.a) : x.b.localeCompare(y.b));
        return front;
    }

    private computeBounds(polygons: Map<string, GeoFeature>): { minX: number; minY: number; maxX: number; maxY: number } | null {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const feature of polygons.values()) {
            const polys: PolygonCoords[] =
                feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
            for (const poly of polys) {
                for (const ring of poly) {
                    for (const [x, y] of ring) {
                        minX = Math.min(minX, x);
                        minY = Math.min(minY, y);
                        maxX = Math.max(maxX, x);
                        maxY = Math.max(maxY, y);
                    }
                }
            }
        }
        if (!isFinite(minX)) return null;
        return { minX, minY, maxX, maxY };
    }

    private getMasterSid(feature: GeoFeature): string | null {
        const sid = feature.properties?.sid;
        const munId = feature.properties?.municipality_id;
        if (!sid) return null;
        if (munId != null && typeof munId === 'number') {
            const sourceId = sid.startsWith('S') ? sid.slice(1) : sid;
            return `${munId}:${sourceId}`;
        }
        return sid;
    }

    private getContestedHatchPattern(): CanvasPattern | null {
        if (this.hatchPattern) return this.hatchPattern;
        const canvas = document.createElement('canvas');
        canvas.width = 12;
        canvas.height = 12;
        const pctx = canvas.getContext('2d');
        if (!pctx) return null;
        pctx.strokeStyle = '#000';
        pctx.lineWidth = 1;
        pctx.beginPath();
        pctx.moveTo(0, 0);
        pctx.lineTo(12, 12);
        pctx.moveTo(12, 0);
        pctx.lineTo(0, 12);
        pctx.stroke();
        this.hatchPattern = this.ctx.createPattern(canvas, 'repeat');
        return this.hatchPattern;
    }

    private render(): void {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);

        if (!this.bounds || this.polygons.size === 0) {
            this.ctx.fillStyle = '#e8dec2';
            this.ctx.fillRect(0, 0, w, h);
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.font = 'bold 24px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Loading map data...', w / 2, h / 2);
            return;
        }

        let { minX, minY, maxX, maxY } = this.bounds;
        const zoomFactor = this.getEffectiveZoomFactor();
        if (zoomFactor > 1) {
            const centerX = minX + (maxX - minX) * this.zoomCenter.x;
            const centerY = minY + (maxY - minY) * this.zoomCenter.y;
            const rangeX = (maxX - minX) / zoomFactor;
            const rangeY = (maxY - minY) / zoomFactor;
            minX = centerX - rangeX / 2;
            maxX = centerX + rangeX / 2;
            minY = centerY - rangeY / 2;
            maxY = centerY + rangeY / 2;
        }

        const padding = 40;
        const availableW = w - padding * 2;
        const availableH = h - padding * 2;
        const scale = Math.min(availableW / (maxX - minX), availableH / (maxY - minY));
        const offsetX = (w - (maxX - minX) * scale) / 2;
        const offsetY = (h - (maxY - minY) * scale) / 2;

        const project = (x: number, y: number): [number, number] => [
            (x - minX) * scale + offsetX,
            (y - minY) * scale + offsetY
        ];

        const controllers = this.controlData.by_settlement_id ?? {};
        const controlStatus = this.controlData.control_status_by_settlement_id ?? {};

        // Paper substrate
        this.ctx.fillStyle = '#e8dec2';
        this.ctx.fillRect(0, 0, w, h);

        if (this.layerEthnicity && this.ethnicityData) {
            // Ethnicity fill mode
            for (const [, feature] of this.polygons.entries()) {
                const masterSid = this.getMasterSid(feature);
                let fillColor = ETHNICITY_COLORS['other'];
                if (masterSid && this.ethnicityData.by_settlement_id) {
                    const ethData = this.ethnicityData.by_settlement_id[masterSid];
                    if (ethData?.majority) {
                        fillColor = ETHNICITY_COLORS[ethData.majority.toLowerCase()] ?? ETHNICITY_COLORS['other'];
                    }
                }
                this.ctx.fillStyle = fillColor;
                this.drawPolygonPath(feature, project);
                this.ctx.fill();
                this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                this.ctx.lineWidth = 0.5;
                this.ctx.stroke();
            }

            this.drawZoomPill(w, h);
            this.drawMinimap();
            return;
        }

        if (!this.layerPoliticalControl) {
            this.ctx.fillStyle = 'rgba(120,120,120,0.3)';
            for (const [, feature] of this.polygons.entries()) {
                this.drawPolygonPath(feature, project);
                this.ctx.fill();
            }
            this.drawZoomPill(w, h);
            return;
        }

        const contestedPattern = this.layerContested ? this.getContestedHatchPattern() : null;

        for (const [, feature] of this.polygons.entries()) {
            const masterSid = this.getMasterSid(feature);
            const controller = masterSid ? (controllers[masterSid] ?? 'null') : 'null';
            const color = SIDE_COLORS[controller] ?? SIDE_COLORS['null'];
            const status = masterSid ? controlStatus[masterSid] : undefined;
            const isContested = this.layerContested && (status === 'CONTESTED' || status === 'HIGHLY_CONTESTED');

            this.ctx.fillStyle = color;
            this.drawPolygonPath(feature, project);
            this.ctx.fill();
            this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            this.ctx.lineWidth = 0.5;
            this.ctx.stroke();

            if (isContested && contestedPattern) {
                this.ctx.save();
                this.ctx.fillStyle = contestedPattern;
                this.drawPolygonPath(feature, project);
                this.ctx.clip('evenodd');
                this.ctx.fillRect(0, 0, w, h);
                this.ctx.restore();
            }
        }

        const lodLevel = this.getLodZoomLevel();
        if (this.layerPoliticalControl && lodLevel >= 1) {
            this.drawFrontLines(project);
        }

        this.drawZoomPill(w, h);
        this.drawMinimap();
    }

    private drawMinimap(): void {
        const minimap = this.container.querySelector('.war-planning-map-minimap') as HTMLCanvasElement;
        if (!minimap || !this.bounds) return;
        const ctx = minimap.getContext('2d');
        if (!ctx) return;
        const w = minimap.width;
        const h = minimap.height;
        ctx.fillStyle = 'rgba(35,35,30,0.9)';
        ctx.fillRect(0, 0, w, h);
        const { minX, minY, maxX, maxY } = this.bounds;
        const scale = Math.min(w / (maxX - minX), h / (maxY - minY));
        const offsetX = (w - (maxX - minX) * scale) / 2;
        const offsetY = (h - (maxY - minY) * scale) / 2;
        const project = (x: number, y: number) => [(x - minX) * scale + offsetX, (y - minY) * scale + offsetY];
        const controllers = this.controlData.by_settlement_id ?? {};
        for (const [, feature] of this.polygons.entries()) {
            const masterSid = this.getMasterSid(feature);
            const c = masterSid ? (controllers[masterSid] ?? 'null') : 'null';
            const color = c === 'RBiH' ? 'rgb(27,94,32)' : c === 'RS' ? 'rgb(226,74,74)' : c === 'HRHB' ? 'rgb(74,144,226)' : 'rgb(100,100,100)';
            ctx.fillStyle = color;
            ctx.beginPath();
            const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
            for (const poly of polys) {
                for (const ring of poly) {
                    for (let i = 0; i < ring.length; i++) {
                        const [sx, sy] = project(ring[i][0], ring[i][1]);
                        if (i === 0) ctx.moveTo(sx, sy);
                        else ctx.lineTo(sx, sy);
                    }
                }
            }
            ctx.closePath();
            ctx.fill();
        }
        const t = this.getViewTransform();
        if (t && (t.maxX - t.minX) < (maxX - minX)) {
            const [x1, y1] = project(t.minX, t.minY);
            const [x2, y2] = project(t.maxX, t.maxY);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        }
    }

    private onMinimapClick(e: MouseEvent, minimap: HTMLCanvasElement): void {
        if (!this.bounds) return;
        const rect = minimap.getBoundingClientRect();
        const scaleX = minimap.width / rect.width;
        const scaleY = minimap.height / rect.height;
        const mx = (e.clientX - rect.left) * scaleX;
        const my = (e.clientY - rect.top) * scaleY;
        const { minX, minY, maxX, maxY } = this.bounds;
        const s = Math.min(minimap.width / (maxX - minX), minimap.height / (maxY - minY));
        const ox = (minimap.width - (maxX - minX) * s) / 2;
        const oy = (minimap.height - (maxY - minY) * s) / 2;
        const dataX = (mx - ox) / s + minX;
        const dataY = (my - oy) / s + minY;
        const rx = maxX - minX;
        const ry = maxY - minY;
        this.zoomCenter = { x: rx > 0 ? (dataX - minX) / rx : 0.5, y: ry > 0 ? (dataY - minY) / ry : 0.5 };
        this.render();
    }

    /** Public redraw (e.g. after layer toggle or resize). */
    redraw(): void {
        this.render();
    }

    private drawFrontLines(project: (x: number, y: number) => [number, number]): void {
        const frontEdges = this.getFrontEdges();
        this.ctx.save();
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([6, 4]);
        this.ctx.beginPath();
        for (const edge of frontEdges) {
            const pa = this.settlementCentroids.get(edge.a);
            const pb = this.settlementCentroids.get(edge.b);
            if (pa && pb) {
                const [sx, sy] = project(pa[0], pa[1]);
                this.ctx.moveTo(sx, sy);
                const [ex, ey] = project(pb[0], pb[1]);
                this.ctx.lineTo(ex, ey);
            }
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    private drawPolygonPath(
        feature: GeoFeature,
        project: (x: number, y: number) => [number, number]
    ): void {
        const polys: PolygonCoords[] =
            feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        this.ctx.beginPath();
        for (const poly of polys) {
            for (const ring of poly) {
                for (let i = 0; i < ring.length; i++) {
                    const pos = ring[i];
                    const [sx, sy] = project(pos[0], pos[1]);
                    if (i === 0) this.ctx.moveTo(sx, sy);
                    else this.ctx.lineTo(sx, sy);
                }
            }
        }
        this.ctx.closePath();
    }

    private getEffectiveZoomFactor(): number {
        return this.zoomFactorSmooth;
    }

    private getLodZoomLevel(): 0 | 1 | 2 {
        const f = this.zoomFactorSmooth;
        const d0 = Math.abs(f - ZOOM_FACTORS[0]);
        const d1 = Math.abs(f - ZOOM_FACTORS[1]);
        const d2 = Math.abs(f - ZOOM_FACTORS[2]);
        if (d0 <= d1 && d0 <= d2) return 0;
        if (d1 <= d2) return 1;
        return 2;
    }

    private scheduleZoomSnap(): void {
        if (this.zoomSnapId) clearTimeout(this.zoomSnapId);
        this.zoomSnapId = setTimeout(() => {
            this.zoomSnapId = null;
            let bestIdx = 0;
            let bestDist = Infinity;
            for (let i = 0; i < ZOOM_FACTORS.length; i++) {
                const d = Math.abs(this.zoomFactorSmooth - ZOOM_FACTORS[i]);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i;
                }
            }
            this.zoomFactorSmooth = ZOOM_FACTORS[bestIdx];
            this.zoomLevel = bestIdx as 0 | 1 | 2;
            const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
            if (zoomPill) zoomPill.textContent = ZOOM_LABELS[this.zoomLevel];
            this.render();
        }, this.ZOOM_SNAP_IDLE_MS);
    }

    private onWheel(e: WheelEvent): void {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;
        const pt = this.canvasToData(canvasX, canvasY);
        if (!pt || !this.bounds) return;

        const delta = -e.deltaY * this.ZOOM_WHEEL_SENSITIVITY;
        const newFactor = Math.max(1, Math.min(5, this.zoomFactorSmooth * (1 + delta)));

        const rx = this.bounds.maxX - this.bounds.minX;
        const ry = this.bounds.maxY - this.bounds.minY;
        const dataX = pt[0];
        const dataY = pt[1];

        const oldFactor = this.zoomFactorSmooth;
        this.zoomFactorSmooth = newFactor;

        const scaleChange = newFactor / oldFactor;
        const cx = this.zoomCenter.x * rx + this.bounds.minX;
        const cy = this.zoomCenter.y * ry + this.bounds.minY;
        const newCx = dataX - (dataX - cx) / scaleChange;
        const newCy = dataY - (dataY - cy) / scaleChange;
        this.zoomCenter = {
            x: rx > 0 ? (newCx - this.bounds.minX) / rx : 0.5,
            y: ry > 0 ? (newCy - this.bounds.minY) / ry : 0.5
        };

        this.zoomLevel = this.getLodZoomLevel();
        const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
        if (zoomPill) zoomPill.textContent = ZOOM_LABELS[this.zoomLevel];
        this.scheduleZoomSnap();
        this.render();
    }

    private getViewTransform(): {
        minX: number; minY: number; maxX: number; maxY: number;
        scale: number; offsetX: number; offsetY: number;
    } | null {
        if (!this.bounds) return null;
        let { minX, minY, maxX, maxY } = this.bounds;
        const zoomFactor = this.getEffectiveZoomFactor();
        if (zoomFactor > 1) {
            const centerX = minX + (maxX - minX) * this.zoomCenter.x;
            const centerY = minY + (maxY - minY) * this.zoomCenter.y;
            const rangeX = (maxX - minX) / zoomFactor;
            const rangeY = (maxY - minY) / zoomFactor;
            minX = centerX - rangeX / 2;
            maxX = centerX + rangeX / 2;
            minY = centerY - rangeY / 2;
            maxY = centerY + rangeY / 2;
        }
        const w = this.canvas.width;
        const h = this.canvas.height;
        const padding = 40;
        const availableW = w - padding * 2;
        const availableH = h - padding * 2;
        const scale = Math.min(availableW / (maxX - minX), availableH / (maxY - minY));
        const offsetX = (w - (maxX - minX) * scale) / 2;
        const offsetY = (h - (maxY - minY) * scale) / 2;
        return { minX, minY, maxX, maxY, scale, offsetX, offsetY };
    }

    private canvasToData(canvasX: number, canvasY: number): [number, number] | null {
        const t = this.getViewTransform();
        if (!t) return null;
        const dataX = (canvasX - t.offsetX) / t.scale + t.minX;
        const dataY = (canvasY - t.offsetY) / t.scale + t.minY;
        return [dataX, dataY];
    }

    private pointInPolygon(px: number, py: number, feature: GeoFeature): boolean {
        const polys: PolygonCoords[] =
            feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        for (const poly of polys) {
            const ring = poly[0];
            if (!ring || ring.length < 3) continue;
            let inside = false;
            const n = ring.length;
            for (let i = 0, j = n - 1; i < n; j = i++) {
                const xi = ring[i][0], yi = ring[i][1];
                const xj = ring[j][0], yj = ring[j][1];
                if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
                    inside = !inside;
                }
            }
            if (inside) return true;
        }
        return false;
    }

    private getSettlementAtPoint(canvasX: number, canvasY: number): GeoFeature | null {
        const pt = this.canvasToData(canvasX, canvasY);
        if (!pt) return null;
        const [dx, dy] = pt;
        const sids = Array.from(this.polygons.keys()).sort();
        for (const sid of sids) {
            const feature = this.polygons.get(sid);
            if (feature && this.pointInPolygon(dx, dy, feature)) return feature;
        }
        return null;
    }

    private zoomIn(): void {
        if (this.zoomLevel < 2) {
            this.zoomLevel = (this.zoomLevel + 1) as 0 | 1 | 2;
            this.zoomFactorSmooth = ZOOM_FACTORS[this.zoomLevel];
            const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
            if (zoomPill) zoomPill.textContent = ZOOM_LABELS[this.zoomLevel];
            this.render();
        }
    }

    private zoomOut(): void {
        if (this.zoomLevel > 0) {
            this.zoomLevel = (this.zoomLevel - 1) as 0 | 1 | 2;
            this.zoomFactorSmooth = ZOOM_FACTORS[this.zoomLevel];
            const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
            if (zoomPill) zoomPill.textContent = ZOOM_LABELS[this.zoomLevel];
            this.render();
        }
    }

    private zoomToLevel(level: 0 | 1 | 2): void {
        this.zoomLevel = level;
        this.zoomFactorSmooth = ZOOM_FACTORS[level];
        const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
        if (zoomPill) zoomPill.textContent = ZOOM_LABELS[level];
        this.render();
    }

    private fitExtent(): void {
        this.zoomLevel = 0;
        this.zoomFactorSmooth = ZOOM_FACTORS[0];
        this.zoomCenter = { x: 0.5, y: 0.5 };
        const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
        if (zoomPill) zoomPill.textContent = ZOOM_LABELS[0];
        this.render();
    }

    private onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            if (this.selectedSettlement) {
                this.setSelectedSettlement(null);
            } else if (this.zoomLevel > 0) {
                this.zoomOut();
            } else {
                this.close();
            }
            e.preventDefault();
        } else if (e.key === 'l' || e.key === 'L') {
            this.layerPanelExpanded = !this.layerPanelExpanded;
            const layerPanel = this.container.querySelector('.war-planning-map-layer-panel');
            if (layerPanel) layerPanel.classList.toggle('collapsed', !this.layerPanelExpanded);
            e.preventDefault();
        } else if (e.key === '+' || e.key === '=') {
            this.zoomIn();
            e.preventDefault();
        } else if (e.key === '-') {
            this.zoomOut();
            e.preventDefault();
        } else if (e.key === '1') {
            this.zoomToLevel(0);
            e.preventDefault();
        } else if (e.key === '2') {
            this.zoomToLevel(1);
            e.preventDefault();
        } else if (e.key === '3') {
            this.zoomToLevel(2);
            e.preventDefault();
        } else if (e.key === 'Backspace' || e.key === 'b' || e.key === 'B') {
            this.zoomOut();
            e.preventDefault();
        } else if (e.key === 'f' || e.key === 'F' || e.key === 'Home') {
            this.fitExtent();
            e.preventDefault();
        } else if (e.key === '/' || (e.ctrlKey && e.key === 'f')) {
            this.showSearch();
            e.preventDefault();
        }
    }

    private showSearch(): void {
        const overlay = this.container.querySelector('.war-planning-map-search');
        const input = this.container.querySelector('.war-planning-map-search-input') as HTMLInputElement;
        if (overlay && input) {
            overlay.classList.remove('closed');
            overlay.classList.add('open');
            input.value = '';
            input.focus();
            this.updateSearchResults('', overlay.querySelector('.war-planning-map-search-results') as HTMLDivElement);
        }
    }

    private hideSearch(overlay: HTMLElement, input: HTMLInputElement): void {
        overlay.classList.add('closed');
        overlay.classList.remove('open');
        input.value = '';
        (this.container.querySelector('.war-planning-map-close') as HTMLElement)?.focus();
    }

    private normalizeForSearch(s: string): string {
        return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    }

    private updateSearchResults(query: string, container: HTMLDivElement): void {
        container.innerHTML = '';
        const q = this.normalizeForSearch(query.trim());
        const matches = q.length < 2
            ? []
            : this.searchIndex.filter((item) => this.normalizeForSearch(item.name).includes(q)).slice(0, 12);
        for (const item of matches) {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'war-planning-map-search-result';
            row.textContent = item.name;
            row.addEventListener('click', () => {
                this.jumpToSettlement(item);
                const overlay = this.container.querySelector('.war-planning-map-search');
                const input = this.container.querySelector('.war-planning-map-search-input') as HTMLInputElement;
                if (overlay && input) this.hideSearch(overlay as HTMLElement, input);
            });
            container.appendChild(row);
        }
    }

    private jumpToSettlement(item: { bbox: { minX: number; minY: number; maxX: number; maxY: number }; feature: GeoFeature }): void {
        if (!this.bounds) return;
        const { minX, minY, maxX, maxY } = item.bbox;
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        const rx = this.bounds.maxX - this.bounds.minX;
        const ry = this.bounds.maxY - this.bounds.minY;
        this.zoomCenter = { x: rx > 0 ? (cx - this.bounds.minX) / rx : 0.5, y: ry > 0 ? (cy - this.bounds.minY) / ry : 0.5 };
        this.zoomLevel = 2;
        this.zoomFactorSmooth = ZOOM_FACTORS[2];
        this.setSelectedSettlement(item.feature);
        const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;
        if (zoomPill) zoomPill.textContent = ZOOM_LABELS[2];
        this.render();
    }

    private onMapClick(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;

        const zoomPill = this.container.querySelector('.war-planning-map-zoom-pill') as HTMLElement;

        const updateZoomCenter = (): void => {
            const pt = this.canvasToData(canvasX, canvasY);
            if (pt && this.bounds) {
                const rx = this.bounds.maxX - this.bounds.minX;
                const ry = this.bounds.maxY - this.bounds.minY;
                this.zoomCenter = {
                    x: rx > 0 ? (pt[0] - this.bounds.minX) / rx : 0.5,
                    y: ry > 0 ? (pt[1] - this.bounds.minY) / ry : 0.5
                };
            }
        };

        if (this.zoomLevel === 2) {
            const feature = this.getSettlementAtPoint(canvasX, canvasY);
            if (feature) {
                if (this.layerInvest) {
                    // INVEST mode: route to investment panel instead of settlement info
                    this.selectMunicipalityFromFeature(feature);
                } else {
                    this.setSelectedSettlement(feature);
                }
            } else {
                if (this.layerInvest && this.selectedMunicipality) {
                    this.setSelectedMunicipality(null);
                } else if (this.selectedSettlement) {
                    this.setSelectedSettlement(null);
                } else {
                    this.zoomLevel = 1;
                    this.zoomFactorSmooth = ZOOM_FACTORS[1];
                    updateZoomCenter();
                    if (zoomPill) zoomPill.textContent = ZOOM_LABELS[1];
                    this.render();
                }
            }
        } else {
            this.zoomLevel = ((this.zoomLevel + 1) % 3) as 0 | 1 | 2;
            this.zoomFactorSmooth = ZOOM_FACTORS[this.zoomLevel];
            updateZoomCenter();
            if (zoomPill) zoomPill.textContent = ZOOM_LABELS[this.zoomLevel];
            this.render();
        }
    }

    private drawZoomPill(w: number, h: number): void {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        const label = ZOOM_LABELS[this.zoomLevel];
        const x = w - 16;
        const y = 16;
        const metrics = this.ctx.measureText(label);
        this.ctx.fillRect(x - metrics.width - 8, y, metrics.width + 16, 22);
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(label, x - 4, y + 4);
        this.ctx.restore();
    }

    // ======================================
    // INVEST Layer Methods (Phase 0)
    // ======================================

    /** Show or hide the INVEST checkbox depending on game phase. */
    private updateInvestLayerAvailability(): void {
        const investRow = this.container.querySelector('#wpm-layer-invest-row') as HTMLElement;
        if (!investRow) return;
        const phase = this.gameState?.meta?.phase ?? 'phase_0';
        const isPhase0 = phase === 'phase_0';
        investRow.style.display = isPhase0 ? 'block' : 'none';
        const cb = this.container.querySelector('#wpm-layer-invest') as HTMLInputElement | null;
        // In Phase 0 default to INVEST enabled so capital allocation is immediately discoverable.
        if (isPhase0 && !this.layerInvest) {
            this.layerInvest = true;
            if (cb) cb.checked = true;
            this.updateInvestPanelVisibility();
        }
        // Auto-disable INVEST if phase changed away from phase_0
        if (!isPhase0 && this.layerInvest) {
            this.layerInvest = false;
            if (cb) cb.checked = false;
            this.setSelectedMunicipality(null);
            this.updateInvestPanelVisibility();
        }
    }

    /** Toggle investment panel wrapper open/closed. */
    private updateInvestPanelVisibility(): void {
        const investWrapper = this.container.querySelector('.investment-panel-wrapper') as HTMLElement;
        const settWrapper = this.container.querySelector('.settlement-info-panel-wrapper') as HTMLElement;
        if (investWrapper) {
            const isOpen = this.layerInvest;
            investWrapper.classList.toggle('closed', !isOpen);
            investWrapper.classList.toggle('open', isOpen);
            investWrapper.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        }
        // Hide settlement panel when INVEST is active
        if (settWrapper && this.layerInvest) {
            settWrapper.classList.add('closed');
            settWrapper.classList.remove('open');
            settWrapper.setAttribute('aria-hidden', 'true');
        }
        if (this.investmentPanel) {
            this.investmentPanel.updateProps({
                gameState: this.gameState,
                playerFaction: this.playerFaction,
                selectedMunicipality: this.selectedMunicipality,
                directiveState: this.directiveState
            });
        }
    }

    /** Resolve municipality info from a clicked GeoFeature for the investment panel. */
    private selectMunicipalityFromFeature(feature: GeoFeature): void {
        const sid = feature.properties?.sid;
        if (!sid) return;

        // Resolve municipality ID
        const midStr = this.settlementToMidMap.get(sid) ?? String(feature.properties?.municipality_id ?? '');
        if (!midStr) return;

        const munName = this.municipalitiesMap.get(midStr) ?? `Municipality ${midStr}`;
        const munId = midStr as MunicipalityId;

        // Get municipality state
        const mun = this.gameState?.municipalities?.[munId];
        const stabilityScore = mun?.stability_score ?? 50;
        const controlStatus = mun?.control_status ?? 'NEUTRAL';
        const orgPen: OrganizationalPenetration = mun?.organizational_penetration ?? {};

        // Get controller
        const controller = this.gameState?.political_controllers?.[munId] ?? null;

        // Get majority ethnicity from first settlement in this municipality
        let majorityEthnicity: string | null = null;
        if (this.ethnicityData?.by_settlement_id) {
            const ethData = this.ethnicityData.by_settlement_id[sid];
            if (ethData?.majority) {
                majorityEthnicity = ethData.majority.charAt(0).toUpperCase() + ethData.majority.slice(1);
            }
        }

        this.setSelectedMunicipality({
            munId,
            munName,
            controller,
            stabilityScore,
            controlStatus,
            orgPen,
            majorityEthnicity
        });
    }

    /** Set the selected municipality for the investment panel. */
    setSelectedMunicipality(info: InvestmentPanelMunInfo | null): void {
        this.selectedMunicipality = info;
        if (this.investmentPanel) {
            this.investmentPanel.updateProps({ selectedMunicipality: info });
        }
        this.render();
    }

    /** Handle an investment action from the panel. */
    private handleInvest(munId: MunicipalityId, investmentType: InvestmentType, coordinated?: boolean): void {
        if (!this.gameState) return;
        const result = this.directiveState.stage(
            this.gameState,
            this.playerFaction,
            investmentType,
            [munId],
            { coordinated }
        );
        if (result) {
            // Re-render panel and map to reflect staged investment
            if (this.investmentPanel) {
                this.investmentPanel.updateProps({
                    gameState: this.gameState,
                    directiveState: this.directiveState,
                    selectedMunicipality: this.selectedMunicipality
                });
            }
            this.render();
            this.onInvestmentChanged?.();
        }
    }

    /** Handle undo of a staged investment. */
    private handleUndoInvestment(id: string): void {
        this.directiveState.unstage(id);
        if (this.investmentPanel) {
            this.investmentPanel.updateProps({
                gameState: this.gameState,
                directiveState: this.directiveState,
                selectedMunicipality: this.selectedMunicipality
            });
        }
        this.render();
        this.onInvestmentChanged?.();
    }
}
