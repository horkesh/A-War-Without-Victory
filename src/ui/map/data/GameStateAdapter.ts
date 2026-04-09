/**
 * ═══════════════════════════════════════════════════════════════
 * OWNERSHIP: Canonical — UI Read Path
 * DOMAIN:    Single source of game state for all UI components
 * ═══════════════════════════════════════════════════════════════
 *
 * DECIDES:   Nothing — read-only transformation layer
 * WRITES:    Nothing in game state — only derives UI-safe views
 * READS:     GameState (raw engine truth)
 * MUST NOT:  Mutate game state, cache stale state, expose raw
 *            engine internals directly to player-facing components,
 *            or bypass player-visible-state boundaries.
 *
 * UPSTREAM:  GameState (authoritative engine source)
 * DOWNSTREAM: All UI components in src/ui/map/components/
 *
 * TRUTH INVARIANTS:
 * - Player-visible state boundary: only expose what the player
 *   would plausibly know given their role as faction president
 * - OperationView is the CANONICAL UI-FACING OPERATION MODEL
 * - All operation phase labels must match sector_offensive.ts lifecycle
 *   (valid phases: 'planning' | 'execution' | 'recovery')
 * - Commander identity must resolve via commander_officer_id
 * - unresolvedSectorBrigades reflects engine truth (military.unresolved_sector_brigades)
 *   and must NEVER be suppressed — Codex principle #6: unresolved is honest
 *
 * Adapter for loading and extracting data from a saved GameState (final_save.json).
 * Converts the rich GameState structure into the flat LoadedGameState view
 * needed by the map application.
 *
 * Migrated from legacy ui_legacy/data/GameStateAdapter.ts — import paths updated.
 */

import type {
    AoROrderView, AttackOrderView,
    CorpsFrontSectorView, EnclaveResilienceView, FactionId, FogOfWarView, FormationView, FrictionEventView, LoadedGameState,
    MilitiaPoolView, MobilizationSummaryView, MovementOrderSettlementView, NamedOfficerStateView, NamedOfficerView,
    OperationView, RepositionOrderView, RecruitmentView,
} from './types';
import {
    getPlayerSafeCorpsName,
    getPlayerSafeDecisionTitle,
    getPlayerSafeDisplayLabel,
    getPlayerSafeOfficerName,
} from '../utils/playerSafeText.js';
import { classifyArmyReserveSeverity } from '../utils/armyReserveSeverity.js';
import { buildControlLookup, buildStatusLookup } from './ControlLookup.js';
import { getMunicipalitySupportLabel } from '../../../sim/combat/municipality_support.js';
import { strictCompare } from '../../../state/validateGameState.js';
import { computeFullVerdict } from '../../../sim/negotiation/scoring.js';
import type { GameVerdict } from '../../../state/negotiation_types.js';
import { computeCorpsCommandStrain, getCommandStrainLabel, projectStrainDecay, deriveRecoveryForecast, deriveCorpsSituationAssessment, deriveReadinessTrend } from './command_strain.js';
import type { GameState } from '../../../state/game_state.js';
import { toCommandBriefingView } from '../../shared/command_briefing_views.js';
import { getOperationalSitrepView } from '../../shared/operational_sitrep_views.js';

function pointsByFaction(rec: Record<string, { points?: number }>): Record<string, number> {
    const out: Record<string, number> = {};
    for (const fid of Object.keys(rec).sort()) {
        const v = rec[fid];
        out[fid] = typeof v?.points === 'number' && Number.isFinite(v.points) ? v.points : 0;
    }
    return out;
}

/** Filter a faction-keyed record to only the player's faction (defense-in-depth). */
function scopeToPlayerFaction<T>(record: Record<string, T> | undefined, playerFaction: string | null | undefined): Record<string, T> | undefined {
    if (!record || !playerFaction) return record;
    const entry = record[playerFaction];
    return entry !== undefined ? { [playerFaction]: entry } : undefined;
}

const ATTACKER_WIN_OUTCOMES = ['decisive_victory', 'victory', 'costly_victory'];
const ATTACKER_LOSS_OUTCOMES = ['repulsed', 'catastrophic'];

function finiteNumber(value: unknown, fallback = 0): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

const MUNICIPALITY_DISPLAY_NAMES: Record<string, string> = {
    banja_luka: 'Banja Luka', banovici: 'Banovići', bihac: 'Bihać', bijeljina: 'Bijeljina',
    bileca: 'Bileća', bosanska_dubica: 'Bosanska Dubica', bosanska_gradiska: 'Bosanska Gradiška',
    bosanska_kostajnica: 'Bosanska Kostajnica', bosanska_krupa: 'Bosanska Krupa',
    bosanski_brod: 'Bosanski Brod', bosanski_novi: 'Bosanski Novi',
    bosanski_petrovac: 'Bosanski Petrovac', bosanski_samac: 'Bosanski Šamac',
    bosansko_grahovo: 'Bosansko Grahovo', bratunac: 'Bratunac', brcko: 'Brčko',
    breza: 'Breza', bugojno: 'Bugojno', busovaca: 'Busovača', cajnice: 'Čajniče',
    capljina: 'Čapljina', cazin: 'Cazin', celinac: 'Čelinac',
    centar_sarajevo: 'Centar Sarajevo', citluk: 'Čitluk', derventa: 'Derventa',
    doboj: 'Doboj', donji_vakuf: 'Donji Vakuf', duvno: 'Duvno', foca: 'Foča',
    fojnica: 'Fojnica', gacko: 'Gacko', glamoc: 'Glamoč', gorazde: 'Goražde',
    gornji_vakuf: 'Gornji Vakuf', gracanica: 'Gračanica', gradacac: 'Gradačac',
    grude: 'Grude', hadzici: 'Hadžići', hanpijesak: 'Han Pijesak',
    ilidza: 'Ilidža', ilijas: 'Ilijaš', jablanica: 'Jablanica', jajce: 'Jajce',
    kakanj: 'Kakanj', kalesija: 'Kalesija', kalinovik: 'Kalinovik', kiseljak: 'Kiseljak',
    kladanj: 'Kladanj', kljuc: 'Ključ', konjic: 'Konjic', kotor_varos: 'Kotor Varoš',
    kresevo: 'Kreševo', kupres: 'Kupres', laktasi: 'Laktaši', listica: 'Lištica',
    livno: 'Livno', ljubinje: 'Ljubinje', ljubuski: 'Ljubuški', lopare: 'Lopare',
    lukavac: 'Lukavac', maglaj: 'Maglaj', modrica: 'Modrića', mostar: 'Mostar',
    mrkonjic_grad: 'Mrkonjić Grad', neum: 'Neum', nevesinje: 'Nevesinje',
    novi_grad_sarajevo: 'Novi Grad Sarajevo', novi_travnik: 'Novi Travnik',
    novo_sarajevo: 'Novo Sarajevo', odzak: 'Odžak', olovo: 'Olovo', orasje: 'Orašje',
    pale: 'Pale', posusje: 'Posušje', prijedor: 'Prijedor', prnjavor: 'Prnjavor',
    prozor: 'Prozor', rogatica: 'Rogatica', rudo: 'Rudo', sanski_most: 'Sanski Most',
    sekovici: 'Šekovići', sipovo: 'Šipovo', skender_vakuf: 'Skender Vakuf',
    sokolac: 'Sokolac', srbac: 'Srbac', srebrenica: 'Srebrenica', srebrenik: 'Srebrenik',
    stari_grad_sarajevo: 'Stari Grad Sarajevo', stolac: 'Stolac', tesanj: 'Tešanj',
    teslic: 'Teslić', titov_drvar: 'Drvar', travnik: 'Travnik', trebinje: 'Trebinje',
    trnovo: 'Trnovo', tuzla: 'Tuzla', ugljevik: 'Ugljevik', vares: 'Vareš',
    velika_kladusa: 'Velika Kladuša', visegrad: 'Višegrad', visoko: 'Visoko',
    vitez: 'Vitez', vlasenica: 'Vlasenica', vogosca: 'Vogošća',
    zavidovici: 'Zavidovići', zenica: 'Zenica', zepce: 'Žepče',
    zivinice: 'Živinice', zvornik: 'Zvornik',
};

