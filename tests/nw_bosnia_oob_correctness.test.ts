/**
 * NW Bosnia OOB correctness — close BUG-01 (`hvo_northwest_bosnia` 0-brigade
 * shell at t0) via OOB-data alignment.
 *
 * Lane: LANE-NIGHTSHIFT-NW-BOSNIA-OOB-AUDIT.
 *
 * Background: API smoke `bft5bixcj` (Petković Turn 1) found `hvo_northwest_bosnia`
 * declared at t0 with role + stance assigned but 0 brigades / 0 personnel,
 * because corps `available_from=10` and brigades `available_from=2/8`. Q1
 * (`6cbcaa00`) tried to fix this in the engine (defer corps creation until
 * `available_from`); revert at `8ccdbff8` because deferring all 5 HRHB OZ
 * corps to w10 produced -17% RBiH territory loss — Posavina HVO units that
 * historically pinned VRS (BB1 Ch.25 / Annex 28) were now absent.
 *
 * Mini-panel verdict (this lane): **GENUINE-OOB-MISCALIBRATION**.
 *
 * Per BB1 p.181-182:
 *   - Early March 1992: HVO mixed Croat-Muslim forces (using HV weapons)
 *     stop Serb takeover of Bosanski Brod.
 *   - April-May 1992: HVO/HV "pushed JNA out of Bosanski Brod, overran
 *     Modriča and Derventa" — 50,000-troop battles in Posavina, "the most
 *     strategic area of the country."
 *   - Orašje pocket held the entire 1992 corridor campaign — November VRS
 *     offensive failed, "It would be May of 1995 before the VRS would attempt
 *     another assault on Orasje."
 *
 * Therefore at scenario t0 (April 1992), HVO Posavina units WERE operational.
 * `hvo_northwest_bosnia` is a unique HRHB OZ — combat began before formal HZ-HB
 * and OZ structure existed. Other HRHB OZs (Main Staff, Southeast Herzegovina,
 * Central Bosnia, Tomislavgrad) keep `available_from=10` — different formation
 * histories.
 *
 * Fix scope (4 OOB rows):
 *   - `hvo_northwest_bosnia` (corps): 10 → 0
 *   - `hrhb_101st_oraje_brigade`: 2 → 0  (Orašje, survived 1992)
 *   - `hrhb_102nd_brigade`: 8 → 0        (survived 1992)
 *   - `hrhb_106th_bosanska_posavina_brigade`: 8 → 0 (Orašje, survived 1992)
 *
 * Provenance correction after this lane:
 *   - `hvo_hrvoje_vukcic_brigade`: the evidence identifies it as a JAJCE formation
 *     (BB2 Annex 29, PDF p.349/330) under Central Bosnia, and a later OOB
 *     identifies a same-name home-defence regiment in Prozor-Rama; neither
 *     supports the Odžak assignment. THE ROW NONETHELESS CARRIES THE ODŽAK VALUE
 *     ON CALIBRATION GROUNDS — the Jajce placement was implemented, measured in
 *     run n223, and withdrawn because it produced an indestructible attrition sink
 *     (85 defensive battles, 79 lost, 8,932 casualties absorbed, finishing ACTIVE
 *     at 1,440 from a 1,100 start). This is a documented divergence, enforced by
 *     T6 below, not an unexamined error. Read T6's header before touching the row.
 *   - `hrhb_102nd_brigade`: re-homed Orašje → Odžak and glossed "102nd Odžak
 *     Brigade". BB1 PDF p.437 names the six original Orašje Corps District
 *     brigades — "101st Bosanski Brod, 102nd Odzak, 103rd Derventa, 104th
 *     Samac, 105th Modrica, 106th Orasje" — and pp.437-438 record that five of
 *     the six lost their home regions in 1992 and were folded into the
 *     201st/202nd Home Defence Regiments at Orašje in early 1994. The Orašje
 *     home came from the October 1995 OOB (post-consolidation) and is wrong for
 *     an April 1992 start. Removing the Hrvoje row was a NAME correction only;
 *     BB1 p.182 has HV/HVO holding strong positions near Odžak until the town
 *     fell on 12 July 1992, so Odžak must open with an HVO defender (T8).
 * Out of scope (kept as-is):
 *   - `hrhb_103rd_derventa_brigade`, `hrhb_104th_bosanski_brod_brigade`,
 *     and `hrhb_105th_modrica_brigade`: corrected to `available_from=0`.
 *     BB1 pp. 181-182 places the HVO/HV Posavina force in combat across
 *     Brod-Derventa-Modriča during April-May 1992.
 */

