/**
 * Collapse §6 GUARD G2 invariant (Phase I spec §4.2, hardened in Phase IV-b D1). // legacy-phase-term-ok
 *
 * G2 is the defense-in-depth regression that asserts the genocide-rupture floor is
 * intact: with collapse in the pipeline, (a) Srebrenica falls to RS, (b) the
 * `srebrenica_genocide_1995` rupture records at turn ≥ 160, (c) Žepa falls to RS,
 * (d) Goražde + Bihać + Sarajevo + Teočak are HELD by RBiH at Dayton.
 *
 * IV-b D1 HARDENING (binding §6 review conditions —
 * docs/40_reports/proposals/20260610_COLLAPSE_PHASE4B_S6_REVIEW.md):
 *  - G2-A (BLOCKING): the §6 assertions previously ran against the LATEST 188w artifact
 *    with no proof it was collapse-ON → they passed trivially on collapse-OFF runs.
 *    Collapse-ON runs (ENABLE_COLLAPSE=true, scenario_runner.ts) now write a sidecar
 *    marker `collapse_enabled.json` into the run dir; the collapse-ON §6 suite below
 *    runs ONLY against a marker-verified artifact and REPORTS non-execution when none
 *    exists (see RC DEFECT 8 below). The selected-artifact assertions are KEPT as the
 *    collapse-OFF regression sentinel.
 *  - G2-B (BLOCKING): rupture-timing IDENTITY (gate-packet G2.3), not just the ≥160
 *    floor: `recorded_turn` and the scripted-fall trigger inputs must be IDENTICAL
 *    between a collapse-ON and a collapse-OFF 188w artifact pair. NOTE on "first turn
 *    controller === RS": evaluateRuptureConsequences runs every turn and records on
 *    the FIRST turn ≥ 160 where `political_controllers['op:srebrenica:srebrenica_2']
 *    === 'RS'`; combined with the ≥160 assertion, recorded_turn IS the first-RS turn,
 *    so recorded_turn identity ⇒ first-RS-turn identity. Belt-and-braces, the
 *    scripted fall events' `event_last_fired_turn` (the control-flip writers) and the
 *    `srebrenica_enclave_formed`/`srebrenica_fell` event flags are also pinned.
 *  - G2-C: positive pin on the edge-min residual — for every protected enclave OSID,
 *    getSidCapacityModifiers() must return all-1.0 (the OSID is never in
 *    capacity_modifiers.by_sid). Makes any future Option-3 regression loud.
 *  - G2-D (doc): on a collapse-ON run, enclave OSIDs WILL have `local_strain` /
 *    `collapse_eligibility_tier1` entries BY DESIGN — guard-by-exclusion-at-write
 *    (ratified #368): G1 excludes the enclave at the Phase 3D WRITE, it does not stop
 *    upstream evaluation. Only `collapse_damage` / `capacity_modifiers` /
 *    `will_not_recover` are §6-protected. Do NOT mistake an enclave strain/tier1
 *    entry for a guard breach.
 *
 * Marker-less run dirs are treated as collapse-OFF (the marker ships with this change;
 * any pre-marker collapse-ON artifact is simply not accepted as ON proof). The ON/OFF
 * pair assertions bite for real at D2's two-run harness.
 *
 * IV-b D2 MARKER HYGIENE (review-383 defect fix): pre-marker artifacts (IV-a era —
 * produced before the sidecar existed) classify as collapse-OFF BY DESIGN; they can
 * never be accepted as ON proof, and a stale IV-a collapse-ON artifact on the OFF side
 * of the G2-B pair is the reason D2 measurement runs MUST use unique run dirs.
 * Symmetrically, scenario_runner.ts (syncCollapseEnabledMarker) now DELETES any stale
 * `collapse_enabled.json` on the collapse-OFF path at save-write time, so an OFF rerun
 * of a REUSED run dir cannot leave a stale ON marker (the false-positive vector where
 * G2-A would assert the §6 collapse-ON proof against an OFF artifact). Regression test:
 * tests/collapse_run_marker_hygiene.test.ts.
 *
 * RC DEFECT 8 FIX (2026-08-13) — this suite was a FALSE GREEN on two counts:
 *  (i)  ARTIFACT SELECTION BY MTIME. Candidates were ordered by `statSync().mtimeMs`, so
 *       which artifact §6 was asserted against depended on this checkout's filesystem
 *       metadata, not on the run — nondeterministic across machines and checkouts, and
 *       against the determinism rule. Selection now happens on the run-dir NAME (marker
 *       partition, then `_n<counter>` descending, terminating in strictCompare) and
 *       excludes truncated runs of the same scenario — see tests/_helpers/s6_run_selection.ts.
 *  (ii) SILENT SKIPS. G2-A and G2-B used `it.skipIf`. With ~100 unmarked 188w dirs in
 *       runs/ and ZERO marked ones, both cases skipped out of existence — a fully green
 *       suite proved nothing about §6. Both cases now always RUN and report their status
 *       in their own test name, plus a §6 execution receipt at the end. Setting
 *       `AWWV_REQUIRE_S6_EXECUTION=true` (do this for any run used as §6 evidence) turns
 *       a non-executed case into a hard FAILURE, per panel criterion 3.
 *
 * Determinism: reads persisted artifacts + pure helpers; no RNG/clock, no fs metadata.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSidCapacityModifiers } from '../src/sim/collapse/capacity_modifiers.js';
import { ENCLAVE_DEFINITIONS, getEnclaveDefForOsid } from '../src/sim/combat/enclave_resilience.js';
import {
    assertS6PairComparable,
    resolveS6EvidenceRoot,
    scanS6RunCandidates,
    selectS6RunDirs,
} from './_helpers/s6_run_selection.js';
import type { GameState } from '../src/state/game_state.js';

const RUNS_DIR = resolveS6EvidenceRoot(process.env)
    ?? join(process.cwd(), 'tests', 'fixtures', '__s6_evidence_not_configured__');

/**
 * Strict mode: a §6 case that does NOT execute becomes a hard FAILURE.
 *
 * Set `AWWV_REQUIRE_S6_EXECUTION=true` for any run that is being used as §6 EVIDENCE
 * (the D2 two-run measurement harness, a pre-merge §6 gate). Panel criterion 3: a
 * skipped §6 case is a NO-GO, not a pass. It is OFF by default because a fresh checkout
 * legitimately has no `runs/` artifacts and must not be permanently red — in that mode
 * the non-execution is still LOUD (it is written into the test names and the receipt),
 * just not fatal.
 */
