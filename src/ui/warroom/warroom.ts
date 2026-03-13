import type { FactionId, GameState } from '../../state/game_state.js';
import { deserializeState } from '../../state/serialize.js';
import { ClickableRegionManager } from './ClickableRegionManager.js';
import { HoverRenderer } from './HoverRenderer.js';
import { ModalManager } from './components/ModalManager.js';
import { SettingsModal } from './components/SettingsModal.js';

import { NewspaperModal } from './components/NewspaperModal.js';
import { Phase0PreparationMap } from './components/Phase0PreparationMap.js';
import { TacticalMap } from './components/TacticalMap.js';
import { WallCalendar } from './components/WallCalendar.js';
import { WarPlanningMap } from './components/WarPlanningMap.js';
import { setScenarioStartDate, turnToCalendarMonthYear, turnToShortLabel } from './components/warroom_utils.js';
// Asset URLs via Vite so dev server serves them from the module graph
import bgUrl from './assets/hq_background_v3.png?url';
import hqRbih1991Url from './assets/hq_rbih_1991.webp?url';
import hqRbih1992Url from './assets/hq_rbih_1992.webp?url';
import hqRbih1993Url from './assets/hq_rbih_1993.webp?url';
import hqRbih1994Url from './assets/hq_rbih_1994.webp?url';
import hqRbih1995Url from './assets/hq_rbih_1995.webp?url';
// Flag assets — drawn dynamically on the wall per player faction
import flagHrhbUrl from './assets/flag_HRHB.png?url';
import flagRbihUrl from './assets/flag_RBiH.png?url';
import flagRsUrl from './assets/flag_RS.png?url';
// Scenario briefing images
import scnApr1992Url from './assets/scenarios/apr1992_briefing.png?url';
import scnSep1991Url from './assets/scenarios/sep1991_briefing.png?url';
// Main menu background (game start screen)
import gameStartBgUrl from './assets/game start.png?url';

type CampaignScenarioKey = 'sep_1991' | 'apr_1992';

/** Display resolution for runtime: half of authoring (2752×1536) to reduce decode and canvas memory. Region JSON stays 2752×1536; hit-test scales automatically. */
const WARROOM_SCENE_WIDTH = 1376;
const WARROOM_SCENE_HEIGHT = 768;
const WARROOM_CALENDAR_REGION_IDS = ['wall_calendar_area', 'wall_calendar'] as const;

const DEFAULT_REGIONS_URL = '/data/ui/hq_clickable_regions.json';
/** If this file exists, it is used when no faction-specific file is available. */
const OVERRIDE_REGIONS_URL = '/data/ui/hq_clickable_regions_override.json';

/** URL for faction-specific region file: hq_rbih_clickable_regions.json, hq_rs_clickable_regions.json, hq_hrhb_clickable_regions.json */
function getFactionRegionsUrl(faction: FactionId): string {
    return `/data/ui/hq_${faction.toLowerCase()}_clickable_regions.json`;
}

async function resolveRegionsUrl(): Promise<string> {
    const w = typeof window !== 'undefined' ? (window as unknown as { __awwvWarroomRegionsUrl?: string }) : undefined;
    if (w?.__awwvWarroomRegionsUrl) return w.__awwvWarroomRegionsUrl;
    try {
        const r = await fetch(OVERRIDE_REGIONS_URL);
        if (r.ok) return OVERRIDE_REGIONS_URL;
    } catch {
        // ignore
    }
    return DEFAULT_REGIONS_URL;
}

function getInitialRegionCandidates(): string[] {
    return [
        OVERRIDE_REGIONS_URL,
        DEFAULT_REGIONS_URL,
        getFactionRegionsUrl('RBiH'),
        getFactionRegionsUrl('RS'),
        getFactionRegionsUrl('HRHB')
    ];
}
/** Year-keyed plate URLs per faction. Plates switch each April. */
const WARROOM_YEAR_PLATE_URLS: Record<FactionId, Record<number, string>> = {
    RBiH: { 1991: hqRbih1991Url, 1992: hqRbih1992Url, 1993: hqRbih1993Url, 1994: hqRbih1994Url, 1995: hqRbih1995Url },
    RS:   { 1991: bgUrl },
    HRHB: { 1991: bgUrl }
};

