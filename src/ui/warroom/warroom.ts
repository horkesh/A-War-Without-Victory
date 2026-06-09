import { CURRENT_SCHEMA_VERSION, type FactionId, type GameState } from '../../state/game_state.js';
import { deserializeState } from '../../state/serialize.js';
import { ModalManager } from './components/ModalManager.js';
import { SettingsModal } from './components/SettingsModal.js';

import { WarPlanningMap } from './components/WarPlanningMap.js';
import { setScenarioStartDate, turnToShortLabel } from './components/warroom_utils.js';
// Flag assets — drawn dynamically on the wall per player faction
import flagHrhbUrl from './assets/flag_HRHB.webp?url';
import flagRbihUrl from './assets/flag_RBiH.webp?url';
import flagRsUrl from './assets/flag_RS.webp?url';
// Main menu background (game start screen)
import gameStartBgUrl from './assets/game start.webp?url';
import { encodeShellHandoffCommand, type ShellHandoffCommand } from '../shared/shellHandoff.js';
import { getPlayerFacingFaction } from '../shared/playerFacingLabels.js';

type CampaignScenarioKey = 'apr_1992';
const BROWSER_STARTUP_SNAPSHOT_PATH = '/data/derived/startup/apr_1992_initial_save.json';

interface DesktopBridge {
    startNewCampaign?: (payload: { playerFaction: FactionId; scenarioKey: CampaignScenarioKey }) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
    subscribeGameStateUpdated?: (cb: (stateJson: string) => void) => (() => void);
    subscribeTurnReportUpdated?: (cb: (report: unknown) => void) => (() => void);
    getCurrentGameState?: () => Promise<string | null>;
    loadStateDialog?: () => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
    openTacticalMapWindow?: (payload?: { mode?: 'operational' | 'sandbox' }) => Promise<unknown>;
    [key: string]: unknown;
}

class WarroomApp {
    private gameState: GameState | null = null;

    private warPlanningMap = new WarPlanningMap();
    private modalManager = new ModalManager();

    private desktopBridge: DesktopBridge | null = null;
    /** Tactical map iframe (lazily created on first open). */
    private tacticalMapIframe: HTMLIFrameElement | null = null;
    private tacticalMapReady = false;
    /** True when the iframe was loaded with ?view=warroom (React shell owns room navigation). */
    private tacticalMapInWarroomMode = false;
    /** HTTP base URL for the tactical map server (set at init from Electron IPC). */
    private mapServerUrl: string | null = null;
    /** Embedded iframe subscribers keyed by event name. */
    private embeddedBridgeSubscribers = new Map<WindowProxy, { origin: string; events: Set<string> }>();
    private unsubscribeDesktopGameState: (() => void) | null = null;
    private unsubscribeDesktopTurnReport: (() => void) | null = null;
    private pendingShellHandoff: ShellHandoffCommand | null = null;
    /** True once the user has navigated away from the initial main menu (prevents init race). */
    private userNavigatedFromMenu = false;

    constructor() {
        this.init();
    }