const REQUIRE_S6_EXECUTION = process.env.AWWV_REQUIRE_S6_EXECUTION === 'true';

function loadFinalSave(runDir: string): Record<string, unknown> {
    return JSON.parse(readFileSync(join(runDir, 'final_save.json'), 'utf8')) as Record<string, unknown>;
}

function politicalState(finalSave: Record<string, unknown>): Record<string, unknown> {
    const direct = finalSave.political as Record<string, unknown> | undefined;
    if (direct) return direct;
    const nested = (finalSave.state as { political?: Record<string, unknown> })?.political;
    return nested ?? {};
}

function militaryState(finalSave: Record<string, unknown>): Record<string, unknown> {
    const direct = finalSave.military as Record<string, unknown> | undefined;
    if (direct) return direct;
    const nested = (finalSave.state as { military?: Record<string, unknown> })?.military;
    return nested ?? {};
}

function politicalControllers(finalSave: Record<string, unknown>): Record<string, string | null> {
    return (politicalState(finalSave).political_controllers as Record<string, string | null>) ?? {};
}

function ruptureConsequences(finalSave: Record<string, unknown>): Array<{ id: string; recorded_turn: number }> {
    const negotiation = militaryState(finalSave).negotiation as
        { rupture_consequences?: Array<{ id: string; recorded_turn: number }> } | undefined;
    return negotiation?.rupture_consequences ?? [];
}

function eventLastFiredTurn(finalSave: Record<string, unknown>): Record<string, number> {
    return (militaryState(finalSave).event_last_fired_turn as Record<string, number>) ?? {};
}

function eventFlags(finalSave: Record<string, unknown>): Record<string, string | number | boolean> {
    return (militaryState(finalSave).event_flags as Record<string, string | number | boolean>) ?? {};
}

/** Minimal GameState shape for the side-effect-free capacity-modifier reader (G2-C). */
function asCapacityReaderState(finalSave: Record<string, unknown>): GameState {
    return { political: politicalState(finalSave) } as unknown as GameState;
}