import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { test } from 'vitest';
import { loadOobBrigades, loadOobCorps } from '../src/scenario/oob_loader.js';

const REPO_ROOT = process.cwd();

/** Brief-scoped NW-Bosnia OOB rows: corps + 3 brigades whose available_from changed. */
const NW_BOSNIA_BRIGADES_FIXED = [
    'hrhb_101st_oraje_brigade',
    'hrhb_102nd_brigade',
    'hrhb_106th_bosanska_posavina_brigade',
] as const;

/** Other HRHB OZ corps that MUST remain `available_from=10` (T2 invariant). */
const OTHER_HRHB_OZ_CORPS = [
    'hvo_main_staff',
    'hvo_southeast_herzegovina',
    'hvo_central_bosnia',
    'hvo_tomislavgrad',
] as const;

test('T1: hvo_northwest_bosnia corps + brief-scoped brigades all available_from=0; corps not later than its earliest brigade', async () => {
    const corps = await loadOobCorps(REPO_ROOT);
    const brigades = await loadOobBrigades(REPO_ROOT);

    const nwbCorps = corps.find(c => c.id === 'hvo_northwest_bosnia');
    assert.ok(nwbCorps, 'hvo_northwest_bosnia corps row must exist');
    assert.strictEqual(nwbCorps.available_from, 0,
        `hvo_northwest_bosnia.available_from expected 0, got ${nwbCorps.available_from} ` +
        `(BB1 p.181: HVO Posavina combat began early March 1992 before scenario t0)`);

    for (const bid of NW_BOSNIA_BRIGADES_FIXED) {
        const b = brigades.find(x => x.id === bid);
        assert.ok(b, `brigade ${bid} must exist in OOB`);
        assert.strictEqual(b.corps, 'hvo_northwest_bosnia',
            `brigade ${bid} must be assigned to hvo_northwest_bosnia corps`);
        assert.strictEqual(b.available_from, 0,
            `${bid}.available_from expected 0, got ${b.available_from} ` +
            `(BB1 p.181-182: Orašje pocket held all of 1992)`);
    }

    // Corps available_from must be <= its earliest brigade available_from.
    const nwbBrigades = brigades.filter(b => b.corps === 'hvo_northwest_bosnia');
    assert.ok(nwbBrigades.length > 0, 'hvo_northwest_bosnia must have at least one brigade');
    const earliestBrigade = Math.min(...nwbBrigades.map(b => b.available_from));
    assert.ok(nwbCorps.available_from <= earliestBrigade,
        `corps.available_from (${nwbCorps.available_from}) must be <= earliest brigade ` +
        `available_from (${earliestBrigade}); otherwise corps is created without any brigades`);
});

test('T2: other HRHB OZ corps available_from values UNCHANGED from pre-Q1 baseline (=10)', async () => {
    const corps = await loadOobCorps(REPO_ROOT);
    for (const cid of OTHER_HRHB_OZ_CORPS) {
        const c = corps.find(x => x.id === cid);
        assert.ok(c, `${cid} corps row must exist`);
        assert.strictEqual(c.available_from, 10,
            `${cid}.available_from expected 10 (unchanged from pre-Q1 baseline); ` +
            `got ${c.available_from}. ` +
            `Only hvo_northwest_bosnia is in scope for this lane — see BB1 ` +
            `p.181-182 for the unique formation history of HVO Posavina vs other OZs.`);
    }
});

test('T3: determinism — re-load OOB JSON byte-identical', async () => {
    // Load via the canonical loader twice; results must be deeply identical.
    const corps1 = await loadOobCorps(REPO_ROOT);
    const corps2 = await loadOobCorps(REPO_ROOT);
    assert.strictEqual(JSON.stringify(corps1), JSON.stringify(corps2),
        'loadOobCorps must be deterministic across calls');

    const brigades1 = await loadOobBrigades(REPO_ROOT);
    const brigades2 = await loadOobBrigades(REPO_ROOT);
    assert.strictEqual(JSON.stringify(brigades1), JSON.stringify(brigades2),
        'loadOobBrigades must be deterministic across calls');

    // Raw JSON file byte stability: parse-reparse-stringify yields stable output.
    const corpsRaw = await fs.readFile(path.join(REPO_ROOT, 'data/source/oob_corps.json'), 'utf8');
    const brigadesRaw = await fs.readFile(path.join(REPO_ROOT, 'data/source/oob_brigades.json'), 'utf8');
    const corpsParsed = JSON.parse(corpsRaw);
    const brigadesParsed = JSON.parse(brigadesRaw);
    // Re-serialize and re-parse — must yield same logical content.
    assert.deepStrictEqual(JSON.parse(JSON.stringify(corpsParsed)), corpsParsed,
        'oob_corps.json must round-trip JSON-stable');
    assert.deepStrictEqual(JSON.parse(JSON.stringify(brigadesParsed)), brigadesParsed,
        'oob_brigades.json must round-trip JSON-stable');
});

