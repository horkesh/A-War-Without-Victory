/**
 * §6 acceptance criteria 4 and 7 — enclave OUTCOME invariants (RC collapse panel, 2026-08-13).
 *
 * Panel record: docs/40_reports/20260813_RC_COLLAPSE_PANEL_FROZEN_ARTIFACT.md (§SEAT 1,
 * "SET A"/"SET B"/"the 9 blocking criteria") and the reconciler synthesis alongside it.
 *
 * WHAT GAP THESE CLOSE
 * --------------------
 * The §6 enclave guard is STRUCTURAL for FIELDS and only CONTINGENT for OUTCOMES.
 * `isPhase3DEnclaveGuarded` is a pure static OSID-space predicate, so no enclave OSID can
 * ever acquire `collapse_damage` — that half is airtight and
 * `collapse_phase1_g2_section6_invariant.test.ts` already proves it in the writer's own
 * key space.
 *
 * But the guard is OWN-OSID-ONLY. An enclave's RIM is not guarded. The combat consumer
 * went live in PR #398 (`attack_resolution_osid.ts:867`, `defenderPower *=
 * getCollapseDefenderMultiplier(...)`, floor 0.6), so a collapsed rim cell is a WEAKER
 * DEFENDER, can be taken by ordinary combat, and the enclave behind it can be enveloped
 * and severed — with the guard never firing and every field assertion still green.
 *
 * The pre-existing outcome assertion is four enclave capitals. It passes on a hollowed-out
 * enclave: reduce Goražde to `gorazde_2` alone and the capital check still reads RBiH.
 * These two criteria replace "the capital is still ours" with "nothing in the enclave, and
 * nothing holding the enclave up, moved because collapse was switched on."
 *
 * CRITERION 4 — full-keyspace ON-vs-OFF IDENTITY.
 *   `political_controllers` byte-identical between the collapse-ON and collapse-OFF 188w
 *   runs across the whole `getEnclaveDefForOsid` key space (SET A, 84 of 712 OSIDs: all 9
 *   enclaves, `osid_list`s plus expanded Bihać and Sarajevo prefixes).
 *
 *   *** IDENTITY, NEVER "is RBiH-held" — see findControllerDivergences() for why the
 *   literal gate-packet wording already fails at HEAD on 21 of the 84. ***
 *
 * CRITERION 7 — enclave-rim regression, plus a NAMED-CHAIN TOPOLOGICAL assertion.
 *   (a) No cell that is RBiH-held in the collapse-OFF baseline and within the 1-ring of
 *       Goražde / Bihać / Teočak / the Sarajevo core (SET B, 43 cells) may be newly lost
 *       in the collapse-ON run.
 *   (b) 1-ring alone is NOT sufficient, and this was CHECKED, not assumed: the Teočak
 *       corridor can be severed at depth 2 while `rastosnica_2` — the only 1-ring cell on
 *       the chain — stays RBiH. So Teočak must remain in the same BFS-connected RBiH
 *       component as Tuzla in the ON run whenever it was in the OFF run.
 *   (c) The 2-ring (110 cells) is DIAGNOSTIC ONLY, reported and never asserted. Blocking
 *       at depth 2 everywhere pulls in most of central Bosnia; the false positives would
 *       get the criterion waived rather than fixed.
 *
 * DERIVED, NOT HARDCODED. `ENCLAVE_DEFINITIONS` already has three replicas and the UI one
 * has drifted. Both key sets come out of the live G1 predicate plus the contact graph at
 * test time — see tests/_helpers/s6_enclave_keyspace.ts. The panel's 84 / 43 are asserted
 * as sanity pins ON THE DERIVATION, which is a different thing from being the data.
 *
 * THESE CANNOT PASS TODAY, AND THEY SAY SO OUT LOUD. The marker-verified ON/OFF pair does
 * not exist yet (95 full-length 188w run dirs in `runs/`, ZERO carrying
 * `collapse_enabled.json`); Stage 2 produces it. Non-execution is written into each test's
 * own NAME, warned on stderr, listed in the receipt, and is a HARD FAILURE under
 * `AWWV_REQUIRE_S6_EXECUTION=true` — the same contract the §6 G2 suite uses, and the exact
 * opposite of the `it.skipIf` defect that let G2-A/G2-B vanish out of a green suite.
 * Panel criterion 2's own wording: if the pair does not exist, criteria 4 and 7 are
 * NO-GO, not skip.
 *
 * BASELINE SOURCE. Control is read from the OFF run's own `final_save.json`.
 * `data/derived/latest_run_final_save.json` is NOT used: the seat used it as a
 * set-SHAPING proxy and explicitly disowned it as a baseline — its commit is unknown and
 * its relation to the calibration floor is unverified.
 *
 * DISCRIMINATING POWER. Every assertion here has a paired negative test below that feeds
 * it a fabricated divergence and requires it to report the violation. The depth-2 corridor
 * case is the one that matters: it is precisely what a 1-ring check misses. This repo has
 * shipped vacuous guards twice; a guard nobody watched fail is not a guard.
 *
 * LIVENESS COUNTS. A loop over an empty key set is indistinguishable from a loop that found
 * no violations, and both report green. That is the live shape of the §6 G2 suite right now:
 * its three full-keyspace loops iterate ZERO times against a `collapse_damage.by_entity`
 * holding 0 keys, its ten per-OSID `toBeUndefined()` pins pass on empty maps, and the receipt
 * still reads `sentinel=EXECUTED`. Disclosed in that suite's header, but the receipt reads
 * far stronger than what ran. So here every criterion asserts HOW MANY keys it actually
 * resolved before it asserts that it found nothing wrong, criterion 7a additionally requires
 * a non-empty RBiH-held baseline subset (or it cannot bite), criterion 7b treats a vacuous
 * corridor as a strict-mode failure, and the resolved counts appear in the test names and the
 * receipt as `EXECUTED(keys=84)`. A measured 188w artifact carries all 712 universe OSIDs in
 * `political_controllers` with no extras, so full resolution is the correct expectation.
 *
 * Determinism: reads persisted artifacts + pure set/graph helpers. No RNG, no wall-clock,
 * no filesystem metadata anywhere in artifact selection (that rule and the defect behind
 * it live in tests/_helpers/s6_run_selection.ts).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { strictCompare } from '../src/state/validateGameState.js';
import {
    assertS6PairComparable,
    resolveS6EvidenceRoot,
    scanS6RunCandidates,
    selectS6RunDirs,
} from './_helpers/s6_run_selection.js';
import {
    MUST_HOLD_ENCLAVE_IDS,
    TEOCAK_OSID,
    TUZLA_OSID,
    countResolved,
    deriveEnclaveKeySpace,
    deriveEnclaveRim,
    findControllerDivergences,
    findNewlyLostCells,
    formatDivergences,
    heldComponent,
    loadOperationalGraph,
    sameHeldComponent,
    type ControllerMap,
} from './_helpers/s6_enclave_keyspace.js';

const BASE_DIR = process.cwd();
const RUNS_DIR = resolveS6EvidenceRoot(process.env, BASE_DIR)
    ?? join(BASE_DIR, 'tests', 'fixtures', '__s6_evidence_not_configured__');

/** Same contract as the §6 G2 suite: a §6 case that does not execute is a hard failure. */
const REQUIRE_S6_EXECUTION = process.env.AWWV_REQUIRE_S6_EXECUTION === 'true';

