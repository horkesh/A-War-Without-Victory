import { deserializeState } from '../../state/serialize.js';
import type { GameState, FactionId } from '../../state/game_state.js';
import { WallCalendar } from './components/WallCalendar.js';
import { TacticalMap } from './components/TacticalMap.js';
import { WarPlanningMap } from './components/WarPlanningMap.js';
import { Phase0PreparationMap } from './components/Phase0PreparationMap.js';
import { ClickableRegionManager } from './ClickableRegionManager.js';
import { HoverRenderer } from './HoverRenderer.js';
import { ModalManager } from './components/ModalManager.js';
import { NewspaperModal } from './components/NewspaperModal.js';
// Asset URLs via Vite so dev server serves them from the module graph
import bgUrl from './assets/hq_background_v3.png?url';
// Flag assets — drawn dynamically on the wall per player faction
import flagRbihUrl from './assets/flag_RBiH.png?url';
import flagRsUrl from './assets/flag_RS.png?url';
import flagHrhbUrl from './assets/flag_HRHB.png?url';
// Scenario briefing images
import scnApr1992Url from './assets/scenarios/apr1992_briefing.png?url';
import scnSep1991Url from './assets/scenarios/sep1991_briefing.png?url';
// Main menu background
import gameStartBgUrl from './assets/game start.png?url';

type CampaignScenarioKey = 'sep_1991' | 'apr_1992';

interface DesktopBridge {
    startNewCampaign?: (payload: { playerFaction: FactionId; scenarioKey: CampaignScenarioKey }) => Promise<{ ok: boolean; error?: string; stateJson?: string }>;
    setGameStateUpdatedCallback?: (cb: (stateJson: string) => void) => void;
    getCurrentGameState?: () => Promise<string | null>;
    openTacticalMapWindow?: () => Promise<unknown>;
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

    private bgImage: HTMLImageElement | null = null;
    private flagImages: Map<string, HTMLImageElement> = new Map();
    private desktopBridge: DesktopBridge | null = null;
    /** Faction chosen in step 2, used when step 3 fires. */
    private pendingFaction: FactionId | null = null;
    /** Tactical map iframe (lazily created on first open). */
    private tacticalMapIframe: HTMLIFrameElement | null = null;
    private tacticalMapReady = false;
    private phase0StartBriefShown = false;

    constructor() {
        this.canvas = document.getElementById('warroom-canvas') as HTMLCanvasElement;
        // Match the background's native resolution (hq_background_v3.png)
        this.canvas.width = 2752;
        this.canvas.height = 1536;
        this.ctx = this.canvas.getContext('2d')!;

        this.init();
    }