/** Given a calendar year from the current turn, return the plate year (latest available <= calendarYear). */
function getPlateYear(faction: FactionId, calendarYear: number): number {
    const years = Object.keys(WARROOM_YEAR_PLATE_URLS[faction] ?? {}).map(Number).sort((a, b) => a - b);
    let best = years[0] ?? 1991;
    for (const y of years) {
        if (y <= calendarYear) best = y;
    }
    return best;
}

interface DesktopBridge {
    startNewCampaign?: (payload: { playerFaction: FactionId; scenarioKey: CampaignScenarioKey }) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
    setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
    getCurrentGameState?: () => Promise<string | null>;
    openTacticalMapWindow?: (payload?: { mode?: 'operational' | 'sandbox' }) => Promise<unknown>;
    assignCommander?: (officerId: string, corpsId: string) => Promise<{ ok: boolean; error?: string }>;
    [key: string]: unknown;
}

class WarroomApp {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameState: GameState | null = null;

    private calendar = new WallCalendar();
    private map = new TacticalMap();
    private warPlanningMap = new WarPlanningMap();
    private phase0PreparationMap = new Phase0PreparationMap();
    private regionManager = new ClickableRegionManager();
    private hoverRenderer = new HoverRenderer();
    private modalManager = new ModalManager();

    /** Keyed by "faction:year" e.g. "RBiH:1992" */
    private scenePlateImages: Map<string, HTMLImageElement> = new Map();
    private flagImages: Map<string, HTMLImageElement> = new Map();
    private desktopBridge: DesktopBridge | null = null;
    /** Faction chosen in step 2, used when step 3 fires. */
    private pendingFaction: FactionId | null = null;
    /** Tactical map iframe (lazily created on first open). */
    private tacticalMapIframe: HTMLIFrameElement | null = null;
    private tacticalMapReady = false;
    /** HTTP base URL for the tactical map server (set at init from Electron IPC). */
    private mapServerUrl: string | null = null;
    /** Embedded iframe subscribers to game-state-updated bridge events. */
    private embeddedBridgeSubscribers = new Map<WindowProxy, string>();
    private phase0StartBriefShown = false;
    /** True once the user has navigated away from the initial main menu (prevents init race). */
    private userNavigatedFromMenu = false;
    /** Faction for which we last loaded region data (so we only reload when faction changes). */
    private lastLoadedRegionsFaction: FactionId | null = null;

