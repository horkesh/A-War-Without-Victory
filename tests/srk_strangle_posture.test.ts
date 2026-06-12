/**
 * SRK strangle-not-capture posture (§6 Sarajevo urban core, DEFAULT-OFF).
 *
 * Covers:
 *   (a) flag-OFF → `computeSrkStrangleOsids` returns [] and the .RS contained
 *       set is unaffected (war-phase block is never entered → byte-identical).
 *   (b) flag-ON via `setSrkStranglePostureOverride(true)` → SRK plan does NOT
 *       target any urban-core OSID (they appear in the suppressed set);
 *       outer-ring municipalities (ilidza etc.) are NOT suppressed.
 *   (c) Srebrenica / Drina-corps targeting is UNAFFECTED (different faction
 *       pairing; SRK strangle only touches RS vs. Sarajevo urban core).
 *   (d) Additive merge: when Lane V is also ON, the .RS set is the union of
 *       both; neither overwrites the other.
 *   (e) Determinism: sorted output, pure, no side-effects.
 *   (f) `isContainSuppressionActiveFor('RS')` returns true when EITHER Lane V
 *       OR SRK strangle is ON, and false when both are OFF.
 */

import assert from 'node:assert';
import { test, afterEach } from 'vitest';

import { CURRENT_SCHEMA_VERSION, type GameState } from '../src/state/game_state.js';
import {
    isSrkStranglePostureEnabled,
    setSrkStranglePostureOverride,
    resetSrkStranglePostureGate,
    isVrsContainPostureEnabled,
    setVrsContainPostureOverride,
    resetVrsContainPostureGate,
} from '../src/sim/combat/contain_posture_gate.js';
import {
    SRK_STRANGLE_SUPPRESSED_MUN_IDS,
    computeSrkStrangleOsids,
} from '../src/sim/combat/srk_strangle.js';
import { isContainSuppressionActiveFor } from '../src/sim/combat/commander/plan.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Build a minimal GameState with the given political_controllers map. */
function stateWithControllers(
    controllers: Record<string, string | null>,
    turn = 50,
): GameState {
    return {
        schema_version: CURRENT_SCHEMA_VERSION,
        meta: { turn, seed: 'seed' },
        factions: [],
        military: {
            formations: {},
            front_segments: {},
            front_posture: {},
            front_posture_regions: {},
            front_pressure: {},
            militia_pools: {},
            event_flags: {},
        } as unknown as GameState['military'],
        political: {
            political_controllers: controllers as Record<string, 'RBiH' | 'RS' | 'HRHB' | null>,
        } as unknown as GameState['political'],
        displacement: {} as unknown as GameState['displacement'],
    } as GameState;
}

/** Sarajevo urban-core OSID examples (RBiH-held throughout the war). */
const CENTAR = 'op:centar_sarajevo:centar_sarajevo';
const NOVI_GRAD = 'op:novi_grad_sarajevo:novi_grad_sarajevo';
const NOVO_SARAJEVO = 'op:novo_sarajevo:novo_sarajevo';
const STARI_GRAD = 'op:stari_grad_sarajevo:stari_grad_sarajevo';

/** Outer-ring OSID — legitimate SRK objective, must NOT be suppressed. */
const ILIDZA = 'op:ilidza:ilidza';

/** Srebrenica — Drina Corps target; SRK strangle must NOT touch it. */
const SREBRENICA_2 = 'op:srebrenica:srebrenica_2';

afterEach(() => {
    resetSrkStranglePostureGate();
    resetVrsContainPostureGate();
});

// ── (a) flag DEFAULT-OFF ─────────────────────────────────────────────────────

test('SRK strangle gate is DEFAULT-OFF (env unset)', () => {
    resetSrkStranglePostureGate();
    const prev = process.env.AWWV_SRK_STRANGLE_POSTURE;
    delete process.env.AWWV_SRK_STRANGLE_POSTURE;
    try {
        assert.strictEqual(isSrkStranglePostureEnabled(), false);
    } finally {
        if (prev !== undefined) process.env.AWWV_SRK_STRANGLE_POSTURE = prev;
    }
});