    async init() {
        // Grab the Electron preload bridge immediately so early menu clicks can start a campaign
        // even while the rest of the warroom finishes loading.
        this.desktopBridge = this.getDesktopBridge();

        // Apply main menu background: image first, overlay gradient for readability
        const mainMenuEl = document.getElementById('main-menu');
        if (mainMenuEl) {
            mainMenuEl.style.backgroundImage = `url(${gameStartBgUrl}), radial-gradient(circle at center, rgba(30, 40, 60, 0.75) 0%, rgba(5, 5, 15, 0.92) 100%)`;
            mainMenuEl.style.backgroundSize = 'cover, auto';
            mainMenuEl.style.backgroundPosition = 'center, center';
        }

        // Wire overlay buttons immediately so "New Campaign" etc. work before assets finish loading
        this.wireMainMenuButtons();
        this.wireSidePickerButtons();
        const mapScene = document.getElementById('map-scene');
        if (mapScene) {
            mapScene.appendChild(this.warPlanningMap.getContainer());
            this.warPlanningMap.setCloseCallback(() => this.showWarroomScene());
        }
        this.wireToolbar();

        // Listen for "back to HQ" messages from the embedded tactical map iframe
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'awwv-back-to-hq') {
                if (this.tacticalMapInWarroomMode && this.tacticalMapIframe?.contentWindow) {
                    // React owns the warroom view — tell the iframe to switch back to warroom screen.
                    // Keep the tactical scene visible (iframe stays loaded, React handles the swap).
                    this.tacticalMapIframe.contentWindow.postMessage(
                        { type: 'awwv-shell:show-warroom' },
                        '*',
                    );
                } else {
                    this.showWarroomScene();
                }
                return;
            }
            if (e.data?.type === 'awwv-bridge:subscribe-event') {
                this.handleEmbeddedBridgeSubscription(e);
                return;
            }
            if (e.data?.type === 'awwv-bridge:invoke') {
                void this.handleEmbeddedBridgeInvoke(e);
            }
        });

        await this.warPlanningMap.loadData();

        // Resolve tactical map HTTP server URL (set by Electron main process).
        // MapLibre requires http:// origin; its Web Workers don't work under awwv://.
        if (this.desktopBridge && typeof (this.desktopBridge as Record<string, unknown>).getMapServerUrl === 'function') {
            try {
                const url = await (this.desktopBridge as { getMapServerUrl: () => Promise<string | null> }).getMapServerUrl();
                if (url) this.mapServerUrl = url.replace(/\/+$/, '');
            } catch (_) { /* not available — fallback to awwv:// */ }
        }
        if (this.desktopBridge?.subscribeGameStateUpdated) {
            this.unsubscribeDesktopGameState = this.desktopBridge.subscribeGameStateUpdated((stateJson: string) => {
                this.applyGameStateFromJson(stateJson);
                this.broadcastEmbeddedBridgeEvent('game-state-updated', stateJson);
            });
        }
        if (this.desktopBridge?.subscribeTurnReportUpdated) {
            this.unsubscribeDesktopTurnReport = this.desktopBridge.subscribeTurnReportUpdated((report: unknown) => {
                this.broadcastEmbeddedBridgeEvent('turn-report-updated', report);
            });
        }

        const existingStateJson = this.desktopBridge?.getCurrentGameState
            ? await this.desktopBridge.getCurrentGameState()
            : null;

        if (existingStateJson) {
            this.applyGameStateFromJson(existingStateJson);
        } else if (!this.desktopBridge?.startNewCampaign) {
            // Browser/dev mode fallback: prefer the same baked startup artifact as desktop.
            const loadedSnapshot = await this.loadStartupSnapshotFallback();
            if (!loadedSnapshot) {
                await this.loadMockState();
            }
            this.showMainMenu();
        } else if (!this.userNavigatedFromMenu) {
            // Only show main menu if the user hasn't already navigated away
            // during the async init (e.g. clicked "New Campaign" while assets loaded).
            this.showMainMenu();
        }

    }

    async loadMockState(params?: {
        turn?: number;
        phase?: GameState['meta']['phase'];
        faction?: FactionId;
        politicalControllers?: Record<string, string | null>;
    }) {
        const politicalControllers = params?.politicalControllers ?? await this.loadInitialPoliticalControllers();

        const military: GameState['military'] = {
            formations: {},
            front_segments: {},
            theatres: {},
            army_theatre_assignment: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            army_co_decision_traces: {},
            army_corps_directives_by_faction: {},
            event_decision_log: [],
            fired_event_ids: [],
            event_readiness: {},
            event_fire_counts: {},
            event_last_fired_turn: {},
            event_flags: {},
            enabled_event_ids: [],
            phantoms_spawned: [],
        };
        const political: GameState['political'] = {
            political_controllers: politicalControllers,
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] },
            war_consolidation_until: {},
            war_control_strain: {},
            war_supply_pressure: {},
            war_supply_condition: {},
            war_exhaustion: {},
            war_exhaustion_local: {},
        };
        const mockState: GameState = {
            schema_version: CURRENT_SCHEMA_VERSION,
            meta: {
                turn: params?.turn ?? 0,
                seed: 'start_mock',
                phase: params?.phase ?? 'peace',
                player_faction: params?.faction
            },
            factions: [
                { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null },
                { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null },
                { id: 'HRHB', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null }
            ],
            military,
            political,
            displacement: {
                displacement_state: {},
                minority_flight_state: {},
                sustainability_state: {},
                war_displacement_initiated: {},
                hostile_takeover_timers: {},
                displacement_camp_state: {},
                displacement_event_log: [],
                displacement_humanitarian_aggregates: {},
                displacement_origin_dest_arrivals: {},
                displacement_recent_by_turn: {},
                displacement_flows_by_osid: {},
                settlement_displacement: {},
                settlement_displacement_started_turn: {},
                municipality_displacement: {},
                civilian_casualties: {},
            },
        };
        this.gameState = mockState;

        if (params?.turn === 30) {
            this.gameState.meta.scenario_start_date = { year: 1992, month: 4, day: 1 };
        }

        setScenarioStartDate(this.gameState.meta.scenario_start_date);
        this.updateUIOverlay();
    }

    private async loadStartupSnapshotFallback(faction?: FactionId): Promise<boolean> {
        try {
            const response = await fetch(BROWSER_STARTUP_SNAPSHOT_PATH);
            if (!response.ok) return false;
            const stateJson = await response.text();
            this.gameState = deserializeState(stateJson);
            if (faction) {
                this.gameState.meta.player_faction = faction;
            }
            setScenarioStartDate(this.gameState.meta.scenario_start_date);
            this.updateUIOverlay();
            return true;
        } catch (error) {
            console.warn('[warroom] Failed to load baked startup snapshot fallback:', error);
            return false;
        }
    }

    /**
     * Load initial political control for the map. Prefer baked viewer data
     * (political_control_data.json) from the map pipeline; fall back to
     * settlements_initial_master.json if the baked file is not available.
     */
    private async loadInitialPoliticalControllers(): Promise<Record<string, string | null>> {
        const baked = await fetch('/data/derived/political_control_data.json');
        if (baked.ok) {
            const data = (await baked.json()) as { by_settlement_id?: Record<string, string | null> };
            const bySid = data?.by_settlement_id ?? {};
            return typeof bySid === 'object' && bySid !== null ? { ...bySid } : {};
        }
        type SettlementInit = { sid: string; political_controller?: string };
        const response = await fetch('/data/source/settlements_initial_master.json');
        if (!response.ok) {
            throw new Error('Failed to load political control (tried political_control_data.json and settlements_initial_master.json)');
        }
        const payload = await response.json();
        const controllers: Record<string, string | null> = {};
        const settlements = (payload?.settlements ?? []) as SettlementInit[];
        for (const settlement of settlements) {
            if (settlement.sid) {
                controllers[settlement.sid] = settlement.political_controller ?? null;
            }
        }
        return controllers;
    }

    updateUIOverlay() {
        if (!this.gameState) return;
        const playerFaction = getPlayerFacingFaction(this.gameState.meta.player_faction);
        this.warPlanningMap.setControlFromState(this.gameState);
        this.warPlanningMap.setGameState(this.gameState);
        if (playerFaction) {
            this.warPlanningMap.setPlayerFaction(playerFaction);
        }
        this.updateToolbarTurnDisplay();
    }

    private getDesktopBridge(): DesktopBridge | null {
        return (window as Window & { awwv?: DesktopBridge }).awwv ?? null;
    }

    private applyGameStateFromJson(stateJson: string): void {
        try {
            this.gameState = deserializeState(stateJson);
            // Sync scenario epoch so date helpers produce correct calendar dates
            setScenarioStartDate(this.gameState.meta.scenario_start_date);
            // Defer DOM work to the next task so the triggering click is consumed and UI stays responsive.
            setTimeout(() => {
                this.updateUIOverlay();
                // Do not switch back to warroom if the user is viewing the tactical map (or map scene).
                // Otherwise game-state-updated (e.g. from main process) would revert the view immediately.
                const tacticalScene = document.getElementById('tactical-map-scene');
                const mapScene = document.getElementById('map-scene');
                const isViewingTacticalMap = tacticalScene && !tacticalScene.classList.contains('tactical-map-scene-hidden');
                const isViewingWarPlanningMap = mapScene && !mapScene.classList.contains('map-scene-hidden');
                if (!isViewingTacticalMap && !isViewingWarPlanningMap) {
                    // React shell owns room navigation — load iframe with warroom view instead of
                    // showing the legacy canvas desk. The iframe stays loaded for the session.
                    this.showLoadedGameShellScene();
                }
            }, 0);
        } catch (error) {
            console.error('Failed to apply game state JSON in warroom', error);
        }
    }

    // ── 2-step campaign flow: Main Menu → Side Picker → Campaign ──

    /** Loaded games should enter the React warroom shell instead of the legacy desk scene. */
    private showLoadedGameShellScene(): void {
        if (this.gameState) {
            // React shell owns room navigation; keep the iframe loaded for the session.
            void this.showTacticalMapScene('warroom');
            return;
        }
        this.showWarroomScene();
    }

    /** Show a specific overlay screen and hide others. */
    private showScreen(screenId: 'main-menu' | 'side-picker' | 'none'): void {
        const screens = ['main-menu', 'side-picker'];
        for (const id of screens) {
            const el = document.getElementById(id);
            if (!el) continue;
            if (id === screenId) el.classList.remove('mm-hidden');
            else el.classList.add('mm-hidden');
        }

        const warroomScene = document.getElementById('warroom-scene');
        if (warroomScene) {
            // Hide warroom scene if showing main menu (Step 1)
            if (screenId === 'main-menu') warroomScene.classList.add('warroom-scene-hidden');
            else if (screenId === 'none') {
                warroomScene.classList.remove('warroom-scene-hidden');
                this.showLoadedGameShellScene();
            }
        }
    }

    /** STEP 1: Show the main menu title screen. */
    private showMainMenu(): void {
        this.showScreen('main-menu');
        const continueBtn = document.getElementById('mm-continue') as HTMLButtonElement | null;
        if (continueBtn) {
            continueBtn.disabled = !this.gameState;
        }
    }

    /** STEP 2: Show the side picker (faction selection). */
    private showSidePicker(): void {
        this.userNavigatedFromMenu = true;
        this.showScreen('side-picker');

        // Defer flag image loads
        const flagMap: Record<string, string> = { RBiH: flagRbihUrl, RS: flagRsUrl, HRHB: flagHrhbUrl };
        setTimeout(() => {
            for (const [fid, url] of Object.entries(flagMap)) {
                const img = document.getElementById(`sp-flag-${fid}`) as HTMLImageElement | null;
                if (img) {
                    img.src = url;
                    img.alt = `${fid} flag`;
                    img.onerror = () => { img.style.display = 'none'; };
                }
            }
        }, 0);
    }

    /** Wire main menu button handlers. */
    private wireMainMenuButtons(): void {
        const newCampaignBtn = document.getElementById('mm-new-campaign');
        const loadSaveBtn = document.getElementById('mm-load-save');
        const continueBtn = document.getElementById('mm-continue');
        const fileInput = document.getElementById('mm-file-input') as HTMLInputElement | null;

        if (newCampaignBtn) {
            newCampaignBtn.onclick = () => this.showSidePicker();
        }
        if (continueBtn) {
            continueBtn.onclick = () => {
                if (!this.gameState) return;
                this.showScreen('none');
            };
        }
        if (loadSaveBtn && fileInput) {
            loadSaveBtn.onclick = async () => {
                if (this.desktopBridge?.loadStateDialog) {
                    try {
                        const result = await this.desktopBridge.loadStateDialog();
                        if (result?.ok && result.stateJson) {
                            this.applyGameStateFromJson(result.stateJson);
                            this.showScreen('none');
                        }
                    } catch (error) {
                        console.error('[warroom] Failed to load state through desktop bridge:', error);
                    }
                    return;
                }
                fileInput.click();
            };
            fileInput.onchange = (e: Event) => {
                const target = e.target as HTMLInputElement;
                const file = target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (re) => {
                    const text = re.target?.result as string;
                    if (text) {
                        this.applyGameStateFromJson(text);
                        this.showScreen('none');
                    }
                };
                reader.readAsText(file);
            };
        }
    }

    /** Wire side picker (step 2) button handlers. */
    private wireSidePickerButtons(): void {
        const backBtn = document.getElementById('sp-back');
        const factionButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.sp-faction-option'));
        const errorEl = document.getElementById('sp-error');

        if (backBtn) {
            backBtn.onclick = () => this.showMainMenu();
        }

        const showError = (msg: string) => {
            if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove('hidden'); }
        };

        for (const btn of factionButtons) {
            btn.onclick = async () => {
                const faction = btn.dataset.faction;
                if (!faction) return;
                if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }

                if (!this.desktopBridge?.startNewCampaign) {
                    // Browser development mode fallback
                    console.warn('[warroom] Desktop bridge unavailable, using baked startup snapshot fallback for apr_1992');
                    await this.loadScenarioFallback(faction);
                    return;
                }

                // Disable all faction buttons during loading
                for (const b of factionButtons) b.disabled = true;

                try {
                    const result = await this.desktopBridge.startNewCampaign({
                        playerFaction: faction,
                        scenarioKey: 'apr_1992',
                    });
                    if (!result?.ok) {
                        showError(result?.error ?? 'Failed to start campaign.');
                        return;
                    }
                    if (result.stateJson) {
                        this.applyGameStateFromJson(result.stateJson);
                        this.showScreen('none');
                    }
                } catch (error) {
                    showError(error instanceof Error ? error.message : String(error));
                } finally {
                    for (const b of factionButtons) b.disabled = false;
                }
            };
        }
    }

    /** Browser fallback for starting the single live desktop campaign key (`apr_1992`). */
    private async loadScenarioFallback(faction: FactionId): Promise<void> {
        const loadedSnapshot = await this.loadStartupSnapshotFallback(faction);
        if (!loadedSnapshot) {
            console.warn('[warroom] Baked startup snapshot unavailable, falling back to legacy mock apr_1992 state');
            await this.loadMockState({
                turn: 30,
                phase: 'war',
                faction,
            });
        }
        this.showScreen('none');
    }

    /** Wire the top toolbar buttons. */
    private wireToolbar(): void {
        const menuBtn = document.getElementById('wr-btn-menu');
        const mapBtn = document.getElementById('wr-btn-map');
        const sandboxBtn = document.getElementById('wr-btn-sandbox');
        const investBtn = document.getElementById('wr-btn-invest');
        const settingsBtn = document.getElementById('wr-btn-settings');
        const helpBtn = document.getElementById('wr-btn-help');

        if (menuBtn) {
            menuBtn.onclick = () => this.showMainMenu();
        }
        if (mapBtn) {
            mapBtn.onclick = () => {
                this.showTacticalMapScene('operational');
            };
        }
        if (sandboxBtn) {
            sandboxBtn.onclick = () => this.showTacticalMapScene('sandbox');
        }
        if (investBtn) {
            investBtn.onclick = () => {
                // Investment map removed (peace phase no longer exists)
            };
        }
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                if (!this.modalManager) return;
                const modal = new SettingsModal(this.gameState);
                this.modalManager.showModal(modal.render());
            };
        }
        if (helpBtn) {
            helpBtn.onclick = () => {
                if (!this.modalManager) return;
                const panel = document.createElement('div');
                panel.className = 'wr-dialog';
                panel.style.maxWidth = '460px';
                panel.innerHTML = `
                    <h2>WARROOM CONTROLS</h2>
                    <div class="wr-dialog-body" style="text-align: left; line-height: 1.6;">
                        <div><strong style="color: #00e878;">Desk Map</strong> &mdash; Open tactical map</div>
                        <div><strong style="color: #00e878;">Sandbox</strong> &mdash; Open tactical sandbox mode</div>
                        <div><strong style="color: #00e878;">Calendar</strong> &mdash; Advance turn</div>
                        <div><strong style="color: #00e878;">Telephone</strong> &mdash; Diplomacy (war only)</div>
                        <div><strong style="color: #00e878;">Flag / Coatrack</strong> &mdash; Executive summary, then Army HQ handoff</div>
                        <div><strong style="color: #00e878;">Newspapers</strong> &mdash; Current events</div>
                        <div><strong style="color: #00e878;">Journal</strong> &mdash; Army HQ records handoff</div>
                        <div><strong style="color: #00e878;">Report Stack</strong> &mdash; Army HQ operations record</div>
                        <div><strong style="color: #00e878;">Radio</strong> &mdash; News ticker</div>
                    </div>
                `;
                this.modalManager.showModal(panel);
            };
        }
    }

    /** Update the toolbar turn display from current game state. */
    private updateToolbarTurnDisplay(): void {
        const el = document.getElementById('wr-turn-display');
        if (!el || !this.gameState) return;
        const turn = this.gameState.meta.turn;
        const label = turnToShortLabel(turn);
        const phase = this.gameState.meta.phase === 'war' ? 'War phase' : 'Post-War';
        el.textContent = `Turn ${turn} \u2014 ${label} \u2014 ${phase}`;
        const investBtn = document.getElementById('wr-btn-invest') as HTMLButtonElement | null;
        if (investBtn) {
            investBtn.style.display = 'none';
        }
    }

    /** Scene swap: show warroom desk, hide map and tactical scenes. */
    private showWarroomScene(): void {
        const desk = document.getElementById('warroom-desk');
        const warroomScene = document.getElementById('warroom-scene');
        const mapScene = document.getElementById('map-scene');
        const tacticalScene = document.getElementById('tactical-map-scene');
        if (mapScene) {
            mapScene.classList.add('map-scene-hidden');
            mapScene.setAttribute('aria-hidden', 'true');
        }
        if (tacticalScene) {
            tacticalScene.classList.add('tactical-map-scene-hidden');
            tacticalScene.setAttribute('aria-hidden', 'true');
        }
        if (desk) desk.classList.remove('warroom-desk-hidden');
        if (warroomScene) {
            warroomScene.classList.remove('warroom-scene-hidden');
            warroomScene.setAttribute('aria-hidden', 'false');
        }
        this.pullLatestGameState();
    }

    /** Pull the latest game state from Electron main process (e.g. after returning from tactical map). */
    private async pullLatestGameState(): Promise<void> {
        if (!this.desktopBridge?.getCurrentGameState) return;
        try {
            const stateJson = await this.desktopBridge.getCurrentGameState();
            if (stateJson) {
                this.applyGameStateFromJson(stateJson);
            }
        } catch (e) {
            console.warn('[warroom] Failed to pull latest game state:', e);
        }
    }

    /**
     * Show the tactical map as a full-screen iframe layer (same window, no separate BrowserWindow).
     * In Electron: embeds the React tactical map via HTTP map server (MapLibre requires http://).
     * In dev/browser: opens the tactical map in a new tab.
     */
    private async showTacticalMapScene(mode: 'operational' | 'sandbox' | 'warroom' = 'operational'): Promise<void> {
        const isElectron = !!(window as Window & { awwv?: unknown }).awwv;
        if (!isElectron) {
            // Dev/browser: cross-origin prevents meaningful iframe interaction.
            // warroom mode not reachable in dev (warroom.ts runs in Electron only).
            const handoffQuery = this.pendingShellHandoff
                ? `?shellHandoff=${encodeShellHandoffCommand(this.pendingShellHandoff)}`
                : '';
            const devUrl = mode === 'sandbox'
                ? `http://127.0.0.1:3002/tactical_sandbox.html${handoffQuery}`
                : `http://127.0.0.1:3002/${handoffQuery}`;
            window.open(devUrl, '_blank');
            this.pendingShellHandoff = null;
            return;
        }

        const tacticalScene = document.getElementById('tactical-map-scene');
        if (!tacticalScene) return;

        // Prefer HTTP map server (re-query each time so we never use stale awwv if server is ready).
        let mapBaseUrl = this.mapServerUrl;
        if (this.desktopBridge && typeof (this.desktopBridge as Record<string, unknown>).getMapServerUrl === 'function') {
            try {
                const url = await (this.desktopBridge as { getMapServerUrl: () => Promise<string | null> }).getMapServerUrl();
                if (url) {
                    mapBaseUrl = url.replace(/\/+$/, '');
                    this.mapServerUrl = mapBaseUrl;
                }
            } catch (_) { /* keep existing mapServerUrl or awwv fallback */ }
        }
        mapBaseUrl = mapBaseUrl || 'awwv://warroom/tactical-map';

        const cacheBuster = `v=${Date.now()}`;
        let targetSrc: string;
        if (mode === 'sandbox') {
            targetSrc = `${mapBaseUrl}/tactical_sandbox.html?embedded=1&${cacheBuster}`;
        } else if (mode === 'warroom') {
            // React shell owns room navigation — load with view=warroom so React renders WarroomShellLayer.
            targetSrc = `${mapBaseUrl}/index.html?embedded=1&view=warroom&${cacheBuster}`;
        } else {
            targetSrc = `${mapBaseUrl}/index.html?embedded=1&${cacheBuster}`;
        }

        // Track whether the iframe is currently in React warroom mode.
        const nextWarroomMode = mode === 'warroom';

        // Lazily create iframe on first open
        if (!this.tacticalMapIframe) {
            const iframe = document.createElement('iframe');
            iframe.id = 'tactical-map-iframe';
            iframe.setAttribute('allowfullscreen', '');
            iframe.src = targetSrc;
            this.tacticalMapInWarroomMode = nextWarroomMode;

            iframe.onload = () => {
                this.tacticalMapReady = true;
                this.injectBridgeIntoTacticalMap(iframe);
                this.flushPendingShellHandoff();
            };

            tacticalScene.appendChild(iframe);
            this.tacticalMapIframe = iframe;
        } else if (this.tacticalMapIframe.src !== targetSrc) {
            this.tacticalMapReady = false;
            this.tacticalMapInWarroomMode = nextWarroomMode;
            this.tacticalMapIframe.src = targetSrc;
        } else if (this.tacticalMapReady) {
            // Push latest game state to existing iframe
            this.injectBridgeIntoTacticalMap(this.tacticalMapIframe);
            this.flushPendingShellHandoff();
        }

        // Scene swap: hide desk only so warroom-scene stays visible and tactical map can show
        const desk = document.getElementById('warroom-desk');
        if (desk) desk.classList.add('warroom-desk-hidden');
        tacticalScene.classList.remove('tactical-map-scene-hidden');
        tacticalScene.setAttribute('aria-hidden', 'false');
    }

    /**
     * Post-load setup for the tactical map iframe.
     * For tactical_map.html / tactical_sandbox.html the bridge is inherited via inline script (?embedded=1).
     * For map_hoi.html we inject a "Back to HQ" button since it doesn't have one natively.
     */
    private injectBridgeIntoTacticalMap(iframe: HTMLIFrameElement): void {
        try {
            const iframeWindow = iframe.contentWindow as (Window & { awwv?: Record<string, unknown> }) | null;
            if (!iframeWindow) return;

            // Ensure the "Back to HQ" button is visible (inline script handles this too)
            let hqBtn = iframeWindow.document.getElementById('btn-back-to-hq');

            // map_hoi.html doesn't have a native "Back to HQ" button — inject one
            if (!hqBtn) {
                const topBar = iframeWindow.document.getElementById('hoi-top-bar-actions')
                    ?? iframeWindow.document.getElementById('hoi-top-bar');
                if (topBar) {
                    hqBtn = iframeWindow.document.createElement('button');
                    hqBtn.id = 'btn-back-to-hq';
                    hqBtn.textContent = '\u25C0 HQ';
                    hqBtn.title = 'Return to warroom HQ';
                    hqBtn.style.cssText = 'padding:4px 10px;background:rgba(0,232,120,0.12);color:#00e878;border:1px solid rgba(0,232,120,0.3);border-radius:3px;cursor:pointer;font-family:inherit;font-size:11px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase;margin-right:6px;';
                    hqBtn.addEventListener('click', () => {
                        window.postMessage({ type: 'awwv-back-to-hq' }, '*');
                    });
                    topBar.insertBefore(hqBtn, topBar.firstChild);
                }
            }

            if (hqBtn) {
                hqBtn.style.display = '';
            }

            // Ensure the tactical map's own main menu is hidden (we launched from warroom)
            const mainMenuOverlay = iframeWindow.document.getElementById('main-menu-overlay');
            if (mainMenuOverlay) {
                mainMenuOverlay.classList.remove('open');
                mainMenuOverlay.setAttribute('aria-hidden', 'true');
            }
        } catch (e) {
            console.warn('[warroom] Could not configure tactical map iframe:', e);
        }
    }

    private handleEmbeddedBridgeSubscription(event: MessageEvent): void {
        const source = event.source;
        if (!source || typeof (source as WindowProxy).postMessage !== 'function') return;
        const data = event.data as { enabled?: boolean; eventName?: string } | null;
        const enabled = Boolean(data?.enabled);
        const eventName = data?.eventName;
        if (eventName !== 'game-state-updated' && eventName !== 'turn-report-updated') return;
        const origin = typeof event.origin === 'string' ? event.origin : '*';
        const existing = this.embeddedBridgeSubscribers.get(source as WindowProxy) ?? { origin, events: new Set<string>() };
        existing.origin = origin;
        if (enabled) {
            existing.events.add(eventName);
            this.embeddedBridgeSubscribers.set(source as WindowProxy, existing);
        } else {
            existing.events.delete(eventName);
            if (existing.events.size === 0) {
                this.embeddedBridgeSubscribers.delete(source as WindowProxy);
            } else {
                this.embeddedBridgeSubscribers.set(source as WindowProxy, existing);
            }
        }
    }

    private async openTacticalShellHandoff(command: ShellHandoffCommand): Promise<void> {
        if (this.tacticalMapInWarroomMode && this.tacticalMapReady && this.tacticalMapIframe?.contentWindow) {
            // React is showing the warroom view inside the already-loaded iframe.
            // Send the handoff directly — React will switch to game view without an iframe reload.
            this.tacticalMapIframe.contentWindow.postMessage(
                { type: 'awwv-shell:handoff', command },
                '*',
            );
            return;
        }
        this.pendingShellHandoff = command;
        await this.showTacticalMapScene('operational');
        this.flushPendingShellHandoff();
    }

    private flushPendingShellHandoff(): void {
        if (!this.pendingShellHandoff || !this.tacticalMapReady || !this.tacticalMapIframe?.contentWindow) return;
        try {
            this.tacticalMapIframe.contentWindow.postMessage(
                { type: 'awwv-shell:handoff', command: this.pendingShellHandoff },
                '*',
            );
            this.pendingShellHandoff = null;
        } catch (e) {
            console.warn('[warroom] Failed to hand off shell command to tactical map:', e);
        }
    }

    private async handleEmbeddedBridgeInvoke(event: MessageEvent): Promise<void> {
        const data = event.data as { id?: string; method?: string; args?: unknown[] } | null;
        if (!data || typeof data.id !== 'string' || typeof data.method !== 'string') return;
        const source = event.source;
        if (!source || typeof (source as WindowProxy).postMessage !== 'function') return;
        const target = source as WindowProxy;
        const origin = typeof event.origin === 'string' && event.origin !== 'null' ? event.origin : '*';
        const bridge = this.desktopBridge as DesktopBridge | null;
        const method = bridge?.[data.method];
        if (typeof method !== 'function') {
            target.postMessage({ type: 'awwv-bridge:response', id: data.id, ok: false, error: `Bridge method not found: ${data.method}` }, origin);
            return;
        }
        try {
            const args = Array.isArray(data.args) ? data.args : [];
            const result = await (method as (...fnArgs: unknown[]) => unknown)(...args);
            target.postMessage({ type: 'awwv-bridge:response', id: data.id, ok: true, result }, origin);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            target.postMessage({ type: 'awwv-bridge:response', id: data.id, ok: false, error: message }, origin);
        }
    }

    private broadcastEmbeddedBridgeEvent(eventName: string, payload: unknown): void {
        for (const [target, subscription] of this.embeddedBridgeSubscribers.entries()) {
            if (!subscription.events.has(eventName)) continue;
            try {
                target.postMessage(
                    { type: 'awwv-bridge:event', eventName, payload },
                    subscription.origin === 'null' ? '*' : subscription.origin,
                );
            } catch {
                this.embeddedBridgeSubscribers.delete(target);
            }
        }
    }

}

new WarroomApp();