// ── Static derivation (no artifacts needed; always runs) ────────────────────
const graph = loadOperationalGraph(BASE_DIR);
const keySpace = deriveEnclaveKeySpace(graph);
const rim = deriveEnclaveRim(graph, keySpace, MUST_HOLD_ENCLAVE_IDS);

/**
 * Panel sanity pins. Not the data — assertions ABOUT the derivation. A legitimate enclave
 * geometry change turns these red and asks to be re-blessed with a fresh panel count,
 * which is the intended failure mode.
 */
const PANEL_UNIVERSE_SIZE = 712;
const PANEL_SET_A_SIZE = 84;
const PANEL_SET_A_BY_ENCLAVE: ReadonlyArray<readonly [string, number]> = [
    ['bihac_pocket', 30], ['gorazde', 16], ['kiseljak', 6], ['lasva_valley', 8],
    ['sarajevo', 8], ['srebrenica', 11], ['teocak', 1], ['zepa', 1], ['zepce', 3],
];
const PANEL_SET_B_SIZE = 43;
const PANEL_SET_B_BY_ENCLAVE: ReadonlyArray<readonly [string, number]> = [
    ['bihac_pocket', 11], ['gorazde', 12], ['sarajevo', 14], ['teocak', 6],
];
const PANEL_RING2_SIZE = 110;
/**
 * Defect D2 — in ENCLAVE_DEFINITIONS, absent from the 712-OSID universe.
 *
 * *** TO THE D2 LANE: THIS PIN WILL GO RED WHEN YOU FIX D2. THAT IS NOT A REGRESSION. ***
 * Fixing D2 — whether by adding the two OSIDs to the universe or by removing them from
 * `ENCLAVE_DEFINITIONS` — makes `deriveEnclaveKeySpace().deadKeys` empty while this pin
 * still expects both keys. Update the pin to `[]` in the same change; that is the pin
 * doing its job, which is to make the defect impossible to fix silently.
 *
 * SET A stays 84 either way: dead keys never resolved in the universe, so they were never
 * counted. Only this assertion moves, and criterion 4's coverage is unaffected.
 */
const PANEL_DEAD_KEYS: readonly string[] = ['op:gorazde:novakovici', 'op:gorazde:zorlaci'];

// ── Artifact selection — deterministic, name-based, no mtime ────────────────
const selection = selectS6RunDirs(scanS6RunCandidates(RUNS_DIR));
/**
 * COMPARABILITY, not just selection (ledger 2026-08-17). Every criterion in this file is a
 * DIFFERENTIAL — it reads meaning out of ON-vs-OFF — so it is worthless unless the two runs
 * consumed the same inputs. `selection.pair` is the comparability-validated pair;
 * `selection.on`/`.off` are the raw partition winners and must NOT be used here. Reading
 * those two is exactly what produced the n222/n223 verdict: 33 differing cells attributed
 * wholly to the collapse flag by this file and wholly to an OOB change by the ledger.
 */