function humanizeMunicipalitySlug(slug: string): string {
    return MUNICIPALITY_DISPLAY_NAMES[slug]
        ?? slug.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function getAirdropAllocationValue(state: any, enclaveId: string): number {
    return finiteNumber((state.military.airdrop_allocation as Record<string, number> | undefined)?.[enclaveId]);
}

const ENCLAVE_UI_DEFINITIONS: Array<{
    id: string;
    display_name: string;
    faction: string;
    osid_prefixes?: string[];
    osid_list?: string[];
}> = [
    { id: 'bihac_pocket', display_name: 'Bihac Pocket', faction: 'RBiH', osid_prefixes: ['op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:'] },
    { id: 'gorazde', display_name: 'Gorazde', faction: 'RBiH', osid_list: [
        'op:gorazde:bacci', 'op:gorazde:citluk_2',
        'op:gorazde:faocici_2', 'op:gorazde:gorazde_2',
        'op:gorazde:hrancici',
        'op:gorazde:kola', 'op:gorazde:kolovarice',
        'op:gorazde:mravinjac_2', 'op:gorazde:novakovici',
        'op:gorazde:osjecani_2', 'op:gorazde:semihova_2',
        'op:gorazde:slatina_2', 'op:gorazde:ustipraca_2',
        'op:gorazde:zorlaci', 'op:gorazde:zorovici',
    ] },
    { id: 'sarajevo', display_name: 'Sarajevo', faction: 'RBiH', osid_prefixes: ['op:centar_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:', 'op:novi_grad_sarajevo:'] },
    { id: 'srebrenica', display_name: 'Srebrenica', faction: 'RBiH', osid_list: [
        'op:srebrenica:bostahovine_2', 'op:srebrenica:brezovice_2',
        'op:srebrenica:donji_potocari_2', 'op:srebrenica:mala_daljegosta_2',
        'op:srebrenica:ljeskovik_2',
        'op:srebrenica:luka_2', 'op:srebrenica:milacevici',
        'op:srebrenica:radovcici',
        'op:srebrenica:srebrenica_2', 'op:srebrenica:suceska',
        'op:srebrenica:sulice_2',
    ] },
    { id: 'zepa', display_name: 'Zepa', faction: 'RBiH', osid_list: ['op:rogatica:zepa_2'] },
    // HRHB enclaves (Bosniak-Croat conflict)
    { id: 'kiseljak', display_name: 'Kiseljak', faction: 'HRHB', osid_list: [
        'op:kiseljak:azapovici_2',
        'op:kiseljak:brnjaci_2', 'op:kiseljak:gromiljak_2',
        'op:kiseljak:kiseljak_2',
        'op:kresevo:kresevo_2', 'op:kresevo:polje_2',
    ] },
    { id: 'lasva_valley', display_name: 'Lasva Valley', faction: 'HRHB', osid_list: [
        'op:vitez:vitez_2',
        'op:busovaca:bare_2', 'op:busovaca:buselji_2',
        'op:busovaca:busovaca_2', 'op:busovaca:polje_2',
        'op:novi_travnik:rankovici_2', 'op:novi_travnik:rat_2',
        'op:novi_travnik:ruda_2',
    ] },
    { id: 'zepce', display_name: 'Zepce', faction: 'HRHB', osid_list: [
        'op:zepce:ozimica_2', 'op:zepce:viniste_2',
        'op:zepce:zepce_2',
    ] },
];

function deriveEnclaveSupplyState(
    enclaveId: string,
    rawSupplyStateByOsid: Record<string, unknown> | undefined,
    fallbackIsolationTurns: number,
    fallbackHardening: boolean,
    fallbackResilience: number,
): 'adequate' | 'strained' | 'critical' {
    const enclave = ENCLAVE_UI_DEFINITIONS.find((entry) => entry.id === enclaveId);
    const factions = Array.isArray(rawSupplyStateByOsid?.factions) ? rawSupplyStateByOsid.factions as Array<Record<string, unknown>> : [];
    const factionEntry = enclave ? factions.find((entry) => entry.faction_id === enclave.faction) : undefined;
    const byOsid = Array.isArray(factionEntry?.by_osid) ? factionEntry.by_osid as Array<Record<string, unknown>> : [];
    let adequate = 0;
    let strained = 0;
    let critical = 0;
    if (enclave) {
        for (const entry of byOsid) {
            const osid = typeof entry.osid === 'string' ? entry.osid : '';
            const osidMatches = enclave.osid_list
                ? enclave.osid_list.includes(osid)
                : enclave.osid_prefixes?.some((prefix) => osid.startsWith(prefix)) ?? false;
            if (!osidMatches) continue;
            if (entry.state === 'critical') critical++;
            else if (entry.state === 'strained') strained++;
            else if (entry.state === 'adequate') adequate++;
        }
    }
    if (critical + strained + adequate > 0) {
        if (critical >= strained && critical >= adequate) return 'critical';
        if (strained >= critical && strained >= adequate) return 'strained';
        return 'adequate';
    }
    if (fallbackIsolationTurns <= 0) return 'adequate';
    if (fallbackHardening || fallbackResilience >= 8) return 'critical';
    return 'strained';
}

/**
 * Parse a final_save.json file content into a LoadedGameState.
 * Validates required fields and extracts formations, militia pools, and control data.
 * Accepts raw GameState or a single-level wrapper (e.g. { state: GameState }) for IPC/legacy.
 */
export function parseGameState(json: unknown): LoadedGameState {
    // Normalize: unwrap common wrappers so we always work with the flat GameState object.
    let state = json as any;
    if (state != null && typeof state === 'object' && !Array.isArray(state)) {
        const keys = Object.keys(state);
        if (keys.length === 1 && (keys[0] === 'state' || keys[0] === 'gameState')) {
            const inner = state[keys[0]];
            if (inner != null && typeof inner === 'object' && !Array.isArray(inner)) {
                state = inner as any;
            }
        }
    }

    const meta = state.meta as any | undefined;
    if (!meta || typeof meta !== 'object') {
        throw new Error('Invalid game state: missing meta. Ensure the file is a final_save.json from the scenario runner.');
    }
    const turnVal = meta.turn;
    if (typeof turnVal !== 'number' || !Number.isFinite(turnVal)) {
        throw new Error('Invalid game state: meta.turn must be a number. Ensure the file is a final_save.json from the scenario runner.');
    }

    const turn = turnVal;
    const phase = typeof meta.phase === 'string' ? meta.phase : 'unknown';
    const metadataDate = typeof meta.date === 'string' && meta.date.length > 0 ? meta.date : 'UNKNOWN';
    const label = `Turn ${turn} (${phase})`;

    const rawMovementState = state.military.brigade_movement_state as Record<string, { status?: string; stance?: string }> | undefined;

    // Normalize formations to record (engine sends object; accept array for robustness).
    let formationsRecord: Record<string, Record<string, unknown>> = {};
    const rawFormationsInput = state.military.formations;
    if (rawFormationsInput && typeof rawFormationsInput === 'object') {
        if (Array.isArray(rawFormationsInput)) {
            for (const row of rawFormationsInput) {
                const r = row as any;
                const id = (typeof r?.id === 'string' ? r.id : '') || (typeof r?.id === 'number' ? String(r.id) : '');
                if (id) formationsRecord[id] = r;
            }
        } else {
            formationsRecord = rawFormationsInput as Record<string, Record<string, unknown>>;
        }
    }

    // War-phase: use formation location_osid. Peace/legacy: use brigade_aor. Accept phase_ii value as war for backward compat.
    const brigadeAorByFormationId: Record<string, string[]> = {};
    const isWarPhase = phase === 'war' || phase === 'phase_ii';
    if (isWarPhase) {
        if (Object.keys(formationsRecord).length > 0) {
            for (const id of Object.keys(formationsRecord).sort()) {
                const loc = (formationsRecord[id] as { location_osid?: string }).location_osid;
                if (typeof loc === 'string' && loc) {
                    brigadeAorByFormationId[id] = [loc];
                }
            }
        }
    } else {
        const rawBrigadeAor = state.brigade_aor as Record<string, string | null> | undefined;
        if (rawBrigadeAor) {
            const sidKeys = Object.keys(rawBrigadeAor).sort();
            for (const sid of sidKeys) {
                const formationId = rawBrigadeAor[sid];
                if (formationId) {
                    const list = brigadeAorByFormationId[formationId] ?? [];
                    list.push(sid);
                    brigadeAorByFormationId[formationId] = list;
                }
            }
            for (const fid of Object.keys(brigadeAorByFormationId)) {
                brigadeAorByFormationId[fid].sort();
            }
        }
    }

    // Brigade history lives on each formation (state.formations[id].brigade_history), not in a separate state.brigade_history.
    // Fallback to state.brigade_history for any legacy save that might have used that shape.
    const brigadeHistoryRecord = state.brigade_history as Record<string, Record<string, unknown>> | undefined;

    // Per-formation campaign casualty totals from casualty_ledger.per_formation.
    const rawLedgerForPerFm = state.military.casualty_ledger as
        Record<string, { per_formation?: Record<string, { killed?: number; wounded?: number; missing_captured?: number }> }> | undefined;
    const perFormationCasualties: Record<string, { kia: number; wia: number; mia: number }> = {};
    if (rawLedgerForPerFm && typeof rawLedgerForPerFm === 'object') {
        for (const factionData of Object.values(rawLedgerForPerFm)) {
            const pf = factionData?.per_formation;
            if (pf && typeof pf === 'object') {
                for (const [bid, bd] of Object.entries(pf)) {
                    const b = bd as { killed?: number; wounded?: number; missing_captured?: number };
                    perFormationCasualties[bid] = {
                        kia: typeof b?.killed === 'number' ? b.killed : 0,
                        wia: typeof b?.wounded === 'number' ? b.wounded : 0,
                        mia: typeof b?.missing_captured === 'number' ? b.missing_captured : 0,
                    };
                }
            }
        }
    }

    // Home-distance cache: pre-computed BFS hop counts from buildHomeDistanceCache() in war_phases.ts.
    const homeDistanceCache = state.military.home_distance_cache as Record<string, number> | undefined;
    // Current frontline OSIDs from front-edge snapshot (used to keep engagement feed plausible).
    const frontEdgeSnapshots = (state.military.war_front_edges_osid ?? state.military.front_edges ?? []) as Array<{ a?: string; b?: string }>;
    const frontlineOsids = new Set<string>();
    for (const edge of frontEdgeSnapshots) {
        if (typeof edge.a === 'string' && edge.a) frontlineOsids.add(edge.a);
        if (typeof edge.b === 'string' && edge.b) frontlineOsids.add(edge.b);
    }
    // Player-issued permanent sector assignments.
    const brigadeSectorOverrideRaw = state.military.brigade_sector_override as Record<string, string> | undefined;
    const brigadeSectorOverride: Record<string, string> | undefined =
        brigadeSectorOverrideRaw && typeof brigadeSectorOverrideRaw === 'object' && !Array.isArray(brigadeSectorOverrideRaw)
            ? brigadeSectorOverrideRaw
            : undefined;

    // GAP 2 fix: build a reverse map from brigade ID → canonical sub_segment_id from
    // corps_front_sectors sub_segment truth. This ensures the adapter reads canonical
    // sector truth rather than the stale formation field, which can lag after demotion.
    // Built once here (O(sectors × sub_segments × brigades)), used O(1) per formation below.
    const brigadeSubSegmentFromSectors = new Map<string, string>();
    {
        const rawCfs = state.military.corps_front_sectors as Record<string, Record<string, unknown>> | undefined;
        if (rawCfs && typeof rawCfs === 'object') {
            for (const sector of Object.values(rawCfs)) {
                if (!sector || typeof sector !== 'object') continue;
                const subSegs = Array.isArray(sector.sub_segments) ? sector.sub_segments as Array<Record<string, unknown>> : [];
                for (const ss of subSegs) {
                    const ssId = typeof ss.sub_segment_id === 'string' ? ss.sub_segment_id : undefined;
                    if (!ssId) continue;
                    const primaries = Array.isArray(ss.primary_brigade_ids) ? ss.primary_brigade_ids as unknown[] : [];
                    for (const bid of primaries) {
                        if (typeof bid === 'string' && bid) brigadeSubSegmentFromSectors.set(bid, ssId);
                    }
                }
            }
        }
    }

    const formations: FormationView[] = [];
    if (Object.keys(formationsRecord).length > 0) {
        const sortedIds = Object.keys(formationsRecord).sort();
        for (const id of sortedIds) {
            const f = formationsRecord[id];
            const tags = (f.tags as string[]) ?? [];

            let municipalityId: string | undefined;
            for (const tag of tags) {
                if (tag.startsWith('mun:')) {
                    municipalityId = tag.slice(4);
                    break;
                }
            }

            const ops = f.ops as any | undefined;
            const hq_sid = typeof f.hq_sid === 'string' && f.hq_sid ? f.hq_sid : undefined;
            const location_osid = typeof (f as { location_osid?: string }).location_osid === 'string' && (f as { location_osid?: string }).location_osid ? (f as { location_osid?: string }).location_osid : undefined;
            const aorSettlementIds = brigadeAorByFormationId[id];
            const personnel = typeof f.personnel === 'number' ? f.personnel : undefined;
            const posture = typeof f.posture === 'string' && f.posture ? f.posture : undefined;
            const home_defense_active = f.home_defense_active === true ? true : undefined;
            const corps_id = typeof f.corps_id === 'string' && f.corps_id ? f.corps_id : undefined;

            // Home-distance effectiveness fields (brigades only).
            const isBrigadeKind = (f.kind as string) === 'brigade' || (f.kind as string) === 'operational_group';
            let homeHops: number | undefined;
            let homeDistanceMult: number | undefined;
            let homeIsElite: boolean | undefined;
            let sectorOverrideId: string | undefined;
            if (isBrigadeKind) {
                const hops = homeDistanceCache?.[id];
                if (typeof hops === 'number' && Number.isFinite(hops)) {
                    homeHops = hops;
                    const equipClass = f.equipment_class as string | undefined;
                    const isElite = equipClass === 'mechanized' || equipClass === 'motorized'
                        || !!(f.elite_loan_state);
                    homeIsElite = isElite || undefined; // only include if true
                    // Replicate getHomeDistanceMult inline (no engine import in adapter)
                    const HOME_DISTANCE_FREE_RANGE = 3;
                    const perHop = isElite ? 0.02 : 0.04;
                    const floor = isElite ? 0.85 : 0.70;
                    homeDistanceMult = hops <= HOME_DISTANCE_FREE_RANGE
                        ? 1.0
                        : Math.max(floor, 1.0 - (hops - HOME_DISTANCE_FREE_RANGE) * perHop);
                }
                const ov = brigadeSectorOverride?.[id];
                if (typeof ov === 'string' && ov) sectorOverrideId = ov;
            }
            // GAP 2: prefer canonical sub_segment truth from corps_front_sectors over
            // the stale formation field. The reverse map was built above from sector
            // sub_segments[].primary_brigade_ids — authoritative post-sync source.
            // Fallback to formation field only if not present in any sector sub_segment.
            const assigned_sub_segment_id: string | undefined =
                brigadeSubSegmentFromSectors.get(id) ??
                (typeof f.assigned_sub_segment_id === 'string' && f.assigned_sub_segment_id
                    ? f.assigned_sub_segment_id : undefined);
            const movementState = rawMovementState?.[id] as { status?: string; stance?: string } | undefined;
            const movementStatus = (movementState?.status === 'packing' || movementState?.status === 'in_transit' || movementState?.status === 'unpacking')
                ? (movementState.status as 'packing' | 'in_transit' | 'unpacking')
                : 'deployed';
            const movementStance = movementStatus !== 'deployed'
                ? (movementState?.stance === 'column' ? 'column' : 'combat')
                : undefined;

            // Extract war story if present
            const warStory = f.war_story as { arc?: string; narrative?: string; notable_moments?: Array<{ turn: number; description: string }> } | undefined;
            const narrativeArc = (warStory?.arc === 'veteran' || warStory?.arc === 'bloodied' || warStory?.arc === 'shattered' || warStory?.arc === 'risen' || warStory?.arc === 'destroyed' || warStory?.arc === 'garrison')
                ? warStory.arc : undefined;

            // Extract combat summary if present (corps/army_hq); brigades get a fallback below.
            const rawCS = f.combat_summary as any | undefined;
            let combatSummary = rawCS && typeof rawCS.battles_fought === 'number' ? {
                battles_fought: finiteNumber(rawCS.battles_fought),
                victories: finiteNumber(rawCS.victories),
                defeats: finiteNumber(rawCS.defeats),
                stalemates: finiteNumber(rawCS.stalemates),
                battles_as_attacker: finiteNumber(rawCS.battles_as_attacker),
                battles_as_defender: finiteNumber(rawCS.battles_as_defender),
                total_casualties_taken: finiteNumber(rawCS.total_casualties_taken),
                total_casualties_inflicted: finiteNumber(rawCS.total_casualties_inflicted),
                total_osids_captured: finiteNumber(rawCS.total_osids_captured),
                total_osids_lost: finiteNumber(rawCS.total_osids_lost),
                win_rate: finiteNumber(rawCS.win_rate),
                casualty_exchange_ratio: finiteNumber(rawCS.casualty_exchange_ratio),
                current_personnel: finiteNumber(rawCS.current_personnel),
                peak_aggregate_personnel: finiteNumber(rawCS.peak_aggregate_personnel),
                nadir_aggregate_personnel: finiteNumber(rawCS.nadir_aggregate_personnel),
                arc_distribution: (rawCS.arc_distribution != null && typeof rawCS.arc_distribution === 'object' && !Array.isArray(rawCS.arc_distribution))
                    ? rawCS.arc_distribution as Record<string, number> : {},
                brigade_count: finiteNumber(rawCS.brigade_count),
                active_brigade_count: finiteNumber(rawCS.active_brigade_count),
                most_casualties_brigade_id: typeof rawCS.most_casualties_brigade_id === 'string' ? rawCS.most_casualties_brigade_id : null,
                most_victories_brigade_id: typeof rawCS.most_victories_brigade_id === 'string' ? rawCS.most_victories_brigade_id : null,
            } : undefined;

            const fv: FormationView = {
                id,
                faction: (f.faction as string) ?? '',
                name: getPlayerSafeDisplayLabel(typeof f.name === 'string' ? f.name : id, 'Formation'),
                kind: ((f.kind as string) === 'corps_asset' && (id.endsWith('_staff') || id.endsWith('_general_staff'))) ? 'army_hq' : ((f.kind as string) ?? 'brigade'),
                readiness: (f.readiness as string) ?? 'active',
                cohesion: (f.cohesion as number) ?? 100, fatigue: (ops?.fatigue as number) ?? 0,
                status: (f.status as string) ?? 'active', createdTurn: (f.created_turn as number) ?? 0,
                home_osid: typeof f.home_osid === 'string' && f.home_osid ? f.home_osid : undefined,
                tags, municipalityId, hq_sid, location_osid, aorSettlementIds,
                personnel, posture, home_defense_active, corps_id, movementStatus, movementStance,
                homeHops, homeDistanceMult, homeIsElite, sectorOverrideId, assigned_sub_segment_id,
                narrativeArc,
                warNarrative: typeof warStory?.narrative === 'string' ? warStory.narrative : undefined,
                notableMoments: Array.isArray(warStory?.notable_moments) ? warStory.notable_moments : undefined,
                officer_quality: typeof f.officer_quality === 'number' && Number.isFinite(f.officer_quality) ? f.officer_quality : undefined,
                combatSummary,
                morale: typeof f.morale === 'number' ? f.morale : undefined,
                entrenchment_turns: typeof f.entrenchment_turns === 'number' ? f.entrenchment_turns : undefined,
                dig_in_progress: typeof f.dig_in_progress === 'number' ? f.dig_in_progress : undefined,
                disrupted_turns: typeof f.disrupted_turns === 'number' ? f.disrupted_turns : undefined,
                equipment_decay: typeof f.equipment_decay === 'number' ? f.equipment_decay : undefined,
                honor: typeof f.honor === 'string' ? f.honor : undefined,
                composition: f.composition as FormationView['composition'] ?? undefined,
                decorations: Array.isArray(f.decorations) ? f.decorations as NonNullable<FormationView['decorations']> : undefined,
                last_repulsed_from: f.last_repulsed_from as NonNullable<FormationView['last_repulsed_from']> ?? undefined,
                last_retreat_from: f.last_retreat_from as NonNullable<FormationView['last_retreat_from']> ?? undefined,
            };

            // Brigade first battle milestone and engagement log: use history on formation first (save has formations[id].brigade_history).
            if (f.kind === 'brigade' || f.kind === 'operational_group') {
                const bh = (f.brigade_history as any | undefined) ?? brigadeHistoryRecord?.[id];
                if (bh && typeof bh === 'object') {
                    const engs = Array.isArray(bh.engagements) ? (bh.engagements as Array<Record<string, unknown>>) : [];
                    const normalizedEngagements = engs.map((e) => ({
                        turn: typeof e.turn === 'number' ? e.turn : 0,
                        osid: typeof e.osid === 'string' ? e.osid : '',
                        role: (e.role === 'attacker' || e.role === 'defender')
                            ? e.role as 'attacker' | 'defender'
                            : 'defender' as 'attacker' | 'defender',
                        outcome: typeof e.outcome === 'string' ? e.outcome : '',
                        casualties_taken: typeof e.casualties_taken === 'number' ? e.casualties_taken : 0,
                        territory_flipped: e.territory_flipped === true,
                    })).sort((a, b) => a.turn - b.turn);
                    if (normalizedEngagements.length > 0) {
                        fv.firstBattleTurn = normalizedEngagements[0].turn;
                        fv.firstBattleOsid = normalizedEngagements[0].osid || null;
                    } else {
                        fv.firstBattleTurn = typeof bh.first_battle_turn === 'number' ? bh.first_battle_turn : null;
                        fv.firstBattleOsid = typeof bh.first_battle_osid === 'string' ? bh.first_battle_osid : null;
                    }

                    fv.brigade_history = {
                        longest_victory_streak: finiteNumber(bh.longest_victory_streak, 0),
                        turns_under_siege: finiteNumber(bh.turns_under_siege, 0),
                        total_equipment_destroyed: typeof bh.total_equipment_destroyed === 'object' ? bh.total_equipment_destroyed as any : undefined,
                        total_equipment_captured: typeof bh.total_equipment_captured === 'object' ? bh.total_equipment_captured as any : undefined,
                    };

                    if (normalizedEngagements.length > 0) {
                        const plausible = normalizedEngagements.filter((e) =>
                            e.territory_flipped || e.role === 'attacker' || frontlineOsids.has(e.osid)
                        );
                        const source = plausible.length > 0 ? plausible : normalizedEngagements;
                        fv.recent_engagements = source.slice(-8);
                    }
                }
            }

            // Campaign casualty ledger (actual KIA/WIA/MIA from casualty_ledger.per_formation).
            if (f.kind === 'brigade' || f.kind === 'operational_group') {
                const cfCas = perFormationCasualties[id];
                if (cfCas) {
                    fv.campaignKia = cfCas.kia;
                    fv.campaignWia = cfCas.wia;
                    fv.campaignMia = cfCas.mia;
                }
            }

            // Elite loan state (elite brigades only — identified by presence of elite_loan_state).
            const els = (f as any).elite_loan_state as {
                on_loan: boolean; loaned_to_corps: string | null; loan_start_turn: number | null;
                last_recall_turn: number | null; permanently_degraded: boolean; current_episode_id: number | null;
            } | undefined;
            if (els) {
                const turn = state.meta?.turn ?? 0;
                const turnsDeployed = els.on_loan && els.loan_start_turn != null ? turn - els.loan_start_turn : 0;
                const inCooldown = !els.on_loan && els.last_recall_turn != null && (turn - els.last_recall_turn) < 4;
                fv.eliteLoanState = {
                    on_loan: els.on_loan,
                    loaned_to_corps: els.loaned_to_corps,
                    loan_start_turn: els.loan_start_turn,
                    turns_deployed: turnsDeployed,
                    in_cooldown: inCooldown,
                    permanently_degraded: els.permanently_degraded,
                    current_episode_id: els.current_episode_id,
                    base_osid: typeof (f as any).base_osid === 'string' ? (f as any).base_osid : null,
                };
            }

            // Brigade fallback: synthesize combatSummary from brigade_history running tallies (on formation or legacy state.brigade_history).
            if (!combatSummary && (f.kind === 'brigade' || f.kind === 'operational_group')) {
                const bh = (f.brigade_history as any | undefined) ?? brigadeHistoryRecord?.[id];
                if (bh && (typeof bh.battles_fought === 'number' ? bh.battles_fought > 0 : Array.isArray(bh.engagements) && (bh.engagements as unknown[]).length > 0)) {
                    const bf = finiteNumber(bh.battles_fought);
                    const engs = Array.isArray(bh.engagements) ? (bh.engagements as Array<Record<string, unknown>>) : [];
                    const battlesFromEngagements = bf > 0 ? bf : engs.length;
                    let vic = finiteNumber(bh.victories);
                    let defeats = finiteNumber(bh.defeats);
                    let stalemates = finiteNumber(bh.stalemates);
                    let taken = finiteNumber(bh.total_casualties_taken);
                    let inflicted = finiteNumber(bh.total_casualties_inflicted);
                    let att = finiteNumber(bh.battles_as_attacker);
                    let def = finiteNumber(bh.battles_as_defender);
                    if (bf === 0 && engs.length > 0) {
                        for (const e of engs) {
                            const role = e.role === 'attacker' ? 'attacker' : 'defender';
                            const out = typeof e.outcome === 'string' ? e.outcome : '';
                            if (role === 'attacker') {
                                if (ATTACKER_WIN_OUTCOMES.includes(out)) vic++;
                                else if (ATTACKER_LOSS_OUTCOMES.includes(out)) defeats++;
                                else stalemates++;
                            } else {
                                if (ATTACKER_LOSS_OUTCOMES.includes(out)) vic++;
                                else if (ATTACKER_WIN_OUTCOMES.includes(out)) defeats++;
                                else stalemates++;
                            }
                            taken += typeof e.casualties_taken === 'number' ? e.casualties_taken : 0;
                            inflicted += typeof e.casualties_inflicted === 'number' ? e.casualties_inflicted : 0;
                            if (role === 'attacker') att++;
                            else def++;
                        }
                    }
                    combatSummary = {
                        battles_fought: battlesFromEngagements,
                        victories: vic,
                        defeats,
                        stalemates,
                        battles_as_attacker: att,
                        battles_as_defender: def,
                        total_casualties_taken: taken,
                        total_casualties_inflicted: inflicted,
                        total_osids_captured: finiteNumber(bh.total_osids_captured),
                        total_osids_lost: finiteNumber(bh.total_osids_lost),
                        win_rate: battlesFromEngagements > 0 ? vic / battlesFromEngagements : 0,
                        casualty_exchange_ratio: taken > 0 ? inflicted / taken : (inflicted > 0 ? inflicted : 1),
                        current_personnel: personnel ?? 0,
                        peak_aggregate_personnel: finiteNumber(bh.peak_personnel),
                        nadir_aggregate_personnel: finiteNumber(bh.nadir_personnel),
                        arc_distribution: {},
                        brigade_count: 1,
                        active_brigade_count: 1,
                        most_casualties_brigade_id: null,
                        most_victories_brigade_id: null,
                    };
                }
            }
            fv.combatSummary = combatSummary; // Assign the potentially synthesized combatSummary
            formations.push(fv);
        }
    }

    // Synthesize army_hq for factions that have corps but no army_hq in the save
    const ARMY_HQ_SYNTH: Record<string, { id: string; name: string }> = {
        RS: { id: 'vrs_main_staff', name: 'Main Staff VRS' },
        RBiH: { id: 'arbih_general_staff', name: 'General Staff ARBiH' },
        HRHB: { id: 'hvo_main_staff', name: 'Main Staff HVO' },
    };
    for (const [faction, hqDef] of Object.entries(ARMY_HQ_SYNTH)) {
        const hasHq = formations.some(f => f.kind === 'army_hq' && f.faction === faction);
        const hasCorps = formations.some(f => (f.kind === 'corps' || f.kind === 'corps_asset') && f.faction === faction);
        if (!hasHq && hasCorps) {
            formations.push({
                id: hqDef.id, faction, name: hqDef.name, kind: 'army_hq',
                readiness: 'active', cohesion: 100, fatigue: 0, status: 'active', createdTurn: 0,
            } as FormationView);
        }
    }

    const rawCorpsCommand = state.military.corps_command as Record<string, Record<string, unknown>> | undefined;
    if (rawCorpsCommand) {
        for (const fv of formations) {
            if (fv.kind === 'corps' || fv.kind === 'corps_asset') {
                const cc = rawCorpsCommand[fv.id];
                if (cc) {
                    fv.corpsStance = (cc.stance as string) ?? undefined;
                    fv.corpsExhaustion = typeof cc.corps_exhaustion === 'number' ? cc.corps_exhaustion : undefined;
                    fv.corpsOgSlots = typeof cc.og_slots === 'number' ? cc.og_slots : undefined;
                    fv.corpsCommandSpan = typeof cc.command_span === 'number' ? cc.command_span : undefined;
                    const rawActiveOgs = cc.active_ogs;
                    if (Array.isArray(rawActiveOgs)) {
                        fv.corpsActiveOgIds = [...(rawActiveOgs as string[])].sort();
                    }
                }
                fv.subordinateIds = formations
                    .filter((sub) => sub.corps_id === fv.id && sub.id !== fv.id)
                    .map((sub) => sub.id)
                    .sort();

                // ── Command Strain (derived on-read, not stored on GameState) ──────
                const strain = computeCorpsCommandStrain(fv.id, state as unknown as GameState);
                fv.commandStrain = strain;
                fv.commandStrainLabel = getCommandStrainLabel(strain);

                // ── Strain decay projection (Wave 10) ────────────────────────────
                const projections = projectStrainDecay(fv.id, state as unknown as GameState, 5);
                fv.projectedStrainNextTurn = projections.length > 1 ? projections[1].projectedStrain : strain;
                fv.recoveryForecast = deriveRecoveryForecast(projections);

                // ── Corps Situation Assessment (Commander Explanation Surfaces Wave 1) ──
                const cmdState = cc?.commander_state as {
                    zone_assessments?: Array<{
                        posture: string; deficit: number;
                        surplus_brigades: readonly string[];
                        front_edge_count: number;
                        is_must_hold?: boolean; corridor_width?: number;
                    }>;
                    threat_assessment?: { overall_pressure: string; enemy_concentration_zones?: readonly string[] };
                    force_assessment?: {
                        total_brigades: number; combat_effective: number; total_surplus: number;
                        tier_counts?: { main_effort: number; active_defense: number; garrison: number };
                    };
                    current_plan?: {
                        objective_description: string; status: string;
                        concentration_progress?: number; suspension_reason?: string;
                    } | null;
                    last_plan_action?: string;
                    last_plan_reason?: string;
                } | null | undefined;
                fv.situationAssessment = deriveCorpsSituationAssessment(
                    cmdState, fv.corpsStance, fv.corpsExhaustion, strain,
                );

                // ── Active friction events for this corps's commander ─────────────
                const frictionEvents = (state.military.friction_events as Array<{ officer_id: string; turn: number; type: string; resolved: boolean }> | undefined) ?? [];
                const namedOfficers = state.military.named_officers as Record<string, { status?: string; assigned_corps_id?: string | null }> | undefined;
                const corpsCommanderIds = namedOfficers
                    ? Object.keys(namedOfficers).sort().filter(oid => {
                        const os = namedOfficers[oid];
                        return os?.status === 'active' && os?.assigned_corps_id === fv.id;
                    })
                    : [];
                const unresolvedTypes = frictionEvents
                    .filter(e => !e.resolved && corpsCommanderIds.includes(e.officer_id))
                    .map(e => e.type)
                    .sort();
                fv.activeFrictionTypes = unresolvedTypes;

                // ── Full friction event list for Wave 3 resolution UI ─────────
                // Includes only events for this corps's active commander.
                // Sorted by turn (oldest first) for stable rendering.
                const FRICTION_TYPE_LABELS: Record<string, string> = {
                    ignored_stance: 'Ignored Stance Order',
                    unauthorized_op: 'Unauthorized Operation',
                    refused_release: 'Refused Brigade Release',
                };
                fv.frictionEvents = frictionEvents
                    .filter(e => corpsCommanderIds.includes(e.officer_id))
                    .sort((a, b) => a.turn - b.turn || a.officer_id.localeCompare(b.officer_id) || a.type.localeCompare(b.type))
                    .map((e): FrictionEventView => ({
                        compositeKey: `${e.officer_id}:${e.turn}:${e.type}`,
                        officerId: e.officer_id,
                        typeLabel: FRICTION_TYPE_LABELS[e.type] ?? e.type,
                        turn: e.turn,
                        resolved: e.resolved,
                    }));

                // ── Wave 4: stabilization availability ───────────────────────────
                const currentTurn = (state.meta as { turn?: number } | undefined)?.turn ?? 0;
                const rawCorpsCmd = (state.corps_command as Record<string, { stabilization_cooldown_until?: number }> | undefined)?.[fv.id];
                const cooldownUntil = rawCorpsCmd?.stabilization_cooldown_until ?? 0;
                const cooldownActive = currentTurn < cooldownUntil;
                fv.stabilizationAvailable = strain > 0 && !cooldownActive;
                fv.stabilizationCooldownUntil = cooldownActive ? cooldownUntil : undefined;
                const COMPROMISED_THRESHOLD_ADAPTER = 6;
                fv.stabilizationCostCA = state.military.command_authority
                    ? (strain >= COMPROMISED_THRESHOLD_ADAPTER ? 15 : 10)
                    : 0;
            }
        }
    }

    for (const fv of formations) {
        if (fv.kind === 'army_hq') {
            fv.subordinateIds = formations
                .filter((sub) => (sub.kind === 'corps' || sub.kind === 'corps_asset') && sub.faction === fv.faction && sub.id !== fv.id)
                .map((sub) => sub.id)
                .sort();
        }
    }

    // CANONICAL OPERATION EXTRACTION — maps CorpsOperation → OperationView.
    // This is the single permitted UI read path for operation data.
    // Parse active operations from corps_command
    const operations: OperationView[] = [];
    if (rawCorpsCommand) {
        for (const fv of formations) {
            if (fv.kind !== 'corps' && fv.kind !== 'corps_asset') continue;
            const cc = rawCorpsCommand[fv.id];
            // Legacy compat: old save files used singular active_operation; new saves use active_operations[].
            const activeOps = (Array.isArray(cc?.active_operations) ? cc.active_operations : cc?.active_operation ? [cc.active_operation] : []) as any[];
            for (const op of activeOps) {
            if (op && typeof op === 'object' && op.name) {
                const participatingBrigadeIds = Array.isArray(op.participating_brigades)
                    ? (op.participating_brigades as string[]).filter((id): id is string => typeof id === 'string').sort(strictCompare)
                    : undefined;
                const participatingSet = participatingBrigadeIds ? new Set(participatingBrigadeIds) : null;
                const participatingFormations = participatingSet
                    ? formations.filter((f) => participatingSet.has(f.id))
                    : [];
                const avgCohesion = participatingFormations.length > 0
                    ? participatingFormations.reduce((sum, formation) => sum + finiteNumber(formation.cohesion, 0), 0) / participatingFormations.length
                    : undefined;
                const avgPersonnelPct = participatingFormations.length > 0
                    ? participatingFormations.reduce((sum, formation) => {
                        const personnel = finiteNumber(formation.personnel, 0);
                        const baseline = personnel > 0 ? Math.min(1, personnel / 2500) : 0;
                        return sum + baseline;
                    }, 0) / participatingFormations.length
                    : undefined;
                const sectorIntelRecords = typeof op.sector_id === 'string'
                    ? (state.military.sector_intel as Record<string, Array<Record<string, unknown>>> | undefined)?.[op.sector_id]
                    : undefined;
                const intelReadiness = Array.isArray(sectorIntelRecords) && sectorIntelRecords.length > 0
                    ? sectorIntelRecords.reduce((best, record) => {
                        const confidence = finiteNumber(record.confidence, 0);
                        return confidence > best ? confidence : best;
                    }, 0)
                    : undefined;
                const supplyReadiness = typeof op.supply_readiness === 'number' ? op.supply_readiness : undefined;
                operations.push({
                    corps_id: fv.id,
                    corps_name: fv.name,
                    faction: fv.faction,
                    name: op.name as string,
                    type: (op.type as string) ?? 'sector_attack',
                    phase: (op.phase as 'planning' | 'execution' | 'recovery') ?? 'execution',
                    sector_id: typeof op.sector_id === 'string' ? op.sector_id : undefined,
                    staging_osid: typeof op.staging_osid === 'string' ? op.staging_osid : undefined,
                    objectives: Array.isArray(op.objectives) ? (op.objectives as string[]).filter(o => typeof o === 'string') : undefined,
                    current_objective_index: typeof op.current_objective_index === 'number' ? op.current_objective_index : undefined,
                    momentum: typeof op.momentum === 'number' ? op.momentum : undefined,
                    failure_count: typeof op.failure_count === 'number' ? op.failure_count : undefined,
                    consecutive_failures_on_current: typeof op.consecutive_failures_on_current === 'number' ? op.consecutive_failures_on_current : undefined,
                    phase_started_turn: typeof op.phase_started_turn === 'number' ? op.phase_started_turn : undefined,
                    participating_brigade_count: participatingBrigadeIds?.length ?? 0,
                    participating_brigade_ids: participatingBrigadeIds,
                    started_turn: typeof op.started_turn === 'number' ? op.started_turn : turn,
                    supply_readiness: supplyReadiness,
                    avg_cohesion: avgCohesion,
                    avg_personnel_pct: avgPersonnelPct,
                    readiness: supplyReadiness != null || avgCohesion != null || intelReadiness != null
                        ? {
                            supply: supplyReadiness ?? 0,
                            cohesion: avgCohesion != null ? Math.max(0, Math.min(1, avgCohesion / 100)) : 0,
                            intel: intelReadiness ?? 0,
                        }
                        : undefined,
                    min_attack_outcome: typeof op.min_attack_outcome === 'string' ? op.min_attack_outcome as OperationView['min_attack_outcome'] : undefined,
                    tempo: typeof op.tempo === 'string' ? op.tempo as OperationView['tempo'] : undefined,
                    schwerpunkt_osid: typeof op.schwerpunkt_osid === 'string' ? op.schwerpunkt_osid : undefined,
                    artillery_preparation: op.artillery_preparation === true ? true : undefined,
                    force_launch: op.force_launch === true ? true : undefined,
                    was_force_launched: op.was_force_launched === true ? true : undefined,
                    recovery_reason: typeof op.recovery_reason === 'string' ? op.recovery_reason as OperationView['recovery_reason'] : undefined,
                    axes: Array.isArray(op.axes) ? (op.axes as Array<Record<string, unknown>>).map(a => ({
                        axis_id: String(a.axis_id ?? ''),
                        name: String(a.name ?? ''),
                        assigned_brigades: Array.isArray(a.assigned_brigades) ? (a.assigned_brigades as string[]).filter(s => typeof s === 'string') : [],
                        objectives: Array.isArray(a.objectives) ? (a.objectives as string[]).filter(s => typeof s === 'string') : [],
                        current_objective_index: typeof a.current_objective_index === 'number' ? a.current_objective_index : 0,
                        status: (a.status as 'executing' | 'stalled' | 'complete') ?? 'executing',
                        momentum: typeof a.momentum === 'number' ? a.momentum : 0,
                        staging_osid: typeof a.staging_osid === 'string' ? a.staging_osid : undefined,
                    })) : undefined,
                    commander_officer_id: typeof op.commander_officer_id === 'string' ? op.commander_officer_id : undefined,
                    preparation_sub_phase: typeof op.preparation_sub_phase === 'string' ? op.preparation_sub_phase as OperationView['preparation_sub_phase'] : undefined,
                    preparation_turns_elapsed: typeof op.preparation_turns_elapsed === 'number' ? op.preparation_turns_elapsed : undefined,
                    preparation_max_turns: typeof op.preparation_max_turns === 'number' ? op.preparation_max_turns : undefined,
                    commander_assessment: typeof op.commander_assessment === 'string' ? op.commander_assessment as OperationView['commander_assessment'] : undefined,
                    commander_assessment_at_launch: typeof op.commander_assessment_at_launch === 'string' ? op.commander_assessment_at_launch as OperationView['commander_assessment_at_launch'] : undefined,
                    intel_confidence_at_assessment: typeof op.intel_confidence_at_assessment === 'number' ? op.intel_confidence_at_assessment : undefined,
                    supply_readiness_at_assessment: typeof op.supply_readiness_at_assessment === 'number' ? op.supply_readiness_at_assessment : undefined,
                    force_ratio_estimate: typeof op.force_ratio_estimate === 'number' ? op.force_ratio_estimate : undefined,
                    postponement_count: typeof op.postponement_count === 'number' ? op.postponement_count : undefined,
                    // Wave 6: Readiness trend — derived on-read from existing persisted fields
                    readinessTrend: op.phase === 'planning' ? deriveReadinessTrend(
                        typeof op.commander_assessment === 'string' ? op.commander_assessment as 'launch' | 'postpone' | 'abort' : undefined,
                        typeof op.postponement_count === 'number' ? op.postponement_count : 0,
                        typeof op.preparation_turns_elapsed === 'number' ? op.preparation_turns_elapsed : undefined,
                        typeof op.preparation_max_turns === 'number' ? op.preparation_max_turns : undefined,
                    ) : undefined,
                    has_active_probe: op.active_probe != null && typeof op.active_probe === 'object' ? true : undefined,
                    supporting_sector_ids: Array.isArray(op.supporting_sector_ids) ? (op.supporting_sector_ids as string[]).filter(id => typeof id === 'string').sort(strictCompare) : undefined,
                    primary_sector_brigades: Array.isArray(op.primary_sector_brigades) ? (op.primary_sector_brigades as string[]).filter(id => typeof id === 'string').sort(strictCompare) : undefined,
                    attached_brigades: Array.isArray(op.attached_brigades) ? (op.attached_brigades as string[]).filter(id => typeof id === 'string').sort(strictCompare) : undefined,
                    reinforcement_source: typeof op.reinforcement_source === 'string' ? op.reinforcement_source as OperationView['reinforcement_source'] : undefined,
                });
            }
            } // end for-of activeOps
        }
        operations.sort((a, b) => a.faction.localeCompare(b.faction) || a.corps_id.localeCompare(b.corps_id));
    }

    const militiaPools: MilitiaPoolView[] = [];
    const rawPools = state.military.militia_pools as Record<string, Record<string, unknown>> | undefined;
    if (rawPools) {
        for (const key of Object.keys(rawPools).sort()) {
            const p = rawPools[key];
            militiaPools.push({
                munId: (p.mun_id as string) ?? key, faction: (p.faction as string) ?? '',
                available: (p.available as number) ?? 0, committed: (p.committed as number) ?? 0,
                exhausted: (p.exhausted as number) ?? 0, fatigue: (p.fatigue as number) ?? 0,
            });
        }
    }

    let controlBySettlement: Record<string, string | null> = {};
    let initialControlBySettlement: Record<string, string | null> | undefined;
    let statusBySettlement: Record<string, string> = {};
    const pc = state.political.political_controllers as Record<string, string | null> | undefined;
    if (pc) controlBySettlement = buildControlLookup(pc);
    const ipc = state.political.initial_political_controllers as Record<string, string | null> | undefined;
    if (ipc) initialControlBySettlement = buildControlLookup(ipc);
    const contested = state.political.contested_control as Record<string, boolean> | undefined;
    if (contested) {
        for (const [sid, isContested] of Object.entries(contested)) {
            if (isContested) statusBySettlement[sid] = 'CONTESTED';
        }
        statusBySettlement = buildStatusLookup(statusBySettlement);
    }

    const attackOrders: AttackOrderView[] = [];
    const rawAttackOrders = state.military.brigade_attack_orders as Record<string, string | null> | Array<{ brigade_id?: string; target_settlement_id?: string }> | undefined;
    if (Array.isArray(rawAttackOrders)) {
        for (const row of rawAttackOrders) {
            const brigadeId = typeof row?.brigade_id === 'string' ? row.brigade_id : '';
            const targetSid = typeof row?.target_settlement_id === 'string' ? row.target_settlement_id : '';
            if (brigadeId && targetSid) attackOrders.push({ brigadeId, targetSettlementId: targetSid });
        }
        attackOrders.sort((a, b) => a.brigadeId.localeCompare(b.brigadeId) || a.targetSettlementId.localeCompare(b.targetSettlementId));
    } else if (rawAttackOrders && typeof rawAttackOrders === 'object') {
        for (const [brigadeId, targetSid] of Object.entries(rawAttackOrders).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)) {
            if (targetSid) attackOrders.push({ brigadeId, targetSettlementId: targetSid });
        }
    }

    const movementOrdersSettlement: MovementOrderSettlementView[] = [];
    const rawMovementOrders = state.military.brigade_movement_orders as Record<string, { destination_sids?: string[] }> | undefined;
    if (rawMovementOrders && typeof rawMovementOrders === 'object' && !Array.isArray(rawMovementOrders)) {
        for (const [brigadeId, order] of Object.entries(rawMovementOrders).sort((a, b) => a[0].localeCompare(b[0]))) {
            const sids = order?.destination_sids;
            if (Array.isArray(sids) && sids.length > 0) {
                movementOrdersSettlement.push({ brigadeId, targetSettlementIds: [...sids].sort() });
            }
        }
    }

    // Brigade reposition orders are retired. Older saves may still carry the field,
    // but the player-facing shell must not present it as an active order type.
    const repositionOrders: RepositionOrderView[] = [];

    const aorOrders: AoROrderView[] = [];
    const rawAoROrders = state.brigade_aor_orders as Array<{ settlement_id?: string; from_brigade?: string; to_brigade?: string }> | undefined;
    if (Array.isArray(rawAoROrders) && rawAoROrders.length > 0) {
        for (const o of rawAoROrders) {
            const settlementId = typeof o.settlement_id === 'string' ? o.settlement_id : '';
            const fromBrigadeId = typeof o.from_brigade === 'string' ? o.from_brigade : '';
            const toBrigadeId = typeof o.to_brigade === 'string' ? o.to_brigade : '';
            if (settlementId && fromBrigadeId && toBrigadeId) aorOrders.push({ settlementId, fromBrigadeId, toBrigadeId });
        }
        aorOrders.sort((a, b) => {
            if (a.settlementId !== b.settlementId) return a.settlementId < b.settlementId ? -1 : 1;
            if (a.fromBrigadeId !== b.fromBrigadeId) return a.fromBrigadeId < b.fromBrigadeId ? -1 : 1;
            return a.toBrigadeId < b.toBrigadeId ? -1 : a.toBrigadeId > b.toBrigadeId ? 1 : 0;
        });
    }

    const recentControlEvents = (((state.political.control_events as unknown[]) ?? [])
        .map((entry) => {
            const rec = entry as any;
            const turnRaw = Number(rec.turn ?? NaN);
            const settlementId = String(rec.settlement_id ?? '');
            const mechanism = String(rec.mechanism ?? 'unknown');
            if (!Number.isFinite(turnRaw) || !settlementId) return null;
            return {
                turn: turnRaw, settlementId, mechanism,
                from: rec.from == null ? null : String(rec.from),
                to: rec.to == null ? null : String(rec.to),
                municipalityId: rec.mun_id == null ? null : String(rec.mun_id),
            };
        })
        .filter((v): v is NonNullable<typeof v> => v !== null))
        .sort((a, b) => {
            if (a.turn !== b.turn) return a.turn - b.turn;
            return a.settlementId.localeCompare(b.settlementId) || a.mechanism.localeCompare(b.mechanism);
        });

    let recruitment: RecruitmentView | undefined;
    const rawRecruitment = state.military.recruitment_state as any | undefined;
    if (rawRecruitment) {
        const capitalByFaction = pointsByFaction((rawRecruitment.recruitment_capital as Record<string, { points?: number }> | undefined) ?? {});
        const equipmentByFaction = pointsByFaction((rawRecruitment.equipment_pools as Record<string, { points?: number }> | undefined) ?? {});
        const recruitedBrigadeIds = Array.isArray(rawRecruitment.recruited_brigade_ids)
            ? [...(rawRecruitment.recruited_brigade_ids as string[])].sort()
            : [];
        if (Object.keys(capitalByFaction).length > 0) {
            recruitment = { capitalByFaction, equipmentByFaction: Object.keys(equipmentByFaction).length > 0 ? equipmentByFaction : undefined, recruitedBrigadeIds };
        }
    }

    let armyStance: LoadedGameState['armyStance'] | undefined;
    const rawArmyStance = state.military.army_stance as any | undefined;
    if (rawArmyStance && typeof rawArmyStance === 'object' && !Array.isArray(rawArmyStance)) {
        const out: NonNullable<LoadedGameState['armyStance']> = {};
        for (const faction of Object.keys(rawArmyStance).sort((a, b) => a.localeCompare(b))) {
            const stance = rawArmyStance[faction];
            if (typeof stance === 'string' && stance.length > 0) out[faction] = stance;
        }
        if (Object.keys(out).length > 0) armyStance = out;
    }

    let casualtyLedger: LoadedGameState['casualtyLedger'] | undefined;
    const rawCasualtyLedger = state.military.casualty_ledger as Record<string, Record<string, unknown>> | undefined;
    if (rawCasualtyLedger && typeof rawCasualtyLedger === 'object' && !Array.isArray(rawCasualtyLedger)) {
        const out: NonNullable<LoadedGameState['casualtyLedger']> = {};
        for (const faction of Object.keys(rawCasualtyLedger).sort((a, b) => a.localeCompare(b))) {
            const row = rawCasualtyLedger[faction] ?? {};
            out[faction] = {
                killed: finiteNumber(row.killed),
                wounded: finiteNumber(row.wounded),
                missing_captured: finiteNumber(row.missing_captured),
            };
        }
        if (Object.keys(out).length > 0) casualtyLedger = out;
    }

    let civilianCasualties: LoadedGameState['civilianCasualties'] | undefined;
    const rawCivilianCasualties = state.displacement?.civilian_casualties as Record<string, Record<string, unknown>> | undefined;
    if (rawCivilianCasualties && typeof rawCivilianCasualties === 'object' && !Array.isArray(rawCivilianCasualties)) {
        const out: NonNullable<LoadedGameState['civilianCasualties']> = {};
        for (const faction of Object.keys(rawCivilianCasualties).sort((a, b) => a.localeCompare(b))) {
            const row = rawCivilianCasualties[faction] ?? {};
            out[faction] = {
                killed: finiteNumber(row.killed),
                fled_abroad: finiteNumber(row.fled_abroad),
            };
        }
        if (Object.keys(out).length > 0) civilianCasualties = out;
    }

    let internationalVisibilityPressure: LoadedGameState['internationalVisibilityPressure'] | undefined;
    const rawIvp = state.political.international_visibility_pressure as any | undefined;
    if (rawIvp && typeof rawIvp === 'object' && !Array.isArray(rawIvp)) {
        internationalVisibilityPressure = {
            atrocity_visibility: finiteNumber(rawIvp.atrocity_visibility),
            enclave_humanitarian_pressure: finiteNumber(rawIvp.enclave_humanitarian_pressure),
            sarajevo_siege_visibility: finiteNumber(rawIvp.sarajevo_siege_visibility),
            negotiation_momentum: finiteNumber(rawIvp.negotiation_momentum),
            composite_ivp: finiteNumber(rawIvp.composite_ivp),
            last_major_shift: finiteNumber(rawIvp.last_major_shift, turn),
        };
    }
    const ivpConsequencesActive = Array.isArray(state.political.ivp_consequences_active)
        ? (state.political.ivp_consequences_active as unknown[])
            .filter((value): value is string => typeof value === 'string' && value.length > 0)
            .sort(strictCompare)
        : undefined;
    const pendingConvoyDecisions = Array.isArray(state.military.pending_convoy_decisions)
        ? (state.military.pending_convoy_decisions as Array<Record<string, unknown>>)
            .map((convoy) => {
                const id = typeof convoy.id === 'string' ? convoy.id : '';
                const targetEnclave = typeof convoy.target_enclave === 'string' ? convoy.target_enclave : '';
                const routeFaction = convoy.route_faction === 'RS' || convoy.route_faction === 'RBiH' || convoy.route_faction === 'HRHB'
                    ? convoy.route_faction
                    : null;
                if (!id || !targetEnclave || !routeFaction) return null;
                const decision = convoy.decision === 'allow' || convoy.decision === 'block' || convoy.decision === 'divert'
                    ? convoy.decision
                    : undefined;
                return {
                    id,
                    target_enclave: targetEnclave,
                    route_faction: routeFaction as 'RS' | 'RBiH' | 'HRHB',
                    supply_amount: finiteNumber(convoy.supply_amount),
                    ...(decision ? { decision: decision as 'allow' | 'block' | 'divert' } : {}),
                };
            })
            .filter((value): value is NonNullable<typeof value> => value !== null)
            .sort((a, b) => a.id.localeCompare(b.id))
        : undefined;

    const municipalitySupportOrders = state.military.municipality_support_orders && typeof state.military.municipality_support_orders === 'object'
        ? Object.fromEntries(
            Object.entries(state.military.municipality_support_orders as Record<string, Record<string, unknown>>)
                .sort(([a], [b]) => a.localeCompare(b))
                .flatMap(([faction, order]) => {
                    if ((faction !== 'RS' && faction !== 'RBiH' && faction !== 'HRHB') || !order || typeof order !== 'object') return [];
                    const mun_id = typeof order.mun_id === 'string' ? order.mun_id : '';
                    const type = order.type === 'weapons_shipment' || order.type === 'staff_priority' || order.type === 'croatian_support_package'
                        ? order.type
                        : null;
                    const staged_turn = finiteNumber(order.staged_turn, -1);
                    if (!mun_id || !type || staged_turn < 0) return [];
                    return [[faction, { faction, mun_id, type, staged_turn, label: getMunicipalitySupportLabel(faction) }]];
                })
        ) as LoadedGameState['municipalitySupportOrders']
        : undefined;

    let warPhaseSupplyPressure: LoadedGameState['warPhaseSupplyPressure'] | undefined;
    const rawSupply = state.political.war_supply_pressure as any | undefined;
    if (rawSupply && typeof rawSupply === 'object' && !Array.isArray(rawSupply)) {
        const out: NonNullable<LoadedGameState['warPhaseSupplyPressure']> = {};
        for (const faction of Object.keys(rawSupply).sort((a, b) => a.localeCompare(b))) {
            out[faction] = finiteNumber(rawSupply[faction], 100);
        }
        if (Object.keys(out).length > 0) warPhaseSupplyPressure = out;
    }

    let factionReserves: LoadedGameState['factionReserves'] | undefined;
    const rawGeneral = state.military.general_supply_reserve as any | undefined;
    if (rawGeneral && typeof rawGeneral === 'object' && !Array.isArray(rawGeneral)) {
        const out: NonNullable<LoadedGameState['factionReserves']> = {};
        const rawHeavy = state.military.heavy_munitions_reserve as any | undefined;
        for (const faction of Object.keys(rawGeneral).sort((a, b) => a.localeCompare(b))) {
            out[faction] = {
                generalSupply: finiteNumber(rawGeneral[faction], 0),
                heavyMunitions: finiteNumber(rawHeavy?.[faction] ?? 0, 0),
            };
        }
        if (Object.keys(out).length > 0) factionReserves = out;
    }

    // Economy: Production facilities
    let productionFacilities: LoadedGameState['productionFacilities'] | undefined;
    const rawFacilities = state.military.production_facilities as Record<string, any> | undefined;
    if (rawFacilities && typeof rawFacilities === 'object') {
        const pc = state.political.political_controllers ?? {};
        // Simple municipality controller lookup from OSID keys
        const munControllers = new Map<string, string>();
        for (const key of Object.keys(pc).sort()) {
            const ctrl = pc[key];
            if (!ctrl) continue;
            const parts = key.split(':');
            const mun = parts.length >= 2 ? parts[1] : key;
            if (!munControllers.has(mun)) munControllers.set(mun, ctrl);
        }
        productionFacilities = Object.keys(rawFacilities).sort().map(fid => {
            const f = rawFacilities[fid];
            return {
                id: f.facility_id ?? fid,
                name: getPlayerSafeDisplayLabel(f.name ?? fid, 'Production facility'),
                type: f.type ?? 'unknown',
                municipality: f.municipality_id ?? '',
                condition: typeof f.current_condition === 'number' ? f.current_condition : 1,
                controller: munControllers.get(f.municipality_id ?? '') ?? null,
            };
        });
    }

    // Economy: Smuggling routes
    let smugglingRoutes: LoadedGameState['smugglingRoutes'] | undefined;
    const rawRoutes = state.military.smuggling_routes as any[] | undefined;
    if (Array.isArray(rawRoutes) && rawRoutes.length > 0) {
        // Build name lookup from route defs
        const ROUTE_NAMES: Record<string, { name: string; faction: string }> = {
            rbih_sarajevo_tunnel: { name: 'Sarajevo Tunnel', faction: 'RBiH' },
            rbih_adriatic_coast: { name: 'Adriatic Coast', faction: 'RBiH' },
            rbih_dinaric_spine: { name: 'Dinaric Spine', faction: 'RBiH' },
            rs_belgrade_pipeline: { name: 'Belgrade Pipeline', faction: 'RS' },
            rs_corridor: { name: 'Posavina Corridor', faction: 'RS' },
            rs_montenegro: { name: 'Montenegro Route', faction: 'RS' },
            hrhb_croatian_supply: { name: 'Croatian Supply Line', faction: 'HRHB' },
            hrhb_adriatic: { name: 'Adriatic Port', faction: 'HRHB' },
            hrhb_herzegovina: { name: 'Herzegovina Network', faction: 'HRHB' },
        };
        smugglingRoutes = rawRoutes
            .sort((a: any, b: any) => String(a.id ?? '').localeCompare(String(b.id ?? '')))
            .map((r: any) => {
                const meta = ROUTE_NAMES[r.id] ?? { name: getPlayerSafeDisplayLabel(r.id, 'Supply route'), faction: '' };
                return {
                    id: String(r.id ?? ''),
                    name: meta.name,
                    faction: meta.faction,
                    capacity: typeof r.capacity === 'number' ? r.capacity : 0,
                    disrupted: Boolean(r.disrupted),
                    active_turns: typeof r.active_turns === 'number' ? r.active_turns : 0,
                };
            });
    }

    // Economy: Embargo status
    let embargoStatus: LoadedGameState['embargoStatus'] | undefined;
    const factionsList = state.factions ?? [];
    const embargoEntries: Array<[string, { pipeline: number; smuggling: number }]> = [];
    for (const fac of factionsList) {
        const ep = fac.embargo_profile;
        if (!ep) continue;
        embargoEntries.push([fac.id, {
            pipeline: typeof ep.external_pipeline_status === 'number' ? ep.external_pipeline_status : 0,
            smuggling: typeof ep.smuggling_efficiency === 'number' ? ep.smuggling_efficiency : 0,
        }]);
    }
    if (embargoEntries.length > 0) {
        embargoStatus = Object.fromEntries(embargoEntries.sort(([a], [b]) => a.localeCompare(b)));
    }

    let mobilizationSummary: LoadedGameState['mobilizationSummary'] | undefined;
    const rawMilitiaPoolsForSummary = state.military.militia_pools as Record<string, Record<string, unknown>> | undefined;
    const rawStrategicReserves = state.military.strategic_reserves as any | undefined;
    if (rawMilitiaPoolsForSummary && typeof rawMilitiaPoolsForSummary === 'object' && !Array.isArray(rawMilitiaPoolsForSummary)) {
        const byFaction: Record<string, MobilizationSummaryView & { _poolByMun: Map<string, number> }> = {};
        for (const poolKey of Object.keys(rawMilitiaPoolsForSummary).sort(strictCompare)) {
            const pool = rawMilitiaPoolsForSummary[poolKey] ?? {};
            const faction = typeof pool.faction === 'string' ? pool.faction : '';
            if (!faction) continue;
            const munId = poolKey.includes(':') ? poolKey.split(':', 2)[0] : poolKey;
            if (!byFaction[faction]) {
                byFaction[faction] = {
                    faction: faction as MobilizationSummaryView['faction'],
                    total_available: 0,
                    total_committed: 0,
                    total_exhausted: 0,
                    exhaustion_pct: 0,
                    strategic_reserve: finiteNumber(rawStrategicReserves?.[faction], 0),
                    top_pools: [],
                    _poolByMun: new Map<string, number>(),
                };
            }
            byFaction[faction].total_available += finiteNumber(pool.available);
            byFaction[faction].total_committed += finiteNumber(pool.committed);
            byFaction[faction].total_exhausted += finiteNumber(pool.exhausted);
            byFaction[faction]._poolByMun.set(munId, (byFaction[faction]._poolByMun.get(munId) ?? 0) + finiteNumber(pool.available));
        }
        const out: NonNullable<LoadedGameState['mobilizationSummary']> = {};
        for (const faction of Object.keys(byFaction).sort(strictCompare)) {
            const entry = byFaction[faction];
            const denominator = entry.total_available + entry.total_committed + entry.total_exhausted;
            entry.exhaustion_pct = denominator > 0 ? (entry.total_exhausted / denominator) * 100 : 0;
            entry.top_pools = Array.from(entry._poolByMun.entries())
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 5)
                .map(([mun_id, available]) => ({ mun_id, available }));
            out[faction] = {
                faction: entry.faction,
                total_available: entry.total_available,
                total_committed: entry.total_committed,
                total_exhausted: entry.total_exhausted,
                exhaustion_pct: entry.exhaustion_pct,
                strategic_reserve: entry.strategic_reserve,
                top_pools: entry.top_pools,
            };
        }
        if (Object.keys(out).length > 0) mobilizationSummary = out;
    }

    let warPhaseExhaustion: LoadedGameState['warPhaseExhaustion'] | undefined;
    const rawExhaustion = state.political.war_exhaustion as any | undefined;
    if (rawExhaustion && typeof rawExhaustion === 'object' && !Array.isArray(rawExhaustion)) {
        const out: NonNullable<LoadedGameState['warPhaseExhaustion']> = {};
        for (const faction of Object.keys(rawExhaustion).sort((a, b) => a.localeCompare(b))) {
            out[faction] = finiteNumber(rawExhaustion[faction], 0);
        }
        if (Object.keys(out).length > 0) warPhaseExhaustion = out;
    }

    let namedOfficerData: LoadedGameState['namedOfficerData'] | undefined;
    let namedOfficerStateById: LoadedGameState['namedOfficerStateById'] | undefined;
    const rawOfficerData = state.military.named_officer_data as Array<Record<string, unknown>> | undefined;
    const rawOfficers = state.military.named_officers as Record<string, Record<string, unknown>> | undefined;
    if (Array.isArray(rawOfficerData) && rawOfficers && typeof rawOfficers === 'object' && !Array.isArray(rawOfficers)) {
        const officerList: NamedOfficerView[] = [];
        const sortedData = [...rawOfficerData].sort((a, b) => strictCompare(String(a?.id ?? ''), String(b?.id ?? '')));
        for (const data of sortedData) {
            const id = typeof data?.id === 'string' ? data.id : '';
            if (!id) continue;
            const os = rawOfficers[id];
            officerList.push({
                id,
                name: getPlayerSafeOfficerName(typeof data.name === 'string' ? data.name : null),
                faction: typeof data.faction === 'string' ? data.faction : '',
                rank: typeof data.rank === 'string' ? data.rank : 'corps_commander',
                competence: finiteNumber(data.competence, 0),
                aggressiveness: finiteNumber(data.aggressiveness, 0),
                defensive_skill: finiteNumber(data.defensive_skill, 0),
                political_reliability: finiteNumber(data.political_reliability, 0),
                home_corps_id: typeof data.home_corps_id === 'string' ? data.home_corps_id : undefined,
                origin: typeof data.origin === 'string' ? data.origin : 'military',
                status: typeof os?.status === 'string' ? os.status : 'active',
                assigned_corps_id: typeof os?.assigned_corps_id === 'string' ? os.assigned_corps_id : null,
                acting_commander: Boolean(os?.acting_commander),
                turns_in_command: finiteNumber(os?.turns_in_command, 0),
                battles: finiteNumber(os?.battles, 0),
                victories: finiteNumber(os?.victories, 0),
                enclave_lock: os?.enclave_lock != null && typeof os.enclave_lock === 'object'
                    ? { enclave_id: String((os.enclave_lock as Record<string, unknown>).enclave_id ?? ''), locked_until_turn: typeof (os.enclave_lock as Record<string, unknown>).locked_until_turn === 'number' ? (os.enclave_lock as Record<string, unknown>).locked_until_turn as number : undefined }
                    : undefined,
                assigned_operation: typeof os?.assigned_operation === 'string' ? os.assigned_operation : undefined,
                compatible_corps_ids: Array.isArray(data.compatible_corps_ids) ? (data.compatible_corps_ids as string[]).filter(s => typeof s === 'string') : undefined,
                casualty_vulnerability: finiteNumber(os?.casualty_vulnerability, undefined) as number | undefined,
                war_crimes_record: (() => {
                    const wcr = data.war_crimes_record;
                    if (wcr == null || typeof wcr !== 'object') return undefined;
                    const r = wcr as Record<string, unknown>;
                    return {
                        court: String(r.court ?? ''),
                        verdict: String(r.verdict ?? ''),
                        sentence: typeof r.sentence === 'string' ? r.sentence : undefined,
                        charges: typeof r.charges === 'string' ? r.charges : undefined,
                        summary: String(r.summary ?? ''),
                    };
                })(),
                experience_points: finiteNumber(os?.experience_points, undefined) as number | undefined,
                operations_commanded: finiteNumber(os?.operations_commanded, undefined) as number | undefined,
                initial_competence: finiteNumber(os?.initial_competence, undefined) as number | undefined,
                is_cowed: os?.cowed_until_turn !== undefined &&
                    typeof state.meta?.turn === 'number' &&
                    Number(state.meta.turn) <= Number(os.cowed_until_turn),
                cowed_until_turn: typeof os?.cowed_until_turn === 'number' ? os.cowed_until_turn : undefined,
                effective_compliance_modifier: (() => {
                    const pol_rel = Number(data.political_reliability ?? 3);
                    const baseMod = (pol_rel - 3) * 0.10;
                    const warlordEndWeek = (state.military?.war_timeline as any)?.officer_config?.['RBiH']?.warlord_friction_end_week;
                    const isWarlordActive =
                        String(data.faction ?? '') === 'RBiH' &&
                        pol_rel <= 2 &&
                        warlordEndWeek !== undefined &&
                        Number(state.meta?.turn ?? 0) < Number(warlordEndWeek);
                    return isWarlordActive ? baseMod - 0.15 : baseMod;
                })(),
            });
        }
        if (officerList.length > 0) namedOfficerData = officerList;

        const stateById: Record<string, NamedOfficerStateView> = {};
        for (const officerId of Object.keys(rawOfficers).sort(strictCompare)) {
            const os = rawOfficers[officerId];
            if (!os || typeof os !== 'object') continue;
            stateById[officerId] = {
                officer_id: officerId,
                status: typeof os.status === 'string' ? os.status : 'active',
                assigned_corps_id: typeof os.assigned_corps_id === 'string' ? os.assigned_corps_id : null,
                acting_commander: Boolean(os.acting_commander),
                turns_in_command: finiteNumber(os.turns_in_command, 0),
                battles: finiteNumber(os.battles, 0),
                victories: finiteNumber(os.victories, 0),
            };
        }
        if (Object.keys(stateById).length > 0) namedOfficerStateById = stateById;
    }

    const rbih_hrhb_war_earliest_turn = typeof meta?.rbih_hrhb_war_earliest_turn === 'number' ? meta.rbih_hrhb_war_earliest_turn : undefined;
    const war_alliance_rbih_hrhb = typeof state.political.war_alliance_rbih_hrhb === 'number' ? state.political.war_alliance_rbih_hrhb : undefined;
    // Default to RS in dev mode when no player faction set (headless scenario runs)
    const rawPlayerFaction = (meta?.player_faction as string | null | undefined) ?? null;
    const playerFaction = rawPlayerFaction ?? (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1' ? 'RS' : null) ?? (typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'RS' : null);

    // Single pass: derive fogOfWar + sectorIntel from sector_intel records
    let fogOfWar: FogOfWarView | undefined;
    const sectorIntelRecords: LoadedGameState['sectorIntel'] = [];
    const rawSectorIntel = state.military.sector_intel as Record<string, Array<Record<string, unknown>>> | undefined;
    const rawCorpsFrontSectors = state.military.corps_front_sectors as Record<string, Record<string, unknown>> | undefined;
    if (playerFaction && rawSectorIntel && rawCorpsFrontSectors) {
        const visibleEnemySectorIds = new Set<string>();
        const visibleEnemyOsids = new Set<string>();
        for (const [friendlySectorId, records] of Object.entries(rawSectorIntel).sort((a, b) => a[0].localeCompare(b[0]))) {
            const friendlySector = rawCorpsFrontSectors[friendlySectorId];
            if (!friendlySector || friendlySector.faction !== playerFaction || !Array.isArray(records)) continue;
            for (const rec of records) {
                const enemySectorId = typeof rec.enemy_sector_id === 'string' ? rec.enemy_sector_id : '';
                if (!enemySectorId) continue;

                // Fog-of-war: accumulate visible enemy OSIDs and sector IDs
                visibleEnemySectorIds.add(enemySectorId);
                const enemySector = rawCorpsFrontSectors[enemySectorId];
                const subSegments = Array.isArray(enemySector?.sub_segments)
                    ? enemySector.sub_segments as Array<Record<string, unknown>>
                    : [];
                for (const sub of subSegments) {
                    const friendlyOsids = Array.isArray(sub.friendly_osids) ? sub.friendly_osids : [];
                    for (const osid of friendlyOsids) {
                        if (typeof osid === 'string' && osid.length > 0) visibleEnemyOsids.add(osid);
                    }
                }
                const visibleBrigadeIds = Array.isArray(rec.visible_brigade_ids) ? rec.visible_brigade_ids : [];
                for (const brigadeId of visibleBrigadeIds) {
                    if (typeof brigadeId !== 'string' || brigadeId.length === 0) continue;
                    const brigade = formationsRecord[brigadeId];
                    const locationOsid = typeof brigade?.location_osid === 'string' ? brigade.location_osid : '';
                    if (locationOsid) visibleEnemyOsids.add(locationOsid);
                }

                // Sector intel: full record for Threat Assessment panel
                sectorIntelRecords.push({
                    friendly_sector_id: friendlySectorId,
                    enemy_sector_id: enemySectorId,
                    front_edge_count: typeof rec.front_edge_count === 'number' ? rec.front_edge_count : 0,
                    strength_category: (['unknown', 'thin', 'moderate', 'dense', 'fortress'].includes(rec.strength_category as string)
                        ? rec.strength_category as 'unknown' | 'thin' | 'moderate' | 'dense' | 'fortress' : 'unknown'),
                    posture_observed: (['unknown', 'defensive', 'entrenched', 'offensive_prep'].includes(rec.posture_observed as string)
                        ? rec.posture_observed as 'unknown' | 'defensive' | 'entrenched' | 'offensive_prep' : 'unknown'),
                    offensive_signs: Boolean(rec.offensive_signs),
                    confidence: typeof rec.confidence === 'number' ? rec.confidence : 0,
                    turns_in_contact: typeof rec.turns_in_contact === 'number' ? rec.turns_in_contact : 0,
                    visible_brigade_ids: visibleBrigadeIds.filter((id: unknown): id is string => typeof id === 'string').sort(strictCompare),
                });
            }
        }
        if (visibleEnemySectorIds.size > 0 || visibleEnemyOsids.size > 0) {
            fogOfWar = {
                visibleEnemyOsids: Array.from(visibleEnemyOsids).sort(strictCompare),
                visibleEnemySectorIds: Array.from(visibleEnemySectorIds).sort(strictCompare),
            };
        }
    }

    const displacementByMun: LoadedGameState['displacementByMun'] = {};
    const rawDisplacement = state.displacement?.displacement_state as Record<string, Record<string, unknown>> | undefined;
    if (rawDisplacement && typeof rawDisplacement === 'object' && !Array.isArray(rawDisplacement)) {
        for (const [munId, row] of Object.entries(rawDisplacement).sort((a, b) => a[0].localeCompare(b[0]))) {
            const originalPopulation = typeof row.original_population === 'number' && Number.isFinite(row.original_population) ? row.original_population : 0;
            const displacedOut = typeof row.displaced_out === 'number' && Number.isFinite(row.displaced_out) ? row.displaced_out : 0;
            const displacedIn = typeof row.displaced_in === 'number' && Number.isFinite(row.displaced_in) ? row.displaced_in : 0;
            const lostPopulation = typeof row.lost_population === 'number' && Number.isFinite(row.lost_population) ? row.lost_population : 0;
            const arrivedByFaction: Partial<Record<string, number>> = {};
            const rawArrived = row.displaced_in_by_faction;
            if (rawArrived && typeof rawArrived === 'object' && !Array.isArray(rawArrived)) {
                for (const [fid, val] of Object.entries(rawArrived as any).sort((a, b) => a[0].localeCompare(b[0]))) {
                    if (typeof val === 'number' && Number.isFinite(val) && val > 0) arrivedByFaction[fid] = val;
                }
            }
            displacementByMun[munId] = {
                originalPopulation, displacedOut, displacedIn, lostPopulation,
                currentPopulation: Math.max(0, originalPopulation - displacedOut - lostPopulation + displacedIn),
                ...(Object.keys(arrivedByFaction).length > 0 ? { arrivedByFaction } : {}),
            };
        }
    }

    // Scan displacement_event_log for per-OSID per-faction departures and per-mun totals (for fallback when OSID has no events)
    const departedByOsid: LoadedGameState['departedByOsid'] = {};
    const departedByMun: LoadedGameState['departedByMun'] = {};
    const displacementByOsid: LoadedGameState['displacementByOsid'] = {};
    const displacementEventLogRaw: LoadedGameState['displacementEventLog'] = [];
    const rawEventLog = (state as any).displacement?.displacement_event_log;
    if (Array.isArray(rawEventLog)) {
        for (const evt of rawEventLog as Array<Record<string, unknown>>) {
            const displaced = finiteNumber(evt.displaced);
            const killed = finiteNumber(evt.killed);
            const fledAbroad = finiteNumber(evt.fled_abroad);
            const settled = finiteNumber(evt.settled);
            const originOsid = typeof evt.origin_osid === 'string' ? evt.origin_osid : '';
            const destOsid = typeof evt.dest_osid === 'string' ? evt.dest_osid : '';
            const originMun = typeof evt.origin_mun === 'string' ? evt.origin_mun : '';
            const ethnicity = typeof evt.ethnicity === 'string' ? evt.ethnicity : '';
            const turnNum = typeof evt.turn === 'number' ? evt.turn : 0;
            const causedBy = typeof evt.caused_by === 'string' ? evt.caused_by : undefined;
            displacementEventLogRaw.push({ turn: turnNum, origin_osid: originOsid || undefined, dest_osid: destOsid || undefined, origin_mun: originMun || undefined, ethnicity: ethnicity || undefined, displaced, killed, fled_abroad: fledAbroad, settled, caused_by: causedBy });
            if (originOsid) {
                if (!displacementByOsid[originOsid]) displacementByOsid[originOsid] = { out: 0, lost: 0, in: 0 };
                // displaced = total people removed (includes killed + fled as subsets)
                // killed + fled_abroad are subsets of displaced, NOT additional
                displacementByOsid[originOsid].out += displaced;
                displacementByOsid[originOsid].lost += killed + fledAbroad;
            }
            if (destOsid) {
                if (!displacementByOsid[destOsid]) displacementByOsid[destOsid] = { out: 0, lost: 0, in: 0 };
                displacementByOsid[destOsid].in += settled;
            }
            // displaced = total removals (killed + fled are subsets, not additional)
            const totalRemoved = displaced;
            if (totalRemoved > 0 && ethnicity) {
                if (originOsid) {
                    if (!departedByOsid[originOsid]) departedByOsid[originOsid] = {};
                    departedByOsid[originOsid][ethnicity] =
                        (departedByOsid[originOsid][ethnicity] ?? 0) + totalRemoved;
                }
                if (originMun) {
                    if (!departedByMun[originMun]) departedByMun[originMun] = {};
                    departedByMun[originMun][ethnicity] =
                        (departedByMun[originMun][ethnicity] ?? 0) + totalRemoved;
                }
            }
        }
    }

    const frontEdges: LoadedGameState['frontEdges'] = Array.isArray(state.military.front_edges)
        ? (state.military.front_edges as Array<Record<string, unknown>>)
            .map((edge) => {
                const a = typeof edge.a === 'string' ? edge.a : '';
                const b = typeof edge.b === 'string' ? edge.b : '';
                if (!a || !b) return null;
                const [na, nb] = a < b ? [a, b] : [b, a];
                const edgeId = typeof edge.edge_id === 'string' && edge.edge_id ? edge.edge_id : `${na}__${nb}`;
                const sideA = edge.side_a === 'RS' || edge.side_a === 'RBiH' || edge.side_a === 'HRHB' ? edge.side_a : null;
                const sideB = edge.side_b === 'RS' || edge.side_b === 'RBiH' || edge.side_b === 'HRHB' ? edge.side_b : null;
                return { edge_id: edgeId, a: na, b: nb, side_a: a < b ? sideA : sideB, side_b: a < b ? sideB : sideA };
            })
            .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
            .sort((a, b) => a.edge_id.localeCompare(b.edge_id))
        : undefined;

    const frontEdgesOsid: LoadedGameState['frontEdgesOsid'] = Array.isArray(state.military.war_front_edges_osid)
        ? (state.military.war_front_edges_osid as Array<Record<string, unknown>>)
            .map((edge) => {
                const a = typeof edge.a === 'string' ? edge.a : '';
                const b = typeof edge.b === 'string' ? edge.b : '';
                if (!a || !b) return null;
                const [na, nb] = a < b ? [a, b] : [b, a];
                const edgeId = typeof edge.edge_id === 'string' && edge.edge_id ? edge.edge_id : `${na}__${nb}`;
                const sideA = edge.side_a === 'RS' || edge.side_a === 'RBiH' || edge.side_a === 'HRHB' ? edge.side_a : null;
                const sideB = edge.side_b === 'RS' || edge.side_b === 'RBiH' || edge.side_b === 'HRHB' ? edge.side_b : null;
                return { edge_id: edgeId, a: na, b: nb, side_a: a < b ? sideA : sideB, side_b: a < b ? sideB : sideA };
            })
            .filter((edge): edge is NonNullable<typeof edge> => edge !== null)
            .sort((a, b) => a.edge_id.localeCompare(b.edge_id))
        : undefined;

    let frontPressureByEdge: LoadedGameState['frontPressureByEdge'] | undefined;
    const rawFrontPressure = state.military.front_pressure as Record<string, Record<string, unknown>> | undefined;
    if (rawFrontPressure && typeof rawFrontPressure === 'object' && !Array.isArray(rawFrontPressure)) {
        const out: NonNullable<LoadedGameState['frontPressureByEdge']> = {};
        for (const key of Object.keys(rawFrontPressure).sort((a, b) => a.localeCompare(b))) {
            const item = rawFrontPressure[key] ?? {};
            const edgeId = typeof item.edge_id === 'string' && item.edge_id ? item.edge_id : key;
            const value = Number(item.value ?? 0);
            const maxAbs = Number(item.max_abs ?? Math.abs(value));
            const lastUpdatedTurn = Number(item.last_updated_turn ?? turn);
            out[edgeId] = { edge_id: edgeId, value: Number.isFinite(value) ? value : 0, max_abs: Number.isFinite(maxAbs) ? Math.max(1, maxAbs) : 1, last_updated_turn: Number.isFinite(lastUpdatedTurn) ? lastUpdatedTurn : turn };
        }
        if (Object.keys(out).length > 0) frontPressureByEdge = out;
    }

    let corpsFrontSectors: CorpsFrontSectorView[] | undefined;
    const rawSectors = state.military.corps_front_sectors as Record<string, Record<string, unknown>> | undefined;
    const rawOpsecSectors = Array.isArray(state.military.opsec_sectors)
        ? state.military.opsec_sectors as unknown[]
        : Array.isArray((state as any).opsec_sectors)
            ? (state as any).opsec_sectors as unknown[]
            : [] as unknown[];
    const opsecSectorSet = new Set(
        rawOpsecSectors.filter((value): value is string => typeof value === 'string')
    );
    if (rawSectors && typeof rawSectors === 'object' && !Array.isArray(rawSectors)) {
        const out: CorpsFrontSectorView[] = [];
        for (const sectorId of Object.keys(rawSectors).sort((a, b) => a.localeCompare(b))) {
            const s = rawSectors[sectorId] ?? {};
            const corpsId = typeof s.corps_id === 'string' ? s.corps_id : '';
            const faction = typeof s.faction === 'string' ? s.faction : '';
            if (!corpsId || !faction) continue;
            const corpsFormation = formationsRecord[corpsId];
            const corpsName = corpsFormation && typeof corpsFormation.name === 'string' ? corpsFormation.name : corpsId;
            const edgeIds = Array.isArray(s.edge_ids)
                ? (s.edge_ids as unknown[]).filter((value): value is string => typeof value === 'string').sort((a, b) => a.localeCompare(b))
                : [];
            const opposingFactions = Array.isArray(s.opposing_factions)
                ? (s.opposing_factions as unknown[]).filter((value): value is string => typeof value === 'string').sort((a, b) => a.localeCompare(b))
                : [];
            const subSegments = Array.isArray(s.sub_segments) ? s.sub_segments as Array<Record<string, unknown>> : [];
            const assignedBrigadeIds = Array.isArray(s.assigned_brigade_ids) ? (s.assigned_brigade_ids as string[]).filter(id => typeof id === 'string').sort((a, b) => a.localeCompare(b)) : [];
            const reserveBrigadeIds = Array.isArray(s.reserve_brigade_ids) ? (s.reserve_brigade_ids as string[]).filter(id => typeof id === 'string').sort((a, b) => a.localeCompare(b)) : [];

            // Derive display_name from municipality slugs in friendly_osids
            const munCounts = new Map<string, number>();
            for (const ss of subSegments) {
                const friendlyOsids = Array.isArray(ss.friendly_osids) ? ss.friendly_osids as string[] : [];
                for (const osid of friendlyOsids) {
                    const parts = osid.split(':');
                    if (parts.length >= 2) {
                        const mun = parts[1];
                        munCounts.set(mun, (munCounts.get(mun) ?? 0) + 1);
                    }
                }
            }
            const topMuns = [...munCounts.entries()]
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, 2)
                .map(([m]) => humanizeMunicipalitySlug(m));
            const displayName = topMuns.length > 0
                ? `${corpsName} \u2013 ${topMuns.join(', ')}`
                : corpsName;

            out.push({
                sector_id: typeof s.sector_id === 'string' ? s.sector_id : sectorId,
                corps_id: corpsId,
                corps_name: corpsName,
                display_name: displayName,
                faction,
                opposing_factions: opposingFactions,
                edge_ids: edgeIds,
                sub_segment_count: subSegments.length,
                length_edges: typeof s.length_edges === 'number' ? s.length_edges : edgeIds.length,
                assigned_brigade_ids: assignedBrigadeIds,
                reserve_brigade_ids: reserveBrigadeIds,
                density: typeof s.density === 'number' ? s.density : 0,
                threat_ratio: typeof s.threat_ratio === 'number' ? s.threat_ratio : 0,
                defensive_power: typeof s.defensive_power === 'number' ? s.defensive_power : 0,
                // New intel fields defaulting for backwards compatibility:
                intel_confidence: typeof s.intel_confidence === 'number' ? s.intel_confidence : 1.0,
                offensive_signs: Boolean(s.offensive_signs),
                logistics_priority: edgeIds.length > 0
                    ? edgeIds.reduce((sum, edgeId) => {
                        const factionPriorities = (state.military.logistics_priority as Record<string, Record<string, number>> | undefined)?.[faction];
                        const value = factionPriorities?.[edgeId];
                        return sum + (typeof value === 'number' ? value : 1);
                    }, 0) / edgeIds.length
                    : 1,
                opsec_active: opsecSectorSet.has(sectorId),
                sector_stance: typeof s.sector_stance === 'string' ? s.sector_stance as CorpsFrontSectorView['sector_stance'] : 'defend',
                stance_source: typeof s.stance_source === 'string' ? s.stance_source as CorpsFrontSectorView['stance_source'] : 'bot',
                sub_segments: subSegments.map((ss: any) => ({
                    sub_segment_id: ss.sub_segment_id ?? '',
                    edge_ids: Array.isArray(ss.edge_ids) ? ss.edge_ids : [],
                    friendly_osids: Array.isArray(ss.friendly_osids) ? ss.friendly_osids : [],
                    enemy_osids: Array.isArray(ss.enemy_osids) ? ss.enemy_osids : [],
                    length_edges: typeof ss.length_edges === 'number' ? ss.length_edges : 0,
                    primary_brigade_ids: Array.isArray(ss.primary_brigade_ids) ? ss.primary_brigade_ids : [],
                    gap: Boolean(ss.gap),
                })),
            });
        }
        // Merge sector combat ratings if available
        const rawRatings = state.military.sector_combat_ratings as Record<string, Record<string, unknown>> | undefined;
        if (rawRatings && typeof rawRatings === 'object') {
            for (const sv of out) {
                const r = rawRatings[sv.sector_id];
                if (!r) continue;
                sv.combat_offensive_power = typeof r.offensive_power === 'number' ? r.offensive_power : undefined;
                sv.combat_defensive_power = typeof r.defensive_power === 'number' ? r.defensive_power : undefined;
                sv.combat_defense_per_edge = typeof r.defense_per_edge === 'number' ? r.defense_per_edge : undefined;
                sv.combat_strength_class = typeof r.strength_class === 'string' ? r.strength_class as CorpsFrontSectorView['combat_strength_class'] : undefined;
                sv.combat_morale_avg = typeof r.morale_avg === 'number' ? r.morale_avg : undefined;
                sv.combat_cohesion_avg = typeof r.cohesion_avg === 'number' ? r.cohesion_avg : undefined;
                sv.combat_fatigue_avg = typeof r.fatigue_avg === 'number' ? r.fatigue_avg : undefined;
                sv.combat_personnel = typeof r.personnel === 'number' ? r.personnel : undefined;
            }
        }
        if (out.length > 0) corpsFrontSectors = out;
    }

    let sectorEntrenchmentSummary: LoadedGameState['sectorEntrenchmentSummary'] | undefined;
    if (corpsFrontSectors && corpsFrontSectors.length > 0) {
        const formationsById = new Map(formations.map((formation) => [formation.id, formation]));
        const out: NonNullable<LoadedGameState['sectorEntrenchmentSummary']> = {};
        for (const sector of corpsFrontSectors) {
            const assigned = sector.assigned_brigade_ids
                .map((formationId) => formationsById.get(formationId))
                .filter((formation): formation is FormationView => Boolean(formation));
            if (assigned.length === 0) continue;
            out[sector.sector_id] = {
                avgEntrenchment: assigned.reduce((sum, formation) => sum + finiteNumber(formation.entrenchment_turns), 0) / assigned.length,
                avgDigIn: assigned.reduce((sum, formation) => sum + finiteNumber(formation.dig_in_progress), 0) / assigned.length,
                digInCount: assigned.filter((formation) => formation.posture === 'dig_in').length,
                totalCount: assigned.length,
            };
        }
        if (Object.keys(out).length > 0) sectorEntrenchmentSummary = out;
    }

    let enclaveResilience: LoadedGameState['enclaveResilience'] | undefined;
    const rawEnclave = state.political.enclave_resilience as any | undefined;
    const rawSupplyStateByOsid = state.supply_state_by_osid as any | undefined;
    if (rawEnclave && typeof rawEnclave === 'object' && !Array.isArray(rawEnclave)) {
        const out: Record<string, EnclaveResilienceView> = {};
        for (const key of Object.keys(rawEnclave).sort()) {
            const entry = rawEnclave[key];
            const enclaveDef = ENCLAVE_UI_DEFINITIONS.find((enclave) => enclave.id === key);
            if (typeof entry === 'number') {
                out[key] = {
                    resilience: entry,
                    isolation_turns: 0,
                    hardening_active: false,
                    supply_state: deriveEnclaveSupplyState(key, rawSupplyStateByOsid, 0, false, entry),
                    airdrop_status: enclaveDef?.faction === 'RBiH' ? 'not_isolated_long_enough' : 'not_eligible',
                    airdrop_allocation: getAirdropAllocationValue(state as any, key),
                    faction: (enclaveDef?.faction as FactionId | undefined) ?? undefined,
                    display_name: enclaveDef?.display_name ?? humanizeMunicipalitySlug(key.replace(/_/g, '-')),
                };
            } else if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                const e = entry as any;
                const resilienceValue = finiteNumber(e.resilience);
                const isolationTurns = finiteNumber(e.isolation_turns);
                const hardeningActive = Boolean(e.hardening_active);
                out[key] = {
                    resilience: resilienceValue,
                    isolation_turns: isolationTurns,
                    hardening_active: hardeningActive,
                    supply_state: deriveEnclaveSupplyState(key, rawSupplyStateByOsid, isolationTurns, hardeningActive, resilienceValue),
                    airdrop_status: enclaveDef?.faction !== 'RBiH'
                        ? 'not_eligible'
                        : isolationTurns >= 4
                            ? 'receiving'
                        : isolationTurns > 0
                            ? 'not_isolated_long_enough'
                            : 'not_eligible',
                    airdrop_allocation: getAirdropAllocationValue(state as any, key),
                    faction: (enclaveDef?.faction as FactionId | undefined) ?? undefined,
                    display_name: enclaveDef?.display_name ?? humanizeMunicipalitySlug(key.replace(/_/g, '-')),
                };
            }
        }
        if (Object.keys(out).length > 0) enclaveResilience = out;
    }

    const rawCommandBriefing = state.military?.last_briefing;
    const commandBriefing = rawCommandBriefing
        && (!playerFaction || rawCommandBriefing.faction === playerFaction)
        ? toCommandBriefingView(rawCommandBriefing)
        : undefined;
    const operationalSitrep = (phase === 'war' || phase === 'phase_ii')
        && state.displacement && typeof state.displacement === 'object'
        && Array.isArray((state as any).factions)
        ? getOperationalSitrepView(state as GameState, playerFaction as any)
        : undefined;
    const pendingOfficerEvents = derivePendingOfficerEvents(state);
    const pendingEventDecisions = derivePendingEventDecisions(state);
    const presidentialReviewQueue = derivePresidentialReviewQueue({
        pendingOfficerEvents,
        pendingEventDecisions,
    });
    const pendingReserveRequests = derivePendingReserveRequests(state, playerFaction);
    const armyReserveQueue = deriveArmyReserveQueue({
        pendingReserveRequests,
    });

    return {
        label, turn, phase,
        metadata: {
            turn,
            date: metadataDate,
        },
        formations, militiaPools, controlBySettlement, initialControlBySettlement, statusBySettlement,
        brigadeAorByFormationId,
        attackOrders, aorOrders, recentControlEvents, allControlEvents: recentControlEvents, displacementEventLog: displacementEventLogRaw, recruitment,
        armyStance, casualtyLedger: scopeToPlayerFaction(casualtyLedger, playerFaction), civilianCasualties, internationalVisibilityPressure, ivpConsequencesActive, pendingConvoyDecisions, municipalitySupportOrders,
        sarajevoTunnelOperational: Boolean(state.military.sarajevo_tunnel_operational), warPhaseSupplyPressure: scopeToPlayerFaction(warPhaseSupplyPressure, playerFaction), warPhaseExhaustion: scopeToPlayerFaction(warPhaseExhaustion, playerFaction),
        player_faction: playerFaction ?? undefined,
        rbih_hrhb_war_earliest_turn: rbih_hrhb_war_earliest_turn ?? null,
        war_alliance_rbih_hrhb: war_alliance_rbih_hrhb ?? null,
        frontEdges: frontEdges && frontEdges.length > 0 ? frontEdges : undefined,
        frontEdgesOsid: frontEdgesOsid && frontEdgesOsid.length > 0 ? frontEdgesOsid : undefined,
        frontPressureByEdge,
        displacementByMun: Object.keys(displacementByMun).length > 0 ? displacementByMun : undefined,
        departedByOsid: departedByOsid && Object.keys(departedByOsid).length > 0 ? departedByOsid : undefined,
        departedByMun: departedByMun && Object.keys(departedByMun).length > 0 ? departedByMun : undefined,
        displacementByOsid: Object.keys(displacementByOsid).length > 0 ? displacementByOsid : undefined,
        fogOfWar,
        sectorIntel: sectorIntelRecords.length > 0 ? sectorIntelRecords : undefined,
        movementOrdersSettlement: movementOrdersSettlement.length > 0 ? movementOrdersSettlement : undefined,
        repositionOrders: repositionOrders.length > 0 ? repositionOrders : undefined,
        corpsFrontSectors,
        unresolvedSectorBrigades: (() => {
            const raw = state.military?.unresolved_sector_brigades as string[] | undefined;
            if (!Array.isArray(raw) || raw.length === 0) return undefined;
            if (!playerFaction) return raw;
            // Filter to player faction only — formations keyed by formation id
            const formationFactionMap = new Map<string, string>();
            for (const f of formations) formationFactionMap.set(f.id, f.faction ?? '');
            const filtered = raw.filter((id) => formationFactionMap.get(id) === playerFaction);
            return filtered.length > 0 ? filtered : undefined;
        })(),
        operations: filterPlayerFacingEntriesByFaction(operations, playerFaction),
        namedOfficerData,
        namedOfficerStateById,
        factionReserves: scopeToPlayerFaction(factionReserves, playerFaction),
        productionFacilities,
        smugglingRoutes,
        embargoStatus,
        enclaveResilience,
        sectorEntrenchmentSummary,
        mobilizationSummary,
        commandAuthority: state.military.command_authority ? {
            current: finiteNumber(state.military.command_authority.current),
            max: finiteNumber(state.military.command_authority.max, 100),
            spentThisTurn: finiteNumber(state.military.command_authority.spent_this_turn),
            lifetimeSpent: finiteNumber(state.military.command_authority.lifetime_spent),
        } : undefined,
        commandBriefing,
        operationalSitrep,
        battlesByOsid: deriveBattlesByOsid(state),
        movementsByOsid: deriveMovementsByOsid(state),
        supplyTransitionsByOsid: deriveSupplyTransitionsByOsid(state),
        historicalEventsByTurn: deriveHistoricalEvents(state),
        latestTurnSummary: (state.turn_summaries as import('../../../state/turn_summary.js').TurnSummary[] | undefined)?.[0] ?? null,
        turnSummaries: (state.turn_summaries as import('../../../state/turn_summary.js').TurnSummary[] | undefined) ?? [],
        operationHistory: filterPlayerFacingEntriesByFaction(deriveOperationHistory(state), playerFaction),
        activeOperations: filterPlayerFacingEntriesByFaction(deriveActiveOperations(state), playerFaction),
        brigadeSectorOverride: brigadeSectorOverride && Object.keys(brigadeSectorOverride).length > 0 ? brigadeSectorOverride : undefined,
        pendingReserveRequests,
        armyReserveQueue,
        eliteBrigadeTracker: deriveEliteBrigadeTracker(state),
        pendingOfficerEvents,
        // Event system (v0.4.1 Phase 5)
        firedEvents: deriveFiredEvents(state),
        pendingEventDecisions,
        presidentialReviewQueue,
        pendingPeacePlan: derivePendingPeacePlan(state),
        pendingDayton: derivePendingDayton(state),
        negotiationCapital: deriveNegotiationCapital(state),
        strategicDimensions: deriveStrategicDimensions(state),
        negotiatingCapital: deriveNegotiatingCapital(state),
        eventFlags: state.military?.event_flags ?? undefined,
        pressureWarning: derivePressureWarning(state),
        patronOverrideAuthority: derivePatronOverrideAuthority(state),
        // Peace phase (Phase 0)
        ...derivePeacePhaseData(state, phase),
        // Game over
        gameOver: Boolean(meta.game_over),
        gameOutcome: typeof meta.outcome === 'string' ? meta.outcome : undefined,
        gameVerdict: Boolean(meta.game_over) ? deriveGameVerdict(state) : undefined,
    };
}

