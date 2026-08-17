/**
 * OOB t0 spawn completeness — a formation that is present in the OOB catalog and
 * absent from the turn-0 army must not be silent.
 *
 * WHY THIS EXISTS. `hvo_hrvoje_vukcic_brigade` stopped spawning at t0 when
 * `hrhb_102nd_brigade` was re-homed into the same municipality (6ba916fae). The
 * mandatory 102nd draws the shared Odžak HRHB pool first (650 of 1,391), leaving
 * 741 against the row's 800 `manpower_cost`. `recruitment_engine.ts` gates on
 * `pool.available < brigade.manpower_cost` — all-or-nothing, no scaling, no
 * warning — so the row was skipped in silence. Nothing reported it. The only
 * signal was a t0 formation count one lower than expected, and it took a
 * controlled 188-week pair to notice.
 *
 * It was never one row. Running this predicate for the first time found FIVE
 * `available_from: 0` rows missing from t0, and one of them
 * (`rs_2nd_romanija_brigade`) never spawns at any point in a 188-week campaign.
 *
 * WHAT THIS TEST DOES AND DOES NOT CLAIM. Absent at t0 is not the same as
 * deleted. Recruitment re-runs every turn and municipal pools refill, so three
 * of the five recover on turn 1 and a fourth on turn 22. This test asserts only
 * that the t0 gap is ENUMERATED and its cause RE-DERIVED from live data — it is
 * a legibility guard, not a correctness claim about any placement.
 *
 * ANTI-VACUITY (napkin 0h). Three separate mechanisms, because each shape
 * survives the others' checks:
 *   (B) liveness — the candidate and present counts are asserted, so an empty or
 *       truncated catalog fails rather than passing over nothing.
 *   (D) partition by subtraction, never exemption — `unexplained` is derived by
 *       SUBTRACTING the documented set from the observed set, so a new drop
 *       cannot escape by nobody remembering to edit a predicate. The reverse
 *       residual is asserted too, so a stale entry fails instead of lingering.
 *   (reason liveness) — every documented entry must still be able to PROVE its
 *       own cause against the live pool arithmetic. The allowlist cannot decay
 *       into a blanket exemption, because an entry whose stated cause no longer
 *       holds turns the test red.
 *
 * DEPENDENCY, STATED. The t0 army is read from the baked startup artifact
 * `data/derived/startup/apr_1992_initial_save.json`. That artifact's currency is
 * owned by `startup_snapshot_contract.test.ts`; this test additionally
 * cross-checks it by requiring every mandatory `available_from: 0` row to be
 * present, since those force-spawn unconditionally and their absence would mean
 * the artifact was built from a different catalog.
 */

import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { test } from 'vitest';
import { loadOobBrigades } from '../src/scenario/oob_loader.js';
import { militiaPoolKey } from '../src/state/militia_pool_key.js';

const REPO_ROOT = process.cwd();
const STARTUP_SNAPSHOT = path.join(REPO_ROOT, 'data', 'derived', 'startup', 'apr_1992_initial_save.json');

/**
 * Rows known to be absent from the t0 army, each with the cause that must still
 * hold. `pool_below_cost` means the home municipality's militia pool is below the
 * row's `manpower_cost` at t0, so `recruitment_engine.ts` skips it.
 *
 * These are DOCUMENTED, not blessed. Each is an open question about the
 * force economy, not a decision that the drop is correct.
 */
const DOCUMENTED_T0_ABSENCES: ReadonlyArray<{ id: string; cause: 'pool_below_cost'; note: string }> = [
    {
        id: 'hvo_ante_starcevic_brigade',
        cause: 'pool_below_cost',
        note: 'Kiseljak HRHB pool exhausted by earlier draws. Recovers on turn 1 and ends the campaign active.',
    },
    {
        id: 'hvo_hrvoje_vukcic_brigade',
        cause: 'pool_below_cost',
        note:
            'Odžak HRHB pool 1,391; the mandatory hrhb_102nd_brigade re-home draws 650 first, ' +
            'leaving 741 against this row\'s 800 default manpower_cost. Recovers on turn 1 at ' +
            'op:odzak:donja_dubica with its full 1,100 personnel. See T6 in ' +
            'tests/nw_bosnia_oob_correctness.test.ts for why the row carries the Odžak value.',
    },
    {
        id: 'hvo_nikola_subic_zrinski_brigade',
        cause: 'pool_below_cost',
        note: 'Busovača HRHB pool exhausted by earlier draws. Recovers on turn 1 and ends the campaign active.',
    },
    {
        id: 'rs_2nd_herzegovina_light_infantry',
        cause: 'pool_below_cost',
        note: 'Bileća RS pool exhausted by earlier draws. Recovers on turn 22 — twenty weeks late, unexplained.',
    },
    {
        id: 'rs_2nd_romanija_brigade',
        cause: 'pool_below_cost',
        note:
            'Sokolac RS pool 249 against an 800 default manpower_cost. UNLIKE THE OTHERS THIS ROW ' +
            'NEVER SPAWNS — absent from every turn of a 188-week campaign, in the Sarajevo siege ' +
            'ring. This is a real missing formation, not a delayed one, and it is open.',
    },
];

/**
 * The t0 candidate set is every `available_from: 0` brigade row. Floors, not exact
 * counts: the catalog may legitimately grow. A truncated or unloaded catalog
 * cannot satisfy these, so the test cannot pass over an empty comparison.
 */
