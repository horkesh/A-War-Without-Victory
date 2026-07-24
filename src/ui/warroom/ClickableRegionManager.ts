/**
 * DATA BOUNDARY: ClickableRegionManager is a war-phase shell coordinator.
 * All live GameState reads for display purposes MUST flow through extractWarData().
 * Direct reads of state.political.* or state.military.* in display paths are forbidden.
 * Exceptions:
 *   - state.meta.* reads (turn, phase, player_faction, seed) — structural shell metadata, not display data.
 *   - state.factions[*].id — faction identity only, consumed before snapshot is taken.
 * The advanceTurn() method reads state.meta.* before calling extractWarData(); this is intentional.
 */
export type RegionBounds = { x: number; y: number; width: number; height: number };

export type Region = {
    id: string;
    type: 'baked_prop' | 'sprite_overlay' | 'dynamic_render' | 'runtime_overlay';
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
    /** Optional: when true, room art has calendar baked in; skip drawing calendar overlay. */
    options?: { calendar_baked_in_art?: boolean };
};

export type HoverRegion = {
    region: Region;
    bounds: RegionBounds;
    scaledPolygon?: [number, number][];
};

import { buildGraphFromJSON, type LoadedSettlementGraph } from '../../map/settlements_parse.js';
import { runPhaseITurn } from '../../sim/run_early_war_browser.js';
import { runPhaseIITurn } from '../../sim/run_combat_browser.js';
import type { FactionId } from '../../state/game_state.js';
import { GameState } from '../../state/game_state.js';
import { INTERNATIONAL_SANCTIONS_THRESHOLD } from '../../state/patron_pressure.js';
import { getPlayerFacingFaction } from '../shared/playerFacingLabels.js';
import { checkWarTransition, findCriticalEvent, findWarMilestoneEvent, showDeclarationModal, showWarBeginsModal } from './components/DeclarationEventModal.js';
import { getPlayerFaction, turnToWeekString } from './components/warroom_utils.js';
import { DiplomacyModal } from './components/DiplomacyModal.js';
import { IvpBreakdownModal } from './components/IvpBreakdownModal.js';
import { FactionOverviewPanel } from './components/FactionOverviewPanel.js';
import { MagazineModal } from './components/MagazineModal.js';
import { ModalManager } from './components/ModalManager.js';
import { NewspaperModal } from './components/NewspaperModal.js';
import { NewsTicker } from './components/NewsTicker.js';
import { ReportsModal } from './components/ReportsModal.js';
import { CommandBriefingModal } from './components/CommandBriefingModal.js';
import { TacticalMap } from './components/TacticalMap.js';
import { WarPlanningMap } from './components/WarPlanningMap.js';
import { extractWarData } from './data/war_data_extractor.js';
import { capturePreviousTurnSnapshot, getPreviousSnapshot, setPreviousSnapshot, setLastTurnReport, type LastTurnReport } from './data/warroom_state.js';
import type { ShellHandoffCommand } from '../shared/shellHandoff.js';
type DesktopBridge = {
    advanceTurn?: (payload?: Record<string, unknown>) => Promise<{ ok: boolean; error?: string; report?: unknown }>;
    openTacticalMapWindow?: () => Promise<unknown>;
};

type WarroomAnchorId =
    | 'desk_map'
    | 'wall_cork_board'
    | 'command_briefing_folio'
    | 'newspaper_stack'
    | 'intelligence_journal'
    | 'diplomatic_telephone'
    | 'desk_radio'
    | 'wall_flag_area'
    | 'wall_calendar_area'
    | 'commander_coatrack';

export class ClickableRegionManager {
    private regionsMap: RegionsMap | null = null;
    private hoveredRegion: HoverRegion | null = null;
    private scaleX = 1;
    private scaleY = 1;
    private modalManager: ModalManager | null = null;
    private tacticalMap: TacticalMap | null = null;
    private warPlanningMap: WarPlanningMap | null = null;
    private mapSceneOpenHandler: (() => void) | null = null;
    private tacticalMapOpenHandler: (() => void) | null = null;
    private tacticalShellHandoffHandler: ((command: ShellHandoffCommand) => void) | null = null;
    private newsTicker: NewsTicker = new NewsTicker();
    private onGameStateChange: ((newState: GameState) => void) | null = null;
    private settlementGraphCache: LoadedSettlementGraph | null = null;
    /** Player's chosen faction (first in array by default). */
    private playerFaction: FactionId | undefined = undefined;

