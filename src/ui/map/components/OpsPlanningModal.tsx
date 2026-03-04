import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { FeatureCollection } from 'geojson';
import { useGameStore } from '../store/gameStore';
import { collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { loadOperationalSettlements, loadOperationalPoliticalControl } from '../data/DataLoader';
import { buildControlGeoJSON } from '../map/builders/buildControlGeoJSON';
import { buildOsidCentroidLookup } from '../map/builders/geojsonLookup';
import styleJson from '../map/awwv_map_style.json';

function rewritePmtilesUrls(style: Record<string, unknown>, origin: string): Record<string, unknown> {
    const str = JSON.stringify(style);
    const base = `pmtiles://${origin}/`;
    const rewritten = str.replace(/pmtiles:\/\/\//g, base);
    return JSON.parse(rewritten) as Record<string, unknown>;
}

export function OpsPlanningModal() {
    const isOpen = useGameStore((s) => s.opsPlanningModalOpen);
    const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
    const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
    const loadedGameState = useGameStore((s) => s.loadedGameState);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const [, setMapReady] = useState(false);
    const [opName, setOpName] = useState('');

    const sector = useMemo(() => {
        if (!selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;
        return loadedGameState.corpsFrontSectors.find((s) => s.sector_id === selectedSectorId) ?? null;
    }, [selectedSectorId, loadedGameState?.corpsFrontSectors]);

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        // Initialize MapLibre
        const pmtilesProtocol = new Protocol();
        const origin = window.location.origin;
        maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile);
        const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style,
            center: [17.7, 43.87],
            zoom: 8,
            interactive: false, // staff map is fixed
        });
        mapRef.current = map;

        const init = async () => {
            try {
                const [geojson, byOsid] = await Promise.all([
                    loadOperationalSettlements(),
                    loadOperationalPoliticalControl(),
                ]);

                const centroidLookup = buildOsidCentroidLookup(geojson);

                if (sector && loadedGameState?.frontEdgesOsid) {
                    const friendlyOsids = collectSectorFriendlyOsids(sector, loadedGameState.frontEdgesOsid);

                    if (friendlyOsids.length > 0) {
                        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
                        for (const osid of friendlyOsids) {
                            const pt = centroidLookup.get(osid);
                            if (pt) {
                                if (pt[0] < minLng) minLng = pt[0];
                                if (pt[1] < minLat) minLat = pt[1];
                                if (pt[0] > maxLng) maxLng = pt[0];
                                if (pt[1] > maxLat) maxLat = pt[1];
                            }
                        }
                        if (minLng !== Infinity) {
                            // fit map to sector bounds
                            map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 40, animate: false });
                        }
                    }
                }

                const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
                const sources = style.sources as Record<string, { type?: string; data?: FeatureCollection }>;
                if (sources['osid-control']) {
                    (map.getSource('osid-control') as maplibregl.GeoJSONSource)?.setData(controlledGeoJson);
                }
            } catch (e) {
                console.warn('Failed to pre-load OSID data for staff map:', e);
            }
            setMapReady(true);
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
            setMapReady(false);
            maplibregl.removeProtocol('pmtiles');
        };
    }, [isOpen, sector, loadedGameState?.frontEdgesOsid, setOpsPlanningModalOpen]);

    if (!isOpen || !sector) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md">
            <div className="bg-panel-bg w-[80vw] h-[80vh] rounded-lg shadow-2xl flex flex-col border border-panel-border overflow-hidden ring-1 ring-white/10">
                <div className="flex bg-panel-card p-4 border-b border-panel-border shrink-0 justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary tracking-wide">OPERATIONAL PLANNING</h2>
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
                            <label className="text-sm font-semibold text-accent-gold uppercase tracking-widest">Forces Available</label>
                            <div className="text-[12px] text-text-secondary italic mb-1">
                                Select brigades to assign to this operation.
                            </div>
                            <div className="space-y-1">
                                {sector.assigned_brigade_ids.map(id => (
                                    <label key={id} className="flex items-center gap-2 text-sm text-text-primary p-2 bg-panel-card rounded border border-panel-border cursor-pointer hover:border-interactive transition-colors">
                                        <input type="checkbox" className="accent-interactive" defaultChecked />
                                        {id}
                                    </label>
                                ))}
                            </div>
                        </div>

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
                                className="px-4 py-2 rounded text-sm font-bold bg-interactive text-white hover:bg-interactive-hover transition-colors shadow-[0_0_15px_rgba(200,165,110,0.3)] shadow-interactive/20"
                            >
                                Draft Orders
                            </button>
                        </div>
                    </div>

                    {/* Right panel: Staff Map */}
                    <div className="flex-1 relative bg-[#e2d8c4]">
                        <div ref={mapContainerRef} className="absolute inset-0" />

                        {/* Staff Map Overlay Controls */}
                        <div className="absolute top-4 right-4 bg-panel-card border border-panel-border rounded p-2 text-xs font-semibold tracking-wider text-text-secondary flex flex-col gap-1 z-10 shadow-lg">
                            <span className="uppercase text-accent-gold border-b border-panel-border/50 pb-1 mb-1">Staff Map Controls</span>
                            <span>• Static Overview</span>
                            <span>• Pre-assigned Sector Bounds</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
