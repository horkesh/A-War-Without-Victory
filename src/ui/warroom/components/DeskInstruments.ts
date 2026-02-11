import { GameState } from '../../../state/game_state.js';

export class DeskInstruments {
    private props: Map<string, HTMLImageElement> = new Map();
    // Set to true to visualise the new prop positions over the old background
    public renderBakedProps = true;

    // Coordinates matching hq_clickable_regions.json / Brief
    // RECALIBRATED for hq_base_stable_v1.png (shifted up ~180-220px)
    private readonly propConfigs = {
        phone: { x: 100, y: 640, w: 380, h: 214, label: "PHONE" },
        newspaper: { x: 550, y: 700, w: 324, h: 165, label: "NEWSPAPER" },
        magazine: { x: 950, y: 650, w: 202, h: 251, label: "MAGAZINE" },
        reports: { x: 1210, y: 710, w: 316, h: 203, label: "REPORTS" },
        radio: { x: 1540, y: 630, w: 304, h: 177, label: "RADIO" }
    };

    constructor() { }

    async loadAssets() {
        // Attempt to load sprites. If missing, we'll fall back to placeholders.
        // Paths should match where we EXPECT generated assets to be.
        const assets = [
            { key: 'phone', path: '/assets/raw_sora/phone_rotary_red_v1.png' },
            { key: 'newspaper', path: '/assets/raw_sora/sprite_newspaper.png' }, // Reverted to placeholder until asset available
            { key: 'magazine', path: '/assets/raw_sora/sprite_magazine.png' },
            { key: 'reports', path: '/assets/raw_sora/sprite_reports.png' },
            { key: 'radio', path: '/assets/raw_sora/20260204_0932_Image Generation_simple_compose_01kgkwfp1ye97tekvdx70w47t8.png' } // Moved user asset here
        ];

        for (const asset of assets) {
            try {
                const img = await this.loadImage(asset.path);
                this.props.set(asset.key, img);
            } catch (e) {
                console.warn(`Failed to load asset ${asset.key} from ${asset.path}, using placeholder.`);
            }
        }
    }

    private loadImage(src: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    render(ctx: CanvasRenderingContext2D, state: GameState) {
        if (!this.renderBakedProps) {
            return;
        }

        this.renderProp(ctx, 'phone', this.propConfigs.phone);
        this.renderProp(ctx, 'newspaper', this.propConfigs.newspaper);
        this.renderProp(ctx, 'magazine', this.propConfigs.magazine);
        this.renderProp(ctx, 'reports', this.propConfigs.reports);
        this.renderProp(ctx, 'radio', this.propConfigs.radio);
    }

    private renderProp(ctx: CanvasRenderingContext2D, key: string, config: { x: number, y: number, w: number, h: number, label: string }) {
        const img = this.props.get(key);
        if (img) {
            ctx.drawImage(img, config.x, config.y, config.w, config.h);
        } else {
            // Render Placeholder
            ctx.save();
            ctx.fillStyle = 'rgba(0, 255, 255, 0.2)'; // Cyan semi-transparent
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
            ctx.lineWidth = 2;
            ctx.fillRect(config.x, config.y, config.w, config.h);
            ctx.strokeRect(config.x, config.y, config.w, config.h);

            ctx.fillStyle = '#fff';
            ctx.font = 'bold 20px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(config.label, config.x + config.w / 2, config.y + config.h / 2);
            ctx.restore();
        }
    }
}
