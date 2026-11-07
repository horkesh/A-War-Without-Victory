/**
 * Peace settlement consequences (owner, 2026-11-07): "Peace plans need to have
 * consequences. They do not freeze the lines. Parties agreed to a proposed map, which
 * might have different percentages ... only with Dayton did RS achieve its name and
 * territorial continuity."
 *
 * When a peace plan is accepted by every party, or Dayton is signed or imposed, the
 * settlement is the plan's MAP, not the front line. This module builds that map at
 * OSID level from the researched plan maps (data/derived/peace/plan_settlement_shares.json,
 * built by tools/peace/build_peace_settlement_maps.cjs from
 * data/source/peace_plans/plan_maps_research.json; sources and method in
 * docs/40_reports/20261107_PEACE_PLANS_RESEARCH.md) and records each party's
 * constitutional status under the plan. Wartime control (`political_controllers`) is
 * never rewritten: the settlement is a separate record that the verdict reads.
 *
 * OSID assignment inside a municipality (deterministic): every party gets an area quota
 * (its share × municipality area). Pass 1 keeps each OSID with its wartime holder while
 * that holder still has at least half the OSID's area left in its quota. Pass 2 gives the
 * remaining OSIDs, in id order, to the key with the largest remaining quota. `special`
 * land (shared or international administration) stays with its wartime holder.
 *
 * Determinism: constant data, sorted iteration (strictCompare), no RNG or clock.
 */