// Protected enclave OSID capitals (every ENCLAVE_DEFINITIONS family — 6 RBiH + 3 HRHB).
// Panel O-1 = include-HRHB: the guard covers EVERY enclave from getEnclaveDefForOsid.
// IV-b D2 KEY-SPACE FIX (Codex review on #382): the Sarajevo LOGICAL capital
// 'op:centar_sarajevo:centar_sarajevo' is not a painted OSID and can never appear as a
// 3D writer key (Tier-1 entities are painted OSIDs from the exposure substrate) — an
// inertness assertion on it alone is vacuous for Sarajevo. The PAINTED core cell
// 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo' (guarded via the enclave's
// osid_prefixes) is therefore ALSO pinned, and the full-keyspace scan below closes the
// rest of the prefix/list space.
const PROTECTED_ENCLAVE_OSIDS = [
    'op:srebrenica:srebrenica_2',
    'op:rogatica:zepa_2',
    'op:gorazde:gorazde_2',
    'op:bihac:bihac_2',
    'op:centar_sarajevo:centar_sarajevo',
    'op:centar_sarajevo:sarajevo_dio_centar_sajarevo',
    'op:ugljevik:teocak_krstac_2',
    'op:kiseljak:kiseljak_2',
    'op:vitez:vitez_2',
    'op:zepce:zepce_2',
];

/**
 * Shared §6 assertion set, run against a given artifact.
 *
 * G2-D NOTE: deliberately does NOT assert absence of enclave `local_strain` /
 * `collapse_eligibility_tier1` entries — on a collapse-ON run those WILL exist for
 * enclave OSIDs BY DESIGN (guard-by-exclusion-at-write, ratified #368). The three
 * §6-protected fields are collapse_damage / capacity_modifiers / will_not_recover only.
 */
function assertSection6Invariants(finalSave: Record<string, unknown>): void {
    const pc = politicalControllers(finalSave);

    // Srebrenica + Žepa fell (genocide-rupture enclaves).
    expect(pc['op:srebrenica:srebrenica_2']).toBe('RS');
    expect(pc['op:rogatica:zepa_2']).toBe('RS');

    // Never-fell RBiH enclaves held at Dayton. (Sarajevo is a PREFIX enclave — the
    // logical capital_osid 'centar_sarajevo:centar_sarajevo' is not a painted OSID;
    // assert the real RBiH-held core cell instead.)
    expect(pc['op:gorazde:gorazde_2']).toBe('RBiH');
    expect(pc['op:bihac:bihac_2']).toBe('RBiH');
    expect(pc['op:centar_sarajevo:sarajevo_dio_centar_sajarevo']).toBe('RBiH');
    expect(pc['op:ugljevik:teocak_krstac_2']).toBe('RBiH');

    // Rupture recorded, not premature. Panel directive #3(iv): >= 160, not just the
    // canon >= 140 floor — guards the [140,160) gap.
    const genocide = ruptureConsequences(finalSave).find(r => r.id === 'srebrenica_genocide_1995');
    expect(genocide, 'srebrenica_genocide_1995 rupture must be recorded').toBeDefined();
    expect(genocide!.recorded_turn).toBeGreaterThanOrEqual(160);

    // G1 proof — panel directive #3(i)(ii)(iii): per protected OSID assert (i) NO
    // collapse_damage entry [the load-bearing inertness proof — presence ALONE, even at
    // damage 0, trips will_not_recover], (ii) NO capacity_modifier, (iii)
    // will_not_recover NOT set.
    const pol = politicalState(finalSave);
    const collapseDamage = (pol.collapse_damage as { by_entity?: Record<string, unknown> })?.by_entity ?? {};
    const capacityMods = (pol.capacity_modifiers as { by_sid?: Record<string, unknown> })?.by_sid ?? {};
    const trends = (pol.loss_of_control_trends as { by_settlement?: Record<string, { will_not_recover?: boolean }> })?.by_settlement ?? {};
    for (const osid of PROTECTED_ENCLAVE_OSIDS) {
        expect(collapseDamage[osid], `collapse_damage must not contain ${osid}`).toBeUndefined();
        expect(capacityMods[osid], `capacity_modifiers must not contain ${osid}`).toBeUndefined();
        expect(trends[osid]?.will_not_recover ?? false, `will_not_recover must be false for ${osid}`).toBe(false);
    }

    // FULL-KEYSPACE inertness scan (IV-b D2, Codex review on #382): the exact-pin list
    // above cannot enumerate every guarded OSID (Sarajevo + Bihać are PREFIX enclaves
    // covering whole municipalities; the eastern enclaves carry multi-OSID lists). The
    // 3D writer keys ARE OSIDs, and the G1 guard predicate IS getEnclaveDefForOsid —
    // so assert in the writer's own key space: NO key actually written into any of the
    // three §6-protected fields may resolve to an enclave definition.
    for (const key of Object.keys(collapseDamage)) {
        expect(getEnclaveDefForOsid(key), `collapse_damage key ${key} must not belong to any enclave (G1 breach)`).toBeNull();
    }
    for (const key of Object.keys(capacityMods)) {
        expect(getEnclaveDefForOsid(key), `capacity_modifiers key ${key} must not belong to any enclave (G1 breach)`).toBeNull();
    }
    for (const [key, rec] of Object.entries(trends)) {
        if (rec?.will_not_recover === true) {
            expect(getEnclaveDefForOsid(key), `will_not_recover=true key ${key} must not belong to any enclave (G1 breach)`).toBeNull();
        }
    }

    // G2-C — positive pin on the edge-min residual (§6 review Condition 4 corollary):
    // the safe reader must return all-1.0 for every protected enclave OSID. This is what
    // keeps getEdgeCapacityMultiplier's min(a, b) from ever importing a collapsed
    // neighbor's degradation INTO the enclave's own multiplier set. Any future Option-3
    // (war_front_pressure_osid accumulator) regression trips this loudly.
    const readerState = asCapacityReaderState(finalSave);
    for (const osid of PROTECTED_ENCLAVE_OSIDS) {
        const mods = getSidCapacityModifiers(readerState, osid);
        expect(mods, `capacity modifiers for ${osid} must be all-1.0 (DEFAULT)`).toEqual({
            authority_mult: 1,
            cohesion_mult: 1,
            supply_mult: 1,
            pressure_cap_mult: 1,
        });
    }
}