test('T4: backward-compat — loaders accept current OOB shape; all brigades reference a defined corps', async () => {
    // The loaders being callable + returning well-formed objects is the
    // backward-compat contract: pre-fix saves don't carry available_from
    // overrides; OOB is the canonical source. Loader must not throw and
    // every brigade must point at an existing corps.
    const corps = await loadOobCorps(REPO_ROOT);
    const brigades = await loadOobBrigades(REPO_ROOT);
    const corpsIds = new Set(corps.map(c => c.id));
    for (const b of brigades) {
        if (b.corps) {
            assert.ok(corpsIds.has(b.corps),
                `brigade ${b.id} references corps ${b.corps} which does not exist in oob_corps.json`);
        }
        // Field shape sanity: available_from is a non-negative integer.
        assert.ok(Number.isInteger(b.available_from) && b.available_from >= 0,
            `${b.id}.available_from must be a non-negative integer, got ${b.available_from}`);
    }
    for (const c of corps) {
        assert.ok(Number.isInteger(c.available_from) && c.available_from >= 0,
            `${c.id}.available_from must be a non-negative integer, got ${c.available_from}`);
    }
});

test('T5: static-grep — no per-faction OOB branches added (faction-symmetric mechanism preserved)', async () => {
    // The OOB JSON files must not contain conditional / per-faction overrides
    // that would imply asymmetric mechanism. The available_from field is
    // already a faction-agnostic integer gate; data values can differ per
    // row but the mechanism stays uniform.
    const corpsRaw = await fs.readFile(path.join(REPO_ROOT, 'data/source/oob_corps.json'), 'utf8');
    const brigadesRaw = await fs.readFile(path.join(REPO_ROOT, 'data/source/oob_brigades.json'), 'utf8');

    // Disallow any field name suggesting faction-conditional gates.
    const forbiddenPatterns = [
        /\"available_from_if_faction\"/,
        /\"available_from_RBiH\"/,
        /\"available_from_RS\"/,
        /\"available_from_HRHB\"/,
        /\"per_faction_available_from\"/,
    ];
    for (const pat of forbiddenPatterns) {
        assert.ok(!pat.test(corpsRaw), `oob_corps.json must not contain ${pat}`);
        assert.ok(!pat.test(brigadesRaw), `oob_brigades.json must not contain ${pat}`);
    }
});