function deriveEliteBrigadeTracker(state: any): LoadedGameState['eliteBrigadeTracker'] {
    const raw = state.military?.elite_brigade_tracker as Record<string, any> | undefined;
    if (!raw || Object.keys(raw).length === 0) return undefined;
    const result: NonNullable<LoadedGameState['eliteBrigadeTracker']> = {};
    for (const [brigadeId, t] of Object.entries(raw)) {
        result[brigadeId] = {
            total_loans: Number(t.total_loans ?? 0),
            total_turns_deployed: Number(t.total_turns_deployed ?? 0),
            total_battles: Number(t.total_battles ?? 0),
            total_casualties_taken: Number(t.total_casualties_taken ?? 0),
            total_osids_captured: Number(t.total_osids_captured ?? 0),
            episodes: Array.isArray(t.episodes) ? (t.episodes as any[]).map(ep => ({
                episode_id: Number(ep.episode_id ?? 0),
                corps_id: String(ep.corps_id ?? ''),
                reason: String(ep.reason ?? ''),
                loan_start_turn: Number(ep.loan_start_turn ?? 0),
                loan_end_turn: ep.loan_end_turn != null ? Number(ep.loan_end_turn) : null,
                recall_reason: ep.recall_reason ? String(ep.recall_reason) : null,
                travel_hops: Number(ep.travel_hops ?? 0),
                personnel_start: Number(ep.personnel_start ?? 0),
                casualties_taken: Number(ep.casualties_taken ?? 0),
                battles_fought: Number(ep.battles_fought ?? 0),
                osids_captured: Number(ep.osids_captured ?? 0),
            })) : [],
        };
    }
    return result;
}

