import type { InvestmentType } from '../../../phase0/investment.js';
import { getInvestmentTypesForFaction } from '../../../phase0/investment.js';
import type { FactionId, GameState, MunicipalityId, OrganizationalPenetration } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import type { InvestmentPanelMunInfo } from './InvestmentPanel.js';
import { InvestmentPanel } from './InvestmentPanel.js';
import { Phase0DirectiveState } from './Phase0DirectiveState.js';

type Position = [number, number] | [number, number, number];
type Ring = Position[];
type PolygonCoords = Ring[];
type MultiPolygonCoords = PolygonCoords[];
type LineCoords = Position[];
type MultiLineCoords = LineCoords[];

type MunicipalityFeature = {
    properties?: {
        mun1990_id?: string;
        display_name?: string;
    };
    geometry: { type: 'Polygon'; coordinates: PolygonCoords } | { type: 'MultiPolygon'; coordinates: MultiPolygonCoords };
};

type MunicipalityBoundaryFeature = {
    properties?: {
        mun1990_id?: string;
        mun1990_name?: string;
    };
    geometry: { type: 'LineString'; coordinates: LineCoords } | { type: 'MultiLineString'; coordinates: MultiLineCoords };
};

type MunicipalityMeta = {
    mid: string;
    name?: string;
    totals_by_group?: {
        bosniaks?: number;
        croats?: number;
        serbs?: number;
        others?: number;
    };
};

type Mun1990Names = {
    by_municipality_id?: Record<string, { mun1990_id: string; display_name: string }>;
};
type RenderProjection = {
    project: (x: number, y: number) => [number, number];
    dataFromCanvas: (canvasX: number, canvasY: number) => [number, number];
};

const MAP_PADDING = 28;

function escapeHtml(value: string): string {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
}

function normalizeMunKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const CONTROL_COLORS: Record<string, string> = {
    RBiH: 'rgba(62, 109, 72, 0.38)',
    RS: 'rgba(145, 67, 67, 0.36)',
    HRHB: 'rgba(75, 100, 145, 0.36)',
    null: 'rgba(120, 108, 92, 0.30)'
};