// ---------------------------------------------------------------------------
// Artifact selection — DETERMINISTIC, no filesystem mtime (see
// tests/_helpers/s6_run_selection.ts for the rule and the defect it fixes).
// ---------------------------------------------------------------------------
const selection = selectS6RunDirs(scanS6RunCandidates(RUNS_DIR));
const runDir = selection.any === null ? null : join(RUNS_DIR, selection.any);
const onRunDir = selection.on === null ? null : join(RUNS_DIR, selection.on);
/**
 * PAIR vs PARTITION (ledger 2026-08-17). The sentinel and G2-A read ONE artifact each, so
 * they take the raw partition winners. G2-B is a DIFFERENTIAL and takes `selection.pair`,
 * which is refused unless both runs are provenance-stamped and consumed identical inputs —
 * the n222/n223 pair differed by the collapse flag AND an entire OOB change set, and the
 * artifacts could not tell. `offRunDir` therefore exists only for G2-B.
 */
const offRunDir = selection.pair === null ? null : join(RUNS_DIR, selection.pair.off);
const pairOnRunDir = selection.pair === null ? null : join(RUNS_DIR, selection.pair.on);

if (selection.pairWarnings.length > 0) {
    console.warn(`[§6 G2] pair is comparable with caveats: ${selection.pairWarnings.join('; ')}`);
}

/** Why a §6 case cannot run, or null when it can. */
const SENTINEL_SKIP_REASON = runDir !== null
    ? null
    : 'no runs/apr1992_definitive_188w__*__w188* dir carries a final_save.json';
const G2A_SKIP_REASON = onRunDir !== null
    ? null
    : `no full-length 188w run dir records collapse_enabled (${selection.counts.total} candidates, ${selection.counts.marked} collapse-ON) — the collapse-ON §6 proof is NOT ESTABLISHED`;
/**
 * ★ SKIPPED and INCOMPARABLE are DIFFERENT STATES and must not look alike.
 *
 * SKIPPED = benign: the runs predate the stamp, or one side does not exist. Nobody erred.
 * INCOMPARABLE = a pair exists and it is BAD. That is a hard FAILURE, because if a
 * confounded pair degraded to SKIPPED it would be indistinguishable from "no runs yet" —
 * and n222/n223 would have skipped silently instead of teaching anybody anything.
 */