const MIN_T0_CANDIDATES = 180; // 189 at time of writing
const MIN_T0_PRESENT = 175; // 184 at time of writing

test('t0 spawn completeness: every available_from=0 OOB row is either in the t0 army or enumerated with a live cause', async () => {
    const brigades = await loadOobBrigades(REPO_ROOT);
    const snapshot = JSON.parse(await fs.readFile(STARTUP_SNAPSHOT, 'utf8'));
    const formations: Record<string, unknown> = snapshot?.military?.formations ?? {};
    const pools: Record<string, { available?: number }> = snapshot?.military?.militia_pools ?? {};

    const candidates = brigades.filter(b => b.available_from === 0);
    const missing = candidates.filter(b => formations[b.id] == null);
    const present = candidates.length - missing.length;

    // (B) LIVENESS. Assert how much was compared, not merely that violations were zero.
    assert.ok(
        candidates.length >= MIN_T0_CANDIDATES,
        `only ${candidates.length} available_from=0 OOB rows were examined (expected >= ${MIN_T0_CANDIDATES}). ` +
        'A shrunken candidate set means this guard compared almost nothing — fix the catalog load, ' +
        'do not lower the floor.');
    assert.ok(
        present >= MIN_T0_PRESENT,
        `only ${present} of ${candidates.length} available_from=0 rows are present in the t0 army ` +
        `(expected >= ${MIN_T0_PRESENT}). A large drop means the startup artifact is stale or the ` +
        'recruitment setup pass regressed wholesale.');

    // ARTIFACT CURRENCY. Mandatory turn-0 rows force-spawn unconditionally
    // (recruitment_engine.ts seeds their pool if it is short), so any absence here
    // means the snapshot was baked from a different catalog than the one loaded above.
    const missingMandatory = candidates.filter(b => b.mandatory && formations[b.id] == null).map(b => b.id);
    assert.deepStrictEqual(
        missingMandatory, [],
        'mandatory available_from=0 rows are missing from the baked startup artifact. Mandatory rows ' +
        'force-spawn and seed their own pool, so they cannot legitimately be absent: the artifact is ' +
        'stale relative to data/source/oob_brigades.json. Rebuild it and re-run ' +
        `startup_snapshot_contract. Missing: ${missingMandatory.join(', ')}`);

    // (D) PARTITION BY SUBTRACTION. The residual is derived from the observed set
    // minus the documented set — never by its own predicate — so a row that drops
    // out for a NEW reason cannot escape because nobody edited a filter.
    const documentedIds = new Set(DOCUMENTED_T0_ABSENCES.map(e => e.id));
    const unexplained = missing.filter(b => !documentedIds.has(b.id));
    const detail = (id: string) => {
        const b = candidates.find(x => x.id === id)!;
        const key = militiaPoolKey(b.home_mun, (b.recruit_pool_faction ?? b.faction) as never);
        return `${id} (mun=${b.home_mun}, mandatory=${Boolean(b.mandatory)}, manpower_cost=${b.manpower_cost}, pool[${key}]=${pools[key]?.available ?? 'MISSING'})`;
    };
    assert.deepStrictEqual(
        unexplained.map(b => detail(b.id)), [],
        'an OOB row with available_from=0 is absent from the t0 army and is NOT documented. ' +
        'This is the failure this guard exists for: recruitment_engine.ts skips a row in silence ' +
        'when pool.available < manpower_cost, so the only symptom is a t0 count one lower than ' +
        'expected. Diagnose the cause before adding it to DOCUMENTED_T0_ABSENCES — the pool figures ' +
        'above are printed so the arithmetic is visible without instrumenting a run.');

    // Reverse residual: a documented entry that no longer drops is stale and must
    // be removed, or the list silently accumulates exemptions for solved problems.
    const missingIds = new Set(missing.map(b => b.id));
    const stale = DOCUMENTED_T0_ABSENCES.filter(e => !missingIds.has(e.id)).map(e => e.id);
    assert.deepStrictEqual(
        stale, [],
        'DOCUMENTED_T0_ABSENCES names rows that now spawn at t0. Delete the entries — a documented ' +
        `absence that no longer happens is an exemption waiting to hide the next real one: ${stale.join(', ')}`);

    // REASON LIVENESS. Every documented entry must re-derive its own stated cause
    // from live data. Without this the list is a blanket exemption: an entry could
    // keep suppressing a row that is now dropping for a completely different reason.
    let causesProven = 0;
    for (const entry of DOCUMENTED_T0_ABSENCES) {
        const b = candidates.find(x => x.id === entry.id);
        assert.ok(b, `${entry.id} is documented as a t0 absence but is no longer an available_from=0 OOB row`);
        const key = militiaPoolKey(b.home_mun, (b.recruit_pool_faction ?? b.faction) as never);
        const available = pools[key]?.available ?? 0;
        assert.ok(
            available < b.manpower_cost,
            `${entry.id} is documented with cause "${entry.cause}", but pool[${key}].available=${available} ` +
            `is NOT below manpower_cost=${b.manpower_cost}. The row is still absent from t0, so it is now ` +
            'dropping for a DIFFERENT reason than the one recorded. Find the new cause; do not relabel this one.');
        causesProven++;
    }
    assert.strictEqual(
        causesProven, DOCUMENTED_T0_ABSENCES.length,
        'every documented absence must have proven its cause; a loop that iterated fewer times than the ' +
        'list length has asserted nothing about the remainder');
});
