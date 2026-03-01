/**
 * Settlement Merger tool entry point.
 * Loads canonical settlements, applies Mostar split, initializes all modules.
 */

import * as turf from '@turf/turf';
import { MergerState } from './merger/MergerState.js';
import { MergerRenderer } from './merger/MergerRenderer.js';
import { MergerSidebar } from './merger/MergerSidebar.js';
import { MergerExporter } from './merger/MergerExporter.js';
import type { CanonicalFeature, ContactEdge } from './merger/types.js';

const MAJORITY_THRESHOLD = 0.40;

/** Compute ethnic key from population fields (same logic as derive script). */
function getEthnicKey(p: CanonicalFeature['properties']): string {
    const tot = p.population_total || 0;
    if (tot === 0) return 'X';
    const bPct = (p.population_bosniaks || 0) / tot;
    const sPct = (p.population_serbs || 0) / tot;
    const cPct = (p.population_croats || 0) / tot;
    if (bPct >= MAJORITY_THRESHOLD) return 'B';
    if (sPct >= MAJORITY_THRESHOLD) return 'S';
    if (cPct >= MAJORITY_THRESHOLD) return 'C';
    const max = Math.max(bPct, sPct, cPct);
    if (bPct === max) return 'Bm';
    if (sPct === max) return 'Sm';
    return 'Cm';
}