    async loadRegions(jsonPath: string): Promise<void> {
        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`Failed to load regions map: ${jsonPath}`);
        }
        this.regionsMap = await response.json();
    }

    /** True if the loaded region set has calendar baked into room art (do not draw calendar overlay). */
    isCalendarBakedInArt(): boolean {
        return Boolean(this.regionsMap?.options?.calendar_baked_in_art);
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

    /** Called by warroom to provide tactical map scene transition (embedded iframe). */
    setTacticalMapOpenHandler(handler: () => void): void {
        this.tacticalMapOpenHandler = handler;
    }

    setTacticalShellHandoffHandler(handler: (command: ShellHandoffCommand) => void): void {
        this.tacticalShellHandoffHandler = handler;
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
            this.executeRegion(match.region.id, match.region.action, gameState);
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

    private executeRegion(regionId: string, action: string, gameState: unknown): void {
        switch (regionId as WarroomAnchorId) {
            case 'wall_flag_area':
                this.openFactionOverview(gameState);
                return;
            case 'wall_calendar_area':
                this.advanceTurn(gameState);
                return;
            case 'desk_map':
            case 'wall_cork_board':
                this.openPrimaryMap(gameState);
                return;
            case 'command_briefing_folio':
                this.openCommandBriefingModal(gameState);
                return;
            case 'newspaper_stack':
                this.openNewspaperModal(gameState);
                return;
            case 'intelligence_journal':
                this.openMagazineModal(gameState);
                return;
            case 'diplomatic_telephone':
                this.openDiplomacy(gameState);
                return;
            case 'desk_radio':
                this.toggleNewsTicker(gameState);
                return;
            case 'commander_coatrack':
                this.openFactionOverview(gameState);
                return;
            default:
                this.executeLegacyAction(action, gameState);
        }
    }

    private executeLegacyAction(action: string, gameState: unknown): void {
        switch (action) {
            case 'open_faction_overview':
            case 'open_faction_archive':
                this.openFactionOverview(gameState);
                break;
            case 'map_zoom_in':
            case 'open_operational_map':
                this.openPrimaryMap(gameState);
                break;
            case 'advance_turn':
                this.advanceTurn(gameState);
                break;
            case 'open_newspaper_modal':
            case 'open_press_briefing':
                this.openNewspaperModal(gameState);
                break;
            case 'open_magazine_modal':
            case 'open_intelligence_journal':
                this.openMagazineModal(gameState);
                break;
            case 'open_reports_modal':
                this.openReportsModal(gameState);
                break;
            case 'open_command_briefing':
                this.openCommandBriefingModal(gameState);
                break;
            case 'toggle_news_ticker':
            case 'transistor_radio':
            case 'open_radio_net':
                this.toggleNewsTicker(gameState);
                break;
            case 'open_diplomacy':
            case 'open_diplomatic_telephone':
                this.openDiplomacy(gameState);
                break;
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    private openFactionOverview(gameState: unknown): void {
        if (this.tacticalShellHandoffHandler) {
            this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'summary' });
            return;
        }
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const panel = new FactionOverviewPanel(gameState as GameState, this.modalManager);
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
        // Create confirmation dialog using ops-center theme
        const dialog = document.createElement('div');
        dialog.className = 'wr-dialog';

        const stagedInfo = '';

        const thisWeekPreview = this.generateThisWeekPreview(state);

        dialog.innerHTML = `
            <h2>ADVANCE TURN?</h2>
            <div class="wr-dialog-body">
                <div class="wr-dialog-row"><span class="wr-label">Current</span><span class="wr-value">${turnToWeekString(currentTurn)}</span></div>
                <div class="wr-dialog-row"><span class="wr-label">Next</span><span class="wr-value">${turnToWeekString(nextTurn)}</span></div>
                ${stagedInfo}
                ${thisWeekPreview}
            </div>
            <div class="wr-dialog-actions">
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
        if (advanceBtn) {
            advanceBtn.onclick = async () => {
                const prevPhase = state.meta.phase;
                const bridge = this.getDesktopBridge();
                this.playerFaction = getPlayerFacingFaction(state.meta.player_faction) ?? undefined;

                // Capture pre-turn snapshot for delta-based event generation
                setPreviousSnapshot(capturePreviousTurnSnapshot(state));

                if (bridge?.advanceTurn) {
                    try {
                        const result = await bridge.advanceTurn();
                        this.modalManager?.hideModal();
                        if (!result?.ok) {
                            console.error('Desktop advance-turn failed:', result?.error ?? 'Unknown error');
                            return;
                        }

                        if (result.report) setLastTurnReport(result.report as LastTurnReport);
                    } catch (e) {
                        this.modalManager?.hideModal();
                        console.error('Desktop advance-turn exception', e);
                    }
                    return;
                }

                // War phase: browser-safe advance via early-war or combat pipeline.
                try {
                    const graph = await this.loadSettlementGraphIfNeeded();
                    const seed = state.meta.seed ?? 'start_1992_04';
                    const { nextState } = await runPhaseITurn(state, { seed, settlementGraph: graph });
                    this.onGameStateChange?.(nextState);
                    if (this.playerFaction) {
                        await this.checkWarMilestone(nextState, this.playerFaction);
                    }
                } catch (e) {
                    console.error('War phase advance failed', e);
                }
                this.modalManager?.hideModal();
            };
        }
    }

    /** Show a full-screen milestone modal if a war milestone was just crossed. */
    private async checkWarMilestone(newState: GameState, pf: FactionId): Promise<void> {
        const prevSnap = getPreviousSnapshot();
        const milestone = findWarMilestoneEvent(newState, prevSnap, pf);
        if (milestone) {
            await showDeclarationModal({ type: milestone, turn: newState.meta.turn, details: {} } as { type: string; turn: number; details: Record<string, unknown> }, pf);
        }
    }

    /**
     * Generate "THIS WEEK" preview for war-phase turn advance dialog.
     * Shows pending operations, incoming returns, and critical warnings.
     * Returns empty string if phase is not 'war'.
     */
    private generateThisWeekPreview(state: GameState): string {
        const phase = state.meta.phase ?? 'war';
        if (phase !== 'war') return '';

        const pf = getPlayerFacingFaction(state.meta.player_faction);
        if (!pf) {
            return `
                <div class="wr-dialog-section" style="margin-top:12px;border-top:1px solid #333;padding-top:10px;">
                    <div style="font-size: 12px;font-weight:600;color:#8b8ba7;margin-bottom:8px;letter-spacing:1px;">THIS WEEK</div>
                    <div class="wr-dialog-row" style="color:#555570;font-style:italic;"><span class="wr-label">Player command identity unavailable.</span></div>
                </div>
            `;
        }
        const snap = extractWarData(state, pf);

        const lines: string[] = [];
        lines.push('<div class="wr-dialog-section" style="margin-top:12px;border-top:1px solid #333;padding-top:10px;">');
        lines.push('<div style="font-size: 12px;font-weight:600;color:#ffab00;margin-bottom:8px;letter-spacing:1px;">THIS WEEK</div>');

        // PENDING OPERATIONS
        const packing = snap.brigadeMovement.packing.length;
        const transit = snap.brigadeMovement.inTransit.length;
        const unpacking = snap.brigadeMovement.unpacking.length;
        if (packing > 0 || transit > 0 || unpacking > 0) {
            const parts: string[] = [];
            if (packing > 0) parts.push(`${packing} packing`);
            if (transit > 0) parts.push(`${transit} in transit`);
            if (unpacking > 0) parts.push(`${unpacking} arriving`);
            lines.push(`<div class="wr-dialog-row"><span class="wr-label">Movements</span><span class="wr-value">${parts.join(', ')}</span></div>`);
        }

        // INCOMING: WIA returning — consumed from snapshot (DATA BOUNDARY: no direct state.military.formations read)
        const wiaReturning = snap.ownForces.wiaFormationCount;
        if (wiaReturning > 0) {
            lines.push(`<div class="wr-dialog-row"><span class="wr-label">WIA returning</span><span class="wr-value">${wiaReturning} formations</span></div>`);
        }

        // CORPS OPERATIONS
        const activeOps = snap.ownCorpsOps.filter(co => co.operation != null);
        if (activeOps.length > 0) {
            lines.push(`<div class="wr-dialog-row"><span class="wr-label">Active ops</span><span class="wr-value">${activeOps.length} corps</span></div>`);
        }

        // CRITICAL WARNINGS (red)
        const warnings: string[] = [];
        if (snap.brigadeMovement.encircled.length > 0) {
            warnings.push(`${snap.brigadeMovement.encircled.length} encircled`);
        }
        if (snap.ownSupply.collapsedMunicipalities.length > 0) {
            warnings.push(`${snap.ownSupply.collapsedMunicipalities.length} collapsed supply`);
        }
        if (snap.ownSupply.criticalCount > 0) {
            warnings.push(`${snap.ownSupply.criticalCount} critical supply`);
        }
        if (snap.ownExhaustion.level > 0.60) {
            warnings.push(`exhaustion ${Math.round(snap.ownExhaustion.level * 100)}%`);
        }
        if (snap.exposedFrontSettlements.length > 0) {
            warnings.push(`${snap.exposedFrontSettlements.length} exposed front`);
        }

        if (warnings.length > 0) {
            lines.push(`<div class="wr-dialog-info" style="color:#ff3d00;background:rgba(255,61,0,0.08);margin-top:6px;padding:6px 10px;border-radius:4px;font-size: 12px;">`);
            lines.push(`\u26a0 ${warnings.join(' \u2022 ')}`);
            lines.push('</div>');
        }

        // If nothing to show, add a quiet status line
        if (packing === 0 && transit === 0 && unpacking === 0 && wiaReturning === 0 && activeOps.length === 0 && warnings.length === 0) {
            lines.push('<div class="wr-dialog-row" style="color:#555570;font-style:italic;"><span class="wr-label">No pending operations this turn.</span></div>');
        }

        lines.push('</div>');
        return lines.join('');
    }

    private openNewspaperModal(gameState: unknown): void {
        if (this.tacticalShellHandoffHandler) {
            this.tacticalShellHandoffHandler({ kind: 'chronicle' });
            return;
        }
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const newspaper = new NewspaperModal(gameState as GameState);
        this.modalManager.showModal(newspaper.render());
    }

    private openMagazineModal(gameState: unknown): void {
        if (this.tacticalShellHandoffHandler) {
            this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'records', recordsSubTab: 'aftermath' });
            return;
        }
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const magazine = new MagazineModal(gameState as GameState);
        this.modalManager.showModal(magazine.render());
    }

    private openCommandBriefingModal(gameState: unknown): void {
        if (this.tacticalShellHandoffHandler) {
            this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'briefing' });
            return;
        }
        if (!this.modalManager) {
            console.warn('ModalManager not set');
            return;
        }

        const state = gameState as GameState;
        const briefingRoot = new CommandBriefingModal(state).render();
        const snap = extractWarData(state, getPlayerFaction(state));
        const composite = snap.ivpState.composite;
        const hasConsequences = snap.ivpState.activeConsequenceIds.length > 0;
        if (state.meta.phase === 'war' && (composite >= INTERNATIONAL_SANCTIONS_THRESHOLD || hasConsequences)) {
            const wrapper = document.createElement('div');
            wrapper.appendChild(briefingRoot);
            const footer = document.createElement('div');
            footer.style.cssText = 'margin-top:12px;padding-top:10px;border-top:1px dashed #666;text-align:center;';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = `Review international pressure (${Math.round(composite * 100)}%)`;
            btn.style.cssText = 'padding:6px 12px;font-size: 12px;cursor:pointer;background:#eee;color:#111;border:1px solid #333;border-radius:4px;';
            btn.addEventListener('click', () => this.showIvpBreakdown(state));
            footer.appendChild(btn);
            wrapper.appendChild(footer);
            this.modalManager.showModal(wrapper);
            return;
        }
        this.modalManager.showModal(briefingRoot);
    }

    /** Opens diplomatic pressure briefing modal (warroom). */
    private showIvpBreakdown(state: GameState): void {
        this.modalManager?.showModal(new IvpBreakdownModal(state).render());
    }

    private openReportsModal(gameState: unknown): void {
        if (this.tacticalShellHandoffHandler) {
            this.tacticalShellHandoffHandler({ kind: 'army-hq', tab: 'records', recordsSubTab: 'ops' });
            return;
        }
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

        const diplomacyRoot = new DiplomacyModal(state).render();
        const wrapper = document.createElement('div');
        wrapper.appendChild(diplomacyRoot);
        const footer = document.createElement('div');
        footer.style.cssText = 'margin-top:16px;padding-top:12px;border-top:1px solid #333;text-align:center;';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'Diplomatic press briefing';
        btn.style.cssText = 'padding:8px 14px;font-size:12px;cursor:pointer;background:#1a1a2e;color:#d8d8e0;border:1px solid #444;border-radius:4px;';
        btn.setAttribute('aria-label', 'Open international pressure briefing');
        btn.addEventListener('click', () => this.showIvpBreakdown(state));
        footer.appendChild(btn);
        wrapper.appendChild(footer);
        this.modalManager.showModal(wrapper);
    }

    private getDesktopBridge(): DesktopBridge | null {
        return (window as Window & { awwv?: DesktopBridge }).awwv ?? null;
    }
}
