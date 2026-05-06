/**
 * LANE-NIGHTSHIFT-B2-POLITICAL-LEADER-DATA-INTEGRATION
 *
 * DDR: docs/40_reports/audits/20260506_B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DDR.md
 * (941bd68e + 168d65c2)
 *
 * Predecessors:
 *   • A1 (CampaignPlan wiring): 18136710
 *   • A2 (Army CO substrate): ba6955bf
 *   • A3 (Army order interpretation, consumer): c8ff93d8
 *   • A4 (Army CO roster personalities): 93c75b1d
 *   • B1 (Political directive producer infra): 44053a32
 *
 * Purpose
 * ───────
 * B2 ships canonical political-leader Ring 2 DATA + the scenario-init
 * loader/wire-up that populates B1's substrate slots
 * (`state.military.political_leader_data` and `state.military.political_leaders`).
 * Once both are populated, B1's `producePoliticalDirective` transitions from
 * always-null to actively emitting `PoliticalDirectiveVerb`s consumed by
 * A3 (`apply-army-directive-interpretation`), enabling A4 personality
 * differentiation observable at 188w.
 *
 * Faction-symmetric mechanism (Ring 1)
 * ────────────────────────────────────
 * The loader iterates a sorted faction list with no `if (faction === 'X')`
 * branches. All asymmetry flows from the JSON DATA (which is necessarily
 * faction-asymmetric — Karadžić ≠ Izetbegović ≠ Boban). This mirrors the
 * A4 pattern: faction-symmetric loader code; faction-asymmetric data values.
 *
 * Byte-stability vs. pre-B2 path
 * ──────────────────────────────
 * • `B2_POLITICAL_LEADER_DATA_DISABLED=true` env flag short-circuits the
 *   loader to an empty pass (mirrors A4_ARMY_CO_ROSTER_DISABLED). With
 *   the flag set, B1 still finds substrate empty → returns null → 40w
 *   hash matches post-Krivaja baseline `575aca8c8adfdae2`.
 * • When the JSON file is unavailable / malformed, the loader returns
 *   without populating substrate (defensive — pre-B2 saves and missing
 *   data scenarios pass through with no behavior change).
 *
 * Determinism
 * ───────────
 * Synchronous file read (`readFileSync`); no `Math.random` / `Date.now` /
 * `new Date` / `setTimeout`. Sorted iteration via `Array.sort`.
 *
 * Sensitive-history compliance
 * ────────────────────────────
 * • Ring 1 mechanism (loader): faction-symmetric, no per-faction branches.
 * • Ring 2 data (JSON): faction-asymmetric (canonical historical leader
 *   personalities — Izetbegović, Karadžić, Boban).
 * • §6 surface: NEW behavioral surface — political bot directives now
 *   actively flow through B1 → A3 → A4 telemetry. Faction-symmetric
 *   mechanism with data-driven asymmetry; matches Engine_Invariants_v0_7_0
 *   §6 + SENSITIVE_HISTORY_DESIGN_GATE.md.
 * • DOES NOT touch FORAWWV / paint anchors / political_controllers / OOB.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { GameState, FactionId } from '../../state/game_state.js';
import type {
    PoliticalLeaderProfile,
    PoliticalLeaderState,
    PoliticalPosture,
    WarCrimesPolicy,
    AlliancePosture,
} from '../../state/political_leader_types.js';

// ═══════════════════════════════════════════════════════════════════════════
// JSON schema (mirrors data/scenarios/political_leader_data.json)
// ═══════════════════════════════════════════════════════════════════════════

interface PoliticalLeaderDataJson {
    schema_version: string;
    ddr_commit: string;
    leaders: PoliticalLeaderProfile[];
}

// ═══════════════════════════════════════════════════════════════════════════
// Canonical faction list (sorted; matches A4 pattern)
// ═══════════════════════════════════════════════════════════════════════════

const CANONICAL_FACTIONS: readonly FactionId[] = ['HRHB', 'RBiH', 'RS'];

// ═══════════════════════════════════════════════════════════════════════════
// Module-level cache (loader is pure; safe to memoize once per process)
// ═══════════════════════════════════════════════════════════════════════════

let _dataCache: PoliticalLeaderDataJson | null = null;
let _dataCacheKey: string | null = null;

/**
 * Load the canonical political-leader-data JSON. Synchronous + deterministic.
 *
 * @param path Absolute or repo-relative path. Defaults to
 *             `data/scenarios/political_leader_data.json`.
 * @returns parsed data, or null when the file is unavailable / malformed
 *          (substrate-driven: pre-B2 saves and broken-data scenarios pass
 *          through with no behavior change).
 */