async function init(): Promise<void> {
    const statusEl = document.getElementById('merger-status')!;
    const toolbarInfo = document.getElementById('toolbar-info')!;
    const tooltipEl = document.getElementById('merger-tooltip')!;

    statusEl.textContent = 'Loading settlement data...';

    // ── 1. Fetch data ──
    const [geoRes, graphRes, mapRes] = await Promise.all([
        fetch('/data/derived/settlements_wgs84_1990.geojson'),
        fetch('/data/derived/settlement_contact_graph.json'),
        fetch('/data/derived/operational/canonical_to_operational_map.json'),
    ]);
    const geojson = await geoRes.json();
    const graphData = await graphRes.json();
    const canonicalEdges: ContactEdge[] = graphData.edges;
    const canonicalMap: Record<string, string> = await mapRes.json();

    // ── 2. Build features map and apply Mostar split ──
    const features = new Map<string, CanonicalFeature>();
    const municipalities = new Map<string, string>();

    // Build adjacency from contact graph first
    const adjacency = new Map<string, Set<string>>();
    for (const edge of canonicalEdges) {
        if (!adjacency.has(edge.a)) adjacency.set(edge.a, new Set());
        if (!adjacency.has(edge.b)) adjacency.set(edge.b, new Set());
        adjacency.get(edge.a)!.add(edge.b);
        adjacency.get(edge.b)!.add(edge.a);
    }

    let mostarSplit = false;
    for (const f of geojson.features) {
        const p = f.properties;
        municipalities.set(p.mun1990_id, p.mun1990_name);

        // Mostar split (Phase 0 from derive script)
        if (p.mun1990_id === 'mostar' && p.settlement_name === 'Mostar') {
            try {
                const bb = turf.bbox(f);
                const splitLon = 17.810;

                const westBox = turf.polygon([[[bb[0], bb[1]], [splitLon, bb[1]], [splitLon, bb[3]], [bb[0], bb[3]], [bb[0], bb[1]]]]);
                const eastBox = turf.polygon([[[splitLon, bb[1]], [bb[2], bb[1]], [bb[2], bb[3]], [splitLon, bb[3]], [splitLon, bb[1]]]]);
                const westGeom = turf.intersect(turf.featureCollection([f, westBox]));
                const eastGeom = turf.intersect(turf.featureCollection([f, eastBox]));

                if (westGeom && eastGeom) {
                    const B = p.population_bosniaks || 0;
                    const C = p.population_croats || 0;
                    const S = p.population_serbs || 0;
                    const O = p.population_others || 0;
                    const westB = Math.floor(B * 0.20);
                    const westC = Math.floor(C * 0.75);
                    const westS = Math.floor(S * 0.55);
                    const westO = Math.floor(O * 0.55);

                    const westSid = p.sid + '_W';
                    const eastSid = p.sid + '_E';

                    const westFeature: CanonicalFeature = {
                        type: 'Feature',
                        geometry: westGeom.geometry as any,
                        properties: {
                            ...p,
                            sid: westSid,
                            settlement_name: 'Mostar Zapad',
                            population_total: westB + westC + westS + westO,
                            population_bosniaks: westB,
                            population_croats: westC,
                            population_serbs: westS,
                            population_others: westO,
                            ethnic_key: 'C',
                        },
                    };
                    const eastFeature: CanonicalFeature = {
                        type: 'Feature',
                        geometry: eastGeom.geometry as any,
                        properties: {
                            ...p,
                            sid: eastSid,
                            settlement_name: 'Mostar Istok',
                            population_total: (B - westB) + (C - westC) + (S - westS) + (O - westO),
                            population_bosniaks: B - westB,
                            population_croats: C - westC,
                            population_serbs: S - westS,
                            population_others: O - westO,
                            ethnic_key: 'B',
                        },
                    };

                    features.set(westSid, westFeature);
                    features.set(eastSid, eastFeature);

                    // Update adjacency
                    const origNeighbors = adjacency.get(p.sid) || new Set<string>();
                    adjacency.set(westSid, new Set([...origNeighbors, eastSid]));
                    adjacency.set(eastSid, new Set([...origNeighbors, westSid]));
                    adjacency.delete(p.sid);
                    // Update reverse references
                    for (const [, nset] of adjacency) {
                        if (nset.has(p.sid)) {
                            nset.delete(p.sid);
                            nset.add(westSid);
                            nset.add(eastSid);
                        }
                    }

                    mostarSplit = true;
                    continue;
                }
            } catch (e) {
                console.warn('Mostar split failed:', e);
            }
        }

        // Normal settlement
        const feat: CanonicalFeature = {
            type: 'Feature',
            geometry: f.geometry,
            properties: { ...p, ethnic_key: getEthnicKey(p) },
        };
        features.set(p.sid, feat);
    }

    console.log(`Loaded ${features.size} settlements (Mostar split: ${mostarSplit})`);
    statusEl.textContent = `Loaded ${features.size} settlements across ${municipalities.size} municipalities`;
    toolbarInfo.textContent = `${features.size} settlements | ${municipalities.size} municipalities`;

    // ── 3. Initialize state ──
    const state = new MergerState(features, adjacency, municipalities);

    // ── 3b. Import existing merge groups from derive script output ──
    state.importFromCanonicalMap(canonicalMap);
    console.log(`Imported ${state.mergeGroups.size} merge groups (${state.sidToOsid.size} merged settlements)`);
    statusEl.textContent = `Loaded ${features.size} settlements — imported ${state.mergeGroups.size} existing merge groups`;

    // ── 4. Initialize renderer ──
    const canvasWrap = document.getElementById('merger-canvas-wrap')!;
    const renderer = new MergerRenderer(canvasWrap, state);

    // ── 5. Initialize sidebar ──
    const sidebarEl = document.getElementById('merger-sidebar')!;
    const sidebar = new MergerSidebar(sidebarEl, state, async () => {
        statusEl.textContent = 'Exporting...';
        try {
            const result = await MergerExporter.export(state, canonicalEdges);
            MergerExporter.downloadFile(result.geojson, 'operational_settlements.geojson', 'application/geo+json');
            MergerExporter.downloadFile(result.mapping, 'canonical_to_operational_map.json', 'application/json');
            MergerExporter.downloadFile(result.contactGraph, 'operational_contact_graph.json', 'application/json');
            statusEl.textContent = `Exported 3 files (${state.mergeGroups.size} groups, ${features.size - state.sidToOsid.size} singletons)`;
        } catch (e) {
            console.error('Export failed:', e);
            statusEl.textContent = 'Export failed — see console for details.';
        }
    });

    // ── 6. Wire events ──
    sidebar.setMunChangeCallback((munId) => {
        if (munId) {
            renderer.zoomToMunicipality(munId);
        } else {
            renderer.zoomToFit();
        }
    });

    renderer.setClickCallback((sid) => {
        if (sid) {
            const osid = state.sidToOsid.get(sid);
            if (osid) {
                // Settlement belongs to a merge group — show that group
                sidebar.expandGroup(osid);
            } else if (state.focusedGroupOsid) {
                // A group is focused and user clicked an unmerged settlement — add it to the group
                state.addToGroup(state.focusedGroupOsid, sid);
            } else {
                state.toggleSelection(sid);
            }
        }
    });

    renderer.setHoverCallback((sid, clientX, clientY) => {
        state.setHover(sid);

        // Update tooltip
        if (sid) {
            const f = features.get(sid);
            if (f) {
                const p = f.properties;
                const groupOsid = state.sidToOsid.get(sid);
                tooltipEl.style.display = 'block';
                tooltipEl.style.left = `${Math.min(clientX + 14, window.innerWidth - 300)}px`;
                tooltipEl.style.top = `${clientY + 14}px`;
                tooltipEl.innerHTML = [
                    `<strong>${p.settlement_name}</strong>`,
                    `SID: ${p.sid}`,
                    `Municipality: ${p.mun1990_name}`,
                    `Pop: ${p.population_total.toLocaleString()} | Ethnic: ${p.ethnic_key}`,
                    `B:${p.population_bosniaks} C:${p.population_croats} S:${p.population_serbs} O:${p.population_others}`,
                    groupOsid ? `Group: ${groupOsid}` : '',
                ].filter(Boolean).join('<br>');
            }
        } else {
            tooltipEl.style.display = 'none';
        }
    });

    // ── 7. Subscribe for re-render ──
    let renderScheduled = false;
    state.subscribe(() => {
        if (!renderScheduled) {
            renderScheduled = true;
            requestAnimationFrame(() => {
                renderScheduled = false;
                renderer.render();
                sidebar.render();
            });
        }
    });

    // ── 8. Initial render ──
    renderer.render();
    sidebar.render();

    // ── 9. Window resize ──
    window.addEventListener('resize', () => renderer.resize());

    // ── 10. Keyboard shortcuts ──
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            state.clearSelection();
        }
    });
}

// ── Bootstrap ──
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