const G2B_SKIP_REASON = selection.pair !== null || selection.pairFailure !== null
    ? null
    : `no COMPARABLE ON/OFF 188w artifact pair — ${selection.pairRefusal ?? 'unknown'} (${selection.counts.marked} collapse-ON, ${selection.counts.unmarked} collapse-OFF)`;

/** Two-state status for cases that read ONE artifact. */
function statusOf(skipReason: string | null): string {
    return skipReason === null ? 'EXECUTED' : 'SKIPPED';
}

/** THREE-state status for pair-dependent cases. INCOMPARABLE is a red, never a skip. */
function pairStatusOf(skipReason: string | null): string {
    if (selection.pairFailure !== null) return 'INCOMPARABLE';
    return skipReason === null ? 'EXECUTED' : 'SKIPPED';
}

/** Every §6 case and whether this invocation actually ran it. */
const S6_CASES: ReadonlyArray<{ id: string; skipReason: string | null; status: string }> = [
    { id: 'sentinel', skipReason: SENTINEL_SKIP_REASON, status: statusOf(SENTINEL_SKIP_REASON) },
    { id: 'G2-A', skipReason: G2A_SKIP_REASON, status: statusOf(G2A_SKIP_REASON) },
    { id: 'G2-B', skipReason: G2B_SKIP_REASON, status: pairStatusOf(G2B_SKIP_REASON) },
];

const S6_RECEIPT = S6_CASES.map(c => `${c.id}=${c.status}`).join(' ');

/**
 * A §6 case that could not run reports itself rather than vanishing.
 *
 * `it.skipIf` was the defect: `runs/` holds ~100 unmarked 188w dirs and ZERO marked ones,
 * so G2-A and G2-B skipped out of existence and a fully green suite proved NOTHING about
 * §6 — precisely the false green the §6 apparatus exists to prevent. Now the status is in
 * the test name (always visible), on stderr, and fatal under AWWV_REQUIRE_S6_EXECUTION.
 */
function reportNonExecution(caseId: string, skipReason: string): void {
    console.warn(`[§6 G2] ${caseId} DID NOT EXECUTE — ${skipReason}`);
    expect(
        REQUIRE_S6_EXECUTION,
        `§6 ${caseId} DID NOT EXECUTE and AWWV_REQUIRE_S6_EXECUTION=true: ${skipReason}. ` +
        'Panel criterion 3 — a skipped §6 case is a NO-GO, not a pass. Produce the missing ' +
        'artifact (a collapse-ON 188w run writes runs/<dir>/collapse_enabled.json) and rerun.'
    ).toBe(false);
}

