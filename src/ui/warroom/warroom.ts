import { GameState } from '../../state/game_state.js';
import { WallCalendar } from './components/WallCalendar.js';
import { TacticalMap } from './components/TacticalMap.js';
import { WarPlanningMap } from './components/WarPlanningMap.js';
import { DeskInstruments } from './components/DeskInstruments.js';
import { ClickableRegionManager } from './ClickableRegionManager.js';
import { HoverRenderer } from './HoverRenderer.js';
import { ModalManager } from './components/ModalManager.js';
// Asset URLs via Vite so dev server serves them from the module graph
import bgUrl from './assets/raw_sora/hq_base_stable_v1.png?url';
import crestRbihUrl from './assets/raw_sora/crest_rbih_v1_sora.png?url';
import crestRsUrl from './assets/raw_sora/crest_rs_v1_sora.png?url';
import crestHrhbUrl from './assets/raw_sora/crest_hrhb_v1_sora.png?url';

class WarroomApp {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private gameState: GameState | null = null;

    private calendar = new WallCalendar();
    private map = new TacticalMap();
    private warPlanningMap = new WarPlanningMap();
    private instruments = new DeskInstruments();
    private regionManager = new ClickableRegionManager();
    private hoverRenderer = new HoverRenderer();
    private modalManager = new ModalManager();

    private bgImage: HTMLImageElement | null = null;
    private crestImages: Map<string, HTMLImageElement> = new Map();

    constructor() {
        this.canvas = document.getElementById('warroom-canvas') as HTMLCanvasElement;
        this.canvas.width = 1920;
        this.canvas.height = 1080;
        this.ctx = this.canvas.getContext('2d')!;

        this.init();
    }

    async init() {
        // Load background (imported so Vite serves it in dev and bundles in build)
        this.bgImage = await this.loadImage(bgUrl);

        // Load component assets
        await Promise.all([
            this.calendar.loadAssets(),
            this.map.loadAssets(),
            this.instruments.loadAssets()
        ]);

        await this.loadCrestAssets();
        await this.regionManager.loadRegions('/data/ui/hq_clickable_regions.json');
        this.regionManager.setCanvasScale(this.canvas.width, this.canvas.height);
        this.regionManager.setModalManager(this.modalManager);
        this.regionManager.setTacticalMap(this.map);
        this.regionManager.setWarPlanningMap(this.warPlanningMap);
        this.regionManager.setMapSceneOpenHandler(() => this.showMapScene());
        this.regionManager.setOnGameStateChange((newState) => {
            this.gameState = newState;
            this.updateUIOverlay();
        });

        const mapScene = document.getElementById('map-scene');
        if (mapScene) {
            mapScene.appendChild(this.warPlanningMap.getContainer());
            this.warPlanningMap.setCloseCallback(() => this.showWarroomScene());
        }
        await this.warPlanningMap.loadData();

        // Load a default save or wait for socket/fetch
        await this.loadMockState();

        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('click', (e) => this.onClick(e));

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
            console.log(`Loading image: ${src}`);
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
        document.getElementById('val-phase')!.textContent = (this.gameState.meta.phase || '--').toUpperCase();
        document.getElementById('val-turn')!.textContent = this.gameState.meta.turn.toString();
        this.warPlanningMap.setControlFromState(this.gameState);
        this.warPlanningMap.setGameState(this.gameState);
    }

    renderLoop() {
        this.render();
        requestAnimationFrame(() => this.renderLoop());
    }

    render() {
        if (!this.gameState) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw HQ Background
        if (this.bgImage) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.canvas.width, this.canvas.height);
        }

        this.renderCrest(this.gameState);

        // 2. Draw wall elements
        // Draw Tactical Map onto the designated wall area
        const mapCanvas = this.map.render(this.gameState);
        const mapBounds = this.regionManager.getScaledRegionById('wall_map');
        if (mapBounds) {
            this.ctx.drawImage(
                mapCanvas,
                mapBounds.bounds.x,
                mapBounds.bounds.y,
                mapBounds.bounds.width,
                mapBounds.bounds.height
            );
        } else {
            this.ctx.drawImage(mapCanvas, 200, 80, 1200, 800);
        }

        // Draw Wall Calendar
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
        } else {
            this.ctx.drawImage(calCanvas, 1450, 100, 300, 225);
        }

        // 3. Draw Desk Instruments
        this.instruments.render(this.ctx, this.gameState);

        const hoveredRegion = this.regionManager.getHoveredRegion();
        if (hoveredRegion) {
            this.hoverRenderer.renderHighlight(this.ctx, hoveredRegion);
        }
    }

    private async loadCrestAssets() {
        const entries: Array<[string, string]> = [
            ['RBiH', crestRbihUrl],
            ['RS', crestRsUrl],
            ['HRHB', crestHrhbUrl]
        ];
        const loaded = await Promise.all(entries.map(async ([id, src]) => [id, await this.loadImage(src)] as const));
        for (const [id, img] of loaded) {
            this.crestImages.set(id, img);
        }
    }

    private renderCrest(state: GameState) {
        const crestBounds = this.regionManager.getScaledRegionById('national_crest');
        if (!crestBounds) return;
        const factionId = state.factions[0]?.id;
        if (!factionId) return;
        const crest = this.crestImages.get(factionId);
        if (!crest) return;
        this.ctx.drawImage(
            crest,
            crestBounds.bounds.x,
            crestBounds.bounds.y,
            crestBounds.bounds.width,
            crestBounds.bounds.height
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

    /** Scene swap: show warroom, hide map scene. */
    private showWarroomScene(): void {
        const warroomScene = document.getElementById('warroom-scene');
        const mapScene = document.getElementById('map-scene');
        if (mapScene) {
            mapScene.classList.add('map-scene-hidden');
            mapScene.setAttribute('aria-hidden', 'true');
        }
        if (warroomScene) {
            warroomScene.classList.remove('warroom-scene-hidden');
            warroomScene.setAttribute('aria-hidden', 'false');
        }
    }

    private onMouseMove(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        this.regionManager.onMouseMove(canvasX, canvasY, e.clientX, e.clientY, this.canvas);
    }

    private onClick(e: MouseEvent) {
        if (!this.gameState) return;
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        this.regionManager.onClick(canvasX, canvasY, this.gameState);
    }
}

new WarroomApp();
