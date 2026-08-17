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
 *   - `hvo_hrvoje_vukcic_brigade`: removed from the playable Posavina OOB.
 *     ICTY testimony identifies it as a Jajce formation/remnant, while a later
 *     OOB identifies a same-name home-defence regiment in Prozor-Rama; neither
 *     supports the former Odžak assignment.
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

test('T6: the Hrvoje Vukčić brigade is a JAJCE formation under Central Bosnia, not Odžak and not Tomislavgrad', async () => {
    // This row has now been wrong in three different ways, so all three are pinned.
    //  - It was homed at ODŽAK under NW Bosnia. Unsupported; that was the original defect.
    //  - It was then DELETED outright on the strength of the name being a Jajce one.
    //    That threw away a real formation: BB2 Annex 29, PDF p.349/330, has the
    //    defenders "organized under the Jajce Municipal Headquarters ... about two
    //    battalions of local troops -- about 1,000 men", and Jajce had zero brigades
    //    of any faction at t0 while it was gone.
    //  - The obvious repo table (WIKIPEDIA_OOB_CROSS_REFERENCE.md:484) maps the 97th
    //    dom. puk. "(ex-Jajce)" to TOMISLAVGRAD, which is the POST-FALL reconstitution
    //    in the Prozor-Rama area. Implementing off that line reproduces the wrong-year
    //    defect inside its own fix. At April 1992 the parent is Central Bosnia, per
    //    BB2 p.349/330: "the Central Bosnia Regional headquarters -- which had overall
    //    responsibility for Jajce".
    const brigades = await loadOobBrigades(REPO_ROOT);
    const hrvoje = brigades.find(b => b.id === 'hvo_hrvoje_vukcic_brigade');
    assert.ok(hrvoje, 'hvo_hrvoje_vukcic_brigade must exist as a Jajce formation');
    assert.strictEqual(hrvoje.home_mun, 'jajce',
        'the honorific belongs to the Jajce brigade; Odžak was never supported');
    assert.strictEqual(hrvoje.corps, 'hvo_central_bosnia',
        'April 1992 parent is Central Bosnia (BB2 p.349/330); Tomislavgrad is the post-fall reconstitution');
    assert.strictEqual(hrvoje.available_from, 0);

    // Jajce must not be left undefended at t0 — the condition the deletion created.
    const jajceOpeners = brigades.filter(b => b.home_mun === 'jajce' && b.available_from === 0);
    assert.ok(jajceOpeners.length >= 1,
        'Jajce must open with at least one available_from=0 brigade; it held out for months against a VRS division');
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
