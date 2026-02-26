import { BaseComponent } from './BaseComponent.js';
import type { FormationView } from '../types.js';
import type { HoIMapRenderer } from '../renderer/HoIMapRenderer.js';

export interface FormationOverlayState {
    formations: FormationView[];
    selectedFormationId: string | null;
}

export class FormationOverlayLayer extends BaseComponent {
    public onFormationClick?: (id: string) => void;
    private state: FormationOverlayState = { formations: [], selectedFormationId: null };
    private markerEls: Map<string, HTMLElement> = new Map();
    private renderer: HoIMapRenderer | null = null;
    private isVisible = true;

    constructor(container: HTMLElement) {
        super(container, 'div', 'formation-overlay-layer');
        this.el.style.position = 'absolute';
        this.el.style.top = '0';
        this.el.style.left = '0';
        this.el.style.width = '100%';
        this.el.style.height = '100%';
        this.el.style.pointerEvents = 'none'; // Let clicks pass through to WebGL proxies
        this.el.style.overflow = 'hidden';
        this.el.style.zIndex = '10';
    }

    setRenderer(renderer: HoIMapRenderer) {
        this.renderer = renderer;
        // Register the sync hook so markers move when the camera moves
        this.renderer.onRenderSync = () => this.syncPositions();
    }

    setState(state: Partial<FormationOverlayState>) {
        Object.assign(this.state, state);
        this.render();
    }

    private static formatStrength(n: number): string {
        if (n < 1000) return String(n);
        return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    }

    private getReadinessColor(readiness: string): string {
        switch (readiness) {
            case 'active': return '#4CAF50';
            case 'forming': return '#FFC107';
            case 'overextended': return '#FF9800';
            case 'degraded': return '#F44336';
            default: return '#9E9E9E';
        }
    }

    render(): void {
        if (!this.renderer) return;

        this.isVisible = this.renderer.getLayerVisibility().formations;
        this.el.style.display = this.isVisible ? 'block' : 'none';

        if (!this.isVisible) return;

        const currentIds = new Set(this.state.formations.map((f) => f.id));

        // Remove stale markers
        for (const [id, el] of this.markerEls.entries()) {
            if (!currentIds.has(id)) {
                el.remove();
                this.markerEls.delete(id);
            }
        }

        // Build or update markers
        for (const f of this.state.formations) {
            let markerEl = this.markerEls.get(f.id);
            if (!markerEl) {
                markerEl = document.createElement('div');
                markerEl.className = 'hoi-formation-marker';
                this.el.appendChild(markerEl);
                this.markerEls.set(f.id, markerEl);
            }

            const isSelected = f.id === this.state.selectedFormationId;
            const isDimmed = this.state.selectedFormationId !== null && !isSelected;

            markerEl.style.opacity = isDimmed ? '0.25' : '1';
            markerEl.classList.toggle('selected', isSelected);
            markerEl.classList.toggle('is-corps', f.kind === 'corps' || f.kind === 'army_hq');

            // Update inner HTML
            const factionClass = `faction-${f.faction.toLowerCase()}`;
            const readinessColor = this.getReadinessColor(f.readiness || 'active');
            const posture = f.posture || 'defend';
            const isCorps = f.kind === 'corps' || f.kind === 'army_hq';

            markerEl.onclick = (e) => {
                e.stopPropagation(); // Don't let canvas panning trigger
                this.onFormationClick?.(f.id);
            };

            let strengthStr = '';
            if (isCorps) {
                const count = f.subordinateIds ? f.subordinateIds.length : 0;
                strengthStr = `×${count}`;
            } else {
                strengthStr = FormationOverlayLayer.formatStrength(f.personnel || 800);
            }

            markerEl.innerHTML = `
        <div class="marker-box ${factionClass}">
          <div class="readiness-glow" style="border-color: ${readinessColor}"></div>
          <div class="posture-stripe posture-${posture}"></div>
          <div class="nato-symbol">${isCorps ? 'XX' : '▬'}</div>
          <div class="strength">${strengthStr}</div>
        </div>
        <div class="name-label">${f.name}</div>
      `;
        }

        this.syncPositions();
    }

    private syncPositions() {
        if (!this.renderer || !this.isVisible) return;

        // We only update visibility state once per frame if it changed
        if (this.isVisible !== this.renderer.getLayerVisibility().formations) {
            this.isVisible = this.renderer.getLayerVisibility().formations;
            this.el.style.display = this.isVisible ? 'block' : 'none';
            if (!this.isVisible) return;
        }

        const isStrategicZoom = this.renderer.getZoom() >= 2.6; // Matches ZOOM_CORPS_ONLY_THRESHOLD

        for (const f of this.state.formations) {
            const el = this.markerEls.get(f.id);
            if (!el) continue;

            const isCorps = f.kind === 'corps' || f.kind === 'army_hq';
            const showWhenZoomedOut = isCorps; // In HoIMapRenderer it was m.showWhenZoomedOut ?? m.isCorps

            if (isStrategicZoom && !showWhenZoomedOut) {
                el.style.display = 'none';
                continue;
            }

            let worldPos: [number, number, number] | null = null;
            const osidOrSid = f.location_osid || f.hq_sid;
            if (osidOrSid) {
                worldPos = this.renderer.getWorldPositionForSettlement(osidOrSid);
            } else if (isCorps) {
                // Calculate centroid of subordinates
                let sumX = 0, sumY = 0, sumZ = 0;
                let count = 0;
                const subIds = f.subordinateIds ?? this.state.formations.filter((s) => s.corps_id === f.id).map((s) => s.id);
                for (const bid of subIds) {
                    const b = this.state.formations.find((s) => s.id === bid);
                    if (!b) continue;
                    const bLoc = b.location_osid || b.hq_sid;
                    if (!bLoc) continue;
                    const bPos = this.renderer.getWorldPositionForSettlement(bLoc);
                    if (!bPos) continue;
                    sumX += bPos[0]; sumY += bPos[1]; sumZ += bPos[2];
                    count++;
                }
                if (count > 0) worldPos = [sumX / count, sumY / count, sumZ / count];
            }

            if (!worldPos) {
                el.style.display = 'none';
                continue;
            }

            const screenPos = this.renderer.worldToScreenSpace(worldPos);
            if (!screenPos) {
                el.style.display = 'none';
                continue;
            }

            el.style.display = 'block';
            // Center the marker horizontally and vertically on the point
            el.style.transform = `translate(calc(${screenPos.x}px - 50%), calc(${screenPos.y}px - 50%))`;
        }
    }
}