const onRunDir = selection.pair === null ? null : join(RUNS_DIR, selection.pair.on);
const offRunDir = selection.pair === null ? null : join(RUNS_DIR, selection.pair.off);

if (selection.pairWarnings.length > 0) {
    console.warn(`[§6 C4/C7] pair is comparable with caveats: ${selection.pairWarnings.join('; ')}`);
}

/**
 * ★ SKIPPED and INCOMPARABLE are DIFFERENT STATES. SKIPPED is benign — the runs predate the
 * stamp, or one side does not exist. INCOMPARABLE means a pair exists and it is BAD, which
 * is a hard FAILURE: if a confounded pair degraded to SKIPPED it would be indistinguishable
 * from "no runs yet", and n222/n223 would have vanished into a skip instead of surfacing.
 */
const PAIR_SKIP_REASON = selection.pair !== null || selection.pairFailure !== null
    ? null
    : `no COMPARABLE collapse-ON/OFF 188w artifact pair — ${selection.pairRefusal ?? 'unknown'} `
      + `(${selection.counts.total} full-length candidates, ${selection.counts.marked} collapse-ON, `
      + `${selection.counts.unmarked} collapse-OFF) — Stage 2 must produce it; `
      + 'panel criterion 2: criteria 4 and 7 are NO-GO, not skip';

/** THREE-state status: every case in this file is a differential. */
function statusOf(skipReason: string | null): string {
    if (selection.pairFailure !== null) return 'INCOMPARABLE';
    return skipReason === null ? 'EXECUTED' : 'SKIPPED';
}

/**
 * Each case carries a LIVENESS figure into the receipt. `EXECUTED` alone reads far stronger
 * than what may actually have run — the §6 G2 receipt says `sentinel=EXECUTED` for a case
 * whose three full-keyspace loops iterate zero times. A reader of a green run must be able
 * to see HOW MUCH was checked without opening the file.
 */
const S6_CASES: ReadonlyArray<{ id: string; skipReason: string | null; liveness: string }> = [
    { id: 'C4-keyspace-identity', skipReason: PAIR_SKIP_REASON, liveness: `keys=${keySpace.guarded.length}` },
    { id: 'C7-rim-regression', skipReason: PAIR_SKIP_REASON, liveness: `rim=${rim.ring1.length}` },
    { id: 'C7-teocak-corridor', skipReason: PAIR_SKIP_REASON, liveness: 'chain=teocak→tuzla' },
];
const S6_RECEIPT = S6_CASES.map(c => `${c.id}=${statusOf(c.skipReason)}(${c.liveness})`).join(' ');

/** A case that could not run reports itself rather than vanishing. */
function reportNonExecution(caseId: string, skipReason: string): void {
    console.warn(`[§6 C4/C7] ${caseId} DID NOT EXECUTE — ${skipReason}`);
    expect(
        REQUIRE_S6_EXECUTION,
        `§6 ${caseId} DID NOT EXECUTE and AWWV_REQUIRE_S6_EXECUTION=true: ${skipReason}. `
        + 'Panel criterion 3 — a skipped §6 case is a NO-GO, not a pass.'
    ).toBe(false);
}

function loadControllers(runDir: string): ControllerMap {
    const save = JSON.parse(readFileSync(join(runDir, 'final_save.json'), 'utf8')) as Record<string, unknown>;
    const political = (save.political
        ?? (save.state as { political?: Record<string, unknown> } | undefined)?.political
        ?? {}) as Record<string, unknown>;
    return (political.political_controllers as ControllerMap | undefined) ?? {};
}

