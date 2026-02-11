export type RegionBounds = { x: number; y: number; width: number; height: number };

export type Region = {
    id: string;
    type: 'baked_prop' | 'sprite_overlay' | 'dynamic_render';
    bounds: RegionBounds;
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
};

import { ModalManager } from './components/ModalManager.js';
import { FactionOverviewPanel } from './components/FactionOverviewPanel.js';
import { NewspaperModal } from './components/NewspaperModal.js';
import { MagazineModal } from './components/MagazineModal.js';
import { ReportsModal } from './components/ReportsModal.js';
import { NewsTicker } from './components/NewsTicker.js';
import { GameState } from '../../state/game_state.js';
import { TacticalMap } from './components/TacticalMap.js';
import { WarPlanningMap } from './components/WarPlanningMap.js';
import { runPhase0TurnAndAdvance } from './run_phase0_turn.js';
import { runPhaseITurn } from '../../sim/run_phase_i_browser.js';
import { runPhaseIITurn } from '../../sim/run_phase_ii_browser.js';
import { buildGraphFromJSON, type LoadedSettlementGraph } from '../../map/settlements_parse.js';

export class ClickableRegionManager {
    private regionsMap: RegionsMap | null = null;
    private hoveredRegion: HoverRegion | null = null;
    private scaleX = 1;
    private scaleY = 1;
    private modalManager: ModalManager | null = null;
    private tacticalMap: TacticalMap | null = null;
    private warPlanningMap: WarPlanningMap | null = null;
    private mapSceneOpenHandler: (() => void) | null = null;
    private newsTicker: NewsTicker = new NewsTicker();
    private onGameStateChange: ((newState: GameState) => void) | null = null;
    private settlementGraphCache: LoadedSettlementGraph | null = null;

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

    /** Called by warroom to provide scene transition. Open map = handler then show(). */
    setMapSceneOpenHandler(handler: () => void): void {
        this.mapSceneOpenHandler = handler;
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
        return { region, bounds: this.getScaledBounds(region) };
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
            const bounds = this.getScaledBounds(region);
            if (this.isPointInside(x, y, bounds)) {
                return { region, bounds };
            }
        }
        return null;
    }

    private getScaledBounds(region: Region): RegionBounds {
        return {
            x: region.bounds.x * this.scaleX,
            y: region.bounds.y * this.scaleY,
            width: region.bounds.width * this.scaleX,
            height: region.bounds.height * this.scaleY
        };
    }

    private isPointInside(x: number, y: number, bounds: RegionBounds): boolean {
        return (
            x >= bounds.x &&
            x <= bounds.x + bounds.width &&
            y >= bounds.y &&
            y <= bounds.y + bounds.height
        );
    }

    private executeAction(action: string, gameState: unknown): void {
        switch (action) {
            case 'open_faction_overview':
                this.openFactionOverview(gameState);
                break;
            case 'map_zoom_in':
                this.openWarPlanningMap();
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
            case 'open_diplomacy_panel':
                this.openDiplomacyPanel(gameState);
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

    private openWarPlanningMap(): void {
        if (!this.warPlanningMap) {
            console.warn('WarPlanningMap not set');
            return;
        }
        this.mapSceneOpenHandler?.();
        this.warPlanningMap.show();
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

        // Create confirmation dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: rgba(40, 40, 40, 0.95);
            color: white;
            padding: 30px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            max-width: 400px;
        `;

        dialog.innerHTML = `
            <h2 style="margin: 0 0 20px 0; text-align: center;">ADVANCE TURN?</h2>
            <div style="margin: 20px 0; text-align: center;">
                <div style="margin: 10px 0;">Current: <strong>Turn ${currentTurn}</strong></div>
                <div style="margin: 10px 0;">Next: <strong>Turn ${nextTurn}</strong></div>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center; margin-top: 30px;">
                <button id="cancel-turn-btn" style="padding: 10px 20px; font-size: 16px; cursor: pointer;">Cancel</button>
                <button id="advance-turn-btn" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #4a8; border: none; color: white;">Advance Turn</button>
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

        if (advanceBtn) {
            advanceBtn.onclick = async () => {
                if (state.meta.phase === 'phase_0') {
                    const newState = runPhase0TurnAndAdvance(state, state.meta.seed ?? 'start_1991_09');
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
                }
                this.modalManager?.hideModal();
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

    private openDiplomacyPanel(_gameState: unknown): void {
        console.log('open_diplomacy_panel');
    }
}
