import { BaseComponent } from './BaseComponent.js';
import type { FormationView } from '../types.js';
import type { HoIMapRenderer } from '../renderer/HoIMapRenderer.js';

export interface FormationOverlayState {
    formations: FormationView[];
    selectedFormationId: string | null;
}

export class FormationOverlayLayer extends BaseComponent {
    public onFormationClick?: (id: string | null) => void;
    private state: FormationOverlayState = { formations: [], selectedFormationId: null };
    private markerEls: Map<string, HTMLElement> = new Map();
    private renderer: HoIMapRenderer | null = null;
    private isVisible = true;
    /** Front data for biasing marker positions toward front-active edges. */
    private frontActiveOsids: Set<string> = new Set();
    private controlBySettlement: Record<string, string | null> = {};
    private adjacency: Map<string, string[]> = new Map();

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

    /**
     * Set front data for biasing marker positions toward front-active edges.
     * Front-active = the brigade's OSID has a neighbor controlled by an opposing faction.
     */
    setFrontData(
        controlBySettlement: Record<string, string | null>,
        adjacency: Map<string, string[]>,
    ): void {
        this.controlBySettlement = controlBySettlement;
        this.adjacency = adjacency;
        // Build set of front-active OSIDs: those with at least one neighbor under different control
        this.frontActiveOsids.clear();
        for (const [osid, neighbors] of adjacency.entries()) {
            const ctrl = controlBySettlement[osid];
            if (!ctrl) continue;
            for (const nb of neighbors) {
                const nbCtrl = controlBySettlement[nb];
                if (nbCtrl && nbCtrl !== ctrl) {
                    this.frontActiveOsids.add(osid);
                    break;
                }
            }
        }
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
                // Toggle: re-clicking the selected formation deselects it
                if (this.state.selectedFormationId === f.id) {
                    this.onFormationClick?.(null);
                } else {
                    this.onFormationClick?.(f.id);
                }
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
        if (!this.renderer) return;

        // We only update visibility state once per frame if it changed
        if (this.isVisible !== this.renderer.getLayerVisibility().formations) {
            this.isVisible = this.renderer.getLayerVisibility().formations;
            this.el.style.display = this.isVisible ? 'block' : 'none';
        }

        if (!this.isVisible) return;

        const isStrategicZoom = this.renderer.getZoom() >= 2.6; // Matches ZOOM_CORPS_ONLY_THRESHOLD

        // Group formations by location key
        const groups = new Map<string, FormationView[]>();

        for (const f of this.state.formations) {
            const el = this.markerEls.get(f.id);
            if (!el) continue;

            const isCorps = f.kind === 'corps' || f.kind === 'army_hq';
            if (isStrategicZoom && !isCorps) {
                el.style.display = 'none';
                continue;
            }

            const osidOrSid = f.location_osid || f.hq_sid;
            const locKey = osidOrSid || `corps_${f.id}`;
            const group = groups.get(locKey) ?? [];
            group.push(f);
            groups.set(locKey, group);
        }

        for (const [locKey, items] of groups.entries()) {
            if (items.length === 0) continue;

            const first = items[0]!;
            const isCorps = first.kind === 'corps' || first.kind === 'army_hq';
            const osidOrSid = first.location_osid || first.hq_sid;

            let worldPos: [number, number, number] | null = null;
            if (osidOrSid) {
                worldPos = this.renderer.getWorldPositionForSettlement(osidOrSid);
                // Front-bias: shift brigade markers toward front-facing neighbors
                if (worldPos && !isCorps && this.frontActiveOsids.has(osidOrSid)) {
                    const neighbors = this.adjacency.get(osidOrSid);
                    const myCtrl = this.controlBySettlement[osidOrSid];
                    if (neighbors && myCtrl) {
                        let fSumX = 0, fSumY = 0, fSumZ = 0, fCount = 0;
                        for (const nb of neighbors) {
                            const nbCtrl = this.controlBySettlement[nb];
                            if (nbCtrl && nbCtrl !== myCtrl) {
                                const nbPos = this.renderer.getWorldPositionForSettlement(nb);
                                if (nbPos) {
                                    fSumX += nbPos[0]; fSumY += nbPos[1]; fSumZ += nbPos[2];
                                    fCount++;
                                }
                            }
                        }
                        if (fCount > 0) {
                            // Blend 30% toward the front
                            const blend = 0.3;
                            worldPos = [
                                worldPos[0] + blend * (fSumX / fCount - worldPos[0]),
                                worldPos[1] + blend * (fSumY / fCount - worldPos[1]),
                                worldPos[2] + blend * (fSumZ / fCount - worldPos[2]),
                            ];
                        }
                    }
                }
            } else if (isCorps) {
                // Calculate centroid of subordinates
                let sumX = 0, sumY = 0, sumZ = 0;
                let count = 0;
                const subIds = first.subordinateIds ?? this.state.formations.filter((s) => s.corps_id === first.id).map((s) => s.id);
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
                for (const f of items) {
                    const el = this.markerEls.get(f.id);
                    if (el) el.style.display = 'none';
                }
                continue;
            }

            const screenPos = this.renderer.worldToScreenSpace(worldPos);
            if (!screenPos) {
                for (const f of items) {
                    const el = this.markerEls.get(f.id);
                    if (el) el.style.display = 'none';
                }
                continue;
            }

            // Determine if the stack is "expanded"
            const isExpanded = items.some(f => f.id === this.state.selectedFormationId);

            // Stable sort so the top card is predictably the same
            items.sort((a, b) => {
                const isCorpsA = a.kind === 'corps' || a.kind === 'army_hq' ? 0 : 1;
                const isCorpsB = b.kind === 'corps' || b.kind === 'army_hq' ? 0 : 1;
                if (isCorpsA !== isCorpsB) return isCorpsA - isCorpsB;
                return (a.name || '').localeCompare(b.name || '');
            });

            const count = items.length;

            for (let i = 0; i < count; i++) {
                const f = items[i]!;
                const el = this.markerEls.get(f.id);
                if (!el) continue;

                el.style.display = 'block';

                let offsetX = 0;
                let offsetY = 0;
                let zIndex = 10;

                if (count > 1) {
                    if (isExpanded) {
                        el.classList.add('stack-expanded');
                        // Vertical list, centered on screenPos
                        const spacing = 28; // height of marker + some margin
                        const totalHeight = (count - 1) * spacing;
                        const startY = -totalHeight / 2;
                        offsetY = startY + i * spacing;
                        zIndex = 100 + i;
                    } else {
                        el.classList.remove('stack-expanded');
                        // Deck of cards stack: i=0 at front
                        const shift = 4;
                        offsetX = i * shift;
                        offsetY = -i * shift;
                        zIndex = 50 - i;
                    }
                } else {
                    el.classList.remove('stack-expanded');
                }

                el.style.zIndex = String(zIndex);
                el.style.transform = `translate(calc(${screenPos.x + offsetX}px - 50%), calc(${screenPos.y + offsetY}px - 50%))`;
            }
        }
    }
}