function deriveBattlesByOsid(state: any): LoadedGameState['battlesByOsid'] {
    const result: LoadedGameState['battlesByOsid'] = {};
    const summaries = state.turn_summaries as Array<{ turn?: number; battles?: Array<Record<string, unknown>> }> | undefined;
    if (!Array.isArray(summaries)) return result;
    for (const summary of summaries) {
        const turn = typeof summary.turn === 'number' ? summary.turn : 0;
        if (!Array.isArray(summary.battles)) continue;
        for (const b of summary.battles) {
            const osid = typeof b.osid === 'string' ? b.osid : '';
            if (!osid) continue;
            if (!result[osid]) result[osid] = [];
            result[osid].push({
                turn,
                attacker_faction: String(b.attacker_faction ?? ''),
                defender_faction: String(b.defender_faction ?? ''),
                outcome: String(b.outcome ?? ''),
                attacker_casualties: typeof b.attacker_casualties === 'number' ? b.attacker_casualties : 0,
                defender_casualties: typeof b.defender_casualties === 'number' ? b.defender_casualties : 0,
                territory_flipped: Boolean(b.territory_flipped),
            });
        }
    }
    return result;
}

function deriveMovementsByOsid(state: any): LoadedGameState['movementsByOsid'] {
    const result: LoadedGameState['movementsByOsid'] = {};
    const summaries = state.turn_summaries as Array<{ turn?: number; movements?: Array<Record<string, unknown>> }> | undefined;
    if (!Array.isArray(summaries)) return result;
    for (const summary of summaries) {
        const turn = typeof summary.turn === 'number' ? summary.turn : 0;
        if (!Array.isArray(summary.movements)) continue;
        for (const m of summary.movements) {
            const fid = String(m.formation_id ?? '');
            const fname = getPlayerSafeDisplayLabel(String(m.formation_name ?? fid), 'Formation');
            const from = String(m.from_osid ?? '');
            const to = String(m.to_osid ?? '');
            if (!from && !to) continue;
            // Departed from old OSID
            if (from) {
                if (!result[from]) result[from] = [];
                result[from].push({ turn, formation_id: fid, formation_name: fname, type: 'departed' });
            }
            // Arrived at new OSID
            if (to) {
                if (!result[to]) result[to] = [];
                result[to].push({ turn, formation_id: fid, formation_name: fname, type: 'arrived' });
            }
        }
    }
    return result;
}