/**
 * T6 IS A KNOWN-DIVERGENCE TEST, NOT A FIDELITY PIN. READ THIS BEFORE CHANGING IT.
 *
 * The playable data on this row is DELIBERATELY WRONG ON THE HISTORY, and this test
 * exists to keep both halves of that statement true at once:
 *   (a) the historical finding stays RECORDED and unaltered in provenance, and
 *   (b) the playable value stays PINNED at the mechanically-required one, so the
 *       divergence cannot drift silently into something nobody decided.
 *
 * Do NOT "fix" this test by asserting `home_mun === 'jajce'` again. That is not a
 * restoration, it is a re-application of a change that was measured and withdrawn.
 * Do NOT delete the provenance half either — without it, the only remaining record
 * of the correct history is a comment, and comments are not enforced.
 *
 * WHY THE HISTORICALLY CORRECT VALUE COULD NOT BE USED, measured in run n223
 * (runs/apr1992_definitive_188w__9e902ad68783fbe7__w188_n223). Homed at Jajce the
 * brigade fought 85 battles across turns 18-178, ALL as defender and none as
 * attacker, LOST 79 of them, absorbed 8,932 casualties, faced a worst-case
 * power_ratio of 54.38 — and finished the campaign `active` with 1,440 personnel,
 * MORE than the 1,100 it started with. It is a reinforcement sink, not a brigade.
 * Historically the unit did not survive at all: Jajce fell in October 1992 and BB1
 * PDF p.248 / printed 211 folds the remnants into the 55th Home Defense Regiment.
 * Any op:jajce:* controller match it produced was a FALSE MATCH — right controller,
 * wrong reason. The revert is therefore ON CALIBRATION GROUNDS, NOT EVIDENCE GROUNDS.
 *
 * THE RESTORED ODŽAK VALUE IS ALSO WRONG, and this test does not claim otherwise.
 * At Odžak in the n222 baseline the same brigade dies at turn 9 at
 * op:capljina:capljina_2 — five months before Jajce fell, ~150 km from either place.
 * Neither placement is correct; the Jajce one was judged worse.
 *
 * TWO KNOWN CONSEQUENCES, decided rather than overlooked:
 *   1. JAJCE OPENS UNDEFENDED at t0 — zero brigades of any faction. The former
 *      `jajceOpeners >= 1` assertion is deliberately gone. Restoring it would
 *      re-impose the requirement whose only available solution is the broken row.
 *   2. THIS ROW NO LONGER SPAWNS AT ALL. It is not `mandatory`, and the retained
 *      hrhb_102nd_brigade re-home now draws the shared Odžak manpower pool first
 *      (recruitment_engine.ts all-or-nothing gate: 741 available < 800 cost), so
 *      HRHB t0 formations are 38 rather than 39. That combined state was measured
 *      by neither n222 nor n223 and is pending its own 188w. It is NOT asserted
 *      here on purpose — pinning an unmeasured behaviour would bless it.
 */
test('T6: KNOWN DIVERGENCE — the Hrvoje Vukčić row carries the mechanically-required Odžak value while provenance retains the Jajce finding', async () => {
    const brigades = await loadOobBrigades(REPO_ROOT);
    const hrvoje = brigades.find(b => b.id === 'hvo_hrvoje_vukcic_brigade');
    assert.ok(hrvoje, 'hvo_hrvoje_vukcic_brigade must exist; the row was deleted once already and that threw away a real formation');

    // HALF 1 — the playable value is pinned at the mechanically-required one.
    const why =
        'This row is deliberately divergent from the evidence. At the historically ' +
        'correct Jajce home it fought 85 defensive battles across turns 18-178, lost ' +
        '79, absorbed 8,932 casualties, and still finished ACTIVE at 1,440 personnel ' +
        'from a 1,100 start — an immortal attrition sink producing false op:jajce:* ' +
        'matches, when BB1 p.248/211 has the unit destroyed at the October 1992 fall ' +
        'of Jajce. Reverted on CALIBRATION GROUNDS, NOT EVIDENCE GROUNDS. Do not ' +
        'restore the Jajce value without a destruction path for the 1992 fall and a ' +
        'fresh 188w; see docs/provenance/OFFICER_OOB_PROVENANCE.json.';
    assert.strictEqual(hrvoje.home_mun, 'odzak', why);
    assert.strictEqual(hrvoje.home_osid, 'op:odzak:donja_dubica', why);
    assert.strictEqual(hrvoje.corps, 'hvo_northwest_bosnia', why);
    assert.strictEqual(hrvoje.available_from, 0);

    // HALF 2 — the historical finding must survive the divergence, in machine-readable
    // form. If this half fails, the correct history has been lost and the row above is
    // no longer a documented divergence but an undocumented error.
    const provenanceRaw = await fs.readFile(
        path.join(REPO_ROOT, 'docs', 'provenance', 'OFFICER_OOB_PROVENANCE.json'), 'utf8');
    const record = JSON.parse(provenanceRaw).records?.['brigade:hvo_hrvoje_vukcic_brigade'];
    assert.ok(record, 'the provenance record must exist — it is the only remaining carrier of the Jajce finding');

    const citation = String(record.citation ?? '');
    for (const fragment of ['Annex 29', 'p. 349 / printed 330', 'Central Bosnia Regional headquarters']) {
        assert.ok(citation.includes(fragment),
            `provenance citation must still carry the BB2 Jajce evidence (${fragment}). ` +
            'The playable data diverges from this finding; deleting the finding would ' +
            'convert a documented divergence into a silent error.');
    }

    const conflictNote = String(record.conflict_note ?? '');
    assert.ok(conflictNote.includes('CALIBRATION GROUNDS, NOT ON EVIDENCE GROUNDS'),
        'the provenance conflict_note must state that the Odžak value is restored on ' +
        'calibration grounds and not on evidence grounds — that sentence is what stops ' +
        'a future reader from re-deriving the Jajce fix and rediscovering the same failure.');
    assert.ok(conflictNote.includes('55th Home Defense Regiment'),
        'the provenance conflict_note must retain BB1 p.248/211 on the destruction of the unit at the fall of Jajce');
});

