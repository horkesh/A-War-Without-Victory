import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { loadOperationalSettlements, loadOperationalPoliticalControl } from '../data/DataLoader';
import { buildControlGeoJSON } from '../map/builders/buildControlGeoJSON';
import { buildOsidCentroidLookup } from '../map/builders/geojsonLookup';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import styleJson from '../map/awwv_map_style.json';
import { rewritePmtilesUrls } from '../map/rewritePmtilesUrls';
import { buildCorpsFrontLinesGeoJSON } from '../map/builders/buildCorpsFrontLinesGeoJSON';

export function OpsPlanningModal() {
    const isOpen = useGameStore((s) => s.opsPlanningModalOpen);
    const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
    const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const setOperationTargetOsids = useGameStore((s) => s.setOperationTargetOsids);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const controlGeoRef = useRef<FeatureCollection<Polygon | MultiPolygon> | null>(null);
    const centroidLookupRef = useRef<Map<string, [number, number]>>(new Map());
    const [opName, setOpName] = useState('');
    const [operationType, setOperationType] = useState<'sector_attack' | 'general_offensive' | 'strategic_defense' | 'reorganization' | 'feint' | 'probe'>('sector_attack');
    const [minAttackOutcome, setMinAttackOutcome] = useState<'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed'>('victory');
    const [tempo, setTempo] = useState<'methodical' | 'standard' | 'all_out'>('standard');
    const [artilleryPreparation, setArtilleryPreparation] = useState(false);
    const [schwerpunktOsid, setSchwerpunktOsid] = useState<string>('');
    const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);
    const [selectedBrigades, setSelectedBrigades] = useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const ipc = useIPC();

    const sector = useMemo(() => {
        if (!selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;
        return loadedGameState.corpsFrontSectors.find((s) => s.sector_id === selectedSectorId) ?? null;
    }, [selectedSectorId, loadedGameState?.corpsFrontSectors]);

    const sectorFriendlyOsids = useMemo(
        () => (sector ? collectSectorFriendlyOsids(sector, loadedGameState?.frontEdgesOsid) : []),
        [sector, loadedGameState?.frontEdgesOsid]
    );

    const brigadeNameById = useMemo(() => {
        const map = new Map<string, string>();
        for (const formation of loadedGameState?.formations ?? []) {
            map.set(formation.id, formation.name || formation.id);
        }
        return map;
    }, [loadedGameState?.formations]);

    useEffect(() => {
        if (!sector) return;
        setSelectedObjectives([]);
        setSelectedBrigades(new Set(sector.assigned_brigade_ids));
        setOperationType('sector_attack');
        setMinAttackOutcome('victory');
        setTempo('standard');
        setArtilleryPreparation(false);
        setSchwerpunktOsid('');
        setStatusMessage(null);
        setOpName(`Operation ${sector.display_name}`);
    }, [sector]);

    function buildOsidFilteredFeatures(
        controlGeo: FeatureCollection<Polygon | MultiPolygon> | null,
        osids: string[]
    ): FeatureCollection<Polygon | MultiPolygon> {
        const selected = new Set(osids);
        if (!controlGeo || selected.size === 0) return { type: 'FeatureCollection', features: [] };
        const features = controlGeo.features
            .filter((feature) => {
                const osid = (feature.properties as Record<string, unknown>)?.osid;
                return typeof osid === 'string' && selected.has(osid);
            })
            .map((feature) => ({
                type: 'Feature' as const,
                geometry: feature.geometry as Polygon | MultiPolygon,
                properties: { ...feature.properties },
            }));
        return { type: 'FeatureCollection', features };
    }

    function buildAdvanceArrows(
        from: [number, number] | null,
        objectiveOsids: string[]
    ): FeatureCollection<LineString | Polygon> {
        if (!from) return { type: 'FeatureCollection', features: [] };
        const lookup = centroidLookupRef.current;
        const features: Feature<LineString | Polygon>[] = [];
        const sortedObjectives = [...objectiveOsids].sort((a, b) => a.localeCompare(b));
        for (const osid of sortedObjectives) {
            const to = lookup.get(osid);
            if (!to) continue;

            const dx = to[0] - from[0];
            const dy = to[1] - from[1];
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) continue;

            const midX = from[0] + dx * 0.5;
            const midY = from[1] + dy * 0.5;
            const nx = -dy / len;
            const ny = dx / len;
            // More "curvy/random" control point for scribble look
            const scribbleOffset = (Math.random() - 0.5) * 0.005;
            const control: [number, number] = [midX + nx * (Math.min(0.02, len * 0.08) + scribbleOffset), midY + ny * Math.min(0.02, len * 0.08)];

            const curve: [number, number][] = [];
            for (let i = 0; i <= 20; i++) {
                const t = i / 20;
                const inv = 1 - t;
                curve.push([
                    inv * inv * from[0] + 2 * inv * t * control[0] + t * t * to[0],
                    inv * inv * from[1] + 2 * inv * t * control[1] + t * t * to[1],
                ]);
            }

            const tip = curve[curve.length - 1];
            const prev = curve[curve.length - 2];
            const udx = tip[0] - prev[0];
            const udy = tip[1] - prev[1];
            const ulen = Math.sqrt(udx * udx + udy * udy);
            if (ulen === 0) continue;
            const ux = udx / ulen;
            const uy = udy / ulen;
            const px = -uy;
            const py = ux;
            const headLength = 0.014;
            const headWidth = 0.006;
            const baseX = tip[0] - ux * headLength;
            const baseY = tip[1] - uy * headLength;
            const left: [number, number] = [baseX + px * headWidth, baseY + py * headWidth];
            const right: [number, number] = [baseX - px * headWidth, baseY - py * headWidth];

            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: curve },
                properties: { type: 'advance-line', osid },
            });
            features.push({
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [[tip, left, right, tip]] },
                properties: { type: 'advance-head', osid },
            });

            // Tactical "Pencil Circle" scratch around objective
            const circlePoints: [number, number][] = [];
            const steps = 12;
            const radius = 0.004;
            for (let i = 0; i <= steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                const r = radius * (0.9 + Math.random() * 0.2); // Jitter for hand-draw look
                circlePoints.push([
                    to[0] + Math.cos(angle) * r,
                    to[1] + Math.sin(angle) * r
                ]);
            }
            features.push({
                type: 'Feature',
                geometry: { type: 'LineString', coordinates: circlePoints },
                properties: { type: 'pencil-scratch', osid }
            });
        }
        return { type: 'FeatureCollection', features };
    }

    function getSectorFrontCentroid(): [number, number] | null {
        if (sectorFriendlyOsids.length === 0) return null;
        const lookup = centroidLookupRef.current;
        let x = 0;
        let y = 0;
        let count = 0;
        for (const osid of sectorFriendlyOsids) {
            const c = lookup.get(osid);
            if (!c) continue;
            x += c[0];
            y += c[1];
            count++;
        }
        if (count === 0) return null;
        return [x / count, y / count];
    }

    function refreshOverlaySources(objectiveOsids: string[], friendlyOsids: string[]) {
        const map = mapRef.current;
        if (!map) return;
        const sectorOverlay = buildOsidFilteredFeatures(controlGeoRef.current, friendlyOsids);
        const objectiveOverlay = buildOsidFilteredFeatures(controlGeoRef.current, objectiveOsids);
        const arrows = buildAdvanceArrows(getSectorFrontCentroid(), objectiveOsids);
        (map.getSource('ops-sector-overlay') as maplibregl.GeoJSONSource | undefined)?.setData(sectorOverlay);
        (map.getSource('ops-objectives') as maplibregl.GeoJSONSource | undefined)?.setData(objectiveOverlay);
        (map.getSource('ops-advance-arrows') as maplibregl.GeoJSONSource | undefined)?.setData(arrows);
    }

    function toggleObjective(osid: string) {
        setSelectedObjectives((prev) => {
            const next = prev.includes(osid)
                ? prev.filter((id) => id !== osid)
                : [...prev, osid].sort((a, b) => a.localeCompare(b));
            setOperationTargetOsids(next);
            refreshOverlaySources(next, sectorFriendlyOsids);
            return next;
        });
    }

    function toggleBrigade(brigadeId: string) {
        setSelectedBrigades((prev) => {
            const next = new Set(prev);
            if (next.has(brigadeId)) next.delete(brigadeId);
            else next.add(brigadeId);
            return next;
        });
    }

    async function submitDraft() {
        if (!ipc.isAvailable) {
            setLoadError('Ops planning order staging is available in desktop mode only.');
            setStatusMessage('Ops planning is available in desktop mode only. Run the game from the desktop app.');
            return;
        }
        if (!sector) {
            setStatusMessage('No sector context. Close and open Ops Planning from Sector Intelligence.');
            return;
        }
        if (selectedObjectives.length === 0 && operationType !== 'reorganization') {
            setStatusMessage('Select at least one objective: click settlements on the map.');
            return;
        }
        if (selectedBrigades.size === 0) {
            setStatusMessage('Select at least one participating brigade.');
            return;
        }

        setIsSubmitting(true);
        const targetSettlements = [...selectedObjectives].sort((a, b) => a.localeCompare(b));
        const participatingBrigades = [...selectedBrigades].sort((a, b) => a.localeCompare(b));
        const result = await ipc.stageCorpsOperationOrder({
            corpsId: sector.corps_id,
            name: opName.trim() || `Operation ${sector.display_name}`,
            type: operationType,
            targetSettlements,
            participatingBrigades,
            sectorId: operationType === 'sector_attack' || operationType === 'feint' || operationType === 'probe' ? sector.sector_id : undefined,
            objectives: operationType === 'sector_attack' || operationType === 'feint' || operationType === 'probe' ? targetSettlements : undefined,
            planningDuration: operationType === 'probe' ? 1 : operationType === 'sector_attack' || operationType === 'feint' ? 1 : undefined,
            stagingOsid: sectorFriendlyOsids[0],
            minAttackOutcome,
            tempo,
            schwerpunktOsid: schwerpunktOsid || undefined,
            artilleryPreparation,
        });
        setIsSubmitting(false);

        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to stage operation order.');
            setStatusMessage(result.error ?? 'Failed to stage operation order.');
            return;
        }

        setOperationTargetOsids(targetSettlements);
        setStatusMessage('Operation drafted and staged.');
        setOpsPlanningModalOpen(false);
    }

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const pmtilesProtocol = new Protocol();
        const origin = window.location.origin;
        try {
            maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
        } catch (e) {
            // Already registered, ignore
        }
        const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style,
            center: [17.7, 43.87],
            zoom: 8,
            interactive: true,
        });
        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        const init = async () => {
            try {
                const [geojson, byOsid] = await Promise.all([
                    loadOperationalSettlements(),
                    loadOperationalPoliticalControl(),
                ]);

                const centroidLookup = buildOsidCentroidLookup(geojson);
                centroidLookupRef.current = centroidLookup;

                if (sector && sectorFriendlyOsids.length > 0) {
                    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                    for (const osid of sectorFriendlyOsids) {
                        const pt = centroidLookup.get(osid);
                        if (pt) {
                            if (pt[0] < minLng) minLng = pt[0];
                            if (pt[1] < minLat) minLat = pt[1];
                            if (pt[0] > maxLng) maxLng = pt[0];
                            if (pt[1] > maxLat) maxLat = pt[1];
                        }
                    }
                    if (minLng !== Infinity) {
                        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, animate: false });
                    }
                }

                const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
                controlGeoRef.current = controlledGeoJson as FeatureCollection<Polygon | MultiPolygon>;

                // NATO tactical look: Turn off area control coloring, use lines only
                (map.getSource('osid-control') as maplibregl.GeoJSONSource | undefined)?.setData(controlledGeoJson);
                if (map.getLayer('osid-control-fill')) {
                    map.setPaintProperty('osid-control-fill', 'fill-opacity', 0);
                }

                // Add Front Lines
                const frontLineGeo = buildCorpsFrontLinesGeoJSON(
                    geojson as FeatureCollection,
                    loadedGameState?.corpsFrontSectors ?? [],
                    false, // allied logic
                    centroidLookup,
                    undefined,
                    loadedGameState?.frontEdgesOsid
                );

                map.addSource('ops-front-lines', { type: 'geojson', data: frontLineGeo });

                // Pressure / Glow
                map.addLayer({
                    id: 'ops-front-glow',
                    type: 'line',
                    source: 'ops-front-lines',
                    filter: ['==', ['get', 'lineType'], 'glow'],
                    paint: {
                        'line-color': [
                            'match', ['get', 'faction'],
                            'RS', 'rgba(255, 100, 100, 0.4)',
                            'RBiH', 'rgba(100, 255, 100, 0.4)',
                            'HRHB', 'rgba(100, 100, 255, 0.4)',
                            'rgba(200, 200, 200, 0.2)'
                        ],
                        'line-width': 12,
                        'line-blur': 15,
                    }
                });

                // Solid NATO line
                map.addLayer({
                    id: 'ops-front-line',
                    type: 'line',
                    source: 'ops-front-lines',
                    filter: ['==', ['get', 'lineType'], 'front'],
                    paint: {
                        'line-color': 'rgba(0, 0, 0, 0.65)',
                        'line-width': 1.5,
                    }
                });

                map.addSource('ops-sector-overlay', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({
                    id: 'ops-sector-overlay-fill',
                    type: 'fill',
                    source: 'ops-sector-overlay',
                    paint: {
                        'fill-color': 'rgba(255,255,255,0.25)',
                        'fill-opacity': 1,
                    },
                });
                map.addLayer({
                    id: 'ops-sector-overlay-line',
                    type: 'line',
                    source: 'ops-sector-overlay',
                    paint: {
                        'line-color': 'rgba(255,255,255,0.85)',
                        'line-width': 3,
                    },
                });

                map.addSource('ops-objectives', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({
                    id: 'ops-objectives-fill',
                    type: 'fill',
                    source: 'ops-objectives',
                    paint: {
                        'fill-color': 'rgba(255,255,255,0.20)',
                        'fill-opacity': 1,
                    },
                });
                map.addLayer({
                    id: 'ops-objectives-line',
                    type: 'line',
                    source: 'ops-objectives',
                    paint: {
                        'line-color': 'rgba(255,255,255,0.95)',
                        'line-width': 2,
                        'line-dasharray': [2, 1.5],
                    },
                });

                map.addSource('ops-advance-arrows', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({
                    id: 'ops-advance-lines',
                    type: 'line',
                    source: 'ops-advance-arrows',
                    filter: ['==', ['get', 'type'], 'advance-line'],
                    paint: {
                        'line-color': '#2a4d69', // Deep tactical blue
                        'line-width': 3.5,
                    },
                    layout: { 'line-cap': 'round', 'line-join': 'round' },
                });
                map.addLayer({
                    id: 'ops-advance-heads',
                    type: 'fill',
                    source: 'ops-advance-arrows',
                    filter: ['==', ['get', 'type'], 'advance-head'],
                    paint: {
                        'fill-color': '#112d42', // Darker blue for head
                        'fill-opacity': 1,
                    },
                });

                // Pencil Scratches (Objectives)
                map.addLayer({
                    id: 'ops-pencil-scratches',
                    type: 'line',
                    source: 'ops-advance-arrows',
                    filter: ['==', ['get', 'type'], 'pencil-scratch'],
                    paint: {
                        'line-color': '#8b0000', // Deep red for target focus
                        'line-width': 2.5,
                        'line-blur': 0.5
                    }
                });

                map.on('click', 'osid-control-fill', (event) => {
                    const osid = event.features?.[0]?.properties?.osid;
                    if (typeof osid === 'string' && osid.length > 0) {
                        toggleObjective(osid);
                    }
                });
                map.on('click', 'ops-sector-overlay-fill', (event) => {
                    const osid = event.features?.[0]?.properties?.osid;
                    if (typeof osid === 'string' && osid.length > 0) {
                        toggleObjective(osid);
                    }
                });
                map.on('click', 'ops-objectives-fill', (event) => {
                    const osid = event.features?.[0]?.properties?.osid;
                    if (typeof osid === 'string' && osid.length > 0) {
                        toggleObjective(osid);
                    }
                });
                map.on('mouseenter', 'osid-control-fill', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'osid-control-fill', () => {
                    map.getCanvas().style.cursor = '';
                });
                map.on('mouseenter', 'ops-sector-overlay-fill', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'ops-sector-overlay-fill', () => {
                    map.getCanvas().style.cursor = '';
                });
                map.on('mouseenter', 'ops-objectives-fill', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });
                map.on('mouseleave', 'ops-objectives-fill', () => {
                    map.getCanvas().style.cursor = '';
                });
                refreshOverlaySources([], sectorFriendlyOsids);
            } catch (e) {
                console.warn('Failed to initialize ops planning map:', e);
            }
        };

        map.on('load', init);

        // Keyboard shortcut to close
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpsPlanningModalOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('keydown', onKeyDown);
            mapRef.current?.remove();
            mapRef.current = null;
            centroidLookupRef.current = new Map();
            controlGeoRef.current = null;
            maplibregl.removeProtocol('pmtiles');
        };
    }, [isOpen, sector, setOpsPlanningModalOpen, sectorFriendlyOsids.join('|')]);

    if (!isOpen || !sector) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm crt-overlay">
            <div className="panel-power-on weathered-panel w-[85vw] h-[85vh] rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 relative paper-grain">
                <div className="flex bg-panel-card p-4 border-b border-panel-border shrink-0 justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-accent-gold tracking-widest glow-text">OPERATIONAL PLANNING</h2>
                        <p className="text-sm text-text-secondary">Sector: {sector.display_name} • Corps: {sector.corps_id}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpsPlanningModalOpen(false)}
                        className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-white rounded bg-black/20 hover:bg-black/40 transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left panel: Form */}
                    <div className="w-[400px] bg-panel-bg border-r border-panel-border p-6 flex flex-col gap-6 overflow-y-auto">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Operation Name</label>
                            <input
                                type="text"
                                value={opName}
                                onChange={(e) => setOpName(e.target.value)}
                                placeholder="e.g. Operation Storm..."
                                className="w-full bg-black/30 border border-panel-border rounded p-2 text-white placeholder-text-secondary focus:border-accent-gold focus:outline-none transition-colors"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Operation Type</label>
                            <select
                                value={operationType}
                                onChange={(e) => setOperationType(e.target.value as typeof operationType)}
                                className="w-full bg-black/30 border border-panel-border rounded p-2 text-white focus:border-accent-gold focus:outline-none transition-colors"
                            >
                            <option value="sector_attack">Sector Attack</option>
                            <option value="general_offensive">General Offensive</option>
                            <option value="strategic_defense">Strategic Defense</option>
                            <option value="reorganization">Reorganization</option>
                            <option value="feint">Feint</option>
                            <option value="probe">Probe</option>
                        </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Casualty Tolerance</label>
                                <select
                                    value={minAttackOutcome}
                                    onChange={(e) => setMinAttackOutcome(e.target.value as typeof minAttackOutcome)}
                                    className="w-full bg-black/30 border border-panel-border rounded p-2 text-white focus:border-accent-gold focus:outline-none transition-colors"
                                >
                                    <option value="decisive_victory">Decisive Only</option>
                                    <option value="victory">Victory Required</option>
                                    <option value="costly_victory">Accept Costly</option>
                                    <option value="repulsed">Attack Regardless</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Tempo</label>
                                <select
                                    value={tempo}
                                    onChange={(e) => setTempo(e.target.value as typeof tempo)}
                                    className="w-full bg-black/30 border border-panel-border rounded p-2 text-white focus:border-accent-gold focus:outline-none transition-colors"
                                >
                                    <option value="methodical">Methodical</option>
                                    <option value="standard">Standard</option>
                                    <option value="all_out">All-Out</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Schwerpunkt</label>
                                <select
                                    value={schwerpunktOsid}
                                    onChange={(e) => setSchwerpunktOsid(e.target.value)}
                                    className="w-full bg-black/30 border border-panel-border rounded p-2 text-white focus:border-accent-gold focus:outline-none transition-colors"
                                >
                                    <option value="">Auto-select</option>
                                    {selectedObjectives.map((osid) => (
                                        <option key={osid} value={osid}>{getOsidDisplayName(osid, osidDisplayNames)}</option>
                                    ))}
                                </select>
                            </div>
                            <label className="flex items-end gap-2 text-sm text-text-primary p-2 bg-panel-card rounded border border-panel-border cursor-pointer hover:border-interactive transition-colors">
                                <input
                                    type="checkbox"
                                    className="accent-interactive"
                                    checked={artilleryPreparation}
                                    onChange={(e) => setArtilleryPreparation(e.target.checked)}
                                />
                                Artillery Preparation
                            </label>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Forces Available</label>
                            <div className="text-[12px] text-text-secondary italic mb-1">
                                Select brigades to assign to this operation.
                            </div>
                            <div className="space-y-1">
                                {sector.assigned_brigade_ids.map(id => (
                                    <label key={id} className="flex items-center gap-2 text-sm text-text-primary p-2 bg-panel-card rounded border border-panel-border cursor-pointer hover:border-interactive transition-colors">
                                        <input
                                            type="checkbox"
                                            className="accent-interactive"
                                            checked={selectedBrigades.has(id)}
                                            onChange={() => toggleBrigade(id)}
                                        />
                                        {brigadeNameById.get(id) ?? getOsidDisplayName(id, osidDisplayNames)}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Selected Objectives</label>
                            <div className="max-h-[140px] overflow-y-auto space-y-1">
                                {selectedObjectives.length === 0 ? (
                                    <div className="text-[12px] text-text-secondary italic">No objectives selected yet.</div>
                                ) : (
                                    selectedObjectives.map((osid) => (
                                        <button
                                            key={osid}
                                            type="button"
                                            onClick={() => toggleObjective(osid)}
                                            className="w-full text-left text-sm text-text-primary p-2 bg-panel-card rounded border border-panel-border hover:border-interactive transition-colors"
                                        >
                                            {getOsidDisplayName(osid, osidDisplayNames)}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        {statusMessage && (
                            <div className="text-[12px] text-interactive bg-panel-card border border-panel-border rounded px-2 py-1">
                                {statusMessage}
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-panel-border flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setOpsPlanningModalOpen(false)}
                                className="px-4 py-2 rounded text-sm font-semibold bg-panel-card text-text-primary hover:bg-panel-hover transition-colors border border-panel-border"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void submitDraft()}
                                disabled={isSubmitting}
                                className="px-4 py-2 rounded text-sm font-bold bg-interactive text-white hover:bg-interactive-hover transition-colors shadow-[0_0_15px_rgba(200,165,110,0.3)] shadow-interactive/20"
                            >
                                {isSubmitting ? 'Staging...' : 'Draft Orders'}
                            </button>
                        </div>
                    </div>

                    {/* Right panel: Staff Map */}
                    <div className="flex-1 relative bg-[#d6ccb7]">
                        <div ref={mapContainerRef} className="absolute inset-0" />

                        <div className="absolute top-4 right-4 bg-panel-card border border-panel-border rounded p-3 text-[10px] font-semibold tracking-wider text-text-secondary flex flex-col gap-1 z-10 shadow-lg weathered-panel">
                            <span className="uppercase text-accent-gold border-b border-panel-border/50 pb-1 mb-1 glow-text">Staff Map Controls</span>
                            <span>• Click OSID to toggle objective</span>
                            <span>• Red circles = target priorities</span>
                            <span>• Unit coloring active on frontlines</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