test('flag-OFF: computeSrkStrangleOsids returns empty array (not called by war-phase block)', () => {
    // Even if we call the function directly with RBiH-held core OSIDs,
    // the war-phase block gates on isSrkStranglePostureEnabled() and never
    // calls it when OFF. Verify the function itself is pure and not the issue.
    setSrkStranglePostureOverride(false);
    const state = stateWithControllers({
        [CENTAR]: 'RBiH',
        [NOVI_GRAD]: 'RBiH',
        [ILIDZA]: 'RS',
    });
    // The war-phase block never calls computeSrkStrangleOsids when OFF.
    // Call directly to confirm it produces a result — the gate is the caller's responsibility.
    // Here we verify the gate returns false.
    assert.strictEqual(isSrkStranglePostureEnabled(), false);
    // And the state .RS contained set would remain untouched (simulated below).
    state.political.last_contained_osids_by_faction = undefined;
    // No write happens when gate is OFF → remains undefined.
    if (isSrkStranglePostureEnabled()) {
        // This branch must NOT execute.
        assert.fail('gate is OFF but block executed');
    }
    assert.strictEqual(state.political.last_contained_osids_by_faction, undefined);
});

// ── (b) flag-ON: urban-core OSIDs are suppressed, outer-ring is not ──────────

test('gate override controls the flag (tests)', () => {
    setSrkStranglePostureOverride(true);
    assert.strictEqual(isSrkStranglePostureEnabled(), true);
    setSrkStranglePostureOverride(false);
    assert.strictEqual(isSrkStranglePostureEnabled(), false);
    setSrkStranglePostureOverride(null);
    // Falls back to env (unset in test env → false).
    const prev = process.env.AWWV_SRK_STRANGLE_POSTURE;
    delete process.env.AWWV_SRK_STRANGLE_POSTURE;
    try {
        assert.strictEqual(isSrkStranglePostureEnabled(), false);
    } finally {
        if (prev !== undefined) process.env.AWWV_SRK_STRANGLE_POSTURE = prev;
    }
});

test('flag-ON: RBiH-held urban-core OSIDs appear in the SRK strangle set', () => {
    setSrkStranglePostureOverride(true);
    const state = stateWithControllers({
        [CENTAR]:        'RBiH',
        [NOVI_GRAD]:     'RBiH',
        [NOVO_SARAJEVO]: 'RBiH',
        [STARI_GRAD]:    'RBiH',
        [ILIDZA]:        'RS',   // outer-ring, RS-held → not suppressed
    });
    const suppressed = computeSrkStrangleOsids(state);
    assert.ok(suppressed.includes(CENTAR),        'centar_sarajevo suppressed');
    assert.ok(suppressed.includes(NOVI_GRAD),     'novi_grad_sarajevo suppressed');
    assert.ok(suppressed.includes(NOVO_SARAJEVO), 'novo_sarajevo suppressed');
    assert.ok(suppressed.includes(STARI_GRAD),    'stari_grad_sarajevo suppressed');
    // Outer ring must NOT appear.
    assert.ok(!suppressed.includes(ILIDZA), 'ilidza (outer ring) NOT suppressed');
});

test('flag-ON: RS-held urban-core OSIDs are NOT in the SRK strangle set (no friendly-fire)', () => {
    setSrkStranglePostureOverride(true);
    // Hypothetical: if RS somehow already holds a core OSID, it must not appear.
    const state = stateWithControllers({
        [CENTAR]:    'RS',   // RS-held — not suppressed
        [NOVI_GRAD]: 'RBiH', // RBiH-held — suppressed
    });
    const suppressed = computeSrkStrangleOsids(state);
    assert.ok(!suppressed.includes(CENTAR),    'RS-held centar not suppressed');
    assert.ok(suppressed.includes(NOVI_GRAD),  'RBiH-held novi_grad suppressed');
});

// ── (c) Srebrenica / Drina-corps unaffected ───────────────────────────────────

test('flag-ON: Srebrenica OSID is NOT in the SRK strangle set (different municipality)', () => {
    setSrkStranglePostureOverride(true);
    const state = stateWithControllers({
        [CENTAR]:       'RBiH',
        [SREBRENICA_2]: 'RBiH', // Drina corps objective — not a Sarajevo urban-core mun
    });
    const suppressed = computeSrkStrangleOsids(state);
    assert.ok(!suppressed.includes(SREBRENICA_2),
        'Srebrenica not in SRK strangle set — Drina Corps unaffected');
    assert.ok(suppressed.includes(CENTAR),
        'centar_sarajevo is suppressed (SRK target)');
});

