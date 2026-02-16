import { HoverRegion, RegionBounds } from './ClickableRegionManager.js';

export class HoverRenderer {
    renderHighlight(ctx: CanvasRenderingContext2D, hover: HoverRegion): void {
        const { bounds, region, scaledPolygon } = hover;
        ctx.save();

        switch (region.hover_style) {
            case 'red_outline':
                ctx.strokeStyle = 'rgb(200, 20, 20)';
                ctx.lineWidth = 3;
                this.strokeShape(ctx, bounds, scaledPolygon);
                break;
            case 'glow':
                ctx.shadowColor = 'rgba(255, 255, 0, 0.8)';
                ctx.shadowBlur = 15;
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
                ctx.lineWidth = 2;
                this.strokeShape(ctx, bounds, scaledPolygon);
                break;
            case 'magnifying_glass_cursor':
            case 'none':
            default:
                break;
        }

        ctx.restore();
    }

    private strokeShape(
        ctx: CanvasRenderingContext2D,
        bounds: RegionBounds,
        polygon?: [number, number][]
    ): void {
        if (polygon && polygon.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(polygon[0][0], polygon[0][1]);
            for (let i = 1; i < polygon.length; i++) {
                ctx.lineTo(polygon[i][0], polygon[i][1]);
            }
            ctx.closePath();
            ctx.stroke();
        } else {
            ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
        }
    }
}
