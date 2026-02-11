import { HoverRegion } from './ClickableRegionManager.js';

export class HoverRenderer {
    renderHighlight(ctx: CanvasRenderingContext2D, hover: HoverRegion): void {
        const { bounds, region } = hover;
        ctx.save();

        switch (region.hover_style) {
            case 'red_outline':
                ctx.strokeStyle = 'rgb(200, 20, 20)';
                ctx.lineWidth = 3;
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                break;
            case 'glow':
                ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.lineWidth = 2;
                ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
                break;
            case 'magnifying_glass_cursor':
            case 'none':
            default:
                break;
        }

        ctx.restore();
    }
}