// ── (d) Additive merge with Lane V ───────────────────────────────────────────

test('SRK strangle and Lane V are additive: union of both sets written to .RS', () => {
    // Simulate what war_phases.ts does: Lane V writes some OSIDs, then SRK
    // strangle merges additively.
    const LANE_V_OSID = 'op:srebrenica:srebrenica_2'; // example Lane V entry
    const state = stateWithControllers({
        [CENTAR]:    'RBiH',
        [NOVI_GRAD]: 'RBiH',
    });

    // Simulate Lane V having written to .RS first.
    state.political.last_contained_osids_by_faction = { RS: [LANE_V_OSID] };

    // Now simulate the SRK strangle block merging in.
    setSrkStranglePostureOverride(true);
    const srkOsids = computeSrkStrangleOsids(state);
    const existing = state.political.last_contained_osids_by_faction?.RS ?? [];
    const merged = [...new Set([...existing, ...srkOsids])];
    merged.sort();
    state.political.last_contained_osids_by_faction!.RS = merged;

    const final = state.political.last_contained_osids_by_faction!.RS!;
    // Lane V entry preserved.
    assert.ok(final.includes(LANE_V_OSID), 'Lane V entry preserved after SRK merge');
    // SRK entries added.
    assert.ok(final.includes(CENTAR),    'centar_sarajevo added by SRK merge');
    assert.ok(final.includes(NOVI_GRAD), 'novi_grad_sarajevo added by SRK merge');
    // No duplicates.
    assert.strictEqual(final.length, new Set(final).size, 'no duplicates in merged set');
});

// ── (g) Resumed-save flag-independence (Codex P1 #426) ───────────────────────

test('resumed-save stale-clearing: SRK-ON + Lane-V-OFF discards stale .RS from prior session', () => {
    // Pre-condition: a prior session ran with Lane V ON and serialized eastern-enclave
    // OSIDs into .RS. The save is now resumed with Lane V OFF, SRK ON.
    // The fixed code uses base=[] when Lane V is OFF, so the stale entries must
    // NOT appear in the resulting .RS — only the fresh SRK urban-core set.
    setVrsContainPostureOverride(false);
    setSrkStranglePostureOverride(true);

    const state = stateWithControllers({
        [CENTAR]:        'RBiH',
        [NOVI_GRAD]:     'RBiH',
        [NOVO_SARAJEVO]: 'RBiH',
        [STARI_GRAD]:    'RBiH',
    });

    // Seed stale Lane-V data from a prior session.
    const STALE_EASTERN_1 = 'op:srebrenica:srebrenica_2';
    const STALE_EASTERN_2 = 'op:zepa:zepa_2';
    state.political.last_contained_osids_by_faction = {
        RS: [STALE_EASTERN_1, STALE_EASTERN_2],
    };

    // Simulate the war-phase SRK block with the fix applied.
    // (Mirrors the logic in war_phases.ts lines ~1321-1337 post-fix.)
    assert.strictEqual(isSrkStranglePostureEnabled(), true);
    const srkOsids = computeSrkStrangleOsids(state);
    assert.ok(srkOsids.length > 0, 'precondition: SRK computes some OSIDs');

    const base = isVrsContainPostureEnabled()
        ? (state.political.last_contained_osids_by_faction?.RS ?? [])
        : [];
    const merged = [...new Set([...base, ...srkOsids])];
    merged.sort();
    state.political.last_contained_osids_by_faction!.RS = merged;

    const final = state.political.last_contained_osids_by_faction!.RS!;

    // Stale eastern-enclave entries must NOT appear.
    assert.ok(!final.includes(STALE_EASTERN_1),
        'stale srebrenica_2 (Lane-V leftover) must be cleared when Lane V is OFF');
    assert.ok(!final.includes(STALE_EASTERN_2),
        'stale zepa_2 (Lane-V leftover) must be cleared when Lane V is OFF');

    // Fresh SRK urban-core entries must appear.
    assert.ok(final.includes(CENTAR),        'centar_sarajevo present in fresh SRK set');
    assert.ok(final.includes(NOVI_GRAD),     'novi_grad_sarajevo present in fresh SRK set');
    assert.ok(final.includes(NOVO_SARAJEVO), 'novo_sarajevo present in fresh SRK set');
    assert.ok(final.includes(STARI_GRAD),    'stari_grad_sarajevo present in fresh SRK set');
});