test('T7: Brod-Derventa-Modriča brigades open with their documented April force and retain pocket metadata', async () => {
    // BB1 pp. 181-182 places this HVO/HV force in combat during April-May 1992.
    // `pocket_destroyable` remains legacy authored metadata and does not
    // authorize removal outside the canonical dissolution evaluator.
    const brigades = await loadOobBrigades(REPO_ROOT);
    const siblings = ['hrhb_103rd_derventa_brigade', 'hrhb_104th_bosanski_brod_brigade', 'hrhb_105th_modrica_brigade'];
    for (const bid of siblings) {
        const b = brigades.find(x => x.id === bid);
        assert.ok(b, `${bid} must exist`);
        assert.strictEqual(b.available_from, 0,
            `${bid}.available_from must be 0 for the documented opening Posavina campaign; got ${b.available_from}`);
    }
    // Spot-check the legacy authored metadata remains on the 103rd + 104th.
    const has103rd = brigades.find(b => b.id === 'hrhb_103rd_derventa_brigade');
    const has104th = brigades.find(b => b.id === 'hrhb_104th_bosanski_brod_brigade');
    assert.ok(has103rd && Array.isArray(has103rd.tags) && has103rd.tags.includes('pocket_destroyable'),
        'hrhb_103rd_derventa_brigade retains its authored pocket_destroyable metadata');
    assert.ok(has104th && Array.isArray(has104th.tags) && has104th.tags.includes('pocket_destroyable'),
        'hrhb_104th_bosanski_brod_brigade retains its authored pocket_destroyable metadata');
});

test('T8: Odžak opens with an HVO defender — a name correction must never leave the municipality empty', async () => {
    // WHY THIS PIN EXISTS. `hvo_hrvoje_vukcic_brigade` was deleted outright (T6)
    // because ICTY evidence makes "Hrvoje Vukčić Hrvatinić" a Jajce/Prozor-Rama
    // name. That establishes only that the NAME was wrong at Odžak. BB1 p.182 has
    // HV/HVO forces holding strong positions near Odžak against the 1st Krajina
    // Corps until the town fell on 12 July 1992, and BB1 p.437 names the 102nd
    // Odžak Brigade among the six original Orašje Corps District brigades. So an
    // Odžak HVO garrison at t0 is a sourced structural fact, independent of which
    // row carries it. Deleting a row on name grounds silently removed it once;
    // this test is what makes that recur loudly instead of silently.
    const brigades = await loadOobBrigades(REPO_ROOT);
    const odzakHvo = brigades.filter(b =>
        b.faction === 'HRHB' &&
        b.home_mun === 'odzak' &&
        b.available_from === 0);

    assert.ok(odzakHvo.length >= 1,
        'Odžak must open with at least one available_from=0 HRHB brigade ' +
        '(BB1 p.182: HV/HVO held positions near Odžak until 12 July 1992). ' +
        `Found ${odzakHvo.length}. If a row was renamed or retired, re-home the ` +
        'garrison — do not leave the municipality undefended.');

    // Liveness + placement: the garrison must sit on an Odžak OSID, not merely
    // claim odzak as home_mun while physically homed elsewhere.
    for (const b of odzakHvo) {
        assert.ok(typeof b.home_osid === 'string' && b.home_osid.startsWith('op:odzak:'),
            `${b.id}.home_osid must be an Odžak OSID; got ${String(b.home_osid)}`);
    }

    // The 102nd is the sourced carrier (BB1 p.437). Pinned by id so that a future
    // re-home away from Odžak has to confront this citation rather than pass by
    // satisfying the count above with an unrelated row.
    const the102nd = brigades.find(b => b.id === 'hrhb_102nd_brigade');
    assert.ok(the102nd, 'hrhb_102nd_brigade must exist');
    assert.strictEqual(the102nd.home_mun, 'odzak',
        'BB1 p.437 names the 102nd as the Odžak brigade of the original six; its ' +
        'Orašje home came from the October 1995 post-consolidation OOB and is ' +
        'wrong for an April 1992 start');
});
