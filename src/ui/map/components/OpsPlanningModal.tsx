import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Protocol } from 'pmtiles';
import type { Feature, FeatureCollection, LineString, MultiPolygon, Point, Polygon } from 'geojson';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { collectSectorFriendlyOsids } from '../utils/sectorUtils';
import { loadOperationalSettlements } from '../data/DataLoader';
import { buildControlGeoJSON } from '../map/builders/buildControlGeoJSON';
import { buildOsidCentroidLookup } from '../map/builders/geojsonLookup';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import styleJson from '../map/awwv_map_style.json';
import { rewritePmtilesUrls } from '../map/rewritePmtilesUrls';
import { buildCorpsFrontLinesGeoJSON } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { buildBezierCurve, buildArrowheadTriangle, buildTaperedArrowBody } from '../map/builders/arrowGeometry';
import type { FormationView, LoadedGameState, NamedOfficerView, OperationView } from '../data/types';
import { OPERATION_NAMES, simpleHash } from '../../../sim/combat/operation_names';

// --- Faction-colored axis palettes for map arrows and UI accents ---
// Primary axis uses bold faction color; secondary axes use lighter/desaturated variants.
const FACTION_AXIS_COLORS: Record<string, typeof AXIS_COLORS_FALLBACK> = {
    RS: [
        { line: 'rgba(220, 70, 70, 0.95)', head: 'rgba(180, 40, 40, 0.9)', scratch: 'rgba(220, 70, 70, 0.7)', label: '#e06060', dot: 'bg-red-400', glow: 'rgba(220, 70, 70, 0.25)' },
        { line: 'rgba(255, 140, 100, 0.90)', head: 'rgba(180, 80, 50, 0.85)', scratch: 'rgba(255, 140, 100, 0.5)', label: '#ff9060', dot: 'bg-orange-400', glow: 'rgba(255, 140, 100, 0.20)' },
        { line: 'rgba(200, 160, 80, 0.85)', head: 'rgba(140, 100, 40, 0.85)', scratch: 'rgba(200, 160, 80, 0.5)', label: '#c8a050', dot: 'bg-yellow-600', glow: 'rgba(200, 160, 80, 0.18)' },
        { line: 'rgba(180, 100, 100, 0.80)', head: 'rgba(120, 60, 60, 0.85)', scratch: 'rgba(180, 100, 100, 0.4)', label: '#b46464', dot: 'bg-red-300', glow: 'rgba(180, 100, 100, 0.15)' },
    ],
    RBiH: [
        { line: 'rgba(80, 190, 100, 0.95)', head: 'rgba(40, 140, 60, 0.9)', scratch: 'rgba(80, 190, 100, 0.7)', label: '#60c870', dot: 'bg-green-400', glow: 'rgba(80, 190, 100, 0.25)' },
        { line: 'rgba(100, 200, 180, 0.90)', head: 'rgba(50, 130, 110, 0.85)', scratch: 'rgba(100, 200, 180, 0.5)', label: '#64c8b4', dot: 'bg-teal-400', glow: 'rgba(100, 200, 180, 0.20)' },
        { line: 'rgba(150, 220, 100, 0.85)', head: 'rgba(90, 150, 50, 0.85)', scratch: 'rgba(150, 220, 100, 0.5)', label: '#96dc64', dot: 'bg-lime-400', glow: 'rgba(150, 220, 100, 0.18)' },
        { line: 'rgba(80, 160, 120, 0.80)', head: 'rgba(40, 110, 70, 0.85)', scratch: 'rgba(80, 160, 120, 0.4)', label: '#50a078', dot: 'bg-green-300', glow: 'rgba(80, 160, 120, 0.15)' },
    ],
    HRHB: [
        { line: 'rgba(80, 140, 220, 0.95)', head: 'rgba(40, 90, 170, 0.9)', scratch: 'rgba(80, 140, 220, 0.7)', label: '#5090dc', dot: 'bg-blue-400', glow: 'rgba(80, 140, 220, 0.25)' },
        { line: 'rgba(120, 180, 255, 0.90)', head: 'rgba(60, 110, 180, 0.85)', scratch: 'rgba(120, 180, 255, 0.5)', label: '#78b4ff', dot: 'bg-blue-300', glow: 'rgba(120, 180, 255, 0.20)' },
        { line: 'rgba(100, 160, 200, 0.85)', head: 'rgba(50, 100, 140, 0.85)', scratch: 'rgba(100, 160, 200, 0.5)', label: '#64a0c8', dot: 'bg-sky-400', glow: 'rgba(100, 160, 200, 0.18)' },
        { line: 'rgba(80, 120, 180, 0.80)', head: 'rgba(40, 70, 130, 0.85)', scratch: 'rgba(80, 120, 180, 0.4)', label: '#5078b4', dot: 'bg-blue-200', glow: 'rgba(80, 120, 180, 0.15)' },
    ],
};
const AXIS_COLORS_FALLBACK = [
    { line: 'rgba(255,255,255,0.95)', head: 'rgba(200,200,200,0.75)', scratch: 'rgba(180,50,50,0.7)', label: '#ffffff', dot: 'bg-white', glow: 'rgba(255,255,255,0.20)' },
    { line: 'rgba(100,200,255,0.95)', head: 'rgba(30,80,120,0.85)', scratch: 'rgba(100,200,255,0.5)', label: '#64c8ff', dot: 'bg-cyan-400', glow: 'rgba(100,200,255,0.18)' },
    { line: 'rgba(255,180,60,0.95)', head: 'rgba(140,80,10,0.85)', scratch: 'rgba(255,180,60,0.5)', label: '#ffb43c', dot: 'bg-orange-400', glow: 'rgba(255,180,60,0.18)' },
    { line: 'rgba(200,120,255,0.95)', head: 'rgba(90,40,120,0.85)', scratch: 'rgba(200,120,255,0.5)', label: '#c878ff', dot: 'bg-purple-400', glow: 'rgba(200,120,255,0.15)' },
];

function getAxisColors(faction: string): typeof AXIS_COLORS_FALLBACK {
    return FACTION_AXIS_COLORS[faction] ?? AXIS_COLORS_FALLBACK;
}

const OP_TYPE_TOOLTIPS: Record<string, string> = {
    sector_attack: 'Concentrated attack on enemy positions in this sector. Brigades advance along assigned axes toward objectives in sequence.',
    general_offensive: 'Broad-front push across the entire sector. Higher casualties, wider territorial gains.',
    feint: 'Diversionary attack to draw enemy reserves. Lower commitment, higher deception value.',
    probe: 'Reconnaissance in force. Quick 1-turn planning, tests enemy defenses without full commitment.',
};

interface AxisState {
    id: string;
    name: string;
    brigadeIds: Set<string>;
    objectives: string[];
    stagingOsid?: string;
}

type MapClickMode = 'objectives' | 'staging';

// Arrow source+layer management — uses remove+re-add instead of setData
// because setData on dynamically-created GeoJSON sources does not trigger
// re-render in this modal's MapLibre instance.
const ARROW_SOURCE_ID = 'ops-advance-arrows';

