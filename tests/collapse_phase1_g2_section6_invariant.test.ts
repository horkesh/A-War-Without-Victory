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
import { scanS6RunCandidates, selectS6RunDirs } from './_helpers/s6_run_selection.js';
import type { GameState } from '../src/state/game_state.js';

const RUNS_DIR = join(process.cwd(), 'runs');

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
const offRunDir = selection.off === null ? null : join(RUNS_DIR, selection.off);

/** Why a §6 case cannot run, or null when it can. */
const SENTINEL_SKIP_REASON = runDir !== null
    ? null
    : 'no runs/apr1992_definitive_188w__*__w188* dir carries a final_save.json';
const G2A_SKIP_REASON = onRunDir !== null
    ? null
    : `no full-length 188w run dir carries collapse_enabled.json (${selection.counts.total} candidates, ${selection.counts.marked} marked) — the collapse-ON §6 proof is NOT ESTABLISHED`;
const G2B_SKIP_REASON = onRunDir !== null && offRunDir !== null
    ? null
    : `no marker-verified ON/OFF 188w artifact pair (${selection.counts.marked} marked, ${selection.counts.unmarked} unmarked)`;

function statusOf(skipReason: string | null): string {
    return skipReason === null ? 'EXECUTED' : 'SKIPPED';
}

/** Every §6 case and whether this invocation actually ran it. */
const S6_CASES: ReadonlyArray<{ id: string; skipReason: string | null }> = [
    { id: 'sentinel', skipReason: SENTINEL_SKIP_REASON },
    { id: 'G2-A', skipReason: G2A_SKIP_REASON },
    { id: 'G2-B', skipReason: G2B_SKIP_REASON },
];

const S6_RECEIPT = S6_CASES.map(c => `${c.id}=${statusOf(c.skipReason)}`).join(' ');

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
        `[${statusOf(G2B_SKIP_REASON)}] G2-B rupture-timing identity: srebrenica_genocide_1995 recorded_turn + ` +
        'first-RS-turn + fall-event timing IDENTICAL collapse-ON vs collapse-OFF',
        () => {
            if (G2B_SKIP_REASON !== null) return reportNonExecution('G2-B', G2B_SKIP_REASON);
            const onSave = loadFinalSave(onRunDir!);
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
        console.warn(
            `[§6 G2] receipt: ${S6_RECEIPT} | candidates=${selection.counts.total} ` +
            `marked=${selection.counts.marked} unmarked=${selection.counts.unmarked} | ` +
            `sentinel=${selection.any ?? '-'} ON=${selection.on ?? '-'} OFF=${selection.off ?? '-'}`
        );

        // The receipt must cover every §6 case — a case added without a receipt entry is
        // a case that can go silent again.
        expect(S6_CASES.map(c => c.id)).toEqual(['sentinel', 'G2-A', 'G2-B']);

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