export function loadPoliticalLeaderData(path?: string): PoliticalLeaderDataJson | null {
    const resolvedPath = resolve(path ?? 'data/scenarios/political_leader_data.json');
    if (_dataCache && _dataCacheKey === resolvedPath) {
        return _dataCache;
    }
    try {
        const raw = readFileSync(resolvedPath, 'utf8');
        const parsed = JSON.parse(raw) as PoliticalLeaderDataJson;
        if (!parsed || !Array.isArray(parsed.leaders)) return null;
        _dataCache = parsed;
        _dataCacheKey = resolvedPath;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Test-only cache reset. Safe to call from production paths (no-op when
 * cache is empty). Used by unit tests to isolate state between cases.
 */
export function _resetPoliticalLeaderDataCache(): void {
    _dataCache = null;
    _dataCacheKey = null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation: ensure each leader's numeric fields are in [1, 5]
// ═══════════════════════════════════════════════════════════════════════════

const NUMERIC_FIELDS: ReadonlyArray<keyof PoliticalLeaderProfile> = [
    'hawkishness',
    'flexibility',
    'international_sensitivity',
    'patron_deference',
    'impunity_tolerance',
];

/**
 * Return true when the profile is structurally valid (string ids, faction
 * in canonical set, numeric fields in [1, 5]). Faction-symmetric: same
 * predicate for every leader.
 */
export function isValidLeaderProfile(profile: unknown): profile is PoliticalLeaderProfile {
    if (!profile || typeof profile !== 'object') return false;
    const p = profile as Record<string, unknown>;
    if (typeof p.leader_id !== 'string' || p.leader_id.length === 0) return false;
    if (typeof p.name !== 'string') return false;
    if (typeof p.faction !== 'string') return false;
    if (!CANONICAL_FACTIONS.includes(p.faction as FactionId)) return false;
    for (const field of NUMERIC_FIELDS) {
        const v = p[field];
        if (typeof v !== 'number' || !Number.isFinite(v)) return false;
        if (v < 1 || v > 5) return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mutable-state initializer: fresh PoliticalLeaderState from a profile
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build the initial mutable PoliticalLeaderState for a given profile.
 * Posture is derived once from hawkishness; subsequent updates are owned
 * by future political-bot logic (out of scope for B2).
 *
 * Faction-symmetric: depends only on the profile values, not the faction id.
 */
function buildInitialLeaderState(profile: PoliticalLeaderProfile): PoliticalLeaderState {
    let posture: PoliticalPosture;
    if (profile.hawkishness >= 4) posture = 'hawkish';
    else if (profile.hawkishness <= 2) posture = 'conciliatory';
    else posture = 'moderate';

    const warCrimesPolicy: WarCrimesPolicy =
        profile.impunity_tolerance >= 4 ? 'tolerate' :
        profile.impunity_tolerance <= 2 ? 'prevent' :
        'deny';

    const alliancePosture: AlliancePosture =
        profile.flexibility >= 4 ? 'pragmatic' :
        profile.flexibility <= 2 ? 'hostile' :
        'committed';

    return {
        leader_id: profile.leader_id,
        faction: profile.faction,
        current_posture: posture,
        war_crimes_policy: warCrimesPolicy,
        alliance_posture: alliancePosture,
        political_capital: 5,
        political_capital_max: 10,
        current_priorities: [],
        player_trust: 50,
        recent_decisions: [],
    };
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API: applyPoliticalLeaderData
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Populate `state.military.political_leader_data` (PoliticalLeaderProfile[])
 * and `state.military.political_leaders` (Record<FactionId, ...State>) from
 * a parsed leader-data JSON. Idempotent — when slots already exist (e.g. a
 * prior init pass or a save load), the existing values are preserved
 * (matches A4 stubbornness idempotence pattern).
 *
 * Faction-symmetric: iterates a sorted faction set; no per-faction branches.
 */
export function applyPoliticalLeaderData(
    state: GameState,
    data: PoliticalLeaderDataJson,
): void {
    const mil = state.military as GameState['military'] & {
        political_leader_data?: PoliticalLeaderProfile[];
        political_leaders?: Record<string, PoliticalLeaderState>;
    };

    // Filter to valid profiles whose faction is canonical, sorted by leader_id
    // for deterministic iteration order.
    const validProfiles = data.leaders
        .filter(isValidLeaderProfile)
        .sort((a, b) => a.leader_id.localeCompare(b.leader_id));

    if (validProfiles.length === 0) return;

    // Populate political_leader_data — idempotent: only assign when missing
    // or empty, preserving any pre-existing scenario-authored values.
    if (!Array.isArray(mil.political_leader_data) || mil.political_leader_data.length === 0) {
        mil.political_leader_data = validProfiles.slice();
    }

    // Populate political_leaders mutable state — idempotent per faction.
    if (!mil.political_leaders) mil.political_leaders = {};
    const factions = [...CANONICAL_FACTIONS].sort();
    for (const faction of factions) {
        if (mil.political_leaders[faction]) continue; // preserve existing
        const profile = validProfiles.find(p => p.faction === faction);
        if (!profile) continue;
        mil.political_leaders[faction] = buildInitialLeaderState(profile);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Scenario-init entry: applyPoliticalLeaderDataInit
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scenario-init entry point. Called from scenario_runner.ts AFTER officer
 * initialization (named_officer_data), BEFORE the first `runTurn`. Loads
 * the canonical JSON and populates the substrate.
 *
 * Substrate-driven short-circuits (faction-symmetric):
 *   • B2_POLITICAL_LEADER_DATA_DISABLED=true env flag — used by 40w byte-
 *     stability A/B + 188w control run. Mirrors A4_ARMY_CO_ROSTER_DISABLED.
 *   • Missing JSON / malformed JSON → no-op (pre-B2 saves pass through).
 *   • Empty `leaders` array → no-op.
 *
 * @param state The GameState being initialized. Mutated in place.
 * @param path Optional override of the JSON path (test seam).
 */
export function applyPoliticalLeaderDataInit(state: GameState, path?: string): void {
    if (process.env.B2_POLITICAL_LEADER_DATA_DISABLED === 'true') return;
    const data = loadPoliticalLeaderData(path);
    if (!data) return;
    applyPoliticalLeaderData(state, data);
}
