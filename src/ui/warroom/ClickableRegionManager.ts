export type RegionBounds = { x: number; y: number; width: number; height: number };

export type Region = {
    id: string;
    type: 'baked_prop' | 'sprite_overlay' | 'dynamic_render';
    bounds: RegionBounds;
    polygon?: [number, number][];
    action: string;
    hover_style: 'red_outline' | 'magnifying_glass_cursor' | 'glow' | 'none';
    cursor: string;
    tooltip?: string;
    disabled?: boolean;
    layer: 'wall' | 'desk';
};

export type RegionsMap = {
    schema_version: string;
    image_dimensions: { width: number; height: number };
    regions: Region[];
};

export type HoverRegion = {
    region: Region;
    bounds: RegionBounds;
    scaledPolygon?: [number, number][];
};

import { buildGraphFromJSON, type LoadedSettlementGraph } from '../../map/settlements_parse.js';
import { runPhaseITurn } from '../../sim/run_phase_i_browser.js';
import { runPhaseIITurn } from '../../sim/run_phase_ii_browser.js';
import type { FactionId, Phase0Event } from '../../state/game_state.js';
import { GameState } from '../../state/game_state.js';
import { deserializeState } from '../../state/serialize.js';
import { checkWarTransition, findCriticalEvent, showDeclarationModal, showWarBeginsModal } from './components/DeclarationEventModal.js';
import { FactionOverviewPanel } from './components/FactionOverviewPanel.js';
import { MagazineModal } from './components/MagazineModal.js';
import { ModalManager } from './components/ModalManager.js';
import { NewspaperModal } from './components/NewspaperModal.js';
import { NewsTicker } from './components/NewsTicker.js';
import { Phase0DirectiveState, type StagedInvestment } from './components/Phase0DirectiveState.js';
import { Phase0PreparationMap } from './components/Phase0PreparationMap.js';
import { ReportsModal } from './components/ReportsModal.js';
import { TacticalMap } from './components/TacticalMap.js';
import { WarPlanningMap } from './components/WarPlanningMap.js';
import { runPhase0TurnAndAdvance } from './run_phase0_turn.js';

type DesktopBridge = {
    advanceTurn?: (payload?: { phase0Directives?: StagedInvestment[] }) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
    openTacticalMapWindow?: () => Promise<unknown>;
};

export class ClickableRegionManager {
    private regionsMap: RegionsMap | null = null;
    private hoveredRegion: HoverRegion | null = null;
    private scaleX = 1;
    private scaleY = 1;
    private modalManager: ModalManager | null = null;
    private tacticalMap: TacticalMap | null = null;
    private warPlanningMap: WarPlanningMap | null = null;
    private phase0PreparationMap: Phase0PreparationMap | null = null;
    private mapSceneOpenHandler: (() => void) | null = null;
    private tacticalMapOpenHandler: (() => void) | null = null;
    private newsTicker: NewsTicker = new NewsTicker();
    private onGameStateChange: ((newState: GameState) => void) | null = null;
    private settlementGraphCache: LoadedSettlementGraph | null = null;
    /** Phase 0 directive staging for player investments. */
    public phase0Directives: Phase0DirectiveState = new Phase0DirectiveState();
    /** Player's chosen faction (first in array by default). */
    private playerFaction: FactionId | undefined = undefined;

