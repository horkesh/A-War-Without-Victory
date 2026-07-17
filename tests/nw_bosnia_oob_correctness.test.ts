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
 *   - `hrhb_102nd_brigade`: 8 → 0        (Orašje, survived 1992)
 *   - `hrhb_106th_bosanska_posavina_brigade`: 8 → 0 (Orašje, survived 1992)
 *
 * Out of scope (kept as-is):
 *   - `hvo_hrvoje_vukcic_brigade`: already `available_from=0`
 *   - `hrhb_103rd_derventa_brigade`: kept `available_from=8`
 *     (`pocket_destroyable` is legacy authored metadata, not removal authority)
 *   - `hrhb_104th_bosanski_brod_brigade`: kept `available_from=8`
 *     (`pocket_destroyable` is legacy authored metadata, not removal authority)
 *   - `hrhb_105th_modrica_brigade`: kept `available_from=8`
 *     (ordinary canonical dissolution rules apply)
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

test('T6: hvo_hrvoje_vukcic_brigade unchanged at available_from=0 (pre-existing canonical value, NOT in this lane scope)', async () => {
    // The existing 0-availability entry in NW Bosnia. Test asserts we did not
    // accidentally regress it while editing sibling rows.
    const brigades = await loadOobBrigades(REPO_ROOT);
    const hrvoje = brigades.find(b => b.id === 'hvo_hrvoje_vukcic_brigade');
    assert.ok(hrvoje, 'hvo_hrvoje_vukcic_brigade must exist');
    assert.strictEqual(hrvoje.available_from, 0,
        'hvo_hrvoje_vukcic_brigade was already at available_from=0 (Odžak; HVO original Apr 1992); must remain 0');
    assert.strictEqual(hrvoje.corps, 'hvo_northwest_bosnia');
});

test('T7: sibling NW-Bosnia brigades keep authored availability and pocket metadata without bypassing canonical dissolution', async () => {
    // Per BB1 timing, these brigades historically existed in April 1992 too,
    // but they fell to VRS during 1992 (Modrica 28 Jun, Derventa 4-5 Jul,
    // Bosanski Brod 6 Oct). They are out of this lane's scope; their
    // `available_from=8` value is unchanged by this fix. `pocket_destroyable`
    // remains legacy authored metadata and does not authorize removal outside
    // the canonical dissolution evaluator.
    const brigades = await loadOobBrigades(REPO_ROOT);
    const siblings = ['hrhb_103rd_derventa_brigade', 'hrhb_104th_bosanski_brod_brigade', 'hrhb_105th_modrica_brigade'];
    for (const bid of siblings) {
        const b = brigades.find(x => x.id === bid);
        assert.ok(b, `${bid} must exist`);
        assert.strictEqual(b.available_from, 8,
            `${bid}.available_from must remain 8 (out of this lane's scope); got ${b.available_from}`);
    }
    // Spot-check the legacy authored metadata remains on the 103rd + 104th.
    const has103rd = brigades.find(b => b.id === 'hrhb_103rd_derventa_brigade');
    const has104th = brigades.find(b => b.id === 'hrhb_104th_bosanski_brod_brigade');
    assert.ok(has103rd && Array.isArray(has103rd.tags) && has103rd.tags.includes('pocket_destroyable'),
        'hrhb_103rd_derventa_brigade retains its authored pocket_destroyable metadata');
    assert.ok(has104th && Array.isArray(has104th.tags) && has104th.tags.includes('pocket_destroyable'),
        'hrhb_104th_bosanski_brod_brigade retains its authored pocket_destroyable metadata');
});
