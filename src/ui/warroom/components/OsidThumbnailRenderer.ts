/**
 * OsidThumbnailRenderer — renders a small OSID-based territorial control map
 * onto a 2D canvas context. Used by the warroom cork board staff map.
 *
 * Design: looks like a hand-colored paper map pinned to cork board.
 * - Only the player's faction territory is colored (muted colored-pencil tones)
 * - Enemy territory is neutral/paper-colored
 * - Front lines drawn as dark pencil strokes
 * - BiH country outline in ink
 * - Paper grain noise + weathering for photorealism
 */

import type { FactionId, GameState } from '../../../state/game_state.js';
import crestArbihUrl from '../assets/crest_ARBiH.webp?url';
import crestVrsUrl from '../assets/crest_VRS.webp?url';
import crestHvoUrl from '../assets/crest_HVO.webp?url';

const ARMY_CREST_URLS: Record<string, string> = {
    RBiH: crestArbihUrl,
    RS: crestVrsUrl,
    HRHB: crestHvoUrl,
};

type Ring = [number, number][];
type PolygonCoords = Ring[];

interface OsidFeature {
    osid: string;
    rings: PolygonCoords;
}

// Muted colored-pencil tones — desaturated, semi-transparent
const PLAYER_FILL: Record<string, string> = {
    RBiH: 'rgba(60,120,65,0.40)',
    RS:   'rgba(160,70,60,0.40)',
    HRHB: 'rgba(65,100,155,0.40)',
};
// Neutral paper tone for non-player territories
const NEUTRAL_FILL = 'rgba(180,170,155,0.18)';

// Exterior edge (country border) — only edges touching exactly 1 OSID
const BORDER_COLOR = 'rgba(50,40,30,0.55)';
const FRONT_LINE_COLOR = 'rgba(35,20,10,0.65)';

export class OsidThumbnailRenderer {
    private features: OsidFeature[] = [];
    private bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    private staticControl: Record<string, string | null> = {};
    private liveControl: Record<string, string | null> | null = null;
    private playerFaction: FactionId | null = null;
    private loaded = false;
    /** Edge key → pair of OSIDs sharing that edge (internal edges). */
    private edgeToOsids: Map<string, [string, string]> = new Map();
    /** Edge key → single OSID (exterior/country border edges). */
    private borderEdges: Map<string, string> = new Map();
    /** Precomputed paper grain noise (generated once per size). */
    private grainCanvas: HTMLCanvasElement | null = null;
    private grainSize = { w: 0, h: 0 };
    /** Cached crest images keyed by faction. */
    private crestImages: Map<string, HTMLImageElement> = new Map();

    async load(): Promise<void> {
        if (this.loaded) return;
        try {
            const [geoRes, ctrlRes] = await Promise.all([
                fetch('/data/derived/operational/operational_settlements.geojson'),
                fetch('/data/derived/operational/operational_political_control.json'),
            ]);
            if (!geoRes.ok || !ctrlRes.ok) return;
            const geo = await geoRes.json();
            const ctrl = await ctrlRes.json();
            this.staticControl = ctrl.by_settlement_id ?? {};

            const edgeOwners = new Map<string, string[]>();
            for (const f of geo.features ?? []) {
                const osid = f.properties?.osid as string;
                if (!osid || !f.geometry) continue;
                const coords: PolygonCoords[] =
                    f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;

                const allRings: PolygonCoords = [];
                for (const poly of coords) {
                    for (const ring of poly) {
                        allRings.push(ring as Ring);
                        for (const [x, y] of ring as Ring) {
                            if (x < this.bounds.minX) this.bounds.minX = x;
                            if (x > this.bounds.maxX) this.bounds.maxX = x;
                            if (y < this.bounds.minY) this.bounds.minY = y;
                            if (y > this.bounds.maxY) this.bounds.maxY = y;
                        }
                        for (let i = 0; i < ring.length - 1; i++) {
                            const a = ring[i] as [number, number];
                            const b = ring[i + 1] as [number, number];
                            const kA = `${a[0].toFixed(6)},${a[1].toFixed(6)}`;
                            const kB = `${b[0].toFixed(6)},${b[1].toFixed(6)}`;
                            const ek = kA < kB ? `${kA}|${kB}` : `${kB}|${kA}`;
                            if (!edgeOwners.has(ek)) edgeOwners.set(ek, []);
                            const arr = edgeOwners.get(ek)!;
                            if (!arr.includes(osid)) arr.push(osid);
                        }
                    }
                }
                this.features.push({ osid, rings: allRings });
            }

            for (const [ek, osids] of edgeOwners) {
                if (osids.length === 2) {
                    this.edgeToOsids.set(ek, [osids[0], osids[1]]);
                } else if (osids.length === 1) {
                    this.borderEdges.set(ek, osids[0]);
                }
            }

            this.loaded = true;

            // Pre-load crest images (non-blocking)
            for (const [fac, url] of Object.entries(ARMY_CREST_URLS)) {
                const img = new Image();
                img.src = url;
                img.onload = () => this.crestImages.set(fac, img);
            }
        } catch {
            // Non-fatal
        }
    }

    setControlFromState(state: GameState): void {
        this.liveControl = state.political?.political_controllers ?? null;
    }

    setPlayerFaction(faction: FactionId): void {
        this.playerFaction = faction;
    }

    private getController(osid: string): string | null {
        if (this.liveControl) {
            const live = this.liveControl[osid];
            if (live !== undefined) return live;
        }
        return this.staticControl[osid] ?? null;
    }