    async loadRegions(jsonPath: string): Promise<void> {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load regions map: ${jsonPath}`);
        }
        this.regionsMap = await response.json();
    }

    setModalManager(modalManager: ModalManager): void {
        this.modalManager = modalManager;
    }

    setTacticalMap(map: TacticalMap): void {
        this.tacticalMap = map;
    }

    setWarPlanningMap(map: WarPlanningMap): void {
        this.warPlanningMap = map;
    }

    setPhase0PreparationMap(map: Phase0PreparationMap): void {
        this.phase0PreparationMap = map;
        this.phase0Directives = map.getDirectiveState();
    }

    /** Called by warroom to provide scene transition. Open map = handler then show(). */
    setMapSceneOpenHandler(handler: () => void): void {
        this.mapSceneOpenHandler = handler;
    }

    /** Called by warroom to provide tactical map scene transition (embedded iframe). */
    setTacticalMapOpenHandler(handler: () => void): void {
        this.tacticalMapOpenHandler = handler;
    }

    setOnGameStateChange(callback: (newState: GameState) => void): void {
        this.onGameStateChange = callback;
    }

    setCanvasScale(canvasWidth: number, canvasHeight: number): void {
        if (!this.regionsMap) return;
        const { width, height } = this.regionsMap.image_dimensions;
        this.scaleX = canvasWidth / width;
        this.scaleY = canvasHeight / height;
    }

    getHoveredRegion(): HoverRegion | null {
        return this.hoveredRegion;
    }

    getScaledRegionById(id: string): HoverRegion | null {
        if (!this.regionsMap) return null;
        const region = this.regionsMap.regions.find((entry) => entry.id === id);
        if (!region) return null;
        const { bounds, scaledPolygon } = this.getScaledRegion(region);
        return { region, bounds, scaledPolygon };
    }

    onMouseMove(
        canvasX: number,
        canvasY: number,
        clientX: number,
        clientY: number,
        canvas: HTMLCanvasElement
    ): void {
        const match = this.getRegionAtPoint(canvasX, canvasY);
        const nextRegionId = match?.region.id ?? null;
        const prevRegionId = this.hoveredRegion?.region.id ?? null;

        if (nextRegionId !== prevRegionId) {
            this.hoveredRegion = match;
            if (match) {
                canvas.style.cursor = match.region.cursor;
            } else {
                canvas.style.cursor = 'default';
            }
        }

        if (match?.region.tooltip && this.modalManager) {
            this.modalManager.showTooltip(match.region.tooltip, clientX, clientY);
        } else if (this.modalManager) {
            this.modalManager.hideTooltip();
        }
    }

    onClick(canvasX: number, canvasY: number, gameState: unknown): void {
        const match = this.getRegionAtPoint(canvasX, canvasY);
        if (match && !match.region.disabled) {
            this.executeAction(match.region.action, gameState);
        }
    }

    private getRegionAtPoint(x: number, y: number): HoverRegion | null {
        if (!this.regionsMap) return null;
        for (const region of this.regionsMap.regions) {
            if (region.disabled) continue;
            const { bounds, scaledPolygon } = this.getScaledRegion(region);
            if (this.isPointInside(x, y, bounds, scaledPolygon)) {
                return { region, bounds, scaledPolygon };
            }
        }
        return null;
    }

    private getScaledRegion(region: Region): { bounds: RegionBounds; scaledPolygon?: [number, number][] } {
        const bounds = {
            x: region.bounds.x * this.scaleX,
            y: region.bounds.y * this.scaleY,
            width: region.bounds.width * this.scaleX,
            height: region.bounds.height * this.scaleY
        };
        const scaledPolygon = region.polygon?.map(
            ([px, py]) => [px * this.scaleX, py * this.scaleY] as [number, number]
        );
        return { bounds, scaledPolygon };
    }

    /** @deprecated Use getScaledRegion instead. Kept for backward compatibility. */
    private getScaledBounds(region: Region): RegionBounds {
        return this.getScaledRegion(region).bounds;
    }

    private isPointInside(x: number, y: number, bounds: RegionBounds, scaledPolygon?: [number, number][]): boolean {
        // AABB pre-check (fast rejection)
        if (x < bounds.x || x > bounds.x + bounds.width ||
            y < bounds.y || y > bounds.y + bounds.height) {
            return false;
        }
        // Polygon check if available
        if (scaledPolygon && scaledPolygon.length >= 3) {
            return this.pointInPolygon(x, y, scaledPolygon);
        }
        return true; // AABB only
    }

    private pointInPolygon(x: number, y: number, polygon: [number, number][]): boolean {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i];
            const [xj, yj] = polygon[j];
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    }

    private executeAction(action: string, gameState: unknown): void {
        switch (action) {
            case 'open_faction_overview':
                this.openFactionOverview(gameState);
                break;
            case 'map_zoom_in':
                this.openPrimaryMap(gameState);
                break;
            case 'advance_turn':
                this.advanceTurn(gameState);
                break;
            case 'open_newspaper_modal':
                this.openNewspaperModal(gameState);
                break;
            case 'open_magazine_modal':
                this.openMagazineModal(gameState);
                break;
            case 'open_reports_modal':
                this.openReportsModal(gameState);
                break;
            case 'toggle_news_ticker':
            case 'transistor_radio':
                this.toggleNewsTicker(gameState);
                break;
            case 'open_diplomacy':
                this.openDiplomacy(gameState);
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    private openFactionOverview(gameState: unknown): void {
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const panel = new FactionOverviewPanel(gameState as GameState);
        this.modalManager.showModal(panel.render());
    }

    private openTacticalMap(_gameState: unknown): void {
        // Use embedded tactical map scene if a handler is registered (warroom iframe approach)
        if (this.tacticalMapOpenHandler) {
            this.tacticalMapOpenHandler();
            return;
        }
        // Fallback: open in separate window or browser tab
        const bridge = this.getDesktopBridge() as Record<string, unknown> | null;
        if (bridge && typeof bridge.openTacticalMapWindow === 'function') {
            (bridge.openTacticalMapWindow as () => Promise<unknown>)();
        } else {
            window.open('http://localhost:3001', '_blank');
        }
    }

    private openPrimaryMap(gameState: unknown): void {
        const state = gameState as GameState;
        if (state?.meta?.phase === 'phase_0') {
            this.openPhase0PreparationMap();
            return;
        }
        this.openTacticalMap(gameState);
    }

    private openWarPlanningMap(): void {
        if (!this.warPlanningMap) {
            console.warn('WarPlanningMap not set');
            return;
        }
        this.mapSceneOpenHandler?.();
        this.warPlanningMap.show();
    }

    private openPhase0PreparationMap(): void {
        if (!this.phase0PreparationMap) {
            console.warn('Phase0PreparationMap not set');
            return;
        }
        this.mapSceneOpenHandler?.();
        this.phase0PreparationMap.show();
    }

    private async loadSettlementGraphIfNeeded(): Promise<LoadedSettlementGraph> {
        if (this.settlementGraphCache) return this.settlementGraphCache;
        const [edgesRes, settlementsRes] = await Promise.all([
            fetch('/data/derived/settlement_edges.json'),
            fetch('/data/source/settlements_initial_master.json')
        ]);
        if (!edgesRes.ok) throw new Error('Failed to load settlement_edges.json');
        if (!settlementsRes.ok) throw new Error('Failed to load settlements_initial_master.json');
        const edgesJson = await edgesRes.json();
        const settlementsJson = await settlementsRes.json();
        this.settlementGraphCache = buildGraphFromJSON(settlementsJson, edgesJson);
        return this.settlementGraphCache;
    }

    private advanceTurn(gameState: unknown): void {
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const state = gameState as GameState;
        const currentTurn = state.meta.turn;
        const nextTurn = currentTurn + 1;
        const stagedCount = state.meta.phase === 'phase_0' ? this.phase0Directives.getStagedCount() : 0;
        const stagedCost = state.meta.phase === 'phase_0' ? this.phase0Directives.getTotalStagedCost() : 0;

        // Create confirmation dialog using ops-center theme
        const dialog = document.createElement('div');
        dialog.className = 'wr-dialog';

        const stagedInfo = stagedCount > 0
            ? `<div class="wr-dialog-info wr-info-green">Staged investments: <strong>${stagedCount}</strong> (cost: ${stagedCost})</div>`
            : state.meta.phase === 'phase_0'
                ? `<div class="wr-dialog-info wr-info-amber">No investments staged this turn. Allocate capital before advancing.</div>`
                : '';

        dialog.innerHTML = `
            <h2>ADVANCE TURN?</h2>
            <div class="wr-dialog-body">
                <div class="wr-dialog-row"><span class="wr-label">Current</span><span class="wr-value">Turn ${currentTurn}</span></div>
                <div class="wr-dialog-row"><span class="wr-label">Next</span><span class="wr-value">Turn ${nextTurn}</span></div>
                ${stagedInfo}
            </div>
            <div class="wr-dialog-actions">
                ${state.meta.phase === 'phase_0' ? '<button id="open-invest-map-btn" class="wr-btn wr-btn-secondary">Open Investment Map</button>' : ''}
                <button id="cancel-turn-btn" class="wr-btn wr-btn-secondary">Cancel</button>
                <button id="advance-turn-btn" class="wr-btn wr-btn-primary">Advance Turn</button>
            </div>
        `;

        // Show dialog
        this.modalManager.showModal(dialog);

        // Add button event listeners
        const cancelBtn = document.getElementById('cancel-turn-btn');
        const advanceBtn = document.getElementById('advance-turn-btn');

        if (cancelBtn) {
            cancelBtn.onclick = () => {
                this.modalManager?.hideModal();
            };
        }
        const openInvestMapBtn = document.getElementById('open-invest-map-btn');
        if (openInvestMapBtn) {
            openInvestMapBtn.onclick = () => {
                this.modalManager?.hideModal();
                this.openPhase0PreparationMap();
            };
        }

        if (advanceBtn) {
            advanceBtn.onclick = async () => {
                const prevPhase = state.meta.phase;
                const bridge = this.getDesktopBridge();
                this.playerFaction = (state.meta.player_faction ?? this.playerFaction ?? state.factions[0]?.id) as FactionId | undefined;

                if (bridge?.advanceTurn) {
                    const phase0Directives = state.meta.phase === 'phase_0'
                        ? this.phase0Directives.getStagedInvestments()
                        : [];
                    try {
                        const result = await bridge.advanceTurn(
                            phase0Directives.length > 0 ? { phase0Directives: [...phase0Directives] } : undefined
                        );
                        this.modalManager?.hideModal();
                        if (!result?.ok || !result.stateJson) {
                            console.error('Desktop advance-turn failed:', result?.error ?? 'No state returned');
                            return;
                        }

                        const newState = deserializeState(result.stateJson);
                        this.playerFaction = (newState.meta.player_faction ?? this.playerFaction ?? newState.factions[0]?.id) as FactionId | undefined;
                        const pf = this.playerFaction ?? 'RBiH';

                        const lastEvents: Phase0Event[] = newState.phase0_events_log?.[newState.phase0_events_log.length - 1] ?? [];
                        const criticalEvent = findCriticalEvent(lastEvents);
                        if (criticalEvent) {
                            await showDeclarationModal(criticalEvent, pf);
                        }

                        if (checkWarTransition(prevPhase, newState.meta.phase)) {
                            await showWarBeginsModal(pf);
                        }

                        if (phase0Directives.length > 0) {
                            this.phase0Directives.clear();
                        }
                        this.onGameStateChange?.(newState);
                    } catch (e) {
                        this.modalManager?.hideModal();
                        console.error('Desktop advance-turn exception', e);
                    }
                    return;
                }

                if (state.meta.phase === 'phase_0') {
                    // Apply staged investments before running the turn
                    const working = { ...state };
                    this.phase0Directives.applyAll(working);

                    // Determine player faction
                    const pf = this.playerFaction ?? (state.factions[0]?.id as FactionId | undefined);

                    const newState = runPhase0TurnAndAdvance(working, state.meta.seed ?? 'start_1991_09', pf);
                    this.modalManager?.hideModal();

                    // Check for critical Phase 0 events (declarations, referendum)
                    const lastEvents: Phase0Event[] = newState.phase0_events_log?.[newState.phase0_events_log.length - 1] ?? [];
                    const criticalEvent = findCriticalEvent(lastEvents);
                    if (criticalEvent) {
                        await showDeclarationModal(criticalEvent, pf ?? 'RBiH');
                    }

                    // Check for Phase 0 → Phase I transition (war begins)
                    if (checkWarTransition(prevPhase, newState.meta.phase)) {
                        await showWarBeginsModal(pf ?? 'RBiH');
                    }

                    this.onGameStateChange?.(newState);
                } else if (state.meta.phase === 'phase_i') {
                    try {
                        const graph = await this.loadSettlementGraphIfNeeded();
                        const seed = state.meta.seed ?? 'start_1991_09';
                        const { nextState } = await runPhaseITurn(state, { seed, settlementGraph: graph });
                        this.onGameStateChange?.(nextState);
                    } catch (e) {
                        console.error('Phase I advance failed', e);
                    }
                    this.modalManager?.hideModal();
                } else {
                    // Phase II: browser-safe advance (turn + AoR init when empty).
                    try {
                        const graph = await this.loadSettlementGraphIfNeeded();
                        const seed = state.meta.seed ?? 'start_1991_09';
                        const { nextState } = runPhaseIITurn(state, { seed, settlementGraph: graph });
                        this.onGameStateChange?.(nextState);
                    } catch (e) {
                        console.error('Phase II advance failed', e);
                    }
                    this.modalManager?.hideModal();
                }
            };
        }
    }

    private openNewspaperModal(gameState: unknown): void {
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const newspaper = new NewspaperModal(gameState as GameState);
        this.modalManager.showModal(newspaper.render());
    }

    private openMagazineModal(gameState: unknown): void {
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const magazine = new MagazineModal(gameState as GameState);
        this.modalManager.showModal(magazine.render());
    }

    private openReportsModal(gameState: unknown): void {
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const reports = new ReportsModal(gameState as GameState);
        this.modalManager.showModal(reports.render());
    }

    private toggleNewsTicker(gameState: unknown): void {
        this.newsTicker.toggle(gameState as GameState);
    }

    private openDiplomacy(gameState: unknown): void {
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const state = gameState as GameState;
        const phase = state.meta.phase;

        // Diplomacy is only available once the war has started
        if (phase === 'phase_0') {
            const notice = document.createElement('div');
            notice.className = 'wr-dialog';
            notice.innerHTML = `
                <h3>Line Dead</h3>
                <div class="wr-dialog-notice">The diplomatic channel is not yet active. War must begin before negotiations can start.</div>
            `;
            this.modalManager.showModal(notice);
            return;
        }

        // TODO: Replace with full DiplomacyModal once negotiation UI is built
        const placeholder = document.createElement('div');
        placeholder.className = 'wr-dialog';

        const negotiation = state.negotiation_status;
        const ceasefireActive = negotiation?.ceasefire_active ? 'Yes' : 'No';

        placeholder.innerHTML = `
            <h2>DIPLOMACY</h2>
            <div class="wr-dialog-body">
                <div class="wr-dialog-row"><span class="wr-label">Ceasefire active</span><span class="wr-value">${ceasefireActive}</span></div>
            </div>
            <div class="wr-dialog-notice">Full negotiation interface coming soon.</div>
        `;
        this.modalManager.showModal(placeholder);
    }

    private getDesktopBridge(): DesktopBridge | null {
        return (window as unknown as { awwv?: DesktopBridge }).awwv ?? null;
    }
}