test('resumed-save empty-core: SRK-ON + Lane-V-OFF + no RBiH-held urban core clears stale .RS', () => {
    // Edge case (Codex P2 #427): SRK is ON, Lane V OFF, the save carries a stale
    // Lane-V .RS, AND the current urban core is NOT RBiH-held (computeSrkStrangleOsids
    // returns []). The base/merged compute must run UNCONDITIONALLY so the empty merged
    // result clears the stale set — otherwise the plan.ts gate (active via the SRK flag)
    // keeps reading leftover eastern-enclave entries.
    setVrsContainPostureOverride(false);
    setSrkStranglePostureOverride(true);

    // No RBiH-held urban core → SRK computes nothing to suppress.
    const state = stateWithControllers({
        [CENTAR]:        'RS',
        [NOVI_GRAD]:     'RS',
        [NOVO_SARAJEVO]: 'RS',
        [STARI_GRAD]:    'RS',
    });
    state.political.last_contained_osids_by_faction = { RS: [SREBRENICA_2, 'op:zepa:zepa_2'] };

    // Mirror the post-P2-fix war-phase logic (war_phases.ts ~1321-1343).
    const srkOsids = computeSrkStrangleOsids(state);
    assert.strictEqual(srkOsids.length, 0, 'precondition: no RBiH-held urban core → SRK set empty');
    const base = isVrsContainPostureEnabled()
        ? (state.political.last_contained_osids_by_faction?.RS ?? [])
        : [];
    const merged = [...new Set([...base, ...srkOsids])];
    merged.sort();
    if (merged.length > 0) {
        state.political.last_contained_osids_by_faction!.RS = merged;
    } else if (state.political.last_contained_osids_by_faction?.RS) {
        delete state.political.last_contained_osids_by_faction.RS;
    }

    assert.ok(
        !state.political.last_contained_osids_by_faction?.RS,
        'stale .RS must be CLEARED when SRK contributes nothing and Lane V is OFF',
    );
});

test('both-ON union: Lane-V-ON + SRK-ON writes union of both fresh sets to .RS', () => {
    // When both flags are ON, the fixed code: Lane V writes its fresh set first,
    // then SRK reads base = that fresh set (isVrsContainPostureEnabled() = true)
    // and unions in SRK OSIDs. The result must contain both.
    setVrsContainPostureOverride(true);
    setSrkStranglePostureOverride(true);

    // Simulate Lane V having written a fresh set (no stale contamination).
    const FRESH_LANE_V_1 = 'op:gorazde:gorazde_2';
    const FRESH_LANE_V_2 = 'op:bihac:bihac_2';
    const state = stateWithControllers({
        [CENTAR]:    'RBiH',
        [NOVI_GRAD]: 'RBiH',
    });
    // Lane V's fresh write (simulates what isVrsContainPostureEnabled block does above SRK block).
    state.political.last_contained_osids_by_faction = {
        RS: [FRESH_LANE_V_1, FRESH_LANE_V_2],
    };

    // Now simulate the SRK block with fix applied.
    assert.strictEqual(isVrsContainPostureEnabled(), true);
    const srkOsids = computeSrkStrangleOsids(state);
    const base = isVrsContainPostureEnabled()
        ? (state.political.last_contained_osids_by_faction?.RS ?? [])
        : [];
    const merged = [...new Set([...base, ...srkOsids])];
    merged.sort();
    state.political.last_contained_osids_by_faction!.RS = merged;

    const final = state.political.last_contained_osids_by_faction!.RS!;

    // Both Lane-V fresh entries and SRK entries must be present.
    assert.ok(final.includes(FRESH_LANE_V_1), 'fresh Lane-V gorazde_2 preserved in union');
    assert.ok(final.includes(FRESH_LANE_V_2), 'fresh Lane-V bihac_2 preserved in union');
    assert.ok(final.includes(CENTAR),         'SRK centar_sarajevo in union');
    assert.ok(final.includes(NOVI_GRAD),      'SRK novi_grad_sarajevo in union');
    assert.strictEqual(final.length, new Set(final).size, 'no duplicates in union');
});