describe('collapse §6 GUARD G2 invariant (188w rupture floor)', () => {

    /**
     * SEAM PIN (review guard sweep, 2026-08-13) — the caller must USE the helper's answer.
     *
     * tests/_helpers/s6_run_selection.ts is itself well covered behaviourally, but this suite's
     * USE of it was pinned only textually (an `includes('selectS6RunDirs(scanS6RunCandidates(')`
     * grep plus the /mtime/ and /statSync/ bans over in the selection suite). Those survive a
     * caller that invokes the helper and then IGNORES its result: the grep still matches, and an
     * mtime re-pick via node:fs/promises `stat()` reading `.mtime` contains neither banned
     * literal. Same shape as F1 — a well-tested pure function whose caller is not forced to use it.
     *
     * These assertions close that seam behaviourally: the three dirs the §6 cases actually read
     * MUST be exactly what selectS6RunDirs returned. Any re-pick, by any API, diverging by any
     * amount, fails here.
     *
     * Keep the greps too, and know what each buys — they are not redundant. This pin catches
     * DIVERGENCE; it cannot catch a re-pick that happens to agree. Measured on this checkout: a
     * newest-first mtime re-pick (what the original defect actually did) passes this pin, because
     * mtime-newest and counter-newest are currently the SAME dir. The greps ban the mechanism;
     * this pin binds the answer.
     *
     * EXTENDED 2026-08-17 for pair comparability. The differential case (G2-B) must read
     * `selection.pair`, never `selection.on`+`selection.off` — the raw partition winners are
     * exactly what paired a pre-OOB-change run against a post-OOB-change one. A caller that
     * reverts to the partition winners diverges here as soon as the pair is refused.
     */
    it('SEAM: the dirs the §6 cases read are exactly the deterministic helper\'s answer', () => {
        expect(runDir, 'sentinel dir must be selection.any, not a re-pick').toBe(
            selection.any === null ? null : join(RUNS_DIR, selection.any)
        );
        expect(onRunDir, 'collapse-ON dir must be selection.on, not a re-pick').toBe(
            selection.on === null ? null : join(RUNS_DIR, selection.on)
        );
        expect(offRunDir, 'G2-B OFF dir must be selection.pair.off, not selection.off and not a re-pick').toBe(
            selection.pair === null ? null : join(RUNS_DIR, selection.pair.off)
        );
        expect(pairOnRunDir, 'G2-B ON dir must be selection.pair.on, not selection.on and not a re-pick').toBe(
            selection.pair === null ? null : join(RUNS_DIR, selection.pair.on)
        );
        // Non-vacuity: with artifacts present the single-artifact dir must be a real path, so the
        // identity above is not being satisfied by nulls throughout.
        if (selection.counts.total > 0) {
            expect(runDir).not.toBeNull();
        }
        // A null pair must null BOTH pair dirs — a half-applied refusal would let a
        // differential case read one validated dir and one partition winner.
        if (selection.pair === null) {
            expect(offRunDir).toBeNull();
            expect(pairOnRunDir).toBeNull();
            // Exactly one of the two no-verdict states, and they are not interchangeable:
            // REFUSED means nobody erred and G2-B skips; INCOMPARABLE means a bad pair exists
            // and G2-B must go RED.
            expect(
                (selection.pairRefusal === null) !== (selection.pairFailure === null),
                'exactly one of pairRefusal (skip) / pairFailure (red) must explain a null pair'
            ).toBe(true);
            expect(
                G2B_SKIP_REASON === null,
                'INCOMPARABLE must not degrade to SKIPPED, and REFUSED must not present as executable'
            ).toBe(selection.pairFailure !== null);
        } else {
            expect(offRunDir).not.toBeNull();
            expect(pairOnRunDir).not.toBeNull();
            expect(selection.pairFailure).toBeNull();
        }
    });

    it('hardcoded PROTECTED_ENCLAVE_OSIDS stay in sync with the G1 predicate (getEnclaveDefForOsid)', () => {
        for (const osid of PROTECTED_ENCLAVE_OSIDS) {
            expect(getEnclaveDefForOsid(osid), `${osid} must resolve to an enclave definition`).not.toBeNull();
        }
    });

    // IV-b D2: the standalone .cjs verifier (tools/verify_collapse_section6.cjs) cannot
    // import the live G1 predicate, so it REPLICATES the enclave geometry (prefixes +
    // osid lists). Pin that replication against ENCLAVE_DEFINITIONS so any future
    // geometry change fails loudly here instead of silently de-fanging the verifier.
    it('verify_collapse_section6.cjs replicated enclave geometry stays in sync with ENCLAVE_DEFINITIONS', () => {
        const verifierSrc = readFileSync(join(process.cwd(), 'tools', 'verify_collapse_section6.cjs'), 'utf8');

        // Every osid_list member of every enclave definition must appear verbatim.
        for (const def of ENCLAVE_DEFINITIONS) {
            for (const osid of def.osid_list ?? []) {
                expect(verifierSrc.includes(`'${osid}'`), `verifier must list ${osid} (enclave ${def.id})`).toBe(true);
            }
            for (const prefix of def.osid_prefixes ?? []) {
                expect(verifierSrc.includes(`'${prefix}'`), `verifier must carry prefix ${prefix} (enclave ${def.id})`).toBe(true);
            }
        }
        // The painted Sarajevo core cell pin (the Codex #382 key-space fix) must stay.
        expect(verifierSrc.includes(`'op:centar_sarajevo:sarajevo_dio_centar_sajarevo'`)).toBe(true);
    });

    // ---------------------------------------------------------------------------
    // Regression sentinel — latest 188w artifact, collapse-ON or OFF. These §6
    // invariants must hold on EVERY 188w artifact; on a collapse-OFF run the G1
    // assertions pass trivially (sentinel against non-collapse regressions).
    // ---------------------------------------------------------------------------
    it(`[${statusOf(SENTINEL_SKIP_REASON)}] sentinel (selected 188w artifact, ON or OFF): full §6 assertion set`, () => {
        if (SENTINEL_SKIP_REASON !== null) return reportNonExecution('sentinel', SENTINEL_SKIP_REASON);
        assertSection6Invariants(loadFinalSave(runDir!));
    });

    // ---------------------------------------------------------------------------
    // G2-A (BLOCKING gap, §6 review) — collapse-ON proof. Runs ONLY against an
    // artifact verifiably produced with ENABLE_COLLAPSE=true (collapse_enabled.json
    // sidecar marker, written by scenario_runner.ts on the collapse-ON path only).
    // SKIPS — visibly, not a silent pass — when no marker-verified artifact exists:
    // the collapse-ON §6 proof is then NOT YET ESTABLISHED (it bites at D2's
    // two-run harness, which must produce a marked collapse-ON 188w run).
    // ---------------------------------------------------------------------------
    it(
        `[${statusOf(G2A_SKIP_REASON)}] G2-A collapse-ON proof: full §6 assertion set against a ` +
        'marker-verified ENABLE_COLLAPSE=true 188w artifact',
        () => {
            if (G2A_SKIP_REASON !== null) return reportNonExecution('G2-A', G2A_SKIP_REASON);
            assertSection6Invariants(loadFinalSave(onRunDir!));
        }
    );

    // ---------------------------------------------------------------------------
    // G2-B (BLOCKING gap, §6 review; gate-packet G2.3) — rupture-timing IDENTITY.
    // §6 requires rupture timing MUST NOT change, not merely >= 160. Compares the
    // latest collapse-ON artifact against the latest collapse-OFF artifact.
    // recorded_turn identity ⇒ first-RS-turn identity (see header note: the rupture
    // records on the FIRST turn >= 160 with controller === 'RS', and both runs assert
    // recorded_turn >= 160 above, so no earlier flip can hide in the receipt window.
    // ---------------------------------------------------------------------------
    it(
        `[${pairStatusOf(G2B_SKIP_REASON)}] G2-B rupture-timing identity: srebrenica_genocide_1995 recorded_turn + ` +
        'first-RS-turn + fall-event timing IDENTICAL collapse-ON vs collapse-OFF',
        () => {
            // A BAD pair is a hard failure here, at the case — never at module scope, which
            // would take the derivation pins down with it, and never a skip, which would make
            // a confound indistinguishable from "no runs yet".
            assertS6PairComparable(selection);
            if (G2B_SKIP_REASON !== null) return reportNonExecution('G2-B', G2B_SKIP_REASON);
            // pairOnRunDir, NOT onRunDir — the differential reads the comparability-validated pair.
            const onSave = loadFinalSave(pairOnRunDir!);
            const offSave = loadFinalSave(offRunDir!);

            // Both runs must have the enclave RS-held at Dayton.
            expect(politicalControllers(onSave)['op:srebrenica:srebrenica_2']).toBe('RS');
            expect(politicalControllers(offSave)['op:srebrenica:srebrenica_2']).toBe('RS');

            // Rupture recorded in BOTH, at an IDENTICAL turn (gate-packet G2.3).
            const onGenocide = ruptureConsequences(onSave).find(r => r.id === 'srebrenica_genocide_1995');
            const offGenocide = ruptureConsequences(offSave).find(r => r.id === 'srebrenica_genocide_1995');
            expect(onGenocide, 'collapse-ON run must record the rupture').toBeDefined();
            expect(offGenocide, 'collapse-OFF run must record the rupture').toBeDefined();
            expect(onGenocide!.recorded_turn).toBeGreaterThanOrEqual(160);
            expect(
                onGenocide!.recorded_turn,
                'rupture recorded_turn must be IDENTICAL collapse-ON vs collapse-OFF (§6: timing must not change)'
            ).toBe(offGenocide!.recorded_turn);

            // First-RS-turn identity, belt-and-braces: the scripted fall events are the
            // control-flip writers — their fired turns must be identical; and the rupture
            // trigger inputs (event flags) must match (gate-packet G2.3 trigger inputs).
            const onFired = eventLastFiredTurn(onSave);
            const offFired = eventLastFiredTurn(offSave);
            expect(
                onFired['srebrenica_falls_1995'],
                'srebrenica_falls_1995 fired turn must be IDENTICAL ON vs OFF'
            ).toEqual(offFired['srebrenica_falls_1995']);
            expect(
                onFired['zepa_falls_1995'],
                'zepa_falls_1995 fired turn must be IDENTICAL ON vs OFF'
            ).toEqual(offFired['zepa_falls_1995']);

            const onFlags = eventFlags(onSave);
            const offFlags = eventFlags(offSave);
            expect(onFlags['srebrenica_enclave_formed']).toEqual(offFlags['srebrenica_enclave_formed']);
            expect(onFlags['srebrenica_fell']).toEqual(offFlags['srebrenica_fell']);
        }
    );

    // ---------------------------------------------------------------------------
    // §6 EXECUTION RECEIPT (RC defect 8) — replaces the old always-green
    // `expect(true).toBe(true)` marker, which recorded that G2 EXISTS while saying
    // nothing about whether any of it RAN. The receipt is in this test's own name, so
    // every invocation of the suite prints which §6 cases executed and which did not.
    // ---------------------------------------------------------------------------
    it(`§6 execution receipt — ${S6_RECEIPT} (strict=${REQUIRE_S6_EXECUTION})`, () => {
        // Selection provenance, so the receipt says WHICH artifacts were used.
        // Built ONCE and asserted on below — the assertion must read the string that is
        // actually emitted, not a re-derivation of it, or it proves nothing about the receipt.
        const receipt =
            `[§6 G2] receipt: ${S6_RECEIPT} | candidates=${selection.counts.total} ` +
            `collapse_on=${selection.counts.marked} collapse_off=${selection.counts.unmarked} | ` +
            `sentinel=${selection.any ?? '-'} ON=${selection.on ?? '-'} OFF=${selection.off ?? '-'} | ` +
            `pair=${selection.pair === null ? 'NONE' : 'FORMED'} ` +
            `verdict=${selection.pairFailure !== null ? 'INCOMPARABLE' : selection.pairRefusal !== null ? 'REFUSED' : 'OK'} | ` +
            `excluded_override=${selection.excludedOverrideRuns.length}` +
            (selection.excludedOverrideRuns.length > 0 ? ` [${selection.excludedOverrideRuns.join(', ')}]` : '');
        console.warn(receipt);

        /*
         * NEVER EXEMPT, ALWAYS ROUTE INTO AN ASSERTED BUCKET.
         *
         * Excluded override runs must be NAMED in the emitted receipt, not merely counted — a
         * bare count cannot be audited, and an exclusion nobody can see is exactly the silent
         * degradation this module exists to remove. Asserting against `receipt` (the string
         * that was printed) is what makes trimming the receipt go RED instead of quiet; an
         * assertion that rebuilt the substring locally would pass on a gutted receipt.
         */
        expect(receipt, 'the receipt must always disclose the override-exclusion count')
            .toContain(`excluded_override=${selection.excludedOverrideRuns.length}`);
        for (const name of selection.excludedOverrideRuns) {
            expect(receipt, `excluded override run ${name} must be NAMED in the receipt, not just counted`)
                .toContain(name);
        }

        // The receipt must cover every §6 case — a case added without a receipt entry is
        // a case that can go silent again.
        expect(S6_CASES.map(c => c.id)).toEqual(['sentinel', 'G2-A', 'G2-B']);

        // Refusal and failure are mutually exclusive by construction. If both were ever set,
        // the receipt would be reporting one state while a case threw for the other.
        expect(
            selection.pairRefusal !== null && selection.pairFailure !== null,
            'pairRefusal (skip) and pairFailure (red) are mutually exclusive states'
        ).toBe(false);

        if (selection.pairFailure !== null) {
            console.warn(`[§6 G2] INCOMPARABLE PAIR — this is a FAILURE, not a skip:\n${selection.pairFailure}`);
        }

        const notExecuted = S6_CASES.filter(c => c.skipReason !== null);
        for (const c of notExecuted) {
            console.warn(`[§6 G2] NOT EXECUTED — ${c.id}: ${c.skipReason}`);
        }
        expect(
            REQUIRE_S6_EXECUTION && notExecuted.length > 0,
            `§6 cases did not execute [${notExecuted.map(c => c.id).join(', ')}] and ` +
            'AWWV_REQUIRE_S6_EXECUTION=true — panel criterion 3: NO-GO, not a pass.'
        ).toBe(false);
    });
});