const DEMOGRAPHIC_COLORS: Record<string, string> = {
    bosniaks: 'rgba(75, 125, 90, 0.45)',
    serbs: 'rgba(150, 78, 78, 0.45)',
    croats: 'rgba(83, 108, 156, 0.45)',
    others: 'rgba(125, 115, 101, 0.42)',
    unknown: 'rgba(125, 115, 101, 0.42)'
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function formatTurnDate(turn: number): string {
    const start = new Date(1991, 8, 1);
    const d = new Date(start);
    d.setDate(d.getDate() + turn * 7);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export class Phase0PreparationMap {
    private container: HTMLDivElement;
    private mapArea: HTMLDivElement;
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private features: Map<string, MunicipalityFeature> = new Map();
    private municipalityIdByMun1990: Map<string, MunicipalityId> = new Map();
    private displayNameByMun1990: Map<string, string> = new Map();
    private municipalityMetaById: Map<string, MunicipalityMeta> = new Map();
    private boundaryFeatures: Map<string, MunicipalityBoundaryFeature> = new Map();
    private bounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;
    private gameState: GameState | null = null;
    private closeCallback: (() => void) | null = null;
    private playerFaction: FactionId = 'RBiH';
    private directiveState: Phase0DirectiveState = new Phase0DirectiveState();
    private selectedMunicipality: InvestmentPanelMunInfo | null = null;
    private onInvestmentChanged: (() => void) | null = null;
    private investmentPanel: InvestmentPanel | null = null;
    private hoverTooltip: HTMLDivElement;
    private layerStability = true;
    private layerOrgPen = true;
    private layerControl = false;
    private layerDemographics = false;
    private layerTargets = true;

    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'phase0-prep-map-root';
        this.container.setAttribute('aria-hidden', 'true');

        this.mapArea = document.createElement('div');
        this.mapArea.className = 'phase0-prep-map-area';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d')!;
        this.mapArea.appendChild(this.canvas);

        const turnDisplay = document.createElement('div');
        turnDisplay.className = 'phase0-prep-map-turn';
        this.mapArea.appendChild(turnDisplay);

        const title = document.createElement('div');
        title.className = 'phase0-prep-map-title';
        title.textContent = 'PHASE 0 PREPARATION MAP';
        this.mapArea.appendChild(title);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'phase0-prep-map-close';
        closeBtn.type = 'button';
        closeBtn.textContent = '×';
        closeBtn.setAttribute('aria-label', 'Close map');
        this.mapArea.appendChild(closeBtn);

        const returnBtn = document.createElement('button');
        returnBtn.className = 'phase0-prep-map-return';
        returnBtn.type = 'button';
        returnBtn.textContent = 'Return to Warroom';
        this.mapArea.appendChild(returnBtn);

        const layerPanel = document.createElement('div');
        layerPanel.className = 'phase0-prep-map-layer-panel';
        layerPanel.innerHTML = `
            <div class="phase0-prep-map-layer-title">Layers</div>
            <label class="phase0-prep-map-layer-row"><input type="checkbox" id="p0-layer-stability" checked> Stability heat map</label>
            <label class="phase0-prep-map-layer-row"><input type="checkbox" id="p0-layer-org" checked> Organizational penetration</label>
            <label class="phase0-prep-map-layer-row"><input type="checkbox" id="p0-layer-targets" checked> Investment targets</label>
            <label class="phase0-prep-map-layer-row"><input type="checkbox" id="p0-layer-control"> Political control context</label>
            <label class="phase0-prep-map-layer-row"><input type="checkbox" id="p0-layer-demographics"> Demographics (1991)</label>
        `;
        this.mapArea.appendChild(layerPanel);

        const legend = document.createElement('div');
        legend.className = 'phase0-prep-map-legend';
        legend.innerHTML = `
            <div class="phase0-prep-map-legend-row"><span class="phase0-prep-map-swatch" style="background:#4e8a5f"></span> Stable</div>
            <div class="phase0-prep-map-legend-row"><span class="phase0-prep-map-swatch" style="background:#b59455"></span> Contested</div>
            <div class="phase0-prep-map-legend-row"><span class="phase0-prep-map-swatch" style="background:#9f5f52"></span> Unstable</div>
            <div class="phase0-prep-map-legend-row"><span class="phase0-prep-map-target-marker"></span> Investable target</div>
        `;
        this.mapArea.appendChild(legend);

        this.hoverTooltip = document.createElement('div');
        this.hoverTooltip.className = 'phase0-prep-map-tooltip';
        this.hoverTooltip.style.display = 'none';
        this.mapArea.appendChild(this.hoverTooltip);

        this.container.appendChild(this.mapArea);

        const panelWrapper = document.createElement('div');
        panelWrapper.className = 'phase0-prep-map-investment-wrapper';
        this.investmentPanel = new InvestmentPanel({
            gameState: null,
            playerFaction: this.playerFaction,
            selectedMunicipality: null,
            directiveState: this.directiveState,
            onInvest: (munId: MunicipalityId, investmentType: InvestmentType, coordinated?: boolean) => {
                this.handleInvest(munId, investmentType, coordinated);
            },
            onUndoInvestment: (id: string) => this.handleUndoInvestment(id),
            onClose: () => this.setSelectedMunicipality(null)
        });
        panelWrapper.appendChild(this.investmentPanel.getElement());
        this.container.appendChild(panelWrapper);

        closeBtn.addEventListener('click', () => this.close());
        returnBtn.addEventListener('click', () => this.close());
        this.canvas.addEventListener('click', (e: MouseEvent) => this.onMapClick(e));
        this.canvas.addEventListener('mousemove', (e: MouseEvent) => this.onMapHover(e));
        this.canvas.addEventListener('mouseleave', () => this.hideHoverTooltip());

        this.bindLayerToggle('p0-layer-stability', (checked) => { this.layerStability = checked; this.render(); });
        this.bindLayerToggle('p0-layer-org', (checked) => { this.layerOrgPen = checked; this.render(); });
        this.bindLayerToggle('p0-layer-targets', (checked) => { this.layerTargets = checked; this.render(); });
        this.bindLayerToggle('p0-layer-control', (checked) => { this.layerControl = checked; this.render(); });
        this.bindLayerToggle('p0-layer-demographics', (checked) => { this.layerDemographics = checked; this.render(); });
    }

    private bindLayerToggle(id: string, onChange: (checked: boolean) => void): void {
        const cb = this.container.querySelector(`#${id}`) as HTMLInputElement | null;
        if (!cb) return;
        cb.addEventListener('change', () => onChange(cb.checked));
    }

    getContainer(): HTMLDivElement {
        return this.container;
    }

    setCloseCallback(cb: () => void): void {
        this.closeCallback = cb;
    }

    setOnInvestmentChanged(cb: () => void): void {
        this.onInvestmentChanged = cb;
    }

    setPlayerFaction(faction: FactionId): void {
        this.playerFaction = faction;
        this.investmentPanel?.updateProps({ playerFaction: faction });
    }

    setGameState(state: GameState | null): void {
        this.gameState = state;
        this.updateTurnDisplay();
        this.investmentPanel?.updateProps({ gameState: state, directiveState: this.directiveState });
        this.render();
    }

    getDirectiveState(): Phase0DirectiveState {
        return this.directiveState;
    }

    show(): void {
        this.container.classList.add('phase0-prep-map-visible');
        this.container.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(() => {
            this.resize();
            this.render();
        });
    }

    close(): void {
        this.container.classList.remove('phase0-prep-map-visible');
        this.container.setAttribute('aria-hidden', 'true');
        this.hideHoverTooltip();
        this.closeCallback?.();
    }

    async loadData(): Promise<void> {
        try {
            const [geoRes, boundaryRes, mun1990Res, metaRes] = await Promise.all([
                fetch('/data/derived/municipalities_mun1990_viewer_v1.geojson'),
                fetch('/data/derived/municipalities_1990_boundaries.geojson').catch(() => null),
                fetch('/data/derived/mun1990_names.json').catch(() => null),
                fetch('/data/derived/municipalities_meta.json').catch(() => null)
            ]);
            if (!geoRes.ok) throw new Error(`Failed to load municipality geometry: ${geoRes.status}`);
            const geojson = JSON.parse(await geoRes.text()) as { features?: MunicipalityFeature[] };
            const boundaries = boundaryRes?.ok
                ? (JSON.parse(await boundaryRes.text()) as { features?: MunicipalityBoundaryFeature[] })
                : { features: [] as MunicipalityBoundaryFeature[] };
            const mun1990Names = mun1990Res?.ok ? (await mun1990Res.json()) as Mun1990Names : {};
            const municipalitiesMeta = metaRes?.ok ? (await metaRes.json()) as MunicipalityMeta[] : [];

            this.features.clear();
            this.municipalityIdByMun1990.clear();
            this.displayNameByMun1990.clear();
            this.municipalityMetaById.clear();
            this.boundaryFeatures.clear();

            const displayNameByMun1990 = new Map<string, string>();
            const byMid = mun1990Names?.by_municipality_id ?? {};
            const mids = Object.keys(byMid).sort(strictCompare);
            for (const mid of mids) {
                const mun1990Id = byMid[mid]?.mun1990_id;
                if (!mun1990Id) continue;
                const displayName = byMid[mid]?.display_name;
                if (displayName && !displayNameByMun1990.has(mun1990Id)) {
                    displayNameByMun1990.set(mun1990Id, displayName);
                }
            }

            for (const m of municipalitiesMeta) {
                if (m.mid) this.municipalityMetaById.set(String(m.mid), m);
            }

            for (const feature of geojson.features ?? []) {
                const mun1990Id = feature.properties?.mun1990_id;
                if (!mun1990Id) continue;
                this.features.set(mun1990Id, feature);
                this.municipalityIdByMun1990.set(mun1990Id, mun1990Id as MunicipalityId);
                const displayName = feature.properties?.display_name ?? displayNameByMun1990.get(mun1990Id) ?? mun1990Id;
                this.displayNameByMun1990.set(mun1990Id, displayName);
            }

            const normalizedFeatureIds = new Map<string, string>();
            const featureIds = Array.from(this.features.keys()).sort(strictCompare);
            for (const mun1990Id of featureIds) {
                const normalized = normalizeMunKey(mun1990Id);
                if (!normalizedFeatureIds.has(normalized)) {
                    normalizedFeatureIds.set(normalized, mun1990Id);
                }
            }

            for (const feature of boundaries.features ?? []) {
                const rawBoundaryId = feature.properties?.mun1990_id;
                if (!rawBoundaryId) continue;
                let mun1990Id = rawBoundaryId;
                if (!this.features.has(mun1990Id)) {
                    const normalized = normalizeMunKey(rawBoundaryId);
                    const aliased = normalizedFeatureIds.get(normalized);
                    if (!aliased) continue;
                    mun1990Id = aliased;
                }
                this.boundaryFeatures.set(mun1990Id, feature);
                if (!this.municipalityIdByMun1990.has(mun1990Id)) {
                    this.municipalityIdByMun1990.set(mun1990Id, mun1990Id as MunicipalityId);
                }
                if (!this.displayNameByMun1990.has(mun1990Id)) {
                    this.displayNameByMun1990.set(
                        mun1990Id,
                        feature.properties?.mun1990_name ?? displayNameByMun1990.get(mun1990Id) ?? mun1990Id
                    );
                }
            }

            this.bounds = this.computeRenderBounds();
            this.updateTurnDisplay();
            this.render();
        } catch (error) {
            console.error('Phase0PreparationMap: load error', error);
        }
    }

    private resize(): void {
        const rect = this.mapArea.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        if (w <= 0 || h <= 0) return;
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = Math.floor(w * dpr);
        this.canvas.height = Math.floor(h * dpr);
        this.canvas.style.width = `${w}px`;
        this.canvas.style.height = `${h}px`;
    }

    private updateTurnDisplay(): void {
        const el = this.container.querySelector('.phase0-prep-map-turn') as HTMLElement | null;
        if (!el) return;
        const turn = this.gameState?.meta.turn ?? 0;
        el.textContent = `W${turn} - ${formatTurnDate(turn)}`;
    }

    private render(): void {
        const w = this.canvas.width;
        const h = this.canvas.height;
        this.ctx.clearRect(0, 0, w, h);
        this.ctx.fillStyle = '#e7dbc2';
        this.ctx.fillRect(0, 0, w, h);

        const featureIds = this.getRenderFeatureIds();
        if (!this.bounds || featureIds.length === 0) return;
        const projection = this.getProjection();
        if (!projection) return;
        const { project } = projection;

        const normalizedLookup = this.buildNormalizedMunicipalityLookup();
        for (const featureId of featureIds) {
            const munId = this.resolveStateMunicipalityId(featureId, normalizedLookup);
            const fill = this.getFillColor(featureId, munId);
            this.ctx.fillStyle = fill;
            if (!this.drawMunicipalityAreaPath(featureId, project)) continue;
            this.ctx.fill();

            if (this.layerOrgPen && munId) {
                const op = this.gameState?.municipalities?.[munId]?.organizational_penetration;
                const intensity = this.getOrgIntensity(op);
                if (intensity > 0) {
                    this.ctx.save();
                    this.ctx.fillStyle = `rgba(40, 95, 60, ${Math.min(0.35, 0.08 + intensity / 420)})`;
                    if (this.drawMunicipalityAreaPath(featureId, project)) this.ctx.fill();
                    this.ctx.restore();
                }
            }

            if (this.layerTargets && munId && this.isInvestmentTarget(munId)) {
                this.ctx.save();
                this.ctx.fillStyle = 'rgba(230, 188, 96, 0.16)';
                if (this.drawMunicipalityAreaPath(featureId, project)) this.ctx.fill();
                this.ctx.restore();
            }
        }

        this.drawMunicipalityBorders(project);

        if (this.selectedMunicipality) {
            this.drawSelectedMunicipalityOutline(this.selectedMunicipality.munId, project);
        }
    }

    private getFillColor(featureId: string, munId: MunicipalityId | null): string {
        if (this.layerDemographics) {
            return DEMOGRAPHIC_COLORS[this.getMajorityGroup(munId)] ?? DEMOGRAPHIC_COLORS.unknown;
        }
        if (this.layerControl && munId) {
            const controller = this.getMunicipalityController(munId) ?? 'null';
            return CONTROL_COLORS[controller] ?? CONTROL_COLORS.null;
        }
        if (this.layerStability && munId) {
            const stability = this.gameState?.municipalities?.[munId]?.stability_score ?? 50;
            return this.stabilityColor(stability);
        }
        return this.municipalityIdByMun1990.has(featureId) ? 'rgba(208, 191, 162, 0.86)' : 'rgba(185, 172, 148, 0.70)';
    }

    private stabilityColor(stability: number): string {
        if (stability >= 80) return 'rgba(85, 135, 88, 0.58)';
        if (stability >= 60) return 'rgba(124, 149, 95, 0.52)';
        if (stability >= 40) return 'rgba(176, 145, 87, 0.52)';
        return 'rgba(163, 96, 81, 0.54)';
    }

    private getMajorityGroup(munId: MunicipalityId | null): string {
        if (!munId) return 'unknown';
        const meta = this.municipalityMetaById.get(String(munId));
        const totals = meta?.totals_by_group;
        if (!totals) return 'unknown';
        const ranked = [
            { group: 'bosniaks', value: totals.bosniaks ?? 0 },
            { group: 'serbs', value: totals.serbs ?? 0 },
            { group: 'croats', value: totals.croats ?? 0 },
            { group: 'others', value: totals.others ?? 0 }
        ].sort((a, b) => (b.value - a.value) || strictCompare(a.group, b.group));
        return (ranked[0]?.value ?? 0) > 0 ? ranked[0].group : 'unknown';
    }

    private getOrgIntensity(op: OrganizationalPenetration | undefined): number {
        if (!op) return 0;
        if (this.playerFaction === 'RBiH') {
            return (op.sda_penetration ?? 0) + (op.patriotska_liga ?? 0) + (op.to_control === 'controlled' ? 30 : 0);
        }
        if (this.playerFaction === 'RS') {
            return (op.sds_penetration ?? 0) + (op.paramilitary_rs ?? 0);
        }
        return (op.hdz_penetration ?? 0) + (op.paramilitary_hrhb ?? 0);
    }

    private isInvestmentTarget(munId: MunicipalityId): boolean {
        if (!this.gameState || this.gameState.meta.phase !== 'phase_0') return false;
        const investTypes = getInvestmentTypesForFaction(this.playerFaction);
        for (const inv of investTypes) {
            const validation = this.directiveState.validate(this.gameState, this.playerFaction, inv, [munId]);
            if (validation.valid) return true;
        }
        return false;
    }

    private buildNormalizedMunicipalityLookup(): Map<string, MunicipalityId> {
        const out = new Map<string, MunicipalityId>();
        const municipalityIds = Object.keys(this.gameState?.municipalities ?? {}).sort(strictCompare);
        for (const municipalityId of municipalityIds) {
            const normalized = normalizeMunKey(municipalityId);
            if (!out.has(normalized)) {
                out.set(normalized, municipalityId as MunicipalityId);
            }
        }
        return out;
    }

    private resolveStateMunicipalityId(
        featureId: string,
        normalizedLookup?: Map<string, MunicipalityId>
    ): MunicipalityId | null {
        const mapped = this.municipalityIdByMun1990.get(featureId) ?? (featureId as MunicipalityId);
        if (!this.gameState?.municipalities) {
            return mapped;
        }
        if (this.gameState.municipalities[mapped]) {
            return mapped;
        }
        const normalized = normalizedLookup ?? this.buildNormalizedMunicipalityLookup();
        const byFeature = normalized.get(normalizeMunKey(featureId));
        if (byFeature) return byFeature;
        const byMapped = normalized.get(normalizeMunKey(String(mapped)));
        if (byMapped) return byMapped;
        return null;
    }

    private getMunicipalityController(munId: MunicipalityId | null): FactionId | null {
        if (!munId || !this.gameState) return null;
        const direct = this.gameState.political_controllers?.[munId];
        if (direct === 'RBiH' || direct === 'RS' || direct === 'HRHB') {
            return direct;
        }
        const op = this.gameState.municipalities?.[munId]?.organizational_penetration;
        if (!op) return null;
        const scores: Record<FactionId, number> = {
            RBiH: op.sda_penetration ?? 0,
            RS: op.sds_penetration ?? 0,
            HRHB: op.hdz_penetration ?? 0
        };
        let bestFaction: FactionId | null = null;
        let bestScore = 0;
        const factions: FactionId[] = ['RBiH', 'RS', 'HRHB'];
        for (const faction of factions) {
            const score = scores[faction];
            if (score > bestScore) {
                bestScore = score;
                bestFaction = faction;
            }
        }
        return bestScore > 0 ? bestFaction : null;
    }

    private drawPolygonPath(feature: MunicipalityFeature, project: (x: number, y: number) => [number, number]): void {
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        this.ctx.beginPath();
        for (const poly of polys) {
            for (const ring of poly) {
                for (let i = 0; i < ring.length; i++) {
                    const [sx, sy] = project(ring[i][0], ring[i][1]);
                    if (i === 0) this.ctx.moveTo(sx, sy);
                    else this.ctx.lineTo(sx, sy);
                }
            }
        }
        this.ctx.closePath();
    }

    private drawMunicipalityAreaPath(featureId: string, project: (x: number, y: number) => [number, number]): boolean {
        const boundary = this.boundaryFeatures.get(featureId);
        if (boundary) {
            this.drawBoundaryPath(boundary, project, true);
            return true;
        }
        const feature = this.features.get(featureId);
        if (!feature) return false;
        this.drawPolygonPath(feature, project);
        return true;
    }

    private drawMunicipalityBorderPath(featureId: string, project: (x: number, y: number) => [number, number]): boolean {
        const boundary = this.boundaryFeatures.get(featureId);
        if (boundary) {
            this.drawBoundaryPath(boundary, project, false);
            return true;
        }
        const feature = this.features.get(featureId);
        if (!feature) return false;
        this.drawPolygonPath(feature, project);
        return true;
    }

    private drawMunicipalityBorders(project: (x: number, y: number) => [number, number]): void {
        const featureIds = this.getRenderFeatureIds();
        if (featureIds.length === 0) return;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(55, 45, 35, 0.42)';
        this.ctx.lineWidth = 1.1;
        for (const mun1990Id of featureIds) {
            if (!this.drawMunicipalityBorderPath(mun1990Id, project)) continue;
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    private drawSelectedMunicipalityOutline(
        munId: MunicipalityId,
        project: (x: number, y: number) => [number, number]
    ): void {
        const targetNormalized = normalizeMunKey(String(munId));
        const mun1990Ids = Array.from(this.municipalityIdByMun1990.entries())
            .filter(([mun1990Id, mapped]) => {
                if (mapped === munId) return true;
                if (normalizeMunKey(String(mapped)) === targetNormalized) return true;
                return normalizeMunKey(mun1990Id) === targetNormalized;
            })
            .map(([mun1990Id]) => mun1990Id)
            .sort(strictCompare);
        if (mun1990Ids.length === 0) return;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(25, 25, 25, 0.95)';
        this.ctx.lineWidth = 2.4;
        for (const mun1990Id of mun1990Ids) {
            if (!this.drawMunicipalityBorderPath(mun1990Id, project)) continue;
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    private drawBoundaryPath(
        feature: MunicipalityBoundaryFeature,
        project: (x: number, y: number) => [number, number],
        closeLoops: boolean
    ): void {
        const lines: MultiLineCoords = feature.geometry.type === 'LineString'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        this.ctx.beginPath();
        for (const line of lines) {
            for (let i = 0; i < line.length; i++) {
                const [sx, sy] = project(line[i][0], line[i][1]);
                if (i === 0) this.ctx.moveTo(sx, sy);
                else this.ctx.lineTo(sx, sy);
            }
            if (closeLoops && line.length > 2) {
                this.ctx.closePath();
            }
        }
    }

    private getRenderFeatureIds(): string[] {
        const ids = new Set<string>();
        for (const id of this.features.keys()) ids.add(id);
        for (const id of this.boundaryFeatures.keys()) ids.add(id);
        return Array.from(ids).sort(strictCompare);
    }

    private computeRenderBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
        if (this.boundaryFeatures.size > 0) {
            const boundaryBounds = this.computeBoundaryBounds(this.boundaryFeatures);
            if (boundaryBounds) return boundaryBounds;
        }
        return this.computeBounds(this.features);
    }

    private computeBounds(features: Map<string, MunicipalityFeature>): { minX: number; minY: number; maxX: number; maxY: number } | null {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const feature of features.values()) {
            const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
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
        }
        if (!isFinite(minX)) return null;
        return { minX, minY, maxX, maxY };
    }

    private computeBoundaryBounds(
        boundaries: Map<string, MunicipalityBoundaryFeature>
    ): { minX: number; minY: number; maxX: number; maxY: number } | null {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const feature of boundaries.values()) {
            const lines: MultiLineCoords = feature.geometry.type === 'LineString'
                ? [feature.geometry.coordinates]
                : feature.geometry.coordinates;
            for (const line of lines) {
                for (const pos of line) {
                    minX = Math.min(minX, pos[0]);
                    minY = Math.min(minY, pos[1]);
                    maxX = Math.max(maxX, pos[0]);
                    maxY = Math.max(maxY, pos[1]);
                }
            }
        }
        if (!isFinite(minX)) return null;
        return { minX, minY, maxX, maxY };
    }

    private onMapClick(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const featureId = this.getFeatureIdAtPoint(x, y);
        if (!featureId) {
            this.setSelectedMunicipality(null);
            return;
        }
        const munId = this.resolveStateMunicipalityId(featureId);
        if (!munId) return;
        this.selectMunicipality(munId, this.displayNameByMun1990.get(featureId) ?? String(munId));
    }

    private getFeatureIdAtPoint(canvasX: number, canvasY: number): string | null {
        const projection = this.getProjection();
        if (!projection) return null;
        const [dataX, dataY] = projection.dataFromCanvas(canvasX, canvasY);
        const featureIds = this.getRenderFeatureIds();
        for (const featureId of featureIds) {
            if (this.pointInFeature(dataX, dataY, featureId)) return featureId;
        }
        return null;
    }

    private pointInFeature(px: number, py: number, featureId: string): boolean {
        const boundary = this.boundaryFeatures.get(featureId);
        if (boundary && this.pointInBoundaryFeature(px, py, boundary)) return true;
        const polygon = this.features.get(featureId);
        if (polygon && this.pointInPolygon(px, py, polygon)) return true;
        return false;
    }

    private pointInBoundaryFeature(px: number, py: number, feature: MunicipalityBoundaryFeature): boolean {
        const lines: MultiLineCoords = feature.geometry.type === 'LineString'
            ? [feature.geometry.coordinates]
            : feature.geometry.coordinates;
        for (const line of lines) {
            if (this.pointInRing(px, py, line)) return true;
        }
        return false;
    }

    private pointInPolygon(px: number, py: number, feature: MunicipalityFeature): boolean {
        const polys: PolygonCoords[] = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
        for (const poly of polys) {
            const ring = poly[0];
            if (this.pointInRing(px, py, ring)) return true;
        }
        return false;
    }

    private pointInRing(px: number, py: number, ring: Position[] | undefined): boolean {
        if (!ring || ring.length < 3) return false;
        let inside = false;
        const n = ring.length;
        for (let i = 0, j = n - 1; i < n; j = i++) {
            const xi = ring[i][0], yi = ring[i][1];
            const xj = ring[j][0], yj = ring[j][1];
            if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi) / (yj - yi)) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private getProjection(): RenderProjection | null {
        if (!this.bounds) return null;
        const { minX, minY, maxX, maxY } = this.bounds;
        const w = this.canvas.width;
        const h = this.canvas.height;
        if (w <= 0 || h <= 0) return null;
        const spanX = maxX - minX;
        const spanY = maxY - minY;
        if (spanX <= 0 || spanY <= 0) return null;
        const scale = Math.min((w - MAP_PADDING * 2) / spanX, (h - MAP_PADDING * 2) / spanY);
        if (!isFinite(scale) || scale <= 0) return null;
        const offsetX = (w - spanX * scale) / 2;
        const offsetY = (h - spanY * scale) / 2;
        return {
            project: (x: number, y: number): [number, number] => [
                (x - minX) * scale + offsetX,
                (y - minY) * scale + offsetY
            ],
            dataFromCanvas: (canvasX: number, canvasY: number): [number, number] => [
                (canvasX - offsetX) / scale + minX,
                (canvasY - offsetY) / scale + minY
            ]
        };
    }

    private onMapHover(e: MouseEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        const featureId = this.getFeatureIdAtPoint(x, y);
        if (!featureId) {
            this.hideHoverTooltip();
            return;
        }
        const munId = this.resolveStateMunicipalityId(featureId);
        const munName = this.displayNameByMun1990.get(featureId) ?? (munId ? String(munId) : featureId);
        const mun = munId ? this.gameState?.municipalities?.[munId] : undefined;
        const controller = this.getMunicipalityController(munId);
        const stability = mun?.stability_score ?? 50;
        const controlStatus = mun?.control_status ?? 'NEUTRAL';
        const majority = this.getMajorityGroup(munId);
        const majorityLabel = majority === 'unknown' ? null : majority.charAt(0).toUpperCase() + majority.slice(1);
        this.showHoverTooltip(
            e.clientX,
            e.clientY,
            munName,
            controller ?? 'Neutral',
            stability,
            controlStatus,
            majorityLabel
        );
    }

    private showHoverTooltip(
        clientX: number,
        clientY: number,
        munName: string,
        controller: string,
        stability: number,
        controlStatus: string,
        majority: string | null
    ): void {
        const details = [`${escapeHtml(controller)}`, `Stability ${stability}`, `${escapeHtml(controlStatus)}`];
        this.hoverTooltip.innerHTML = `
            <div class="phase0-prep-map-tooltip-title">${escapeHtml(munName)}</div>
            <div class="phase0-prep-map-tooltip-body">${details.join(' \u2022 ')}</div>
            ${majority ? `<div class="phase0-prep-map-tooltip-body">Majority: ${escapeHtml(majority)}</div>` : ''}
        `;
        this.hoverTooltip.style.display = 'block';

        const areaRect = this.mapArea.getBoundingClientRect();
        const localX = clientX - areaRect.left;
        const localY = clientY - areaRect.top;
        const pad = 12;
        const maxX = Math.max(pad, areaRect.width - this.hoverTooltip.offsetWidth - pad);
        const maxY = Math.max(pad, areaRect.height - this.hoverTooltip.offsetHeight - pad);
        const left = Math.min(maxX, Math.max(pad, localX + 14));
        const top = Math.min(maxY, Math.max(pad, localY + 14));
        this.hoverTooltip.style.left = `${left}px`;
        this.hoverTooltip.style.top = `${top}px`;
    }

    private hideHoverTooltip(): void {
        this.hoverTooltip.style.display = 'none';
    }

    private selectMunicipality(munId: MunicipalityId, munName: string): void {
        const mun = this.gameState?.municipalities?.[munId];
        const op: OrganizationalPenetration = mun?.organizational_penetration ?? {};
        const majority = this.getMajorityGroup(munId);
        const majorityLabel = majority === 'unknown' ? null : majority.charAt(0).toUpperCase() + majority.slice(1);
        this.setSelectedMunicipality({
            munId,
            munName,
            controller: this.getMunicipalityController(munId),
            stabilityScore: mun?.stability_score ?? 50,
            controlStatus: mun?.control_status ?? 'NEUTRAL',
            orgPen: op,
            majorityEthnicity: majorityLabel
        });
    }

    private setSelectedMunicipality(info: InvestmentPanelMunInfo | null): void {
        this.selectedMunicipality = info;
        this.investmentPanel?.updateProps({ selectedMunicipality: info });
        this.render();
    }

    private handleInvest(munId: MunicipalityId, investmentType: InvestmentType, coordinated?: boolean): void {
        if (!this.gameState) return;
        const staged = this.directiveState.stage(this.gameState, this.playerFaction, investmentType, [munId], {
            coordinated
        });
        if (!staged) return;
        this.investmentPanel?.updateProps({
            gameState: this.gameState,
            directiveState: this.directiveState,
            selectedMunicipality: this.selectedMunicipality
        });
        this.render();
        this.onInvestmentChanged?.();
    }

    private handleUndoInvestment(id: string): void {
        this.directiveState.unstage(id);
        this.investmentPanel?.updateProps({
            gameState: this.gameState,
            directiveState: this.directiveState,
            selectedMunicipality: this.selectedMunicipality
        });
        this.render();
        this.onInvestmentChanged?.();
    }
}