function deriveHistoricalEvents(state: any): LoadedGameState['historicalEventsByTurn'] {
    const result: LoadedGameState['historicalEventsByTurn'] = [];
    const summaries = state.turn_summaries as Array<{ turn?: number; events_fired?: Array<{ id: string; text: string }> }> | undefined;
    if (!Array.isArray(summaries)) return result;
    for (const summary of summaries) {
        const turn = typeof summary.turn === 'number' ? summary.turn : 0;
        if (!Array.isArray(summary.events_fired)) continue;
        for (const e of summary.events_fired) {
            const rawId = String(e.id ?? '');
            result.push({
                turn,
                id: rawId,
                text: getPlayerSafeDisplayLabel(String(e.text ?? rawId), 'Historical event'),
            });
        }
    }
    return result;
}

function deriveSupplyTransitionsByOsid(state: any): LoadedGameState['supplyTransitionsByOsid'] {
    const result: LoadedGameState['supplyTransitionsByOsid'] = {};
    const summaries = state.turn_summaries as Array<{ turn?: number; supply_transitions?: Array<Record<string, unknown>> }> | undefined;
    if (!Array.isArray(summaries)) return result;
    for (const summary of summaries) {
        const turn = typeof summary.turn === 'number' ? summary.turn : 0;
        if (!Array.isArray(summary.supply_transitions)) continue;
        for (const t of summary.supply_transitions) {
            const osid = String(t.osid ?? '');
            if (!osid) continue;
            if (!result[osid]) result[osid] = [];
            result[osid].push({ turn, from: String(t.from ?? ''), to: String(t.to ?? '') });
        }
    }
    return result;
}