import type { FactionId, GameState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
// JSON imports (not osid_areas.ts, which reads with fs): scoring.ts imports this module
// and the renderer bundles scoring.ts through GameStateAdapter.
import osidAreasJson from '../../../data/derived/operational/osid_areas.json';
import settlementShares from '../../../data/derived/peace/plan_settlement_shares.json';
import contactGraphJson from '../../../data/derived/operational/operational_contact_graph.json';
import { parseEdges } from '../../map/settlements_parse.js';
import { buildOsidAdjacency } from '../combat/osid_adjacency.js';
import { enforceSettlementContiguity } from './settlement_contiguity.js';
import { ENCLAVE_DEFINITIONS, osidBelongsToEnclave } from '../combat/enclave_resilience.js';

const OSID_AREAS: { total_area_km2: number; areas: Record<string, number> } = osidAreasJson;
function getOsidAreas(): { total: number; areas: Record<string, number> } {
    return { total: OSID_AREAS.total_area_km2, areas: OSID_AREAS.areas };
}

function isFactionKey(value: string | null | undefined): value is 'RBiH' | 'RS' | 'HRHB' {
    return value === 'RBiH' || value === 'RS' || value === 'HRHB';
}

export type SettlementPlanId = 'vance_owen' | 'owen_stoltenberg' | 'contact_group' | 'dayton';
type ShareKey = 'RBiH' | 'RS' | 'HRHB' | 'special';
const SHARE_KEYS: readonly ShareKey[] = ['RBiH', 'RS', 'HRHB', 'special'];
const FACTIONS: readonly FactionId[] = ['RBiH', 'RS', 'HRHB'];

/** A party's constitutional position under a settlement. */
export interface SettlementStatus {
    /** What the party governs under the plan. */
    polity: 'provinces' | 'state_provinces' | 'republic_in_union' | 'entity' | 'named_entity' | 'federation_partner';
    /** The polity is recognised under the party's own name. */
    named: boolean;
    /** The party's territory is contiguous under the plan map. */
    contiguous: boolean;
    /** The party keeps its own army. */
    own_army: boolean;
    /** Best grade the settlement's terms allow (null = no cap). */
    max_grade: string | null;
    /** One-line, player-facing statement of the terms. */
    summary: string;
}

/**
 * Status consequences per plan and party (research §1.4, §2.4, §5.4, §6.4). Owner
 * direction: only Dayton gives RS its name and territorial continuity.
 */
export const SETTLEMENT_STATUS: Record<SettlementPlanId, Record<string, SettlementStatus>> = {
    vance_owen: {
        RS: { polity: 'provinces', named: false, contiguous: false, own_army: false, max_grade: 'C',
            summary: 'Republika Srpska ceases to exist as a unit: three Serb-led provinces, cut apart by the Croat-led Posavina province.' },
        RBiH: { polity: 'state_provinces', named: true, contiguous: false, own_army: true, max_grade: null,
            summary: 'The state survives within its borders as a decentralised union of ten provinces; three are Bosniak-led and Sarajevo is shared.' },
        HRHB: { polity: 'provinces', named: false, contiguous: true, own_army: true, max_grade: null,
            summary: 'Three Croat-led provinces with autonomy and direct access to the Croatian border.' },
    },
    owen_stoltenberg: {
        RS: { polity: 'republic_in_union', named: true, contiguous: true, own_army: false, max_grade: 'B',
            summary: 'A largely contiguous Serb republic inside a Union of Republics, with no army of its own and no right to secede without unanimous consent.' },
        RBiH: { polity: 'republic_in_union', named: true, contiguous: false, own_army: false, max_grade: 'B',
            summary: 'A landlocked Muslim republic with only access rights to the sea and the Sava; Sarajevo under UN administration.' },
        HRHB: { polity: 'republic_in_union', named: true, contiguous: true, own_army: false, max_grade: null,
            summary: 'A Croat republic inside the Union; Mostar under EU administration.' },
    },
    contact_group: {
        RS: { polity: 'entity', named: false, contiguous: false, own_army: true, max_grade: 'B',
            summary: 'A Serb entity on 49 percent, without recognition under its own name and without the confederal link it demanded.' },
        RBiH: { polity: 'federation_partner', named: true, contiguous: true, own_army: true, max_grade: null,
            summary: 'The Federation receives 51 percent, including the eastern enclaves; Sarajevo is a neutral zone.' },
        HRHB: { polity: 'federation_partner', named: false, contiguous: true, own_army: true, max_grade: null,
            summary: 'The Croat areas are part of the Federation.' },
    },
    dayton: {
        RS: { polity: 'named_entity', named: true, contiguous: true, own_army: true, max_grade: null,
            summary: 'Republika Srpska is recognised by name as one of two entities, keeps its army and the Posavina corridor; Brčko goes to arbitration.' },
        RBiH: { polity: 'federation_partner', named: true, contiguous: true, own_army: true, max_grade: null,
            summary: 'Bosnia and Herzegovina continues as a state; the Federation holds 51 percent with Sarajevo unified and a corridor to Goražde.' },
        HRHB: { polity: 'federation_partner', named: false, contiguous: true, own_army: true, max_grade: null,
            summary: 'Herceg-Bosna is folded into the Federation; Mostar is a Federation city under EU administration.' },
    },
};

/**
 * Persisted settlement record (state.military.negotiation.settlement). It stores the
 * settlement's RESULTS, not a second control map: political control has one owner
 * (political_controllers, Engine Invariants §9.1). The OSID-level settlement map is
 * recomputed on demand with settlementControllersFor(state), from the wartime map frozen
 * at game over plus the stored package overrides.
 */
export interface PeaceSettlement {
    plan_id: SettlementPlanId;
    turn: number;
    /** Area-weighted share per faction under the settlement, 0..100. */
    territory_pct: Record<string, number>;
    /** OSIDs under shared or international administration (left with their wartime holder). */
    special_osids: string[];
    /** Constitutional status per faction. */
    status: Record<string, SettlementStatus>;
    /** Overrides of the plan map: Dayton package outcomes, fixed and captured ground (OSID -> faction, sorted keys). */
    map_overrides?: Record<string, FactionId>;
}

interface SharesFile {
    plans: Record<string, Record<string, Record<ShareKey, number> & { confidence?: string }>>;
}
const SHARES: SharesFile = settlementShares;

export function isSettlementPlan(planId: string): planId is SettlementPlanId {
    return planId === 'vance_owen' || planId === 'owen_stoltenberg' || planId === 'contact_group' || planId === 'dayton';
}

function munOf(osid: string): string {
    return osid.split(':')[1] ?? '';
}

/**
 * Build the OSID-level settlement map for a plan. `overrides` (OSID -> faction) win over
 * the plan map; used for Dayton package outcomes that differ from the historical map.
 */
export function computeSettlementControllers(
    state: GameState,
    planId: SettlementPlanId,
    overrides: Record<string, FactionId> = {},
): { controllers: Record<string, FactionId>; special: string[] } {
    const wartime = state.political?.political_controllers ?? {};
    const areas = getOsidAreas().areas;
    const plan = SHARES.plans[planId] ?? {};
    const byMun = new Map<string, string[]>();
    for (const osid of Object.keys(wartime).sort(strictCompare)) {
        const m = munOf(osid);
        const list = byMun.get(m);
        if (list) list.push(osid); else byMun.set(m, [osid]);
    }
    const controllers: Record<string, FactionId> = {};
    const special: string[] = [];
    for (const mun of [...byMun.keys()].sort(strictCompare)) {
        const osids = byMun.get(mun)!;
        const shares = plan[mun];
        if (!shares) {
            // No plan data for this municipality: it stays with its wartime holders.
            for (const o of osids) { const w = wartime[o]; if (w) controllers[o] = w; }
            continue;
        }
        const munArea = osids.reduce((s, o) => s + (areas[o] ?? 0), 0);
        const quota: Record<ShareKey, number> = { RBiH: 0, RS: 0, HRHB: 0, special: 0 };
        for (const k of SHARE_KEYS) quota[k] = ((shares[k] ?? 0) / 100) * munArea;
        const unassigned: string[] = [];
        for (const o of osids) {
            const holder = wartime[o];
            const a = areas[o] ?? 0;
            if (isFactionKey(holder) && quota[holder] >= a / 2 && quota[holder] > 0) {
                controllers[o] = holder;
                quota[holder] -= a;
            } else {
                unassigned.push(o);
            }
        }
        for (const o of unassigned) {
            let best: ShareKey = 'special';
            let bestQuota = -Infinity;
            for (const k of SHARE_KEYS) {
                if (quota[k] > bestQuota) { bestQuota = quota[k]; best = k; }
            }
            quota[best] -= areas[o] ?? 0;
            if (best === 'special') {
                special.push(o);
                const w = wartime[o];
                if (w) controllers[o] = w;
            } else {
                controllers[o] = best;
            }
        }
    }
    for (const [o, f] of Object.entries(overrides).sort(([a], [b]) => strictCompare(a, b))) {
        if (o in controllers) controllers[o] = f;
    }
    // Owner, 2026-11-07: "There should be no isolated pockets on final Dayton map." The
    // earlier plans drew enclaves on purpose (Vance–Owen provinces, the Contact Group's
    // eastern enclaves), so only Dayton is made contiguous.
    const final = planId === 'dayton'
        ? enforceSettlementContiguity({
            controllers,
            adjacency: getSettlementAdjacency(),
            areas,
            isProtectedExclave: (side, cells) => side === 'FED' && cells.every((o) => POSAVINA_CANTON.has(munOf(o))),
            // Never absorb ground a package won at the table, or an enclave held by its own side.
            isProtectedCell: (o, f) => overrides[o] === f || isEnclaveCellOfSide(o, f),
        }).controllers
        : controllers;
    const sorted: Record<string, FactionId> = {};
    for (const o of Object.keys(final).sort(strictCompare)) sorted[o] = final[o]!;
    return { controllers: sorted, special: special.sort(strictCompare) };
}

/**
 * Municipalities of the Federation's Posavina canton (Orašje, Domaljevac-Šamac from
 * Bosanski Šamac, Odžak). They border Croatia and were held at Dayton without a land link
 * to the rest of the Federation, so the contiguity pass keeps them.
 */
const POSAVINA_CANTON = new Set(['orasje', 'bosanski_samac', 'odzak']);

/**
 * Enclave cells the contiguity pass must not absorb: enclaves with an explicit cell list or
 * a capital (Goražde, Srebrenica, Žepa, Teočak, Sarajevo, the Croat pockets), held by their
 * own entity. Prefix-only definitions (the whole-municipality Bihać pocket) are too broad
 * here, as in rear_pocket_consolidation.ts. Enclave absorption is §6/enclave-delegated.
 */
function isEnclaveCellOfSide(osid: string, faction: FactionId): boolean {
    const fed = (f: string) => f === 'RBiH' || f === 'HRHB';
    for (const enclave of ENCLAVE_DEFINITIONS) {
        if (!enclave.osid_list && !enclave.capital_osid) continue;
        if (fed(enclave.faction) !== fed(faction)) continue;
        if (osidBelongsToEnclave(osid, enclave)) return true;
    }
    return false;
}

/** Area-weighted share per faction, 0..100, over the given controller map. */
export function settlementTerritoryPct(controllers: Record<string, FactionId>): Record<string, number> {
    const { areas, total } = getOsidAreas();
    const km2: Record<string, number> = { RBiH: 0, RS: 0, HRHB: 0 };
    for (const o of Object.keys(controllers).sort(strictCompare)) {
        const f = controllers[o]!;
        km2[f] = (km2[f] ?? 0) + (areas[o] ?? 0);
    }
    const out: Record<string, number> = {};
    for (const f of FACTIONS) out[f] = total > 0 ? ((km2[f] ?? 0) / total) * 100 : 0;
    return out;
}

/**
 * Record the settlement of an accepted plan (or a signed/imposed Dayton) on state.
 * Idempotent per plan: a second call for the same plan returns the stored record.
 */
export function applyPeaceSettlement(
    state: GameState,
    planId: SettlementPlanId,
    overrides: Record<string, FactionId> = {},
): PeaceSettlement {
    const neg = state.military.negotiation;
    if (!neg) throw new Error('applyPeaceSettlement: no negotiation state');
    if (neg.settlement && neg.settlement.plan_id === planId) return neg.settlement;
    const { controllers, special } = computeSettlementControllers(state, planId, overrides);
    const kept: Record<string, FactionId> = {};
    for (const o of Object.keys(overrides).sort(strictCompare)) {
        const f = overrides[o];
        if (f && o in controllers) kept[o] = f;
    }
    const settlement: PeaceSettlement = {
        plan_id: planId,
        turn: state.meta.turn,
        territory_pct: settlementTerritoryPct(controllers),
        special_osids: special,
        status: { ...SETTLEMENT_STATUS[planId] },
        ...(Object.keys(kept).length > 0 ? { map_overrides: kept } : {}),
    };
    neg.settlement = settlement;
    return settlement;
}

/** The OSID-level settlement map for a recorded settlement (recomputed, never stored). */
export function settlementControllersFor(state: GameState): Record<string, FactionId> | null {
    const s = state.military?.negotiation?.settlement;
    if (!s) return null;
    return computeSettlementControllers(state, s.plan_id, s.map_overrides ?? {}).controllers;
}

/** Grades best → worst; mirrors scoring.ts GRADE_RANK. */
const GRADE_ORDER = ['A+', 'A', 'B', 'C', 'D', 'F'];

/** Cap a grade by the settlement's terms for a faction. Only lowers, never raises. */
export function capGradeBySettlement(grade: string, settlement: PeaceSettlement | undefined, faction: string): string {
    const max = settlement?.status?.[faction]?.max_grade;
    if (!max) return grade;
    const gi = GRADE_ORDER.indexOf(grade);
    const mi = GRADE_ORDER.indexOf(max);
    if (gi === -1 || mi === -1) return grade;
    return gi >= mi ? grade : max;
}

let adjacencyCache: Map<string, string[]> | null = null;
/** OSID contact adjacency (operational_contact_graph.json), shared by the settlement modules. */
export function getSettlementAdjacency(): Map<string, string[]> {
    if (!adjacencyCache) adjacencyCache = buildOsidAdjacency(parseEdges(contactGraphJson));
    return adjacencyCache;
}