    async init() {
        // Load background
        this.bgImage = await this.loadImage(bgUrl);

        // Load component assets and flag images in parallel
        await Promise.all([
            this.calendar.loadAssets(),
            this.map.loadAssets(),
            this.loadFlagAssets()
        ]);

        await this.regionManager.loadRegions('/data/ui/hq_clickable_regions.json');
        this.regionManager.setCanvasScale(this.canvas.width, this.canvas.height);
        this.regionManager.setModalManager(this.modalManager);
        this.regionManager.setTacticalMap(this.map);
        this.regionManager.setWarPlanningMap(this.warPlanningMap);
        this.regionManager.setPhase0PreparationMap(this.phase0PreparationMap);
        this.regionManager.setMapSceneOpenHandler(() => this.showMapScene());
        this.regionManager.setTacticalMapOpenHandler(() => this.showTacticalMapScene());

        this.regionManager.setOnGameStateChange((newState) => {
            this.gameState = newState;
            this.updateUIOverlay();
        });

        const mapScene = document.getElementById('map-scene');
        if (mapScene) {
            mapScene.appendChild(this.warPlanningMap.getContainer());
            this.warPlanningMap.setCloseCallback(() => this.showWarroomScene());
            mapScene.appendChild(this.phase0PreparationMap.getContainer());
            this.phase0PreparationMap.setCloseCallback(() => this.showWarroomScene());
        }
        await this.warPlanningMap.loadData();
        await this.phase0PreparationMap.loadData();

        this.desktopBridge = this.getDesktopBridge();
        if (this.desktopBridge?.setGameStateUpdatedCallback) {
            this.desktopBridge.setGameStateUpdatedCallback((stateJson: string) => {
                this.applyGameStateFromJson(stateJson);
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
        } else {
            this.showMainMenu();
        }

        // Wire the 3-step campaign flow
        this.wireMainMenuButtons();
        this.wireSidePickerButtons();
        this.wireScenarioPickerButtons();
        this.wireToolbar();

        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));

        // Listen for "back to HQ" messages from the embedded tactical map iframe
        window.addEventListener('message', (e) => {
            if (e.data?.type === 'awwv-back-to-hq') {
                this.showWarroomScene();
            }
        });

        this.renderLoop();
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
            meta: { turn: 0, seed: 'start_1991_09', phase: 'phase_0' },
            factions: [
                { id: 'RBiH', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null },
                { id: 'RS', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null },
                { id: 'HRHB', profile: { authority: 1, legitimacy: 1, control: 1, logistics: 1, exhaustion: 0 }, areasOfResponsibility: [], supply_sources: [], command_capacity: 0, negotiation: { pressure: 0, last_change_turn: null, capital: 0, spent_total: 0, last_capital_change_turn: null }, declaration_pressure: 0, declared: false, declaration_turn: null }
            ],
            political_controllers: politicalControllers,
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            municipalities: {},
            negotiation_status: { ceasefire_active: false, ceasefire_since_turn: null, last_offer_turn: null },
            ceasefire: {},
            negotiation_ledger: [],
            supply_rights: { corridors: [] }
        } as unknown as GameState;

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
            this.hideAllOverlays();
            this.updateUIOverlay();
        } catch (error) {
            console.error('Failed to apply game state JSON in warroom', error);
        }
    }

    private maybeShowPhase0StartingBrief(): void {
        if (!this.gameState) return;
        if (this.phase0StartBriefShown) return;
        if (this.gameState.meta.phase !== 'phase_0' || this.gameState.meta.turn !== 0) return;
        this.phase0StartBriefShown = true;
        const brief = new NewspaperModal(this.gameState, { startBrief: true });
        this.modalManager.showModal(brief.render());
    }

    // ── 3-step campaign flow: Main Menu → Side Picker → Scenario Picker ──

    /** Hide all overlay screens. */
    private hideAllOverlays(): void {
        for (const id of ['main-menu', 'side-picker', 'scenario-picker']) {
            document.getElementById(id)?.classList.add('mm-hidden');
        }
    }

    /** STEP 1: Show the main menu title screen. */
    private showMainMenu(): void {
        this.hideAllOverlays();
        const menu = document.getElementById('main-menu');
        if (menu) menu.classList.remove('mm-hidden');

        // Enable "Continue" only if a game is already loaded
        const continueBtn = document.getElementById('mm-continue') as HTMLButtonElement | null;
        if (continueBtn) continueBtn.disabled = !this.gameState;
    }

    /** STEP 2: Show the side picker (faction selection). */
    private showSidePicker(): void {
        this.hideAllOverlays();
        const picker = document.getElementById('side-picker');
        if (picker) picker.classList.remove('mm-hidden');

        // Populate flag images from Vite imports
        const flagMap: Record<string, string> = {
            RBiH: flagRbihUrl,
            RS: flagRsUrl,
            HRHB: flagHrhbUrl,
        };
        for (const [fid, url] of Object.entries(flagMap)) {
            const img = document.getElementById(`sp-flag-${fid}`) as HTMLImageElement | null;
            if (img) {
                img.src = url;
                img.alt = `${fid} flag`;
                img.onerror = () => { img.style.display = 'none'; };
            }
        }
    }

    /** STEP 3: Show the scenario picker. */
    private showScenarioPicker(): void {
        this.hideAllOverlays();
        const picker = document.getElementById('scenario-picker');
        if (picker) picker.classList.remove('mm-hidden');

        // Set scenario images via Vite imports
        const scenarioImages: Record<string, string> = {
            apr1992: scnApr1992Url,
            sep1991: scnSep1991Url,
        };
        for (const [key, src] of Object.entries(scenarioImages)) {
            const img = document.getElementById(`scn-img-${key}`) as HTMLImageElement | null;
            if (img) {
                img.src = src;
                img.onerror = () => { img.style.display = 'none'; };
            }
        }
    }

    /** Wire main menu button handlers. */
    private wireMainMenuButtons(): void {
        // Apply background image to main menu screen
        const mainMenu = document.getElementById('main-menu');
        if (mainMenu) {
            mainMenu.style.backgroundImage = `url(${gameStartBgUrl})`;
            mainMenu.style.backgroundSize = 'cover';
            mainMenu.style.backgroundPosition = 'center';
        }

        const newCampaignBtn = document.getElementById('mm-new-campaign');
        const loadSaveBtn = document.getElementById('mm-load-save');
        const loadReplayBtn = document.getElementById('mm-load-replay');
        const continueBtn = document.getElementById('mm-continue');

        if (newCampaignBtn) {
            newCampaignBtn.onclick = () => this.showSidePicker();
        }
        if (continueBtn) {
            continueBtn.onclick = () => {
                if (this.gameState) this.hideAllOverlays();
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
        const investBtn = document.getElementById('wr-btn-invest');
        const settingsBtn = document.getElementById('wr-btn-settings');
        const helpBtn = document.getElementById('wr-btn-help');

        if (menuBtn) {
            menuBtn.onclick = () => this.showMainMenu();
        }
        if (mapBtn) {
            mapBtn.onclick = () => this.showTacticalMapScene();
        }
        if (investBtn) {
            investBtn.onclick = () => {
                if (!this.gameState || this.gameState.meta.phase !== 'phase_0') return;
                this.showMapScene();
                this.phase0PreparationMap.show();
            };
        }
        if (settingsBtn) {
            settingsBtn.onclick = () => {
                if (!this.modalManager) return;
                const panel = document.createElement('div');
                panel.className = 'wr-dialog';
                panel.innerHTML = `
                    <h2>SETTINGS</h2>
                    <div class="wr-dialog-notice">Settings panel coming soon.</div>
                `;
                this.modalManager.showModal(panel);
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
        // Sep 1991 + turn weeks
        const startDate = new Date(1991, 8, 1); // Sep 1 1991
        startDate.setDate(startDate.getDate() + turn * 7);
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const label = `${months[startDate.getMonth()]} ${startDate.getFullYear()}`;
        const phase = this.gameState.meta.phase === 'phase_0' ? 'Pre-War'
            : this.gameState.meta.phase === 'phase_i' ? 'Phase I'
            : 'Phase II';
        el.textContent = `Turn ${turn} \u2014 ${label} \u2014 ${phase}`;
        const investBtn = document.getElementById('wr-btn-invest') as HTMLButtonElement | null;
        if (investBtn) {
            investBtn.style.display = this.gameState.meta.phase === 'phase_0' ? '' : 'none';
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

        this.ctx.clearRect(0, 0, W, H);

        // 1. Background (all props baked in)
        if (this.bgImage) {
            this.ctx.drawImage(this.bgImage, 0, 0, W, H);
        }

        // 2. Dynamic overlays: flag + calendar content
        this.renderFlag(this.gameState);

        const calCanvas = this.calendar.render({
            month: 9,
            year: 1991,
            currentTurn: this.gameState.meta.turn,
            startTurn: 0
        });
        const calendarBounds = this.regionManager.getScaledRegionById('wall_calendar');
        if (calendarBounds) {
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

    private renderFlag(state: GameState) {
        const flagRegion = this.regionManager.getScaledRegionById('faction_flag');
        if (!flagRegion) return;
        const factionId = state.meta.player_faction ?? state.factions[0]?.id;
        if (!factionId) return;
        const flag = this.flagImages.get(factionId);
        if (!flag) return;
        this.ctx.drawImage(
            flag,
            flagRegion.bounds.x,
            flagRegion.bounds.y,
            flagRegion.bounds.width,
            flagRegion.bounds.height
        );
    }

    /** Scene swap: show map scene (full-screen), hide warroom. */
    private showMapScene(): void {
        const warroomScene = document.getElementById('warroom-scene');
        const mapScene = document.getElementById('map-scene');
        if (warroomScene) {
            warroomScene.classList.add('warroom-scene-hidden');
            warroomScene.setAttribute('aria-hidden', 'true');
        }
        if (mapScene) {
            mapScene.classList.remove('map-scene-hidden');
            mapScene.setAttribute('aria-hidden', 'false');
        }
    }

    /** Scene swap: show warroom, hide all other scenes. */
    private showWarroomScene(): void {
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
        if (warroomScene) {
            warroomScene.classList.remove('warroom-scene-hidden');
            warroomScene.setAttribute('aria-hidden', 'false');
        }
        // Re-register warroom's game state callback (tactical map iframe may have overwritten it)
        // and pull the latest game state (player may have advanced turns in the tactical map)
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
     * In Electron: embeds tactical_map.html via awwv:// protocol (same origin).
     * In dev/browser: opens the tactical map in a new tab (cross-origin prevents iframe embedding).
     */
    private showTacticalMapScene(): void {
        const isElectron = !!(window as unknown as { awwv?: unknown }).awwv;
        if (!isElectron) {
            // Dev/browser: cross-origin prevents meaningful iframe interaction
            window.open('http://localhost:3001', '_blank');
            return;
        }

        const tacticalScene = document.getElementById('tactical-map-scene');
        if (!tacticalScene) return;

        // Lazily create iframe on first open
        if (!this.tacticalMapIframe) {
            const iframe = document.createElement('iframe');
            iframe.id = 'tactical-map-iframe';
            iframe.setAttribute('allowfullscreen', '');
            // Serve tactical map under warroom origin so iframe is same-origin
            // and can inherit window.parent.awwv bridge for IPC
            iframe.src = 'awwv://warroom/tactical-map/tactical_map.html?embedded=1';

            iframe.onload = () => {
                this.tacticalMapReady = true;
                this.injectBridgeIntoTacticalMap(iframe);
            };

            tacticalScene.appendChild(iframe);
            this.tacticalMapIframe = iframe;
        } else if (this.tacticalMapReady) {
            // Push latest game state to existing iframe
            this.injectBridgeIntoTacticalMap(this.tacticalMapIframe);
        }

        // Scene swap: hide warroom, show tactical map
        const warroomScene = document.getElementById('warroom-scene');
        if (warroomScene) {
            warroomScene.classList.add('warroom-scene-hidden');
            warroomScene.setAttribute('aria-hidden', 'true');
        }
        tacticalScene.classList.remove('tactical-map-scene-hidden');
        tacticalScene.setAttribute('aria-hidden', 'false');
    }

    /**
     * Post-load setup for the tactical map iframe.
     * The bridge is inherited via the inline script in tactical_map.html (?embedded=1).
     * This method handles edge cases and ensures menu/button state is correct.
     */
    private injectBridgeIntoTacticalMap(iframe: HTMLIFrameElement): void {
        try {
            const iframeWindow = iframe.contentWindow as (Window & { awwv?: Record<string, unknown> }) | null;
            if (!iframeWindow) return;

            // Ensure the "Back to HQ" button is visible (inline script handles this too)
            const hqBtn = iframeWindow.document.getElementById('btn-back-to-hq');
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
            });
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