function deriveOperationCaptureProvenance(aar: Record<string, unknown>): NonNullable<NonNullable<LoadedGameState['operationHistory']>[number]['capture_provenance']> {
    if (typeof aar.capture_provenance === 'string') {
        return aar.capture_provenance as NonNullable<NonNullable<LoadedGameState['operationHistory']>[number]['capture_provenance']>;
    }

    const objectivesTargeted = Array.isArray(aar.objectives_targeted) ? aar.objectives_targeted as string[] : [];
    const objectivesCaptured = Array.isArray(aar.objectives_captured) ? aar.objectives_captured as string[] : [];
    const loggedCaptureSet = new Set<string>();
    for (const entry of Array.isArray(aar.weekly_log) ? aar.weekly_log as Array<Record<string, unknown>> : []) {
        for (const osid of Array.isArray(entry.objectives_captured_this_turn) ? entry.objectives_captured_this_turn as string[] : []) {
            if (objectivesTargeted.includes(osid)) {
                loggedCaptureSet.add(osid);
            }
        }
    }
    const objectivesLoggedCaptured = objectivesTargeted.filter((osid) => loggedCaptureSet.has(osid));
    const objectivesHeldWithoutLoggedCapture = objectivesCaptured.filter((osid) => !loggedCaptureSet.has(osid));
    const totalAttacks = typeof aar.total_attacks === 'number' ? aar.total_attacks : 0;

    if (objectivesCaptured.length === 0) return 'no_objectives_held';
    if (objectivesHeldWithoutLoggedCapture.length === 0) return 'logged_capture';
    if (objectivesLoggedCaptured.length === 0) return totalAttacks === 0 ? 'held_without_logged_attack' : 'held_without_logged_capture';
    return 'mixed';
}