function addArrowSourceAndLayers(map: maplibregl.Map, data: FeatureCollection) {
    map.addSource(ARROW_SOURCE_ID, { type: 'geojson', data });
    map.addLayer({
        id: 'ops-advance-glow', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-glow'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 18, 'line-blur': 8, 'line-opacity': 1.0 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
    });
    map.addLayer({
        id: 'ops-advance-body', type: 'fill', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-body'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1 },
    });
    map.addLayer({
        id: 'ops-advance-body-outline', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-body'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 1.5, 'line-opacity': 0.8 },
    });
    map.addLayer({
        id: 'ops-advance-heads', type: 'fill', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-head'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 1 },
    });
    map.addLayer({
        id: 'ops-advance-head-outline', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'advance-head'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 1 },
    });
    map.addLayer({
        id: 'ops-pencil-scratches', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'pencil-scratch'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-blur': 0.5 },
    });
    map.addLayer({
        id: 'ops-obj-labels', type: 'symbol', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'obj-label'],
        layout: { 'text-field': ['get', 'label'], 'text-size': 14, 'text-font': ['Noto Sans Regular', 'Open Sans Bold'], 'text-allow-overlap': true, 'text-offset': [0, -1.2] },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 2 },
    });
    map.addLayer({
        id: 'ops-staging-markers', type: 'fill', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'staging-marker'],
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.4 },
    });
    map.addLayer({
        id: 'ops-staging-outline', type: 'line', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'staging-marker'],
        paint: { 'line-color': ['get', 'color'], 'line-width': 2 },
    });
    map.addLayer({
        id: 'ops-staging-labels', type: 'symbol', source: ARROW_SOURCE_ID,
        filter: ['==', ['get', 'type'], 'staging-label'],
        layout: { 'text-field': ['get', 'label'], 'text-size': 12, 'text-font': ['Noto Sans Regular', 'Open Sans Bold'], 'text-allow-overlap': true, 'text-offset': [0, -1.0] },
        paint: { 'text-color': ['get', 'color'], 'text-halo-color': 'rgba(0,0,0,0.8)', 'text-halo-width': 2 },
    });
}

function updateArrowSourceData(map: maplibregl.Map, data: FeatureCollection) {
    const source = map.getSource(ARROW_SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
        source.setData(data);
    } else {
        addArrowSourceAndLayers(map, data);
    }
}

let nextAxisCounter = 0;
function makeAxisId(): string {
    return `axis_${++nextAxisCounter}`;
}

// --- G2 Briefing Panel (right panel) ---

const PREP_PHASE_LABELS: Record<string, { label: string; order: number }> = {
    intel_gathering: { label: 'Intel Gathering', order: 1 },
    force_staging: { label: 'Force Staging', order: 2 },
    supply_check: { label: 'Supply Check', order: 3 },
    assessment: { label: 'Assessment', order: 4 },
    ready: { label: 'Ready', order: 5 },
    waiting_for_sync: { label: 'Awaiting Sync', order: 5 },
};

const ASSESSMENT_LABELS: Record<string, { label: string; color: string }> = {
    launch: { label: 'LAUNCH', color: 'text-green-400' },
    postpone: { label: 'POSTPONE', color: 'text-yellow-400' },
    abort: { label: 'ABORT', color: 'text-red-400' },
};

function G2ConfidenceBar({ value, label }: { value: number | undefined; label: string }) {
    const pct = value != null ? Math.round(value * 100) : null;
    const barColor = pct == null ? 'bg-gray-600'
        : pct >= 70 ? 'bg-green-500'
        : pct >= 40 ? 'bg-yellow-500'
        : 'bg-red-500';
    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[10px]">
                <span className="text-text-secondary uppercase tracking-wider">{label}</span>
                <span className="text-text-primary font-semibold">{pct != null ? `${pct}%` : '--'}</span>
            </div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: pct != null ? `${pct}%` : '0%' }} />
            </div>
        </div>
    );
}