    /**
     * Render a hand-colored staff map: player territory colored, front lines, BiH outline.
     */
    render(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
        if (!this.loaded || this.features.length === 0) return false;

        const { minX, minY, maxX, maxY } = this.bounds;
        const dataW = maxX - minX;
        const dataH = maxY - minY;
        if (dataW <= 0 || dataH <= 0) return false;

        const PAD = 4;
        const scale = Math.min((w - PAD * 2) / dataW, (h - PAD * 2) / dataH);
        const offsetX = (w - dataW * scale) / 2;
        const offsetY = (h - dataH * scale) / 2;
        const px = (x: number): number => (x - minX) * scale + offsetX;
        const py = (y: number): number => h - ((y - minY) * scale + offsetY);
        const pf = this.playerFaction;

        // 1. Fill polygons — player faction colored, others neutral
        for (const feat of this.features) {
            const ctrl = this.getController(feat.osid);
            if (ctrl === pf) {
                ctx.fillStyle = (pf && PLAYER_FILL[pf]) || NEUTRAL_FILL;
            } else {
                ctx.fillStyle = NEUTRAL_FILL;
            }
            ctx.beginPath();
            for (const ring of feat.rings) {
                for (let i = 0; i < ring.length; i++) {
                    const sx = px(ring[i][0]);
                    const sy = py(ring[i][1]);
                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.closePath();
            }
            ctx.fill();
        }

        // 2. Country outline (exterior edges — edges with only 1 OSID)
        ctx.strokeStyle = BORDER_COLOR;
        ctx.lineWidth = Math.max(1.0, scale * 0.0006);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (const ek of this.borderEdges.keys()) {
            const [partA, partB] = ek.split('|');
            const [ax, ay] = partA.split(',').map(Number);
            const [bx, by] = partB.split(',').map(Number);
            ctx.moveTo(px(ax), py(ay));
            ctx.lineTo(px(bx), py(by));
        }
        ctx.stroke();

        // 3. Front lines — shared edges between different controllers
        ctx.strokeStyle = FRONT_LINE_COLOR;
        ctx.lineWidth = Math.max(1.2, scale * 0.0007);
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (const [ek, [osidA, osidB]] of this.edgeToOsids) {
            const cA = this.getController(osidA);
            const cB = this.getController(osidB);
            if (!cA || !cB || cA === cB) continue;
            const [partA, partB] = ek.split('|');
            const [ax, ay] = partA.split(',').map(Number);
            const [bx, by] = partB.split(',').map(Number);
            ctx.moveTo(px(ax), py(ay));
            ctx.lineTo(px(bx), py(by));
        }
        ctx.stroke();

        // 4. Paper grain noise overlay — breaks up flat digital fill
        this.applyGrainOverlay(ctx, w, h);

        // 5. Subtle weathering
        this.renderWeathering(ctx, w, h);

        // 6. Faded crest stamp in bottom-right corner
        if (pf) this.renderCrestStamp(ctx, w, h, pf);

        return true;
    }

    /**
     * Paper grain: low-opacity random noise that simulates paper texture.
     * Generated once per canvas size, cached.
     */
    private applyGrainOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        const cw = Math.ceil(w);
        const ch = Math.ceil(h);
        if (!this.grainCanvas || this.grainSize.w !== cw || this.grainSize.h !== ch) {
            this.grainCanvas = document.createElement('canvas');
            this.grainCanvas.width = cw;
            this.grainCanvas.height = ch;
            const gCtx = this.grainCanvas.getContext('2d');
            if (!gCtx) return;
            const imgData = gCtx.createImageData(cw, ch);
            const d = imgData.data;
            // Deterministic noise via simple LCG (no Math.random)
            let seed = 48271;
            for (let i = 0; i < d.length; i += 4) {
                seed = (seed * 16807) % 2147483647;
                const v = (seed & 0xff);
                d[i] = v;
                d[i + 1] = v;
                d[i + 2] = v;
                d[i + 3] = 18; // very low opacity
            }
            gCtx.putImageData(imgData, 0, 0);
            this.grainSize = { w: cw, h: ch };
        }
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.4;
        ctx.drawImage(this.grainCanvas, 0, 0);
        ctx.restore();
    }

    private renderWeathering(ctx: CanvasRenderingContext2D, w: number, h: number): void {
        // Fold crease
        ctx.strokeStyle = 'rgba(120,100,70,0.06)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(0, h * 0.35);
        ctx.lineTo(w, h * 0.34);
        ctx.stroke();

        // Edge vignette
        const grad = ctx.createRadialGradient(
            w / 2, h / 2, Math.min(w, h) * 0.4,
            w / 2, h / 2, Math.max(w, h) * 0.7
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(80,60,30,0.05)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
    }

    /** Faded crest stamp in the bottom-right corner — like an official seal. */
    private renderCrestStamp(ctx: CanvasRenderingContext2D, w: number, h: number, faction: string): void {
        const img = this.crestImages.get(faction);
        if (!img || !img.complete || img.naturalWidth === 0) return;

        const stampSize = Math.min(w, h) * 0.28;
        const margin = stampSize * 0.2;
        const sx = w - stampSize - margin;
        const sy = h - stampSize - margin;

        ctx.save();
        // Faded, like an old rubber stamp impression
        ctx.globalAlpha = 0.12;
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(img, sx, sy, stampSize, stampSize);
        ctx.restore();
    }
}