    constructor() {
        this.canvas = document.getElementById('warroom-canvas') as HTMLCanvasElement;
        // Match the canonical warroom scene-plate resolution.
        this.canvas.width = WARROOM_SCENE_WIDTH;
        this.canvas.height = WARROOM_SCENE_HEIGHT;
        this.ctx = this.canvas.getContext('2d')!;

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
        this.wireScenarioPickerButtons();

        // Load scene-plate, component assets, and runtime overlays in parallel.
        await Promise.all([
            this.loadScenePlateAssets(),
            this.calendar.loadAssets(),
            this.map.loadAssets(),
            this.loadFlagAssets()
        ]);

        await this.loadInitialRegions();
        this.regionManager.setCanvasScale(this.canvas.width, this.canvas.height);
        this.regionManager.setModalManager(this.modalManager);
        this.regionManager.setTacticalMap(this.map);
        this.regionManager.setWarPlanningMap(this.warPlanningMap);
        this.regionManager.setPhase0PreparationMap(this.phase0PreparationMap);
        this.regionManager.setMapSceneOpenHandler(() => this.showMapScene());
        this.regionManager.setTacticalMapOpenHandler(() => this.showTacticalMapScene());

        this.regionManager.setOnGameStateChange((newState) => {
            this.gameState = newState;
            const faction = (newState.meta.player_faction ?? newState.factions[0]?.id ?? 'RBiH') as FactionId;
            void this.ensureRegionsLoadedForFaction(faction);
            this.updateUIOverlay();
        });

        const mapScene = document.getElementById('map-scene');
        if (mapScene) {
            mapScene.appendChild(this.warPlanningMap.getContainer());
            this.warPlanningMap.setCloseCallback(() => this.showWarroomScene());
            mapScene.appendChild(this.phase0PreparationMap.getContainer());
            this.phase0PreparationMap.setCloseCallback(() => this.showWarroomScene());
        }
        this.wireToolbar();
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));

        // Listen for "back to HQ" messages from the embedded tactical map iframe
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'awwv-back-to-hq') {
                this.showWarroomScene();
                return;
            }
            if (e.data?.type === 'awwv-bridge:subscribe-game-state') {
                this.handleEmbeddedBridgeSubscription(e);
                return;
            }
            if (e.data?.type === 'awwv-bridge:invoke') {
                void this.handleEmbeddedBridgeInvoke(e);
            }
        });

        await this.warPlanningMap.loadData();
        await this.phase0PreparationMap.loadData();

        // Resolve tactical map HTTP server URL (set by Electron main process).
        // MapLibre requires http:// origin; its Web Workers don't work under awwv://.
        if (this.desktopBridge && typeof (this.desktopBridge as Record<string, unknown>).getMapServerUrl === 'function') {
            try {
                const url = await (this.desktopBridge as { getMapServerUrl: () => Promise<string | null> }).getMapServerUrl();
                if (url) this.mapServerUrl = url.replace(/\/+$/, '');
            } catch (_) { /* not available — fallback to awwv:// */ }
        }
        if (this.desktopBridge?.setGameStateUpdatedCallback) {
            this.desktopBridge.setGameStateUpdatedCallback((stateJson: string) => {
                this.applyGameStateFromJson(stateJson);
                this.broadcastEmbeddedBridgeEvent('game-state-updated', stateJson);
            });
        }

        const existingStateJson = this.desktopBridge?.getCurrentGameState
            ? await this.desktopBridge.getCurrentGameState()
            : null;

        if (existingStateJson) {
            this.applyGameStateFromJson(existingStateJson);
        } else if (!this.desktopBridge?.startNewCampaign) {
            // Browser/dev mode fallback
            await this.loadMockState();
        } else if (!this.userNavigatedFromMenu) {
            // Only show main menu if the user hasn't already navigated away
            // during the async init (e.g. clicked "New Campaign" while assets loaded).
            this.showMainMenu();
        }

        this.renderLoop();
    }

    private async loadScenePlateAssets() {
        const tasks: Array<Promise<[string, HTMLImageElement]>> = [];
        for (const [faction, yearMap] of Object.entries(WARROOM_YEAR_PLATE_URLS)) {
            for (const [year, url] of Object.entries(yearMap)) {
                const key = `${faction}:${year}`;
                tasks.push(this.loadImage(url).then(img => [key, img]));
            }
        }
        const loaded = await Promise.all(tasks);
        for (const [key, image] of loaded) {
            this.scenePlateImages.set(key, image);
        }
    }

    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => {
                console.error(`Failed to load image: ${src}`, e);
                reject(new Error(`Failed to load image: ${src}`));
            };
            img.src = src;
        });
    }

    async loadMockState() {
        const politicalControllers = await this.loadInitialPoliticalControllers();

        // September 1991 starting state (Phase 0); minimal shape for runPhase0Turn
        this.gameState = {
  schema_version: 1,
  meta: { turn: 0, seed: 'start_1991_09', phase: 'peace' },
  factions: [
                { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null },
                { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null },
                { id: 'HRHB', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null }
            ],
  military: {
    formations: {},
    front_segments: {},
    front_posture: {},
    front_posture_regions: {},
    front_pressure: {},
    militia_pools: {}
  } as any,
  political: {
    political_controllers: politicalControllers,
    municipalities: {},
    negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
    ceasefire: {},
    negotiation_ledger: [],
    supply_rights: { corridors: [] }
  } as any,
} as unknown as GameState;

        setScenarioStartDate(this.gameState.meta.scenario_start_date);
        this.updateUIOverlay();
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
        const playerFaction = (this.gameState.meta.player_faction ?? this.gameState.factions[0]?.id ?? 'RBiH') as FactionId;
        this.warPlanningMap.setControlFromState(this.gameState);
        this.warPlanningMap.setGameState(this.gameState);
        this.warPlanningMap.setPlayerFaction(playerFaction);
        this.phase0PreparationMap.setGameState(this.gameState);
        this.phase0PreparationMap.setPlayerFaction(playerFaction);
        this.regionManager.phase0Directives = this.phase0PreparationMap.getDirectiveState();
        this.updateToolbarTurnDisplay();
        this.maybeShowPhase0StartingBrief();
    }

    private getDesktopBridge(): DesktopBridge | null {
        return (window as unknown as { awwv?: DesktopBridge }).awwv ?? null;
    }

    private applyGameStateFromJson(stateJson: string): void {
        try {
            this.gameState = deserializeState(stateJson);
            const faction = (this.gameState.meta.player_faction ?? this.gameState.factions[0]?.id ?? 'RBiH') as FactionId;
            void this.ensureRegionsLoadedForFaction(faction);
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
                    this.showScreen('none');
                }
            }, 0);
        } catch (error) {
            console.error('Failed to apply game state JSON in warroom', error);
        }
    }

    private maybeShowPhase0StartingBrief(): void {
        if (!this.gameState) return;
        if (this.phase0StartBriefShown) return;
        if (this.gameState.meta.phase !== 'peace' || this.gameState.meta.turn !== 0) return;
        this.phase0StartBriefShown = true;
        const brief = new NewspaperModal(this.gameState, { startBrief: true });
        this.modalManager.showModal(brief.render());
    }

    // ── 3-step campaign flow: Main Menu → Side Picker → Scenario Picker ──

    /** Show a specific overlay screen and hide others. */
    private showScreen(screenId: 'main-menu' | 'side-picker' | 'scenario-picker' | 'none'): void {
        const screens = ['main-menu', 'side-picker', 'scenario-picker'];
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
                this.showWarroomScene();
            }
        }
    }

    /** STEP 1: Show the main menu title screen. */
    private showMainMenu(): void {
        this.showScreen('main-menu');
        // Enable "Continue" only if a game is already loaded
        const continueBtn = document.getElementById('mm-continue') as HTMLButtonElement | null;
        if (continueBtn) continueBtn.disabled = !this.gameState;
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

    /** STEP 3: Show the scenario picker. */
    private showScenarioPicker(): void {
        this.showScreen('scenario-picker');

        // Defer scenario image loads
        const scenarioImages: Record<string, string> = { apr1992: scnApr1992Url, sep1991: scnSep1991Url };
        setTimeout(() => {
            for (const [key, src] of Object.entries(scenarioImages)) {
                const img = document.getElementById(`scn-img-${key}`) as HTMLImageElement | null;
                if (img) {
                    img.src = src;
                    img.onerror = () => { img.style.display = 'none'; };
                }
            }
        }, 0);
    }

    /** Wire main menu button handlers. */
    private wireMainMenuButtons(): void {
        const newCampaignBtn = document.getElementById('mm-new-campaign');
        const loadSaveBtn = document.getElementById('mm-load-save');
        const loadReplayBtn = document.getElementById('mm-load-replay');
        const continueBtn = document.getElementById('mm-continue');

        if (newCampaignBtn) {
            newCampaignBtn.onclick = () => this.showSidePicker();
        }
        if (continueBtn) {
            continueBtn.onclick = () => {
                if (this.gameState) this.showScreen('none');
            };
        }
        // Load Save / Load Replay — placeholder for now
        if (loadSaveBtn) {
            loadSaveBtn.onclick = () => {
                console.log('[warroom] Load Save — not yet implemented');
            };
        }
        if (loadReplayBtn) {
            loadReplayBtn.onclick = () => {
                console.log('[warroom] Load Replay — not yet implemented');
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

        for (const btn of factionButtons) {
            btn.onclick = () => {
                const faction = btn.dataset.faction as FactionId | undefined;
                if (!faction) return;
                if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }
                this.pendingFaction = faction;
                this.showScenarioPicker();
            };
        }
    }

    /** Wire scenario picker (step 3) button handlers. */
    private wireScenarioPickerButtons(): void {
        const backBtn = document.getElementById('scn-back');
        const scenarioButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.scn-option'));
        const errorEl = document.getElementById('scn-error');

        if (backBtn) {
            backBtn.onclick = () => this.showSidePicker();
        }

        const showError = (msg: string) => {
            if (errorEl) { errorEl.textContent = msg; errorEl.classList.remove('hidden'); }
        };

        for (const btn of scenarioButtons) {
            btn.onclick = async () => {
                const scenarioKey = btn.dataset.scenario as CampaignScenarioKey | undefined;
                if (!scenarioKey || !this.pendingFaction) return;

                if (!this.desktopBridge?.startNewCampaign) {
                    showError('Desktop bridge unavailable.');
                    return;
                }

                // Disable all scenario buttons during loading
                for (const b of scenarioButtons) b.disabled = true;
                if (errorEl) { errorEl.textContent = ''; errorEl.classList.add('hidden'); }

                try {
                    const result = await this.desktopBridge.startNewCampaign({
                        playerFaction: this.pendingFaction,
                        scenarioKey,
                    });
                    if (!result?.ok) {
                        showError(result?.error ?? 'Failed to start campaign.');
                        return;
                    }
                    if (result.stateJson) {
                        this.applyGameStateFromJson(result.stateJson);
                    }
                } catch (error) {
                    showError(error instanceof Error ? error.message : String(error));
                } finally {
                    for (const b of scenarioButtons) b.disabled = false;
                }
            };
        }
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
                if (this.gameState?.meta.phase === 'peace') {
                    this.showMapScene();
                    this.phase0PreparationMap.show();
                    return;
                }
                this.showTacticalMapScene('operational');
            };
        }
        if (sandboxBtn) {
            sandboxBtn.onclick = () => this.showTacticalMapScene('sandbox');
        }
        if (investBtn) {
            investBtn.onclick = () => {
                if (!this.gameState || this.gameState.meta.phase !== 'peace') return;
                this.showMapScene();
                this.phase0PreparationMap.show();
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
                panel.style.maxWidth = '500px';
                panel.innerHTML = `
                    <h2>WARROOM CONTROLS</h2>
                    <div class="wr-dialog-body" style="text-align: left; line-height: 2;">
                        <div><strong style="color: #00e878;">Desk Map</strong> &mdash; Open tactical map</div>
                        <div><strong style="color: #00e878;">Sandbox</strong> &mdash; Open tactical sandbox mode</div>
                        <div><strong style="color: #00e878;">Calendar</strong> &mdash; Advance turn</div>
                        <div><strong style="color: #00e878;">Telephone</strong> &mdash; Diplomacy (war only)</div>
                        <div><strong style="color: #00e878;">Flag</strong> &mdash; Faction overview</div>
                        <div><strong style="color: #00e878;">Newspapers</strong> &mdash; Current events</div>
                        <div><strong style="color: #00e878;">Military Hat</strong> &mdash; Intelligence report</div>
                        <div><strong style="color: #00e878;">Report Stack</strong> &mdash; Turn reports</div>
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
        const phase = this.gameState.meta.phase === 'peace' ? 'Pre-War'
            : this.gameState.meta.phase === 'war' ? 'Peace phase'
                : 'War phase';
        el.textContent = `Turn ${turn} \u2014 ${label} \u2014 ${phase}`;
        const investBtn = document.getElementById('wr-btn-invest') as HTMLButtonElement | null;
        if (investBtn) {
            investBtn.style.display = this.gameState.meta.phase === 'peace' ? '' : 'none';
        }
    }

    renderLoop() {
        this.render();
        requestAnimationFrame(() => this.renderLoop());
    }

    render() {
        if (!this.gameState) return;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const playerFaction = (this.gameState.meta.player_faction ?? this.gameState.factions[0]?.id ?? 'RBiH') as FactionId;
        const calYear = turnToCalendarMonthYear(this.gameState.meta.turn).year;
        const plateYear = getPlateYear(playerFaction, calYear);
        const scenePlate = this.scenePlateImages.get(`${playerFaction}:${plateYear}`)
            ?? this.scenePlateImages.get(`RBiH:${plateYear}`)
            ?? this.scenePlateImages.get('RBiH:1991')
            ?? null;

        this.ctx.clearRect(0, 0, W, H);

        // 1. Background (all props baked in)
        if (scenePlate) {
            this.ctx.drawImage(scenePlate, 0, 0, W, H);
        }

        // 2. Runtime overlays: calendar only (flag is baked into room art per WARROOM_MASTER / clean-room handover)

        const calMY = turnToCalendarMonthYear(this.gameState.meta.turn);
        const calCanvas = this.calendar.render({
            month: calMY.month,
            year: calMY.year,
            currentTurn: this.gameState.meta.turn,
            startTurn: 0
        });
        const calendarBounds = WARROOM_CALENDAR_REGION_IDS
            .map((regionId) => this.regionManager.getScaledRegionById(regionId))
            .find((region) => region != null);
        if (calendarBounds && !this.regionManager.isCalendarBakedInArt()) {
            this.ctx.drawImage(
                calCanvas,
                calendarBounds.bounds.x,
                calendarBounds.bounds.y,
                calendarBounds.bounds.width,
                calendarBounds.bounds.height
            );
        }

        // 3. Hover highlight
        const hoveredRegion = this.regionManager.getHoveredRegion();
        if (hoveredRegion) {
            this.hoverRenderer.renderHighlight(this.ctx, hoveredRegion);
        }
    }

    private async loadFlagAssets() {
        const entries: Array<[string, string]> = [
            ['RBiH', flagRbihUrl],
            ['RS', flagRsUrl],
            ['HRHB', flagHrhbUrl]
        ];
        const loaded = await Promise.all(entries.map(async ([id, src]) => [id, await this.loadImage(src)] as const));
        for (const [id, img] of loaded) {
            this.flagImages.set(id, img);
        }
    }

    /**
     * Load some region data during startup, but never let a missing default file
     * abort warroom init. This keeps the menu/campaign flow alive even when the
     * shared regions file is intentionally removed in favor of per-faction files.
     */
    private async loadInitialRegions(): Promise<void> {
        const explicitUrl = await resolveRegionsUrl();
        const candidates = explicitUrl === DEFAULT_REGIONS_URL
            ? getInitialRegionCandidates()
            : [explicitUrl];

        for (const url of candidates) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                await this.regionManager.loadRegions(url);
                return;
            } catch {
                // Try the next candidate.
            }
        }

        console.warn('[warroom] No initial region file found; continuing without regions until faction-specific data loads.');
    }

    /** Load faction-specific region file when player faction is known; fall back to default if missing. */
    private async ensureRegionsLoadedForFaction(faction: FactionId): Promise<void> {
        if (this.lastLoadedRegionsFaction === faction) return;
        const url = getFactionRegionsUrl(faction);
        try {
            const r = await fetch(url);
            if (r.ok) {
                await this.regionManager.loadRegions(url);
                this.lastLoadedRegionsFaction = faction;
                return;
            }
        } catch {
            // ignore
        }
        try {
            await this.regionManager.loadRegions(DEFAULT_REGIONS_URL);
            this.lastLoadedRegionsFaction = faction;
        } catch {
            // keep previous regions if default also fails
        }
    }

    /** Scene swap: show map scene (full-screen), hide warroom. */
    private showMapScene(): void {
        const desk = document.getElementById('warroom-desk');
        const mapScene = document.getElementById('map-scene');
        if (desk) desk.classList.add('warroom-desk-hidden');
        if (mapScene) {
            mapScene.classList.remove('map-scene-hidden');
            mapScene.setAttribute('aria-hidden', 'false');
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
        this.reRegisterWarroomCallback();
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
    private async showTacticalMapScene(mode: 'operational' | 'sandbox' = 'operational'): Promise<void> {
        const isElectron = !!(window as unknown as { awwv?: unknown }).awwv;
        if (!isElectron) {
            // Dev/browser: cross-origin prevents meaningful iframe interaction
            const devUrl = mode === 'sandbox'
                ? 'http://localhost:3002/tactical_sandbox.html'
                : 'http://localhost:3002/';
            window.open(devUrl, '_blank');
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
        const targetSrc = mode === 'sandbox'
            ? `${mapBaseUrl}/tactical_sandbox.html?embedded=1&${cacheBuster}`
            : `${mapBaseUrl}/index.html?embedded=1&${cacheBuster}`;

        // Lazily create iframe on first open
        if (!this.tacticalMapIframe) {
            const iframe = document.createElement('iframe');
            iframe.id = 'tactical-map-iframe';
            iframe.setAttribute('allowfullscreen', '');
            iframe.src = targetSrc;

            iframe.onload = () => {
                this.tacticalMapReady = true;
                this.injectBridgeIntoTacticalMap(iframe);
            };

            tacticalScene.appendChild(iframe);
            this.tacticalMapIframe = iframe;
        } else if (this.tacticalMapIframe.src !== targetSrc) {
            this.tacticalMapReady = false;
            this.tacticalMapIframe.src = targetSrc;
        } else if (this.tacticalMapReady) {
            // Push latest game state to existing iframe
            this.injectBridgeIntoTacticalMap(this.tacticalMapIframe);
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

    /**
     * When returning from tactical map to warroom, re-register the warroom's
     * own game state callback (the iframe may have overwritten it).
     */
    private reRegisterWarroomCallback(): void {
        if (this.desktopBridge?.setGameStateUpdatedCallback) {
            this.desktopBridge.setGameStateUpdatedCallback((stateJson: string) => {
                this.applyGameStateFromJson(stateJson);
                this.broadcastEmbeddedBridgeEvent('game-state-updated', stateJson);
            });
        }
    }

    private handleEmbeddedBridgeSubscription(event: MessageEvent): void {
        const source = event.source;
        if (!source || typeof (source as WindowProxy).postMessage !== 'function') return;
        const enabled = Boolean((event.data as { enabled?: boolean })?.enabled);
        const origin = typeof event.origin === 'string' ? event.origin : '*';
        if (enabled) {
            this.embeddedBridgeSubscribers.set(source as WindowProxy, origin);
        } else {
            this.embeddedBridgeSubscribers.delete(source as WindowProxy);
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
        for (const [target, origin] of this.embeddedBridgeSubscribers.entries()) {
            try {
                target.postMessage({ type: 'awwv-bridge:event', eventName, payload }, origin === 'null' ? '*' : origin);
            } catch {
                this.embeddedBridgeSubscribers.delete(target);
            }
        }
    }

    private onMouseMove(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;
        this.regionManager.onMouseMove(canvasX, canvasY, e.clientX, e.clientY, this.canvas);
    }

    private onClick(e: MouseEvent) {
        if (!this.gameState) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const canvasX = (e.clientX - rect.left) * scaleX;
        const canvasY = (e.clientY - rect.top) * scaleY;
        this.regionManager.onClick(canvasX, canvasY, this.gameState);
    }
}

new WarroomApp();