function G2BriefingPanel({ sectorId, loadedGameState }: { sectorId: string | null; loadedGameState: LoadedGameState | null }) {
    // Find the active operation for this sector (if any)
    const sectorOp: OperationView | null = useMemo(() => {
        if (!sectorId || !loadedGameState?.operations) return null;
        return loadedGameState.operations.find(
            (op) => op.sector_id === sectorId && op.phase !== 'recovery'
        ) ?? null;
    }, [sectorId, loadedGameState?.operations]);

    // Find the commander officer for this operation
    const commander: NamedOfficerView | null = useMemo(() => {
        if (!sectorOp?.commander_officer_id || !loadedGameState?.namedOfficerData) return null;
        return loadedGameState.namedOfficerData.find(
            (o) => o.id === sectorOp.commander_officer_id
        ) ?? null;
    }, [sectorOp?.commander_officer_id, loadedGameState?.namedOfficerData]);

    // Find corps commander as fallback
    const sector = useMemo(() => {
        if (!sectorId || !loadedGameState?.corpsFrontSectors) return null;
        return loadedGameState.corpsFrontSectors.find((s) => s.sector_id === sectorId) ?? null;
    }, [sectorId, loadedGameState?.corpsFrontSectors]);

    const corpsCommander: NamedOfficerView | null = useMemo(() => {
        if (!sector?.corps_id || !loadedGameState?.namedOfficerData) return null;
        return loadedGameState.namedOfficerData.find(
            (o) => o.assigned_corps_id === sector.corps_id && o.acting_commander
        ) ?? null;
    }, [sector?.corps_id, loadedGameState?.namedOfficerData]);

    const displayCommander = commander ?? corpsCommander;
    const prepPhase = sectorOp?.preparation_sub_phase;
    const prepInfo = prepPhase ? PREP_PHASE_LABELS[prepPhase] : null;
    const assessmentInfo = sectorOp?.commander_assessment ? ASSESSMENT_LABELS[sectorOp.commander_assessment] : null;

    return (
        <div className="w-[300px] shrink-0 bg-panel-bg border-l border-panel-border flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Section header */}
                <div className="border-b border-panel-border pb-2">
                    <h3 className="text-[11px] font-bold text-accent-gold uppercase tracking-[0.2em]">G2 Intelligence Briefing</h3>
                </div>

                {/* Commander */}
                <div className="bg-black/20 rounded border border-panel-border/40 p-3 space-y-2">
                    <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Commander</div>
                    {displayCommander ? (
                        <div className="space-y-1">
                            <div className="text-sm font-semibold text-text-primary">{displayCommander.name}</div>
                            <div className="text-[10px] text-text-secondary">{displayCommander.rank}</div>
                            <div className="flex gap-3 text-[10px] mt-1">
                                <span className="text-text-secondary">
                                    Comp: <span className="text-text-primary font-semibold">{displayCommander.competence.toFixed(1)}</span>
                                </span>
                                <span className="text-text-secondary">
                                    Aggr: <span className="text-text-primary font-semibold">{displayCommander.aggressiveness}</span>
                                </span>
                                <span className="text-text-secondary">
                                    Def: <span className="text-text-primary font-semibold">{displayCommander.defensive_skill.toFixed(1)}</span>
                                </span>
                            </div>
                            {!commander && corpsCommander && (
                                <div className="text-[9px] text-text-secondary italic mt-1">Corps commander (no op commander assigned)</div>
                            )}
                        </div>
                    ) : (
                        <div className="text-[11px] text-text-secondary italic">No commander assigned</div>
                    )}
                </div>

                {/* Preparation phase */}
                <div className="bg-black/20 rounded border border-panel-border/40 p-3 space-y-2">
                    <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Preparation Phase</div>
                    {sectorOp && prepInfo ? (
                        <div className="space-y-2">
                            {/* Phase step indicator */}
                            <div className="flex items-center gap-1">
                                {Object.entries(PREP_PHASE_LABELS).filter(([, v]) => v.order <= 5).map(([key, val]) => {
                                    const isCurrent = key === prepPhase;
                                    const isDone = prepInfo.order > val.order;
                                    return (
                                        <div key={key} className="flex-1 flex flex-col items-center gap-0.5">
                                            <div className={`w-full h-1 rounded-full ${
                                                isCurrent ? 'bg-accent-gold' : isDone ? 'bg-green-600' : 'bg-gray-700'
                                            }`} />
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="text-[11px] text-text-primary font-semibold">{prepInfo.label}</div>
                            {sectorOp.preparation_turns_elapsed != null && (
                                <div className="text-[10px] text-text-secondary">
                                    Turn {sectorOp.preparation_turns_elapsed}
                                    {sectorOp.preparation_max_turns != null && ` of ${sectorOp.preparation_max_turns}`}
                                </div>
                            )}
                            {sectorOp.has_active_probe && (
                                <div className="text-[10px] text-yellow-400 font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                                    Active Probe
                                </div>
                            )}
                        </div>
                    ) : sectorOp ? (
                        <div className="text-[11px] text-text-primary capitalize">{sectorOp.phase}</div>
                    ) : (
                        <div className="text-[11px] text-text-secondary italic">No active operation</div>
                    )}
                </div>

                {/* Intel & readiness bars */}
                <div className="bg-black/20 rounded border border-panel-border/40 p-3 space-y-3">
                    <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Readiness Assessment</div>
                    <G2ConfidenceBar value={sectorOp?.intel_confidence_at_assessment ?? sectorOp?.readiness?.intel} label="Intel Confidence" />
                    <G2ConfidenceBar value={sectorOp?.supply_readiness_at_assessment ?? sectorOp?.supply_readiness} label="Supply Readiness" />

                    {/* Force ratio */}
                    <div className="space-y-1">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-text-secondary uppercase tracking-wider">Force Ratio</span>
                            <span className={`font-semibold ${
                                sectorOp?.force_ratio_estimate == null ? 'text-text-secondary'
                                : sectorOp.force_ratio_estimate >= 2.0 ? 'text-green-400'
                                : sectorOp.force_ratio_estimate >= 1.0 ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}>
                                {sectorOp?.force_ratio_estimate != null
                                    ? `${sectorOp.force_ratio_estimate.toFixed(1)}:1`
                                    : '--'}
                            </span>
                        </div>
                        {sectorOp?.force_ratio_estimate != null && (
                            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${
                                    sectorOp.force_ratio_estimate >= 2.0 ? 'bg-green-500'
                                    : sectorOp.force_ratio_estimate >= 1.0 ? 'bg-yellow-500'
                                    : 'bg-red-500'
                                }`} style={{ width: `${Math.min(100, (sectorOp.force_ratio_estimate / 4) * 100)}%` }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Commander assessment */}
                <div className="bg-black/20 rounded border border-panel-border/40 p-3 space-y-2">
                    <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Commander Assessment</div>
                    {assessmentInfo ? (
                        <div className="space-y-1">
                            <div className={`text-sm font-bold tracking-wider ${assessmentInfo.color}`}>
                                {assessmentInfo.label}
                            </div>
                            {sectorOp?.postponement_count != null && sectorOp.postponement_count > 0 && (
                                <div className="text-[10px] text-text-secondary">
                                    Postponements: {sectorOp.postponement_count}/2
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-[11px] text-text-secondary italic">Pending</div>
                    )}
                </div>

                {/* Operation summary (if active) */}
                {sectorOp && (
                    <div className="bg-black/20 rounded border border-panel-border/40 p-3 space-y-1.5">
                        <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Active Operation</div>
                        <div className="text-[11px] text-text-primary font-semibold">{sectorOp.name}</div>
                        <div className="text-[10px] text-text-secondary capitalize">{sectorOp.type.replace(/_/g, ' ')}</div>
                        <div className="text-[10px] text-text-secondary">{sectorOp.participating_brigade_count} brigades assigned</div>
                        {sectorOp.tempo && (
                            <div className="text-[10px] text-text-secondary capitalize">Tempo: {sectorOp.tempo}</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function OpsPlanningModal() {
    const isOpen = useGameStore((s) => s.opsPlanningModalOpen);
    const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
    const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
    const loadedGameState = useGameStore((s) => s.loadedGameState);
    const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
    const setLoadError = useGameStore((s) => s.setLoadError);
    const setOperationTargetOsids = useGameStore((s) => s.setOperationTargetOsids);
    const setCommanderSelectionContext = useGameStore((s) => s.setCommanderSelectionContext);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const controlGeoRef = useRef<FeatureCollection<Polygon | MultiPolygon> | null>(null);
    const centroidLookupRef = useRef<Map<string, [number, number]>>(new Map());
    const [opName, setOpName] = useState('');
    const [operationType, setOperationType] = useState<'sector_attack' | 'general_offensive' | 'feint' | 'probe'>('sector_attack');
    const [minAttackOutcome, setMinAttackOutcome] = useState<'decisive_victory' | 'victory' | 'costly_victory' | 'stalemate' | 'repulsed'>('victory');
    const [tempo, setTempo] = useState<'methodical' | 'standard' | 'all_out'>('standard');
    const [artilleryPreparation, setArtilleryPreparation] = useState(false);
    const [schwerpunktOsid, setSchwerpunktOsid] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // Multi-axis state
    const [axes, setAxes] = useState<AxisState[]>([]);
    const [activeAxisId, setActiveAxisId] = useState<string>('');
    const activeAxisIdRef = useRef<string>('');
    const [mapClickMode, setMapClickMode] = useState<MapClickMode>('objectives');
    const mapClickModeRef = useRef<MapClickMode>('objectives');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const ipc = useIPC();

    // Keep refs in sync with state for use in map click closure
    useEffect(() => { mapClickModeRef.current = mapClickMode; }, [mapClickMode]);
    useEffect(() => { activeAxisIdRef.current = activeAxisId; }, [activeAxisId]);

    const sector = useMemo(() => {
        if (!selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;
        return loadedGameState.corpsFrontSectors.find((s) => s.sector_id === selectedSectorId) ?? null;
    }, [selectedSectorId, loadedGameState?.corpsFrontSectors]);

    const sectorFriendlyOsids = useMemo(
        () => (sector ? collectSectorFriendlyOsids(sector, loadedGameState?.frontEdgesOsid) : []),
        [sector, loadedGameState?.frontEdgesOsid]
    );

    // Build formation lookup for brigade stats
    const formationById = useMemo(() => {
        const map = new Map<string, FormationView>();
        for (const f of loadedGameState?.formations ?? []) {
            map.set(f.id, f);
        }
        return map;
    }, [loadedGameState?.formations]);

    const playerFaction = useMemo(() => {
        if (loadedGameState?.player_faction) return loadedGameState.player_faction;
        // Detect from sector brigades when player_faction not set (e.g. Vite dev)
        if (sector?.assigned_brigade_ids) {
            for (const bid of sector.assigned_brigade_ids) {
                const f = formationById.get(bid);
                if (f?.faction) return f.faction;
            }
        }
        return '';
    }, [loadedGameState?.player_faction, sector?.assigned_brigade_ids, formationById]);

    // Build enemy strength per OSID for force-ratio display
    const enemyStrengthByOsid = useMemo(() => {
        const map = new Map<string, { brigadeCount: number; totalPersonnel: number; tanks: number; artillery: number }>();
        for (const f of loadedGameState?.formations ?? []) {
            if (!f.location_osid || f.faction === playerFaction || f.status !== 'active') continue;
            const existing = map.get(f.location_osid) ?? { brigadeCount: 0, totalPersonnel: 0, tanks: 0, artillery: 0 };
            existing.brigadeCount++;
            existing.totalPersonnel += f.personnel ?? 0;
            existing.tanks += f.composition?.tanks ?? 0;
            existing.artillery += f.composition?.artillery ?? 0;
            map.set(f.location_osid, existing);
        }
        return map;
    }, [loadedGameState?.formations, playerFaction]);

    // Initialize axes when sector changes
    useEffect(() => {
        if (!sector) return;
        const initialAxisId = makeAxisId();
        setAxes([{
            id: initialAxisId,
            name: 'Main Advance',
            brigadeIds: new Set(sector.assigned_brigade_ids),
            objectives: [],
        }]);
        setActiveAxisId(initialAxisId);
        setOperationType('sector_attack');
        setMinAttackOutcome('victory');
        setTempo('standard');
        setArtilleryPreparation(false);
        setSchwerpunktOsid('');
        setStatusMessage(null);
        // Pre-generate a faction-flavored operation name from the canonical pools
        const factionPool = OPERATION_NAMES[playerFaction] ?? OPERATION_NAMES['RS'] ?? [];
        if (factionPool.length > 0) {
            setOpName(factionPool[simpleHash(sector.corps_id) % factionPool.length]!);
        } else {
            setOpName(`Operation ${sector.display_name}`);
        }
    }, [sector, playerFaction]);

    const activeAxis = axes.find((a) => a.id === activeAxisId) ?? null;

    // Collect all objectives across all axes for map display
    const allObjectives = useMemo(() => axes.flatMap((a) => a.objectives), [axes]);
    const allBrigadeIds = useMemo(() => {
        const s = new Set<string>();
        for (const a of axes) for (const b of a.brigadeIds) s.add(b);
        return s;
    }, [axes]);
    const allSchwerpunktOptions = useMemo(() => allObjectives.filter((o, i, arr) => arr.indexOf(o) === i), [allObjectives]);
    const axisColors = useMemo(() => getAxisColors(playerFaction), [playerFaction]);

    // --- Helpers ---

    function buildOsidFilteredFeatures(
        controlGeo: FeatureCollection<Polygon | MultiPolygon> | null,
        osids: string[]
    ): FeatureCollection<Polygon | MultiPolygon> {
        const selected = new Set(osids);
        if (!controlGeo || selected.size === 0) return { type: 'FeatureCollection', features: [] };
        const features = controlGeo.features
            .filter((f) => {
                const osid = (f.properties as Record<string, unknown>)?.osid;
                return typeof osid === 'string' && selected.has(osid);
            })
            .map((f) => ({
                type: 'Feature' as const,
                geometry: f.geometry as Polygon | MultiPolygon,
                properties: { ...f.properties },
            }));
        return { type: 'FeatureCollection', features };
    }

    function buildMultiAxisArrows(
        currentAxes: AxisState[]
    ): FeatureCollection<LineString | Polygon | Point> {
        const lookup = centroidLookupRef.current;
        const features: Feature<LineString | Polygon | Point>[] = [];
        for (let axisIdx = 0; axisIdx < currentAxes.length; axisIdx++) {
            const axis = currentAxes[axisIdx];
            const colorSet = axisColors[axisIdx % axisColors.length];
            if (axis.objectives.length === 0) continue;

            // Resolve first objective point (needed for edge-shift)
            const firstObjPt = lookup.get(axis.objectives[0]);
            if (!firstObjPt) continue;

            // Compute origin: staging OSID → brigade centroid → sector centroid
            let hasStaging = false;
            let rawOrigin: [number, number] | null = null;
            if (axis.stagingOsid) {
                rawOrigin = lookup.get(axis.stagingOsid) ?? null;
                if (rawOrigin) hasStaging = true;
            }

            // Sector centroid (used as fallback and minimum-distance backup)
            let sectorCentroid: [number, number] | null = null;
            {
                let ox = 0, oy = 0, oc = 0;
                for (const osid of sectorFriendlyOsids) {
                    const c = lookup.get(osid);
                    if (c) { ox += c[0]; oy += c[1]; oc++; }
                }
                if (oc > 0) sectorCentroid = [ox / oc, oy / oc];
            }

            if (!rawOrigin) {
                // Brigade centroid
                let ox = 0, oy = 0, oc = 0;
                for (const bId of axis.brigadeIds) {
                    const f = formationById.get(bId);
                    if (f?.location_osid) {
                        const pt = lookup.get(f.location_osid);
                        if (pt) { ox += pt[0]; oy += pt[1]; oc++; }
                    }
                }
                if (oc > 0) rawOrigin = [ox / oc, oy / oc];
            }
            if (!rawOrigin) rawOrigin = sectorCentroid;
            if (!rawOrigin) continue;

            // If origin is too close to first objective, fall back to sector centroid
            const distToObj = Math.sqrt((rawOrigin[0] - firstObjPt[0]) ** 2 + (rawOrigin[1] - firstObjPt[1]) ** 2);
            if (distToObj < 0.02 && sectorCentroid) {
                rawOrigin = sectorCentroid;
            }

            // Shift staging origin toward target to approximate OSID edge (not centroid)
            let origin: [number, number];
            if (hasStaging) {
                const shift = Math.min(0.4, 0.012 / Math.max(0.001, distToObj)); // Cap shift at 40% or ~1.2km
                origin = [
                    rawOrigin[0] + (firstObjPt[0] - rawOrigin[0]) * shift,
                    rawOrigin[1] + (firstObjPt[1] - rawOrigin[1]) * shift,
                ];
            } else {
                origin = rawOrigin;
            }

            // Build chained arrows: origin→obj1→obj2→obj3
            const chain: [number, number][] = [origin];
            for (const osid of axis.objectives) {
                const pt = lookup.get(osid);
                if (pt) chain.push(pt);
            }

            for (let seg = 0; seg < chain.length - 1; seg++) {
                const from = chain[seg];
                const to = chain[seg + 1];
                const dx = to[0] - from[0];
                const dy = to[1] - from[1];
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len === 0) continue;

                // Subtle lateral curve for HoI feel (alternates per axis)
                const offsetMag = len * 0.03 * (axisIdx % 2 === 0 ? 1 : -1);
                const curve = buildBezierCurve(from, to, offsetMag, 20);

                // Tapered body — proportional but restrained
                const isFirst = seg === 0;
                const baseHalfW = Math.max(0.003, len * (isFirst ? 0.030 : 0.025));
                const tipHalfW = Math.max(0.001, len * 0.006);
                const body = buildTaperedArrowBody(curve, baseHalfW, tipHalfW);
                if (body) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [body] },
                        properties: { type: 'advance-body', axisIdx, color: colorSet.line },
                    });
                }

                // Arrowhead — prominent, wider than body tip
                const headW = Math.max(0.005, len * 0.030);
                const headL = headW * 2.0;
                const triangle = buildArrowheadTriangle(curve, headL, headW);
                if (triangle) {
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [triangle] },
                        properties: { type: 'advance-head', axisIdx, color: colorSet.head },
                    });
                }

                // Glow behind the body
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: curve },
                    properties: { type: 'advance-glow', axisIdx, color: colorSet.glow },
                });
            }

            // Numbered objective markers + pencil scratches
            for (let objIdx = 0; objIdx < axis.objectives.length; objIdx++) {
                const osid = axis.objectives[objIdx];
                const pt = lookup.get(osid);
                if (!pt) continue;

                // Pencil circle
                const circlePoints: [number, number][] = [];
                const radius = 0.004;
                for (let i = 0; i <= 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    circlePoints.push([pt[0] + Math.cos(angle) * radius, pt[1] + Math.sin(angle) * radius]);
                }
                features.push({
                    type: 'Feature',
                    geometry: { type: 'LineString', coordinates: circlePoints },
                    properties: { type: 'pencil-scratch', axisIdx, color: colorSet.scratch },
                });

                // Numbered label marker
                features.push({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: pt },
                    properties: { type: 'obj-label', label: `${objIdx + 1}`, axisIdx, color: colorSet.label },
                });
            }

            // Staging marker (diamond shape)
            if (axis.stagingOsid) {
                const stPt = lookup.get(axis.stagingOsid);
                if (stPt) {
                    const sz = 0.003;
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Polygon', coordinates: [[[stPt[0], stPt[1] + sz], [stPt[0] + sz, stPt[1]], [stPt[0], stPt[1] - sz], [stPt[0] - sz, stPt[1]], [stPt[0], stPt[1] + sz]]] },
                        properties: { type: 'staging-marker', axisIdx, color: colorSet.line },
                    });
                    features.push({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: stPt },
                        properties: { type: 'staging-label', label: 'S', axisIdx, color: colorSet.label },
                    });
                }
            }
        }
        return { type: 'FeatureCollection', features };
    }

    const refreshOverlaySources = useCallback((currentAxes: AxisState[]) => {
        const map = mapRef.current;
        if (!map) return;
        const allObjs = currentAxes.flatMap((a) => a.objectives);
        const stagingOsids = currentAxes.map((a) => a.stagingOsid).filter((s): s is string => !!s);
        const sectorOverlay = buildOsidFilteredFeatures(controlGeoRef.current, sectorFriendlyOsids);
        const objectiveOverlay = buildOsidFilteredFeatures(controlGeoRef.current, allObjs);
        const objectiveHighlight = buildOsidFilteredFeatures(controlGeoRef.current, allObjs);
        const stagingHighlight = buildOsidFilteredFeatures(controlGeoRef.current, stagingOsids);
        const arrows = buildMultiAxisArrows(currentAxes);

        (map.getSource('ops-sector-overlay') as maplibregl.GeoJSONSource | undefined)?.setData(sectorOverlay);
        (map.getSource('ops-objectives') as maplibregl.GeoJSONSource | undefined)?.setData(objectiveOverlay);
        (map.getSource('ops-highlight-objectives') as maplibregl.GeoJSONSource | undefined)?.setData(objectiveHighlight);
        (map.getSource('ops-highlight-staging') as maplibregl.GeoJSONSource | undefined)?.setData(stagingHighlight);
        updateArrowSourceData(map, arrows);
    }, [sectorFriendlyOsids, formationById]);

    // --- Axis management ---

    function addAxis() {
        const id = makeAxisId();
        const name = axes.length === 0 ? 'Main Advance' : `Axis ${String.fromCharCode(65 + axes.length)}`;
        setAxes((prev) => [...prev, { id, name, brigadeIds: new Set<string>(), objectives: [] }]);
        setActiveAxisId(id);
    }

    function removeAxis(axisId: string) {
        setAxes((prev) => {
            const next = prev.filter((a) => a.id !== axisId);
            if (next.length === 0) {
                const id = makeAxisId();
                setActiveAxisId(id);
                return [{ id, name: 'Main Advance', brigadeIds: new Set<string>(sector?.assigned_brigade_ids ?? []), objectives: [] as string[] }];
            }
            if (axisId === activeAxisId) setActiveAxisId(next[0].id);
            return next;
        });
    }

    function renameAxis(axisId: string, name: string) {
        setAxes((prev) => prev.map((a) => a.id === axisId ? { ...a, name } : a));
    }

    function toggleBrigadeOnAxis(axisId: string, brigadeId: string) {
        setAxes((prev) => prev.map((a) => {
            if (a.id !== axisId) {
                // Remove from other axes (brigade can only be on one axis)
                if (a.brigadeIds.has(brigadeId)) {
                    const next = new Set(a.brigadeIds);
                    next.delete(brigadeId);
                    return { ...a, brigadeIds: next };
                }
                return a;
            }
            const next = new Set(a.brigadeIds);
            if (next.has(brigadeId)) next.delete(brigadeId);
            else next.add(brigadeId);
            return { ...a, brigadeIds: next };
        }));
    }

    function toggleObjectiveOnActiveAxis(osid: string) {
        const axisId = activeAxisIdRef.current;
        setAxes((prev) => {
            const next = prev.map((a) => {
                if (a.id !== axisId) return a;
                const objs = a.objectives.includes(osid)
                    ? a.objectives.filter((o) => o !== osid)
                    : [...a.objectives, osid];
                return { ...a, objectives: objs };
            });
            // Defer store update to avoid setState-during-render (MapContainer subscribes to this)
            queueMicrotask(() => setOperationTargetOsids(next.flatMap((a) => a.objectives)));
            return next;
        });
    }

    function setStagingOnActiveAxis(osid: string) {
        const axisId = activeAxisIdRef.current;
        setAxes((prev) => prev.map((a) => {
            if (a.id !== axisId) return a;
            return { ...a, stagingOsid: a.stagingOsid === osid ? undefined : osid };
        }));
        setMapClickMode('objectives');
        if (mapRef.current) {
            mapRef.current.getCanvas().style.cursor = '';
        }
    }

    function clearStagingOnActiveAxis() {
        const axisId = activeAxisIdRef.current;
        setAxes((prev) => prev.map((a) => a.id !== axisId ? a : { ...a, stagingOsid: undefined }));
    }

    function handleMapClick(osid: string) {
        if (mapClickModeRef.current === 'staging') {
            setStagingOnActiveAxis(osid);
        } else {
            toggleObjectiveOnActiveAxis(osid);
        }
    }

    function moveObjective(axisId: string, objIdx: number, direction: -1 | 1) {
        setAxes((prev) => prev.map((a) => {
            if (a.id !== axisId) return a;
            const objs = [...a.objectives];
            const newIdx = objIdx + direction;
            if (newIdx < 0 || newIdx >= objs.length) return a;
            [objs[objIdx], objs[newIdx]] = [objs[newIdx], objs[objIdx]];
            return { ...a, objectives: objs };
        }));
    }

    // --- Submit ---

    async function submitDraft() {
        if (!ipc.isAvailable) {
            setLoadError('Ops planning order staging is available in desktop mode only.');
            setStatusMessage('Desktop mode required for staging operations.');
            return;
        }
        if (!sector) {
            setStatusMessage('No sector context. Re-open from Sector Intelligence.');
            return;
        }
        const hasObjectives = axes.some((a) => a.objectives.length > 0);
        if (!hasObjectives) {
            setStatusMessage('Select at least one objective on the map.');
            return;
        }
        const hasBrigades = axes.some((a) => a.brigadeIds.size > 0);
        if (!hasBrigades) {
            setStatusMessage('Assign at least one brigade to an axis.');
            return;
        }

        setIsSubmitting(true);
        const allBrigades = [...allBrigadeIds].sort((a, b) => a.localeCompare(b));
        const allObjs = [...new Set(allObjectives)].sort((a, b) => a.localeCompare(b));

        const isSingleAxis = axes.length === 1;
        const axesPayload = isSingleAxis ? undefined : axes.map((a) => ({
            axis_id: a.id,
            name: a.name,
            assigned_brigades: [...a.brigadeIds].sort((x, y) => x.localeCompare(y)),
            objectives: a.objectives,
            current_objective_index: 0,
            status: 'executing' as const,
            failure_count: 0,
            consecutive_failures_on_current: 0,
            momentum: 0,
            attack_attempt_count: 0,
            objective_capture_count: 0,
            movement_only_execution_turns: 0,
            idle_execution_turn_streak: 0,
            staging_osid: a.stagingOsid,
        }));

        const result = await ipc.stageCorpsOperationOrder({
            corpsId: sector.corps_id,
            name: opName.trim() || `Operation ${sector.display_name}`,
            type: operationType,
            targetSettlements: allObjs,
            participatingBrigades: allBrigades,
            sectorId: ['sector_attack', 'feint', 'probe'].includes(operationType) ? sector.sector_id : undefined,
            objectives: isSingleAxis ? axes[0].objectives : allObjs,
            planningDuration: operationType === 'probe' ? 1 : ['sector_attack', 'feint'].includes(operationType) ? 1 : undefined,
            stagingOsid: axes[0]?.stagingOsid ?? sectorFriendlyOsids[0],
            minAttackOutcome,
            tempo,
            schwerpunktOsid: schwerpunktOsid || undefined,
            artilleryPreparation,
            axes: axesPayload,
        });
        setIsSubmitting(false);

        if (!result.ok) {
            setLoadError(result.error ?? 'Failed to stage operation order.');
            setStatusMessage(result.error ?? 'Failed.');
            return;
        }
        setOperationTargetOsids(allObjs);
        setStatusMessage('Operation drafted and staged.');
        setOpsPlanningModalOpen(false);

        // Open commander selection modal for the newly staged operation
        const finalOpName = opName.trim() || `Operation ${sector.display_name}`;
        setCommanderSelectionContext({ corpsId: sector.corps_id, operationName: finalOpName });
    }

    // --- Map initialization ---

    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        const pmtilesProtocol = new Protocol();
        const origin = window.location.origin;
        try { maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile); } catch { /* already registered */ }
        const style = rewritePmtilesUrls(styleJson as Record<string, unknown>, origin) as maplibregl.StyleSpecification;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style,
            center: [17.7, 43.87],
            zoom: 8,
            interactive: true,
            attributionControl: false,
        });
        mapRef.current = map;
        if (import.meta.env.DEV) {
            (window as any).__debug_ops_map = map;
        }
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        const init = async () => {
            try {
                const geojson = await loadOperationalSettlements();
                // Use current game-state control, not the static scenario-start file
                const byOsid = loadedGameState?.controlBySettlement ?? {};

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
                        map.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 60, maxZoom: 10, animate: false });
                    }
                }

                const controlledGeoJson = buildControlGeoJSON(geojson, byOsid);
                controlGeoRef.current = controlledGeoJson as FeatureCollection<Polygon | MultiPolygon>;

                (map.getSource('osid-control') as maplibregl.GeoJSONSource | undefined)?.setData(controlledGeoJson);
                if (map.getLayer('osid-control-fill')) {
                    map.setPaintProperty('osid-control-fill', 'fill-opacity', 0.55);
                }

                const frontLineGeo = buildCorpsFrontLinesGeoJSON(
                    geojson as FeatureCollection,
                    loadedGameState?.corpsFrontSectors ?? [],
                    false,
                    centroidLookup,
                    undefined,
                    loadedGameState?.frontEdgesOsid
                );
                map.addSource('ops-front-lines', { type: 'geojson', data: frontLineGeo });
                map.addLayer({
                    id: 'ops-front-glow', type: 'line', source: 'ops-front-lines',
                    filter: ['==', ['get', 'lineType'], 'glow'],
                    paint: {
                        'line-color': ['match', ['get', 'faction'], 'RS', 'rgba(255,100,100,0.4)', 'RBiH', 'rgba(100,255,100,0.4)', 'HRHB', 'rgba(100,100,255,0.4)', 'rgba(200,200,200,0.2)'],
                        'line-width': 12, 'line-blur': 15,
                    }
                });
                map.addLayer({
                    id: 'ops-front-line', type: 'line', source: 'ops-front-lines',
                    filter: ['==', ['get', 'lineType'], 'front'],
                    paint: { 'line-color': 'rgba(0,0,0,0.65)', 'line-width': 1.5 }
                });

                // Sector overlay
                map.addSource('ops-sector-overlay', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({ id: 'ops-sector-overlay-fill', type: 'fill', source: 'ops-sector-overlay', paint: { 'fill-color': 'rgba(255,255,255,0.15)', 'fill-opacity': 1 } });
                map.addLayer({ id: 'ops-sector-overlay-line', type: 'line', source: 'ops-sector-overlay', paint: { 'line-color': 'rgba(255,255,255,0.6)', 'line-width': 2 } });

                // Objective overlay
                map.addSource('ops-objectives', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({ id: 'ops-objectives-fill', type: 'fill', source: 'ops-objectives', paint: { 'fill-color': 'rgba(255,255,255,0.12)', 'fill-opacity': 1 } });
                map.addLayer({ id: 'ops-objectives-line', type: 'line', source: 'ops-objectives', paint: { 'line-color': 'rgba(255,255,255,0.8)', 'line-width': 2, 'line-dasharray': [2, 1.5] } });

                // Ops highlight: objectives (dark red territory fill)
                map.addSource('ops-highlight-objectives', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({ id: 'ops-highlight-objectives-fill', type: 'fill', source: 'ops-highlight-objectives', paint: { 'fill-color': '#8b0000', 'fill-opacity': 0.25 } });
                map.addLayer({ id: 'ops-highlight-objectives-border', type: 'line', source: 'ops-highlight-objectives', paint: { 'line-color': '#1a1a1a', 'line-width': 2, 'line-dasharray': [4, 2] } });

                // Ops highlight: staging (green territory fill)
                map.addSource('ops-highlight-staging', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
                map.addLayer({ id: 'ops-highlight-staging-fill', type: 'fill', source: 'ops-highlight-staging', paint: { 'fill-color': '#2d6a4f', 'fill-opacity': 0.20 } });
                map.addLayer({ id: 'ops-highlight-staging-border', type: 'line', source: 'ops-highlight-staging', paint: { 'line-color': '#40916c', 'line-width': 2 } });

                // Advance arrows — source + layers created via addArrowSourceAndLayers
                addArrowSourceAndLayers(map, { type: 'FeatureCollection', features: [] });

                // Click handlers — dispatch via ref so closure captures latest mode
                const handleClick = (event: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
                    const osid = event.features?.[0]?.properties?.osid;
                    if (typeof osid === 'string' && osid.length > 0) handleMapClick(osid);
                };
                for (const layerId of ['osid-control-fill', 'ops-sector-overlay-fill', 'ops-objectives-fill', 'ops-highlight-objectives-fill', 'ops-highlight-staging-fill']) {
                    map.on('click', layerId, handleClick);
                    map.on('mouseenter', layerId, () => {
                        const mode = mapClickModeRef.current;
                        map.getCanvas().style.cursor = mode === 'staging' ? 'crosshair' : 'pointer';
                    });
                    map.on('mouseleave', layerId, () => {
                        map.getCanvas().style.cursor = '';
                    });
                }

                refreshOverlaySources(axes);
            } catch (e) {
                console.warn('Failed to initialize ops planning map:', e);
            }
        };

        map.on('load', init);

        const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpsPlanningModalOpen(false); };
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

    // Refresh map overlays when axes change (after map is loaded)
    useEffect(() => {
        if (mapRef.current) refreshOverlaySources(axes);
    }, [axes, refreshOverlaySources]);

    if (!isOpen || !sector) return null;

    // --- Brigade stat card ---
    function BrigadeCard({ brigadeId, axisId, axisColor }: { brigadeId: string; axisId: string; axisColor: string }) {
        const f = formationById.get(brigadeId);
        const name = f?.name ?? brigadeId;
        const pers = f?.personnel ?? 0;
        const fat = f?.fatigue ?? 0;
        const coh = f?.cohesion ?? 0;
        const tanks = f?.composition?.tanks ?? 0;
        const arty = f?.composition?.artillery ?? 0;
        const isAssigned = axes.find((a) => a.id === axisId)?.brigadeIds.has(brigadeId) ?? false;

        return (
            <label
                className={`flex items-start gap-2 text-[11px] p-2 rounded border cursor-pointer transition-colors ${isAssigned
                    ? 'bg-black/40 border-interactive/50 text-text-primary'
                    : 'bg-panel-card border-panel-border text-text-secondary hover:border-interactive/30'
                    }`}
            >
                <input
                    type="checkbox"
                    className="accent-interactive mt-0.5 shrink-0"
                    checked={isAssigned}
                    onChange={() => toggleBrigadeOnAxis(axisId, brigadeId)}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${axisColor}`} style={{ opacity: isAssigned ? 1 : 0.3 }} />
                        <span className="font-semibold truncate">{name}</span>
                    </div>
                    <div className="flex gap-2 mt-0.5 text-[10px] text-text-secondary">
                        <span>{pers.toLocaleString()} men</span>
                        {tanks > 0 && <span>{tanks}T</span>}
                        {arty > 0 && <span>{arty}A</span>}
                        <span>Fat:{Math.round(fat)}</span>
                        <span>Coh:{Math.round(coh)}</span>
                    </div>
                </div>
            </label>
        );
    }

    // --- Plan summary ---
    function PlanSummary() {
        const totalBrigades = allBrigadeIds.size;
        const totalObjectives = allObjectives.length;
        if (totalBrigades === 0 && totalObjectives === 0) return null;

        return (
            <div className="bg-black/30 border border-panel-border rounded p-3 text-[11px] space-y-2">
                <div className="text-accent-gold font-semibold uppercase tracking-widest text-[10px] border-b border-panel-border/50 pb-1">Plan Summary</div>
                {axes.map((axis, idx) => {
                    const colorSet = axisColors[idx % axisColors.length];
                    if (axis.brigadeIds.size === 0 && axis.objectives.length === 0) return null;
                    return (
                        <div key={axis.id} className="space-y-0.5">
                            <div className="font-semibold flex items-center gap-1.5" style={{ color: colorSet.label }}>
                                <span className={`w-2 h-2 rounded-full ${colorSet.dot}`} />
                                {axis.name}
                            </div>
                            {axis.brigadeIds.size > 0 && (
                                <div className="text-text-secondary pl-3.5">
                                    {[...axis.brigadeIds].map((id) => formationById.get(id)?.name ?? id).join(', ')}
                                </div>
                            )}
                            {axis.objectives.length > 0 && (
                                <div className="text-text-primary pl-3.5">
                                    {axis.objectives.map((o, i) => `${i + 1}. ${getOsidDisplayName(o, osidDisplayNames)}`).join(' \u2192 ')}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div className="text-text-secondary pt-1 border-t border-panel-border/30">
                    {totalBrigades} brigade{totalBrigades !== 1 ? 's' : ''} \u2022 {totalObjectives} objective{totalObjectives !== 1 ? 's' : ''} \u2022 {axes.length} ax{axes.length !== 1 ? 'es' : 'is'}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm crt-overlay">
            <div className="panel-power-on weathered-panel w-[90vw] h-[90vh] rounded-lg shadow-2xl flex flex-col overflow-hidden ring-1 ring-white/10 relative paper-grain">
                {/* Header */}
                <div className="flex bg-panel-card p-4 border-b border-panel-border shrink-0 justify-between items-center relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-accent-gold tracking-widest glow-text">OPERATIONAL PLANNING</h2>
                        <p className="text-sm text-text-secondary">Sector: {sector.display_name} &bull; Corps: {sector.corps_id}</p>
                    </div>
                    <button type="button" onClick={() => setOpsPlanningModalOpen(false)}
                        className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-white rounded bg-black/20 hover:bg-black/40 transition-colors">
                        &#10005;
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left panel — forces & planning */}
                    <div className="w-[440px] shrink-0 bg-panel-bg border-r border-panel-border flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">

                            {/* Operation name + type */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Name</label>
                                    <input type="text" value={opName} onChange={(e) => setOpName(e.target.value)}
                                        placeholder="Operation..."
                                        className="w-full bg-black/30 border border-panel-border rounded px-2 py-1.5 text-sm text-white placeholder-text-secondary focus:border-accent-gold focus:outline-none" />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Type</label>
                                    <select value={operationType}
                                        onChange={(e) => setOperationType(e.target.value as typeof operationType)}
                                        className="w-full bg-black/30 border border-panel-border rounded px-2 py-1.5 text-sm text-white focus:border-accent-gold focus:outline-none">
                                        <option value="sector_attack">Sector Attack</option>
                                        <option value="general_offensive">General Offensive</option>
                                        <option value="feint">Feint</option>
                                        <option value="probe">Probe</option>
                                    </select>
                                </div>
                            </div>

                            {/* Type description (always visible) */}
                            <div className="text-[10px] text-text-secondary bg-black/20 rounded px-2 py-1.5 border border-panel-border/30">
                                {OP_TYPE_TOOLTIPS[operationType]}
                            </div>

                            {/* Params row */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Tolerance</label>
                                    <select value={minAttackOutcome} onChange={(e) => setMinAttackOutcome(e.target.value as typeof minAttackOutcome)}
                                        className="w-full bg-black/30 border border-panel-border rounded px-2 py-1 text-[11px] text-white focus:border-accent-gold focus:outline-none">
                                        <option value="decisive_victory">Decisive Only</option>
                                        <option value="victory">Victory Req.</option>
                                        <option value="costly_victory">Accept Costly</option>
                                        <option value="repulsed">Regardless</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Tempo</label>
                                    <select value={tempo} onChange={(e) => setTempo(e.target.value as typeof tempo)}
                                        className="w-full bg-black/30 border border-panel-border rounded px-2 py-1 text-[11px] text-white focus:border-accent-gold focus:outline-none">
                                        <option value="methodical">Methodical</option>
                                        <option value="standard">Standard</option>
                                        <option value="all_out">All-Out</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Main Effort</label>
                                    <select value={schwerpunktOsid} onChange={(e) => setSchwerpunktOsid(e.target.value)}
                                        className="w-full bg-black/30 border border-panel-border rounded px-2 py-1 text-[11px] text-white focus:border-accent-gold focus:outline-none">
                                        <option value="">Auto</option>
                                        {allSchwerpunktOptions.map((osid) => (
                                            <option key={osid} value={osid}>{getOsidDisplayName(osid, osidDisplayNames)}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <label className="flex items-center gap-2 text-[11px] text-text-primary p-2 bg-panel-card rounded border border-panel-border cursor-pointer hover:border-interactive transition-colors">
                                <input type="checkbox" className="accent-interactive" checked={artilleryPreparation} onChange={(e) => setArtilleryPreparation(e.target.checked)} />
                                Artillery Preparation (first turn bombardment)
                            </label>

                            {/* Axes */}
                            <div className="border-t border-panel-border pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest">Axes of Advance</label>
                                    <button type="button" onClick={addAxis}
                                        className="text-[10px] text-interactive hover:text-white px-2 py-0.5 rounded border border-interactive/30 hover:border-interactive transition-colors">
                                        + Add Axis
                                    </button>
                                </div>

                                {/* Axis tabs */}
                                <div className="flex gap-1 mb-3">
                                    {axes.map((axis, idx) => {
                                        const colorSet = axisColors[idx % axisColors.length];
                                        const isActive = axis.id === activeAxisId;
                                        return (
                                            <button key={axis.id} type="button"
                                                onClick={() => setActiveAxisId(axis.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[11px] font-semibold transition-colors border ${isActive
                                                    ? 'bg-black/40 border-interactive text-white'
                                                    : 'bg-panel-card border-panel-border text-text-secondary hover:border-interactive/50'
                                                    }`}>
                                                <span className={`w-2 h-2 rounded-full ${colorSet.dot}`} />
                                                {axis.name}
                                                <span className="text-[9px] text-text-secondary ml-1">({axis.brigadeIds.size}b/{axis.objectives.length}o)</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Active axis detail */}
                                {activeAxis && (() => {
                                    const axisIdx = Math.max(0, axes.findIndex((a) => a.id === activeAxisId));
                                    const colorSet = axisColors[axisIdx % axisColors.length];
                                    return (
                                        <div className="space-y-3 bg-black/15 rounded p-3 border border-panel-border/30">
                                            {/* Axis name + delete */}
                                            <div className="flex items-center gap-2">
                                                <input type="text" value={activeAxis.name}
                                                    onChange={(e) => renameAxis(activeAxis.id, e.target.value)}
                                                    className="flex-1 bg-black/30 border border-panel-border rounded px-2 py-1 text-[11px] text-white focus:border-accent-gold focus:outline-none" />
                                                {axes.length > 1 && (
                                                    <button type="button" onClick={() => removeAxis(activeAxis.id)}
                                                        className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/30 hover:border-red-400 transition-colors">
                                                        Remove
                                                    </button>
                                                )}
                                            </div>

                                            {/* Brigades for this axis */}
                                            <div>
                                                <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest mb-1">Assigned Brigades</div>
                                                <div className="space-y-1 max-h-[180px] overflow-y-auto">
                                                    {sector.assigned_brigade_ids.map((id) => (
                                                        <BrigadeCard key={id} brigadeId={id} axisId={activeAxis.id} axisColor={colorSet.dot} />
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Staging area */}
                                            <div>
                                                <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest mb-1">Staging Area</div>
                                                <div className="flex items-center gap-2">
                                                    <button type="button"
                                                        onClick={() => {
                                                            const next = mapClickMode === 'staging' ? 'objectives' : 'staging';
                                                            setMapClickMode(next);
                                                            if (mapRef.current) {
                                                                mapRef.current.getCanvas().style.cursor = next === 'staging' ? 'crosshair' : '';
                                                            }
                                                        }}
                                                        className={`text-[10px] px-2.5 py-1 rounded border transition-colors ${mapClickMode === 'staging'
                                                            ? 'bg-accent-gold/20 border-accent-gold text-accent-gold animate-pulse'
                                                            : 'bg-panel-card border-panel-border text-text-secondary hover:border-interactive/50'
                                                            }`}>
                                                        {mapClickMode === 'staging' ? 'CANCEL: Click map to set staging...' : 'Set Staging Area'}
                                                    </button>
                                                    {activeAxis.stagingOsid && (
                                                        <span className="text-[10px] text-text-primary flex items-center gap-1">
                                                            <span className="text-accent-gold">&#9670;</span>
                                                            {getOsidDisplayName(activeAxis.stagingOsid, osidDisplayNames)}
                                                            <button type="button" onClick={clearStagingOnActiveAxis} className="text-red-400 hover:text-red-300 ml-0.5">&#10005;</button>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Objectives for this axis */}
                                            <div>
                                                <div className="text-[10px] font-semibold text-accent-gold uppercase tracking-widest mb-1">
                                                    Objectives <span className="text-text-secondary font-normal">(click map to add, attack in order shown)</span>
                                                </div>
                                                {activeAxis.objectives.length === 0 ? (
                                                    <div className="text-[10px] text-text-secondary italic p-2">Click enemy positions on the map to add objectives.</div>
                                                ) : (() => {
                                                    // Compute once for all objectives on this axis
                                                    let axisFriendlyPersonnel = 0;
                                                    for (const bId of activeAxis.brigadeIds) {
                                                        axisFriendlyPersonnel += formationById.get(bId)?.personnel ?? 0;
                                                    }
                                                    return (
                                                        <div className="space-y-1">
                                                            {activeAxis.objectives.map((osid, objIdx) => {
                                                                const enemy = enemyStrengthByOsid.get(osid);
                                                                return (
                                                                    <div key={osid} className="flex items-center gap-1.5 p-1.5 bg-panel-card rounded border border-panel-border text-[11px]">
                                                                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                                                                            style={{ backgroundColor: colorSet.line, color: '#000' }}>
                                                                            {objIdx + 1}
                                                                        </span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <span className="text-text-primary truncate block">{getOsidDisplayName(osid, osidDisplayNames)}</span>
                                                                            {enemy ? (
                                                                                <span className={`text-[9px] ${axisFriendlyPersonnel > enemy.totalPersonnel * 1.5 ? 'text-green-400' : axisFriendlyPersonnel > enemy.totalPersonnel ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                                    {axisFriendlyPersonnel.toLocaleString()} vs ~{enemy.totalPersonnel.toLocaleString()} est.
                                                                                    {enemy.tanks > 0 ? ` (${enemy.tanks}T` : ''}
                                                                                    {enemy.artillery > 0 ? `${enemy.tanks > 0 ? '/' : '('}${enemy.artillery}A)` : enemy.tanks > 0 ? ')' : ''}
                                                                                    {' '}&mdash; {enemy.brigadeCount} bde{enemy.brigadeCount !== 1 ? 's' : ''}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[9px] text-text-secondary">No known enemy forces</span>
                                                                            )}
                                                                        </div>
                                                                        <button type="button" onClick={() => moveObjective(activeAxis.id, objIdx, -1)}
                                                                            disabled={objIdx === 0}
                                                                            className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-white disabled:opacity-20 transition-colors">
                                                                            &#9650;
                                                                        </button>
                                                                        <button type="button" onClick={() => moveObjective(activeAxis.id, objIdx, 1)}
                                                                            disabled={objIdx === activeAxis.objectives.length - 1}
                                                                            className="w-5 h-5 flex items-center justify-center text-text-secondary hover:text-white disabled:opacity-20 transition-colors">
                                                                            &#9660;
                                                                        </button>
                                                                        <button type="button" onClick={() => toggleObjectiveOnActiveAxis(osid)}
                                                                            className="w-5 h-5 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors">
                                                                            &#10005;
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Plan summary */}
                            <PlanSummary />

                            {statusMessage && (
                                <div className="text-[11px] text-interactive bg-panel-card border border-panel-border rounded px-2 py-1.5">
                                    {statusMessage}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Center panel: Staff Map */}
                    <div className="flex-1 relative bg-[#d6ccb7]">
                        <div ref={mapContainerRef} className="absolute inset-0" />

                        <div className="absolute top-4 right-14 bg-panel-card/90 border border-panel-border rounded p-2.5 text-[10px] font-semibold tracking-wider text-text-secondary flex flex-col gap-0.5 z-10 shadow-lg">
                            <span className="uppercase text-accent-gold border-b border-panel-border/50 pb-1 mb-0.5">Map Controls</span>
                            {mapClickMode === 'staging' ? (
                                <span className="text-accent-gold">Click to set staging area for active axis</span>
                            ) : (
                                <span>Click to toggle objective on active axis</span>
                            )}
                            <span>Numbered markers show attack sequence</span>
                            {axes.length > 1 && <span>Colors distinguish axes of advance</span>}
                        </div>
                    </div>

                    {/* Right panel: G2 Briefing */}
                    <G2BriefingPanel
                        sectorId={selectedSectorId}
                        loadedGameState={loadedGameState}
                    />
                </div>

                {/* Bottom strip — action buttons */}
                <div className="h-12 shrink-0 border-t border-panel-border bg-panel-bg flex items-center justify-end gap-3 px-6">
                    <button type="button" onClick={() => setOpsPlanningModalOpen(false)}
                        className="px-4 py-2 rounded text-sm font-semibold bg-panel-card text-text-primary hover:bg-panel-hover transition-colors border border-panel-border">
                        Cancel
                    </button>
                    <button type="button" onClick={() => setShowConfirmation(true)} disabled={isSubmitting}
                        className="px-4 py-2 rounded text-sm font-bold bg-interactive text-white hover:bg-interactive-hover transition-colors shadow-[0_0_15px_rgba(200,165,110,0.3)] shadow-interactive/20">
                        {isSubmitting ? 'Staging...' : 'Draft Orders'}
                    </button>
                </div>

                {/* Confirmation overlay */}
                {showConfirmation && (
                    <div className="absolute inset-0 z-20 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-panel-bg border border-panel-border rounded-lg p-6 max-w-[480px] w-full shadow-2xl space-y-4">
                            <h3 className="text-lg font-bold text-accent-gold tracking-widest uppercase">Confirm Operation</h3>
                            <div className="text-sm text-text-primary font-semibold">{opName}</div>
                            <div className="text-[11px] text-text-secondary space-y-1">
                                <div>Type: <span className="text-text-primary capitalize">{operationType.replace(/_/g, ' ')}</span></div>
                                <div>Tolerance: <span className="text-text-primary capitalize">{minAttackOutcome.replace(/_/g, ' ')}</span></div>
                                <div>Tempo: <span className="text-text-primary capitalize">{tempo}</span></div>
                                {artilleryPreparation && <div className="text-interactive">Artillery preparation enabled</div>}
                            </div>
                            <div className="border-t border-panel-border/50 pt-3 space-y-2">
                                {axes.map((axis, idx) => {
                                    const colorSet = axisColors[idx % axisColors.length];
                                    return (
                                        <div key={axis.id} className="text-[11px]">
                                            <div className="font-semibold flex items-center gap-1.5" style={{ color: colorSet.label }}>
                                                <span className={`w-2 h-2 rounded-full ${colorSet.dot}`} />
                                                {axis.name}: {axis.brigadeIds.size} bde{axis.brigadeIds.size !== 1 ? 's' : ''} → {axis.objectives.length} obj{axis.objectives.length !== 1 ? 's' : ''}
                                            </div>
                                            {axis.stagingOsid && (
                                                <div className="text-[10px] text-text-secondary pl-3.5">Staging: {getOsidDisplayName(axis.stagingOsid, osidDisplayNames)}</div>
                                            )}
                                            {axis.objectives.length > 0 && (
                                                <div className="text-[10px] text-text-secondary pl-3.5">
                                                    {axis.objectives.map((o, i) => `${i + 1}. ${getOsidDisplayName(o, osidDisplayNames)}`).join(' → ')}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setShowConfirmation(false)}
                                    className="px-4 py-2 rounded text-sm font-semibold bg-panel-card text-text-primary hover:bg-panel-hover transition-colors border border-panel-border">
                                    Back
                                </button>
                                <button type="button" onClick={() => { setShowConfirmation(false); void submitDraft(); }} disabled={isSubmitting}
                                    className="px-4 py-2 rounded text-sm font-bold bg-interactive text-white hover:bg-interactive-hover transition-colors shadow-[0_0_15px_rgba(200,165,110,0.3)]">
                                    {isSubmitting ? 'Staging...' : 'Confirm & Stage'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