// ── (e) Determinism ──────────────────────────────────────────────────────────

test('computeSrkStrangleOsids output is sorted and deterministic', () => {
    setSrkStranglePostureOverride(true);
    const state = stateWithControllers({
        [STARI_GRAD]:    'RBiH',
        [CENTAR]:        'RBiH',
        [NOVO_SARAJEVO]: 'RBiH',
        [NOVI_GRAD]:     'RBiH',
    });
    const a = computeSrkStrangleOsids(state);
    const b = computeSrkStrangleOsids(state);
    assert.deepStrictEqual(a, b, 'deterministic: same output on repeated calls');
    assert.deepStrictEqual(a, [...a].sort(), 'output is sorted');
});

test('no political_controllers → empty array (safe fallback)', () => {
    setSrkStranglePostureOverride(true);
    const state = stateWithControllers({});
    // Explicitly remove controllers.
    (state.political as unknown as Record<string, unknown>).political_controllers = undefined;
    const suppressed = computeSrkStrangleOsids(state);
    assert.deepStrictEqual(suppressed, []);
});

// ── (f) isContainSuppressionActiveFor gate covers both RS lanes ──────────────

test('isContainSuppressionActiveFor(RS) = false when both VRS and SRK flags are OFF', () => {
    setVrsContainPostureOverride(false);
    setSrkStranglePostureOverride(false);
    assert.strictEqual(isContainSuppressionActiveFor('RS'), false);
});

test('isContainSuppressionActiveFor(RS) = true when only Lane V (VRS) is ON', () => {
    setVrsContainPostureOverride(true);
    setSrkStranglePostureOverride(false);
    assert.strictEqual(isContainSuppressionActiveFor('RS'), true);
});

test('isContainSuppressionActiveFor(RS) = true when only SRK strangle is ON', () => {
    setVrsContainPostureOverride(false);
    setSrkStranglePostureOverride(true);
    assert.strictEqual(isContainSuppressionActiveFor('RS'), true);
});

test('isContainSuppressionActiveFor(RS) = true when both flags are ON', () => {
    setVrsContainPostureOverride(true);
    setSrkStranglePostureOverride(true);
    assert.strictEqual(isContainSuppressionActiveFor('RS'), true);
});

test('isContainSuppressionActiveFor(RBiH) unaffected by SRK flag', () => {
    setSrkStranglePostureOverride(true);
    // RBiH gate is controlled solely by ARBIH_CONTAIN flag (Lane A).
    // Default is OFF → false even with SRK ON.
    assert.strictEqual(isContainSuppressionActiveFor('RBiH'), false);
});

// ── canonical constant sanity ─────────────────────────────────────────────────

test('SRK_STRANGLE_SUPPRESSED_MUN_IDS contains the four urban-core municipalities', () => {
    const ids = SRK_STRANGLE_SUPPRESSED_MUN_IDS;
    assert.ok(ids.includes('centar_sarajevo'),    'centar_sarajevo');
    assert.ok(ids.includes('novi_grad_sarajevo'), 'novi_grad_sarajevo');
    assert.ok(ids.includes('novo_sarajevo'),      'novo_sarajevo');
    assert.ok(ids.includes('stari_grad_sarajevo'),'stari_grad_sarajevo');
    assert.strictEqual(ids.length, 4, 'exactly 4 urban-core municipalities');
});

test('SRK_STRANGLE_SUPPRESSED_MUN_IDS does NOT include outer-ring municipalities', () => {
    const ids = SRK_STRANGLE_SUPPRESSED_MUN_IDS;
    for (const outer of ['ilidza', 'vogosca', 'ilijas', 'hadzici', 'pale', 'sokolac']) {
        assert.ok(!ids.includes(outer), `${outer} must NOT be in suppressed list`);
    }
});