describe('§6 criteria 4 + 7 — enclave key-space identity and rim regression', () => {

    /**
     * SEAM PIN (2026-08-17) — the differential cases must read the COMPARABILITY-VALIDATED
     * pair, not the raw partition winners.
     *
     * Every criterion in this file is ON-vs-OFF. `selection.on`/`selection.off` answer "which
     * marked and unmarked run is newest", which is not "which two runs are comparable" — the
     * n222/n223 pair satisfied the former and failed the latter, and 33 cells were attributed
     * to opposite causes by two readers. This binds the dirs the cases open to
     * `selection.pair`, so a caller that reverts to the partition winners fails here rather
     * than quietly producing an unattributable verdict.
     */
    it('SEAM: criteria 4/7 read selection.pair, not selection.on/selection.off', () => {
        expect(onRunDir, 'ON dir must be selection.pair.on').toBe(
            selection.pair === null ? null : join(RUNS_DIR, selection.pair.on)
        );
        expect(offRunDir, 'OFF dir must be selection.pair.off').toBe(
            selection.pair === null ? null : join(RUNS_DIR, selection.pair.off)
        );
        if (selection.pair === null) {
            expect(onRunDir).toBeNull();
            expect(offRunDir).toBeNull();
            // Exactly one of the two no-verdict states must be set, and they mean different
            // things: REFUSED skips, INCOMPARABLE reds.
            expect(
                (selection.pairRefusal === null) !== (selection.pairFailure === null),
                'exactly one of pairRefusal (skip) / pairFailure (red) must explain a null pair'
            ).toBe(true);
            if (selection.pairFailure === null) {
                expect(PAIR_SKIP_REASON, 'a REFUSED pair must skip every differential case').not.toBeNull();
            } else {
                expect(PAIR_SKIP_REASON, 'an INCOMPARABLE pair must NOT skip — it must fail').toBeNull();
            }
        } else {
            expect(PAIR_SKIP_REASON).toBeNull();
            expect(selection.pairFailure).toBeNull();
        }
    });

    // ── Derivation pins (always run; no artifacts required) ─────────────────

    it('SET A derives from the live G1 predicate to the panel key space (84 of 712)', () => {
        expect(graph.osids.length, 'operational universe size').toBe(PANEL_UNIVERSE_SIZE);
        expect(
            keySpace.guarded.length,
            `SET A must be the panel's ${PANEL_SET_A_SIZE}-OSID guarded key space. If enclave `
            + 'geometry legitimately changed, re-bless this pin with a fresh panel count — do not '
            + 'widen the pin to match a shrunken key space.'
        ).toBe(PANEL_SET_A_SIZE);
        expect([...keySpace.byEnclave].map(([id, members]) => [id, members.length]))
            .toEqual(PANEL_SET_A_BY_ENCLAVE.map(([id, n]) => [id, n]));

        // Defect D2, pinned so it stays visible: two Goražde keys resolve to nothing.
        expect(keySpace.deadKeys, 'ENCLAVE_DEFINITIONS keys absent from the OSID universe (defect D2)')
            .toEqual(PANEL_DEAD_KEYS);
    });

    it('SET B derives to the panel enclave rim (43 unguarded 1-ring cells), and excludes guarded cells', () => {
        expect(rim.ring1.length, `enclave rim must be the panel's ${PANEL_SET_B_SIZE} cells`).toBe(PANEL_SET_B_SIZE);
        expect([...rim.ring1ByEnclave].map(([id, cells]) => [id, cells.length]))
            .toEqual(PANEL_SET_B_BY_ENCLAVE.map(([id, n]) => [id, n]));

        // The rim is the UNGUARDED neighbourhood by construction — a guarded cell leaking
        // into it would make criterion 7 overlap criterion 4 and hide a real rim loss.
        for (const osid of rim.ring1) {
            expect(keySpace.guardedSet.has(osid), `rim cell ${osid} must not be guarded`).toBe(false);
        }

        // The corridor cell criterion 7 exists for must actually be in the set.
        expect(
            rim.ring1.includes('op:zvornik:rastosnica_2'),
            'op:zvornik:rastosnica_2 — THE corridor attaching Teočak to 2nd Corps/Tuzla — must be in the rim'
        ).toBe(true);

        // 2-ring: diagnostic only. Pinned for drift visibility, never used to block.
        expect(rim.ring2.length, '2-ring diagnostic size').toBe(PANEL_RING2_SIZE);
    });

    // ── CRITERION 4 ─────────────────────────────────────────────────────────

    it(
        `[${statusOf(PAIR_SKIP_REASON)}(keys=${keySpace.guarded.length})] criterion 4: political_controllers `
        + 'IDENTICAL collapse-ON vs collapse-OFF across the full 84-OSID enclave key space',
        () => {
            // A BAD pair is a hard failure here, at the case — never at module scope (it would take
            // the derivation pins down too) and never a skip (a confound must not look like "no runs").
            assertS6PairComparable(selection);
            if (PAIR_SKIP_REASON !== null) return reportNonExecution('C4-keyspace-identity', PAIR_SKIP_REASON);
            const off = loadControllers(offRunDir!);
            const on = loadControllers(onRunDir!);

            // LIVENESS FIRST. Identity over two empty maps compares undefined to undefined 84
            // times and reports zero divergences — a green that asserted nothing. Assert how
            // much was actually examined BEFORE trusting that nothing was found.
            const resolvedOff = countResolved(keySpace.guarded, off);
            const resolvedOn = countResolved(keySpace.guarded, on);
            expect(
                resolvedOff,
                `only ${resolvedOff} of ${keySpace.guarded.length} enclave OSIDs resolve in the collapse-OFF `
                + 'political_controllers map — criterion 4 would compare undefined against undefined and pass '
                + 'vacuously. Empty map, wrong field path, or a key space that has drifted off the data.'
            ).toBe(keySpace.guarded.length);
            expect(
                resolvedOn,
                `only ${resolvedOn} of ${keySpace.guarded.length} enclave OSIDs resolve in the collapse-ON map`
            ).toBe(keySpace.guarded.length);

            // Dead keys are compared too — free, and it means a key that becomes live later
            // is covered without anyone remembering to add it.
            const keys = [...keySpace.guarded, ...keySpace.deadKeys];
            const divergences = findControllerDivergences(keys, off, on);
            console.warn(
                `[§6 C4/C7] criterion 4 LIVENESS: compared ${keys.length} keys `
                + `(${keySpace.guarded.length} live + ${keySpace.deadKeys.length} dead), `
                + `${resolvedOff} resolved OFF / ${resolvedOn} resolved ON, ${divergences.length} divergent`
            );
            expect(
                divergences.length,
                `${divergences.length} enclave OSID(s) changed hands because collapse was switched ON — `
                + `§6 outcome breach: ${formatDivergences(divergences)}`
            ).toBe(0);
        }
    );

    // ── CRITERION 7 (a): rim regression ─────────────────────────────────────

    it(
        `[${statusOf(PAIR_SKIP_REASON)}(rim=${rim.ring1.length})] criterion 7a: no OFF-baseline RBiH-held `
        + 'enclave-rim cell is newly lost in the collapse-ON run',
        () => {
            // A BAD pair is a hard failure here, at the case — never at module scope (it would take
            // the derivation pins down too) and never a skip (a confound must not look like "no runs").
            assertS6PairComparable(selection);
            if (PAIR_SKIP_REASON !== null) return reportNonExecution('C7-rim-regression', PAIR_SKIP_REASON);
            const off = loadControllers(offRunDir!);
            const on = loadControllers(onRunDir!);

            // LIVENESS 1 — the rim itself must be the derived set, not an empty one.
            expect(rim.ring1.length, 'enclave rim must be non-empty').toBe(PANEL_SET_B_SIZE);
            const resolvedRim = countResolved(rim.ring1, off);
            expect(
                resolvedRim,
                `only ${resolvedRim} of ${rim.ring1.length} rim cells resolve in the collapse-OFF map — `
                + 'criterion 7a would examine nothing and pass vacuously'
            ).toBe(rim.ring1.length);

            // LIVENESS 2 — the criterion can only bite on cells the baseline actually holds.
            // Zero RBiH-held rim cells means no envelopment is expressible and the criterion
            // is inert, which must surface as a failure rather than as silence.
            const baselineHeld = rim.ring1.filter(osid => off[osid] === 'RBiH');
            expect(
                baselineHeld.length,
                'ZERO rim cells are RBiH-held in the collapse-OFF baseline — criterion 7a cannot bite. '
                + 'Either the baseline is not a real 188w control map or the rim derivation has drifted '
                + 'off the enclaves it is supposed to surround.'
            ).toBeGreaterThan(0);

            // The exact count is reported, deliberately NOT pinned: which rim cells RBiH holds
            // is a property of the OFF ARTIFACT, not of the geometry. The panel's 17 came from
            // a disowned proxy; pinning it would make criterion 7 fail for the wrong reason.
            console.warn(
                `[§6 C4/C7] criterion 7a LIVENESS: ${resolvedRim}/${rim.ring1.length} rim cells resolved, `
                + `${baselineHeld.length} RBiH-held in OFF `
                + `| 2-ring DIAGNOSTIC: ${rim.ring2.filter(o => off[o] === 'RBiH').length} of ${rim.ring2.length} RBiH-held, `
                + `${findNewlyLostCells(rim.ring2, off, on, 'RBiH').length} newly lost at depth<=2 (NOT asserted)`
            );

            const lost = findNewlyLostCells(rim.ring1, off, on, 'RBiH');
            expect(
                lost.length,
                `${lost.length} enclave-rim cell(s) held by RBiH in the collapse-OFF baseline were lost in the `
                + `collapse-ON run — envelopment vector, §6 outcome breach: ${formatDivergences(lost)}`
            ).toBe(0);
        }
    );

    // ── CRITERION 7 (b): named-chain topological assertion ──────────────────

    it(
        `[${statusOf(PAIR_SKIP_REASON)}(chain=teocak→tuzla)] criterion 7b: Teočak stays in the same RBiH-held `
        + 'component as Tuzla (corridor severable at depth 2, where the 1-ring is blind)',
        () => {
            // A BAD pair is a hard failure here, at the case — never at module scope (it would take
            // the derivation pins down too) and never a skip (a confound must not look like "no runs").
            assertS6PairComparable(selection);
            if (PAIR_SKIP_REASON !== null) return reportNonExecution('C7-teocak-corridor', PAIR_SKIP_REASON);
            const off = loadControllers(offRunDir!);
            const on = loadControllers(onRunDir!);

            // LIVENESS — resolve both endpoints before trusting any component arithmetic. A
            // map missing them yields two empty components and a silent "not attached".
            const resolvedEndpoints = countResolved([TEOCAK_OSID, TUZLA_OSID], off);
            expect(
                resolvedEndpoints,
                `${TEOCAK_OSID} / ${TUZLA_OSID} do not both resolve in the collapse-OFF map — the corridor `
                + 'assertion would operate on empty components'
            ).toBe(2);

            const offComponent = heldComponent(graph, TEOCAK_OSID, off, 'RBiH');
            const attachedOff = offComponent.has(TUZLA_OSID);
            console.warn(
                `[§6 C4/C7] criterion 7b LIVENESS: Teočak's RBiH component in OFF = ${offComponent.size} OSIDs, `
                + `Tuzla attached=${attachedOff}`
            );
            if (!attachedOff) {
                // Conditional by design: if the baseline itself has Teočak detached, collapse
                // did not do it, and asserting attachment would blame the wrong change. But a
                // criterion that cannot bite is not evidence — under strict mode this is a
                // failure, exactly like a case that did not execute.
                const reason = `${TEOCAK_OSID} is NOT in ${TUZLA_OSID}'s RBiH component in the collapse-OFF `
                    + `baseline either (component size ${offComponent.size}), so the corridor assertion is `
                    + 'VACUOUS this run. Not a collapse regression — the corridor is already cut in the '
                    + 'baseline, which is its own finding.';
                console.warn(`[§6 C4/C7] criterion 7b VACUOUS THIS RUN — ${reason}`);
                expect(
                    REQUIRE_S6_EXECUTION,
                    `§6 C7-teocak-corridor is VACUOUS and AWWV_REQUIRE_S6_EXECUTION=true: ${reason} `
                    + 'A criterion that cannot bite is not §6 evidence.'
                ).toBe(false);
                return;
            }
            const attachedOn = sameHeldComponent(graph, TEOCAK_OSID, TUZLA_OSID, on, 'RBiH');
            expect(
                attachedOn,
                `${TEOCAK_OSID} is attached to ${TUZLA_OSID} through the RBiH landmass in the collapse-OFF `
                + 'baseline but SEVERED in the collapse-ON run. The corridor is '
                + 'rastosnica_2 → kalesija → tuzla; it can be cut at depth 2 while rastosnica_2 itself stays '
                + 'RBiH, so criterion 7a sees nothing. Teočak becomes a genuinely isolated enclave and '
                + '"Teočak HOLDS" breaks without a single guarded OSID acquiring collapse_damage.'
            ).toBe(true);
        }
    );

    // ── Discriminating power — every assertion above, watched failing ───────
    //
    // These run unconditionally against FABRICATED control maps, so the guards are proven
    // non-vacuous on every invocation rather than once, by hand, at authoring time.

    describe('discriminating power (fabricated fixtures — each assertion must reject)', () => {

        /** A synthetic baseline where every universe OSID is RBiH-held. */
        function allRbih(): Record<string, string> {
            const map: Record<string, string> = {};
            for (const osid of graph.osids) map[osid] = 'RBiH';
            return map;
        }

        it('criterion 4 REJECTS a single enclave OSID flipping between ON and OFF', () => {
            const off = allRbih();
            const on = { ...off, 'op:gorazde:gorazde_2': 'RS' };
            const divergences = findControllerDivergences(keySpace.guarded, off, on);
            expect(divergences).toEqual([{ osid: 'op:gorazde:gorazde_2', off: 'RBiH', on: 'RS' }]);
        });

        it('criterion 4 REJECTS a key disappearing from the ON map (absent !== null !== value)', () => {
            // NOTE the Sarajevo key: the enclave's LOGICAL capital
            // 'op:centar_sarajevo:centar_sarajevo' is not a painted OSID and is not a node in
            // the 712 universe, so it is correctly absent from SET A. The painted core cell is.
            const off = allRbih();
            const on: Record<string, string | null> = { ...off };
            delete on['op:bihac:bihac_2'];
            on['op:centar_sarajevo:sarajevo_dio_centar_sajarevo'] = null;
            expect(findControllerDivergences(keySpace.guarded, off, on).map(d => d.osid))
                .toEqual(['op:bihac:bihac_2', 'op:centar_sarajevo:sarajevo_dio_centar_sajarevo']);
        });

        it('criterion 4 does NOT fire on the 21 guarded OSIDs that are not held by their enclave faction', () => {
            // The trap, encoded: Srebrenica fell, Žepa fell, Lukavica is the SRK's HQ. An
            // absolute "is RBiH-held" check fails on all of them at HEAD. Identity does not.
            const off: Record<string, string> = {};
            for (const osid of keySpace.guarded) off[osid] = 'RS';
            expect(findControllerDivergences(keySpace.guarded, off, { ...off })).toEqual([]);
        });

        it('criterion 7a REJECTS an RBiH-held rim cell being newly lost', () => {
            const off = allRbih();
            const on = { ...off, 'op:zvornik:rastosnica_2': 'RS' };
            expect(findNewlyLostCells(rim.ring1, off, on, 'RBiH'))
                .toEqual([{ osid: 'op:zvornik:rastosnica_2', off: 'RBiH', on: 'RS' }]);
        });

        it('criterion 7a does NOT fire on a rim cell the baseline never held, nor on a rim cell GAINED', () => {
            const off = allRbih();
            off['op:zvornik:rastosnica_2'] = 'RS';   // never ours → losing it is not a regression
            const on = { ...off };
            on['op:zvornik:sapna'] = 'RBiH';          // gained under ON → not a §6 concern
            expect(findNewlyLostCells(rim.ring1, off, { ...on, 'op:zvornik:rastosnica_2': 'RS' }, 'RBiH')).toEqual([]);
        });

        /**
         * THE CASE THAT MATTERS. Cut the corridor at DEPTH 2 and leave `rastosnica_2`
         * RBiH-held. Criterion 7a must stay silent — it is blind here, by construction —
         * and criterion 7b must catch it. If 7a fired, the depth-2 cut would be a 1-ring
         * problem and 7b would be redundant; the point is that it is not.
         */
        /**
         * The Sapna-salient baseline. An all-RBiH map is the WRONG fixture here and saying
         * why is the point of the comment: with every cell RBiH the graph offers Teočak a
         * second route through `op:lopare:lopare_selo_2`, which is RS in every real baseline.
         * The corridor is only a corridor because its flanks are held by the besieger.
         *
         * So the fixture is the salient as it actually stands: the four cells that survive on
         * the Teočak side of a cut, the named chain, and Tuzla. Structurally faithful — under
         * this fixture the depth-2 cut leaves exactly the same 4-cell residue
         * (teocak_krstac_2, rastosnica_2, jasikovac, srednja_trnova_2) that it produces on a
         * measured 188w control map, where the component falls from 248 OSIDs to those 4.
         */
        const SALIENT_BASELINE_RBIH: readonly string[] = [
            'op:ugljevik:teocak_krstac_2', 'op:ugljevik:jasikovac', 'op:ugljevik:srednja_trnova_2',
            'op:zvornik:rastosnica_2',
            'op:kalesija:kalesija_grad_2', 'op:kalesija:kalesija_selo', 'op:kalesija:kikaci',
            'op:zvornik:sapna',
            'op:tuzla:gornja_tuzla', 'op:tuzla:simin_han_2', 'op:tuzla:tuzla_2',
        ];
        /** All RBiH, all unguarded, all at depth 2 from the enclave — invisible to the 1-ring. */
        const DEPTH_2_CUT: readonly string[] = [
            'op:kalesija:kalesija_grad_2', 'op:kalesija:kalesija_selo', 'op:kalesija:kikaci',
            'op:zvornik:sapna', 'op:tuzla:gornja_tuzla', 'op:tuzla:simin_han_2',
        ];

        function salientBaseline(): Record<string, string> {
            const map: Record<string, string> = {};
            for (const osid of graph.osids) map[osid] = 'RS';
            for (const osid of SALIENT_BASELINE_RBIH) map[osid] = 'RBiH';
            return map;
        }

        it('criterion 7b CATCHES a depth-2 corridor cut that criterion 7a is blind to', () => {
            const off = salientBaseline();
            const on = { ...off };
            for (const osid of DEPTH_2_CUT) on[osid] = 'RS';

            // `rastosnica_2` — the ONLY corridor cell in the 1-ring — is untouched.
            expect(on['op:zvornik:rastosnica_2']).toBe('RBiH');

            // 7a is blind STRUCTURALLY, not just on this fixture: no cut cell is in the 1-ring
            // of any of the four must-hold enclaves, so no rim assertion can ever see this cut.
            for (const osid of DEPTH_2_CUT) {
                expect(rim.ring1.includes(osid), `${osid} must sit OUTSIDE the 1-ring`).toBe(false);
            }
            expect(
                findNewlyLostCells(rim.ring1, off, on, 'RBiH'),
                'the depth-2 cut must be INVISIBLE to the 1-ring check — that is why 7b exists'
            ).toEqual([]);

            // 7b catches it, and the severed remnant is the expected 4 cells.
            expect(sameHeldComponent(graph, TEOCAK_OSID, TUZLA_OSID, off, 'RBiH')).toBe(true);
            expect(
                sameHeldComponent(graph, TEOCAK_OSID, TUZLA_OSID, on, 'RBiH'),
                'depth-2 cut must sever Teočak from Tuzla'
            ).toBe(false);
            expect([...heldComponent(graph, TEOCAK_OSID, on, 'RBiH')].sort(strictCompare)).toEqual([
                'op:ugljevik:jasikovac', 'op:ugljevik:srednja_trnova_2', 'op:ugljevik:teocak_krstac_2',
                'op:zvornik:rastosnica_2',
            ]);
        });

        /**
         * THE VACUITY CLASS, pinned. Every criterion above compares a derived key set against
         * two control maps; if the maps do not resolve those keys, the comparison finds no
         * violations and reports a confident green. That is not hypothetical — it is the live
         * shape of the §6 G2 suite, whose three full-keyspace loops iterate ZERO times against
         * a `collapse_damage.by_entity` holding 0 keys while the receipt still reads EXECUTED.
         *
         * The comparators genuinely cannot tell the two cases apart, and they should not try:
         * that is the CALLER's job, which is why each criterion asserts its resolved count
         * before trusting its violation count. These tests pin both halves of that contract.
         */
        it('LIVENESS: the comparators are BLIND to empty maps — which is why callers assert resolution', () => {
            // Two empty maps: identity holds over all 84 keys, and nothing was examined.
            expect(findControllerDivergences(keySpace.guarded, {}, {})).toEqual([]);
            expect(findNewlyLostCells(rim.ring1, {}, {}, 'RBiH')).toEqual([]);
            // countResolved is what separates "found no violations" from "examined nothing".
            expect(countResolved(keySpace.guarded, {})).toBe(0);
            expect(countResolved(rim.ring1, {})).toBe(0);
            expect(countResolved([TEOCAK_OSID, TUZLA_OSID], {})).toBe(0);
        });

        it('LIVENESS: countResolved reports the FULL set against a fully-populated map', () => {
            const full = allRbih();
            expect(countResolved(keySpace.guarded, full)).toBe(PANEL_SET_A_SIZE);
            expect(countResolved(rim.ring1, full)).toBe(PANEL_SET_B_SIZE);
            expect(countResolved([TEOCAK_OSID, TUZLA_OSID], full)).toBe(2);
            // A partially-populated map is caught too — this is the wrong-field-path signature.
            const partial = { ...full };
            delete partial['op:gorazde:gorazde_2'];
            expect(countResolved(keySpace.guarded, partial)).toBe(PANEL_SET_A_SIZE - 1);
        });

        it('criterion 7b does NOT fire when the corridor is intact but unrelated cells flip', () => {
            const off = salientBaseline();
            const on = { ...off, 'op:banja_luka:banja_luka_2': 'RS', 'op:gorazde:ustipraca_2': 'RS' };
            expect(sameHeldComponent(graph, TEOCAK_OSID, TUZLA_OSID, on, 'RBiH')).toBe(true);
        });

        it('criterion 7b REJECTS the 1-ring cut too (rastosnica_2 itself lost)', () => {
            const off = salientBaseline();
            const on = { ...off, 'op:zvornik:rastosnica_2': 'RS' };
            expect(sameHeldComponent(graph, TEOCAK_OSID, TUZLA_OSID, on, 'RBiH')).toBe(false);
            // ...and this one 7a catches as well, since rastosnica_2 IS in the rim.
            expect(findNewlyLostCells(rim.ring1, off, on, 'RBiH').map(d => d.osid))
                .toEqual(['op:zvornik:rastosnica_2']);
        });
    });

    // ── Receipt ─────────────────────────────────────────────────────────────

    it(`§6 C4/C7 execution receipt — ${S6_RECEIPT} (strict=${REQUIRE_S6_EXECUTION})`, () => {
        // Built ONCE and asserted on below — the assertion must read the emitted string.
        const receipt =
            `[§6 C4/C7] receipt: ${S6_RECEIPT} | candidates=${selection.counts.total} `
            + `collapse_on=${selection.counts.marked} collapse_off=${selection.counts.unmarked} | `
            + `ON=${selection.on ?? '-'} OFF=${selection.off ?? '-'} | `
            + `pair=${selection.pair === null ? 'NONE' : 'FORMED'} `
            + `verdict=${selection.pairFailure !== null ? 'INCOMPARABLE' : selection.pairRefusal !== null ? 'REFUSED' : 'OK'} | `
            + `excluded_override=${selection.excludedOverrideRuns.length}`
            + (selection.excludedOverrideRuns.length > 0 ? ` [${selection.excludedOverrideRuns.join(', ')}]` : '')
            + ` | SET A=${keySpace.guarded.length} SET B=${rim.ring1.length} 2-ring=${rim.ring2.length}`;
        console.warn(receipt);

        // Never exempt, always route into an asserted bucket — see the §6 G2 receipt for the
        // full reasoning. Asserting on the EMITTED string is what makes a trimmed receipt red.
        expect(receipt, 'the receipt must always disclose the override-exclusion count')
            .toContain(`excluded_override=${selection.excludedOverrideRuns.length}`);
        for (const name of selection.excludedOverrideRuns) {
            expect(receipt, `excluded override run ${name} must be NAMED in the receipt, not just counted`)
                .toContain(name);
        }

        // A case added without a receipt entry is a case that can go silent again.
        expect(S6_CASES.map(c => c.id)).toEqual([
            'C4-keyspace-identity', 'C7-rim-regression', 'C7-teocak-corridor',
        ]);

        // Refusal (skip) and failure (red) are mutually exclusive; both set would mean the
        // receipt reports one state while the cases throw for the other.
        expect(
            selection.pairRefusal !== null && selection.pairFailure !== null,
            'pairRefusal (skip) and pairFailure (red) are mutually exclusive states'
        ).toBe(false);

        if (selection.pairFailure !== null) {
            console.warn(`[§6 C4/C7] INCOMPARABLE PAIR — this is a FAILURE, not a skip:\n${selection.pairFailure}`);
        }

        const notExecuted = S6_CASES.filter(c => c.skipReason !== null);
        for (const c of notExecuted) console.warn(`[§6 C4/C7] NOT EXECUTED — ${c.id}: ${c.skipReason}`);
        expect(
            REQUIRE_S6_EXECUTION && notExecuted.length > 0,
            `§6 cases did not execute [${notExecuted.map(c => c.id).join(', ')}] and `
            + 'AWWV_REQUIRE_S6_EXECUTION=true — panel criterion 3: NO-GO, not a pass.'
        ).toBe(false);
    });
});