function deriveOperationHistory(state: any): LoadedGameState['operationHistory'] {
    const history = state.operation_history as Array<Record<string, unknown>> | undefined;
    if (!history || !Array.isArray(history) || history.length === 0) return undefined;
    return history.map((aar: Record<string, unknown>) => {
        const cs = aar.casualties_suffered as { killed: number; wounded: number } ?? { killed: 0, wounded: 0 };
        const ci = aar.casualties_inflicted as { killed: number; wounded: number } ?? { killed: 0, wounded: 0 };
        const el = aar.equipment_lost as { tanks: number; artillery: number } ?? { tanks: 0, artillery: 0 };
        const ed = aar.equipment_destroyed as { tanks: number; artillery: number } ?? { tanks: 0, artillery: 0 };
        const ec = aar.equipment_captured as { tanks: number; artillery: number } ?? { tanks: 0, artillery: 0 };
        const grade = aar.grade as { stars: number; verdict: string; factors: Record<string, number> } ?? { stars: 1, verdict: 'Unknown', factors: {} };
        const objectivesTargeted = (aar.objectives_targeted ?? []) as string[];
        const objectivesCaptured = (aar.objectives_captured ?? []) as string[];
        const objectivesLoggedCaptured = Array.isArray(aar.objectives_logged_captured)
            ? aar.objectives_logged_captured as string[]
            : [];
        const objectivesHeldWithoutLoggedCapture = Array.isArray(aar.objectives_held_without_logged_capture)
            ? aar.objectives_held_without_logged_capture as string[]
            : objectivesCaptured.filter((osid) => !objectivesLoggedCaptured.includes(osid));
        const weeklyLog = (aar.weekly_log as Array<Record<string, unknown>> ?? []).map((entry: Record<string, unknown>) => ({
            turn: entry.turn as number,
            phase: entry.phase as string,
            attacks_this_turn: entry.attacks_this_turn as number,
            objectives_captured_this_turn: (entry.objectives_captured_this_turn ?? []) as string[],
            notable_events: (entry.notable_events ?? []) as string[],
            casualties_suffered: entry.casualties_suffered as { killed: number; wounded: number } ?? { killed: 0, wounded: 0 },
            casualties_inflicted: entry.casualties_inflicted as { killed: number; wounded: number } ?? { killed: 0, wounded: 0 },
        }));
        const axisSummaries = aar.axis_summaries as Array<Record<string, unknown>> | undefined;
        return {
            operation_id: aar.operation_id as string,
            operation_name: aar.operation_name as string,
            corps_id: aar.corps_id as string,
            faction: aar.faction as string,
            started_turn: aar.started_turn as number,
            ended_turn: aar.ended_turn as number,
            outcome: aar.outcome as string,
            commander_name: aar.commander_name as string | undefined,
            commander_rank: aar.commander_rank as string | undefined,
            objectives_targeted: objectivesTargeted,
            objectives_logged_captured: objectivesLoggedCaptured,
            objectives_held_without_logged_capture: objectivesHeldWithoutLoggedCapture,
            capture_provenance: deriveOperationCaptureProvenance(aar),
            objectives_captured: objectivesCaptured,
            total_attacks: aar.total_attacks as number,
            casualties_suffered: cs,
            casualties_inflicted: ci,
            equipment_lost: el,
            equipment_destroyed: ed,
            equipment_captured: ec,
            grade,
            duration_turns: aar.duration_turns as number,
            weekly_log: weeklyLog,
            axis_summaries: axisSummaries?.map((ax: Record<string, unknown>) => ({
                axis_id: ax.axis_id as string,
                axis_name: ax.axis_name as string,
                objectives_targeted: (ax.objectives_targeted ?? []) as string[],
                objectives_captured: (ax.objectives_captured ?? []) as string[],
                total_attacks: ax.total_attacks as number,
                casualties_suffered: ax.casualties_suffered as { killed: number; wounded: number } ?? { killed: 0, wounded: 0 },
                casualties_inflicted: ax.casualties_inflicted as { killed: number; wounded: number } ?? { killed: 0, wounded: 0 },
            })),
            force_launched: aar.force_launched === true ? true : undefined,
            ca_cost_at_launch: typeof aar.ca_cost_at_launch === 'number' ? aar.ca_cost_at_launch : undefined,
            commander_assessment_at_launch: typeof aar.commander_assessment_at_launch === 'string' ? aar.commander_assessment_at_launch as 'launch' | 'postpone' | 'abort' : undefined,
        };
    });
}

function filterPlayerFacingEntriesByFaction<T extends { faction?: string | null }>(
    entries: T[] | undefined,
    playerFaction: string | null,
): T[] | undefined {
    if (!entries || entries.length === 0) return undefined;
    if (!playerFaction) return entries;
    const filtered = entries.filter((entry) => entry.faction === playerFaction);
    return filtered.length > 0 ? filtered : undefined;
}

function deriveActiveOperations(state: any): LoadedGameState['activeOperations'] {
    const military = state.military as any | undefined;
    if (!military) return undefined;
    const cc = military.corps_command as Record<string, Record<string, unknown>> | undefined;
    if (!cc) return undefined;

    const activeOps: NonNullable<LoadedGameState['activeOperations']> = [];
    const formations = military.formations as Record<string, { faction: string }> | undefined;
    const namedOfficerData = military.named_officer_data as Array<{ id: string; name: string }> | undefined;
    const politicalControllers = state.political.political_controllers as Record<string, string> | undefined;

    for (const corpsId of Object.keys(cc).sort()) {
        const cmd = cc[corpsId];
        const opsArray = (Array.isArray(cmd?.active_operations) ? cmd.active_operations : cmd?.active_operation ? [cmd.active_operation] : []) as any[];
        for (const op of opsArray) {
        if (!op) continue;

        // Collect objectives
        const axes = op.axes as Array<{ objectives?: string[] }> | undefined;
        const allObjs: string[] = axes?.length
            ? axes.flatMap(a => a.objectives ?? [])
            : ((op.objectives ?? []) as string[]);

        // Derive faction from first participating brigade
        const participatingBrigades = (op.participating_brigades ?? []) as string[];
        let faction = '';
        if (formations) {
            for (const bdeId of participatingBrigades) {
                if (formations[bdeId]) { faction = formations[bdeId].faction; break; }
            }
        }

        // Count captured objectives
        const captured = politicalControllers
            ? allObjs.filter(o => politicalControllers[o] === faction).length
            : 0;

        // Total attacks
        const totalAttacks = axes?.length
            ? axes.reduce((s, a) => s + ((a as any).attack_attempt_count as number ?? 0), 0)
            : ((op.attack_attempt_count ?? 0) as number);

        // Commander lookup
        let commanderName: string | undefined;
        const cmdOfficerId = op.commander_officer_id as string | undefined;
        if (cmdOfficerId && namedOfficerData) {
            const officer = namedOfficerData.find(o => o.id === cmdOfficerId);
            if (officer) commanderName = officer.name;
        }

        activeOps.push({
            corps_id: corpsId,
            operation_name: (op.name ?? 'Unnamed') as string,
            faction,
            type: op.type as string,
            phase: op.phase as string,
            started_turn: op.started_turn as number,
            participating_brigades: participatingBrigades,
            commander_name: commanderName,
            objectives_count: allObjs.length,
            objectives_captured: captured,
            attacks: totalAttacks,
            weekly_log_length: ((op.weekly_log as unknown[])?.length ?? 0),
        });
        } // end for-of opsArray
    }

    return activeOps.length > 0 ? activeOps : undefined;
}

function derivePendingOfficerEvents(state: any): LoadedGameState['pendingOfficerEvents'] {
    const events = state.military?.pending_officer_events as any[] | undefined;
    if (!events || events.length === 0) return undefined;

    const officerData = state.military?.named_officer_data as any[] | undefined;
    const formations = state.military?.formations as Record<string, any> | undefined;

    const getOfficerName = (id: string): string => {
        const o = officerData?.find((d: any) => d.id === id);
        return getPlayerSafeOfficerName(typeof o?.name === 'string' ? o.name : null);
    };

    const getOfficerStats = (id: string) => {
        const o = officerData?.find((d: any) => d.id === id);
        return {
            competence: Number(o?.competence ?? 3),
            aggressiveness: Number(o?.aggressiveness ?? 3),
            defensive_skill: Number(o?.defensive_skill ?? 3),
            war_crimes_record: o?.war_crimes_record ?? undefined,
        };
    };

    const getCorpsName = (corpsId: string): string => {
        if (!formations) return 'This corps';
        const f = formations[corpsId];
        return getPlayerSafeCorpsName(f?.name ?? null, corpsId);
    };

    return events
        .filter((e: any) => !e.acknowledged)
        .map((e: any) => {
            const stats = getOfficerStats(e.officer_id);
            return {
                event_id: String(e.event_id),
                type: e.type as 'officer_available' | 'replacement_suggested' | 'order_modified' | 'order_pushback' | 'order_refused' | 'officer_relieved',
                faction: String(e.faction),
                turn: Number(e.turn),
                officer_id: String(e.officer_id),
                officer_name: getOfficerName(e.officer_id),
                officer_competence: stats.competence,
                officer_aggressiveness: stats.aggressiveness,
                officer_defensive_skill: stats.defensive_skill,
                current_commander_id: e.current_commander_id ? String(e.current_commander_id) : undefined,
                current_commander_name: e.current_commander_id ? getOfficerName(e.current_commander_id) : undefined,
                ...(e.current_commander_id ? (() => {
                    const cs = getOfficerStats(e.current_commander_id);
                    return {
                        current_commander_competence: cs.competence,
                        current_commander_aggressiveness: cs.aggressiveness,
                        current_commander_defensive_skill: cs.defensive_skill,
                        current_commander_war_crimes_record: cs.war_crimes_record,
                    };
                })() : {}),
                corps_id: e.corps_id ? String(e.corps_id) : undefined,
                corps_name: e.corps_id ? getCorpsName(e.corps_id) : undefined,
                acknowledged: Boolean(e.acknowledged),
                war_crimes_record: stats.war_crimes_record,
                // Phase 3 interpretation event fields
                reason: typeof e.reason === 'string' ? e.reason : undefined,
                overridable: Boolean(e.overridable),
                override_action: typeof e.override_action === 'string' ? e.override_action : undefined,
            };
        });
}

function derivePeacePhaseData(state: any, phase: string): Partial<LoadedGameState> {
    if (phase !== 'peace') return {};

    const factions = Array.isArray(state.factions) ? state.factions as any[] : [];
    const peaceFactions = factions.map((f: any) => ({
        id: String(f.id ?? ''),
        capital: Number(f.prewar_capital ?? 0),
        declaration_pressure: Number(f.declaration_pressure ?? 0),
        declared: Boolean(f.declared),
        declaration_turn: typeof f.declaration_turn === 'number' ? f.declaration_turn : null,
    }));

    const rel = state.political?.phase0_relationships;
    const peaceAllianceValue = typeof rel?.rbih_hrhb === 'number' ? rel.rbih_hrhb : undefined;

    const meta = state.meta ?? {};
    const peaceReferendum = {
        held: Boolean(meta.referendum_held),
        turn: typeof meta.referendum_turn === 'number' ? meta.referendum_turn : null,
        eligible_turn: typeof meta.referendum_eligible_turn === 'number' ? meta.referendum_eligible_turn : null,
        deadline_turn: typeof meta.referendum_deadline_turn === 'number' ? meta.referendum_deadline_turn : null,
        war_start_turn: typeof meta.war_start_turn === 'number' ? meta.war_start_turn : null,
    };

    const eventsLog = state.political?.phase0_events_log;
    let peaceEvents: LoadedGameState['peaceEvents'];
    if (Array.isArray(eventsLog) && eventsLog.length > 0) {
        const latest = eventsLog[eventsLog.length - 1];
        if (Array.isArray(latest)) {
            peaceEvents = latest.map((e: any) => ({
                type: String(e.type ?? ''),
                turn: Number(e.turn ?? 0),
                faction: typeof e.faction === 'string' ? e.faction : undefined,
                details: (e.details && typeof e.details === 'object') ? e.details : {},
            }));
        }
    }

    return {
        peaceFactions: peaceFactions.length > 0 ? peaceFactions : undefined,
        peaceAllianceValue,
        peaceReferendum,
        peaceEvents,
    };
}

function deriveFiredEvents(state: any): LoadedGameState['firedEvents'] {
    const firedIds = state.military?.fired_event_ids as string[] | undefined;
    if (!firedIds || firedIds.length === 0) return undefined;

    // We have the list of fired event IDs but not the full definitions at runtime in the UI.
    // Build minimal entries from the IDs. The turn_summaries may contain events_fired with text.
    const turnSummaries = state.turn_summaries as Array<{ turn?: number; events_fired?: Array<{ id: string; text: string }> }> | undefined;

    // Build a lookup: id -> { turn, text } from turn summaries
    const eventInfo = new Map<string, { turn: number; text: string }>();
    if (Array.isArray(turnSummaries)) {
        for (const summary of turnSummaries) {
            const turn = typeof summary.turn === 'number' ? summary.turn : 0;
            if (Array.isArray(summary.events_fired)) {
                for (const ev of summary.events_fired) {
                    if (ev.id && !eventInfo.has(ev.id)) {
                        eventInfo.set(ev.id, { turn, text: ev.text ?? ev.id });
                    }
                }
            }
        }
    }

    // Build fired event entries (most recent first, cap at 20)
    const entries: NonNullable<LoadedGameState['firedEvents']> = [];
    for (const id of firedIds) {
        const info = eventInfo.get(id);
        entries.push({
            id,
            turn: info?.turn ?? 0,
            title: getPlayerSafeDecisionTitle(info?.text ?? id),
            narrative: '',
            category: 'military',
            effects: [],
            isDecision: false,
        });
    }

    // Sort by turn descending, cap at 20
    entries.sort((a, b) => b.turn - a.turn);
    return entries.length > 0 ? entries.slice(0, 20) : undefined;
}

function derivePendingEventDecisions(state: any): LoadedGameState['pendingEventDecisions'] {
    const pending = state.military?.pending_event_decisions as any[] | undefined;
    if (!pending || pending.length === 0) return undefined;

    return pending.map((d: any) => ({
        event_id: String(d.event_id ?? ''),
        event_title: String(d.event_title ?? ''),
        turn_fired: Number(d.turn_fired ?? 0),
        faction: String(d.faction ?? ''),
        response_options: Array.isArray(d.response_options)
            ? d.response_options.map((opt: any) => ({
                id: String(opt.id ?? ''),
                label: String(opt.label ?? ''),
                description: opt.description ? String(opt.description) : undefined,
                effects: Array.isArray(opt.effects) ? opt.effects : [],
            }))
            : [],
    }));
}

function derivePresidentialReviewQueue({
    pendingOfficerEvents,
    pendingEventDecisions,
}: {
    pendingOfficerEvents: LoadedGameState['pendingOfficerEvents'];
    pendingEventDecisions: LoadedGameState['pendingEventDecisions'];
}): LoadedGameState['presidentialReviewQueue'] {
    const eventDecisionCount = pendingEventDecisions?.length ?? 0;
    const commandInterpretationCount = (pendingOfficerEvents ?? []).filter((event) =>
        event.type === 'order_modified' || event.type === 'order_pushback' || event.type === 'order_refused',
    ).length;
    const personnelDirectiveCount = (pendingOfficerEvents ?? []).filter((event) =>
        event.type === 'officer_available' || event.type === 'replacement_suggested' || event.type === 'officer_relieved',
    ).length;
    const pendingCount = eventDecisionCount + commandInterpretationCount + personnelDirectiveCount;

    if (pendingCount === 0) return undefined;

    const criticalCount =
        eventDecisionCount +
        (pendingOfficerEvents ?? []).filter((event) => event.type === 'order_refused').length;

    return {
        pendingCount,
        criticalCount,
        eventDecisionCount,
        commandInterpretationCount,
        personnelDirectiveCount,
    };
}

function derivePendingReserveRequests(
    state: any,
    playerFaction: string | null | undefined,
): LoadedGameState['pendingReserveRequests'] {
    const requests = Array.isArray(state.military?.pending_reserve_requests)
        ? (state.military.pending_reserve_requests as any[])
            .map((request) => ({
                request_id: String(request.request_id ?? `req:${Number(request.turn_requested ?? 0)}:${String(request.corps_id ?? '')}:${String(request.reason ?? '')}`),
                corps_id: String(request.corps_id ?? ''),
                faction: String(request.faction ?? ''),
                reason: String(request.reason ?? ''),
                provenance_driver:
                    request.provenance_driver === 'active_operation'
                    || request.provenance_driver === 'sector_threat'
                    || request.provenance_driver === 'captured_objectives'
                    || request.provenance_driver === 'commander_request'
                        ? request.provenance_driver
                        : undefined,
                commander_request_priority:
                    request.commander_request_priority === 'critical'
                    || request.commander_request_priority === 'high'
                    || request.commander_request_priority === 'medium'
                    || request.commander_request_priority === 'low'
                        ? request.commander_request_priority
                        : undefined,
                commander_request_brigades_needed:
                    typeof request.commander_request_brigades_needed === 'number'
                    && Number.isFinite(request.commander_request_brigades_needed)
                        ? request.commander_request_brigades_needed
                        : undefined,
                commander_focus_zone_id:
                    typeof request.commander_focus_zone_id === 'string' ? request.commander_focus_zone_id : undefined,
                purpose: request.purpose === 'offensive' || request.purpose === 'defensive' ? request.purpose : undefined,
                why_needed: typeof request.why_needed === 'string' ? request.why_needed : undefined,
                how_to_use: typeof request.how_to_use === 'string' ? request.how_to_use : undefined,
                priority: Number(request.priority ?? 0),
                severityBand: classifyArmyReserveSeverity(Number(request.priority ?? 0)),
                travel_hops: Number(request.travel_hops ?? 0),
                description: String(request.description ?? ''),
                suggested_brigade_id: request.suggested_brigade_id ? String(request.suggested_brigade_id) : null,
                turn_requested: Number(request.turn_requested ?? 0),
            }))
            .filter((request) => !playerFaction || request.faction === playerFaction)
            .sort((a, b) =>
                b.priority - a.priority
                || a.turn_requested - b.turn_requested
                || a.corps_id.localeCompare(b.corps_id)
                || a.request_id.localeCompare(b.request_id),
            )
        : [];

    return requests.length > 0 ? requests : undefined;
}

function deriveArmyReserveQueue({
    pendingReserveRequests,
}: {
    pendingReserveRequests: LoadedGameState['pendingReserveRequests'];
}): LoadedGameState['armyReserveQueue'] {
    const requests = pendingReserveRequests ?? [];
    if (requests.length === 0) return undefined;

    const criticalCount = requests.filter((request) => request.priority >= 75).length;
    const defensiveCount = requests.filter((request) =>
        request.purpose === 'defensive' || request.reason === 'defensive_gap',
    ).length;
    const offensiveCount = requests.length - defensiveCount;
    const leadCriticalRequest = requests.find((request) => request.priority >= 75);

    return {
        pendingCount: requests.length,
        criticalCount,
        offensiveCount,
        defensiveCount,
        leadCriticalReason: leadCriticalRequest?.reason,
        leadCriticalProvenanceDriver: leadCriticalRequest?.provenance_driver,
        leadCriticalCommanderPriority: leadCriticalRequest?.commander_request_priority,
        leadCriticalCommanderBrigadesNeeded: leadCriticalRequest?.commander_request_brigades_needed,
        leadCriticalFocusZoneId: leadCriticalRequest?.commander_focus_zone_id,
        leadCriticalPurpose: leadCriticalRequest?.purpose,
        leadCriticalWhyNeeded: leadCriticalRequest?.why_needed,
        leadCriticalDescription: leadCriticalRequest?.description,
    };
}

function deriveNegotiationCapital(state: any): LoadedGameState['negotiationCapital'] {
    // TODO: Migrate UI to read from strategicDimensions instead of legacy negotiationCapital.
    // For now, derive placeholder values from strategic_dimensions if available, else zeros.
    const neg = state.military?.negotiation;
    const dimStore = neg?.strategic_dimensions;
    if (!neg?.capital || typeof neg.capital !== 'object') return undefined;
    const out: Record<string, { military_position: number; humanitarian_standing: number; international_credibility: number; military_effectiveness: number; political_cohesion: number; composite: number }> = {};
    for (const [faction] of Object.entries(neg.capital).sort((a: [string, unknown], b: [string, unknown]) => a[0].localeCompare(b[0]))) {
        const dims = dimStore?.[faction];
        out[faction] = {
            military_position: Number(dims?.military_credibility?.effective_value ?? 0),
            humanitarian_standing: Number(dims?.international_standing?.effective_value ?? 0),
            international_credibility: Number(dims?.international_standing?.effective_value ?? 0),
            military_effectiveness: Number(dims?.military_credibility?.effective_value ?? 0),
            political_cohesion: Number(dims?.internal_cohesion?.effective_value ?? 0),
            composite: 50, // TODO: compute from DIMENSION_WEIGHTS
        };
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

function deriveStrategicDimensions(state: any): LoadedGameState['strategicDimensions'] {
    const dims = state.military?.negotiation?.strategic_dimensions;
    if (!dims || typeof dims !== 'object') return undefined;
    const out: Record<string, Record<string, { base_value: number; event_modifier: number; effective_value: number }>> = {};
    for (const [faction, factionDims] of Object.entries(dims).sort((a, b) => a[0].localeCompare(b[0]))) {
        const fd = factionDims as any;
        if (!fd || typeof fd !== 'object') continue;
        out[faction] = {};
        for (const [dim, val] of Object.entries(fd).sort((a, b) => a[0].localeCompare(b[0]))) {
            const v = val as any;
            out[faction][dim] = {
                base_value: Number(v?.base_value ?? 50),
                event_modifier: Number(v?.event_modifier ?? 0),
                effective_value: Number(v?.effective_value ?? 50),
            };
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

/** Weighted composite negotiating capital per faction. Weights reflect faction priorities. */
function deriveNegotiatingCapital(state: any): LoadedGameState['negotiatingCapital'] {
    const dims = state.military?.negotiation?.strategic_dimensions;
    if (!dims || typeof dims !== 'object') return undefined;
    const WEIGHTS: Record<string, Record<string, number>> = {
        RS:   { military_credibility: 0.25, territorial_legitimacy: 0.25, international_standing: 0.10, patron_confidence: 0.15, internal_cohesion: 0.10, negotiating_leverage: 0.15 },
        RBiH: { military_credibility: 0.15, territorial_legitimacy: 0.15, international_standing: 0.25, patron_confidence: 0.15, internal_cohesion: 0.15, negotiating_leverage: 0.15 },
        HRHB: { military_credibility: 0.15, territorial_legitimacy: 0.20, international_standing: 0.15, patron_confidence: 0.25, internal_cohesion: 0.15, negotiating_leverage: 0.10 },
    };
    const out: Record<string, number> = {};
    for (const [faction, factionDims] of Object.entries(dims).sort((a, b) => a[0].localeCompare(b[0]))) {
        const w = WEIGHTS[faction];
        if (!w) continue;
        const fd = factionDims as any;
        if (!fd || typeof fd !== 'object') continue;
        let total = 0;
        for (const [dim, weight] of Object.entries(w)) {
            total += (Number((fd[dim] as any)?.effective_value ?? 50)) * weight;
        }
        out[faction] = Math.round(Math.max(0, Math.min(100, total)));
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

function derivePatronOverrideAuthority(state: any): LoadedGameState['patronOverrideAuthority'] {
    const neg = state.military?.negotiation;
    const patrons = neg?.patron_relationships;
    if (!patrons || typeof patrons !== 'object') return undefined;
    const out: Record<string, number> = {};
    for (const [faction, rel] of Object.entries(patrons).sort((a, b) => a[0].localeCompare(b[0]))) {
        const r = rel as any;
        if (r && typeof r.override_authority === 'number') {
            out[faction] = r.override_authority;
        }
    }
    return Object.keys(out).length > 0 ? out : undefined;
}

function derivePendingDayton(state: any): LoadedGameState['pendingDayton'] {
    // Only show Dayton if game is not over and no dayton_result exists yet
    if (state.meta?.game_over) return undefined;
    const neg = state.military?.negotiation;
    if (neg?.dayton_result) return undefined;
    try {
        const { shouldInitiateDayton, initiateDaytonNegotiation } = require('../../../sim/negotiation/dayton_negotiation.js');
        if (!shouldInitiateDayton(state)) return undefined;
        const menu = initiateDaytonNegotiation(state);
        if (!menu) return undefined;
        return {
            territorialPackages: (menu.territorial_packages ?? []).map((p: any) => ({
                id: String(p.id ?? ''),
                name: String(p.name ?? ''),
                defaultHolder: String(p.default_holder ?? ''),
                demandCost: Number(p.demand_cost ?? 0),
                concedeCost: Number(p.concede_cost ?? 0),
            })),
            institutionalPackages: (menu.institutional_packages ?? []).map((p: any) => ({
                id: String(p.id ?? ''),
                name: String(p.name ?? ''),
                centralizedCost: Number(p.centralized_cost ?? 0),
                decentralizedCost: Number(p.decentralized_cost ?? 0),
            })),
            factionCapital: menu.faction_capital ?? {},
            patronOverride: menu.patron_override ?? {},
        };
    } catch { return undefined; }
}

function derivePendingPeacePlan(state: any): LoadedGameState['pendingPeacePlan'] {
    const neg = state.military?.negotiation;
    const pp = neg?.pending_peace_plan;
    if (!pp || typeof pp.plan_id !== 'string') return undefined;
    // Look up plan definition for display data
    let planName = pp.plan_id;
    let narrative = '';
    let proposedSplit = { RBiH: 0, RS: 0, HRHB: 0 };
    let institutionalModel = '';
    try {
        const { PEACE_PLANS } = require('../../../sim/negotiation/peace_plan_data.js');
        const def = PEACE_PLANS.find((p: any) => p.id === pp.plan_id);
        if (def) {
            planName = getPlayerSafeDisplayLabel(def.name ?? pp.plan_id, 'Peace proposal');
            narrative = def.narrative ?? '';
            proposedSplit = def.proposed_split ?? proposedSplit;
            institutionalModel = def.institutional_model ?? '';
        }
    } catch { /* non-fatal — display with raw id */ }
    planName = getPlayerSafeDisplayLabel(planName, 'Peace proposal');
    return {
        planId: pp.plan_id,
        planName,
        narrative,
        turnOffered: typeof pp.turn_offered === 'number' ? pp.turn_offered : 0,
        proposedSplit,
        institutionalModel,
        botResponses: (pp.bot_responses && typeof pp.bot_responses === 'object')
            ? pp.bot_responses as Record<string, 'accepted' | 'rejected'>
            : {},
    };
}

function deriveGameVerdict(state: any): GameVerdict | undefined {
    try {
        return computeFullVerdict(state);
    } catch {
        return undefined;
    }
}

function derivePressureWarning(state: any): boolean {
    const readiness = state.military?.event_readiness;
    if (!readiness || typeof readiness !== 'object') return false;
    for (const value of Object.values(readiness)) {
        if (typeof value === 'number' && value >= 50) return true;
    }
    return false;
}

