/**
 * GORAŽDE / `rs_5th_podrinje` — JANUARY 1993 CALIBRATION PIN.
 *
 * Balkan Battlegrounds places the 5th Podrinje in Goražde municipality and never
 * at Vlasenica (Vol. II PDF p.310/printed 291 fn 121; PDF p.416/printed 397 fn 42).
 * The source supports municipality placement only. Podkožara Donja is the exact
 * January-painter cell selected to represent the isolated RS position; it is not
 * a BB-named brigade headquarters.
 *
 * The prior Vlasenica divergence was retained for 188-week survivability. The
 * calibration owner has explicitly made January 1993 at 40 weeks the sole current
 * acceptance horizon, so this test now pins the historically correct municipality
 * and the painter-derived local deployment instead.
 */

import assert from 'node:assert';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { test } from 'vitest';
import { loadOobBrigades } from '../src/scenario/oob_loader.js';
import { ENCLAVE_DEFINITIONS } from '../src/sim/combat/enclave_resilience.js';

const REPO_ROOT = process.cwd();
const PROVENANCE_PATH = path.join(REPO_ROOT, 'docs', 'provenance', 'OFFICER_OOB_PROVENANCE.json');
const PODKOZARA = 'op:gorazde:podkozara_donja_2';

async function readJson(filePath: string): Promise<any> {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

test('G1: rs_5th_podrinje uses its sourced Goražde municipality and painter-derived Podkožara cell', async () => {
    const brigades = await loadOobBrigades(REPO_ROOT);
    const podrinje = brigades.find((brigade) => brigade.id === 'rs_5th_podrinje');
    assert.ok(podrinje, 'rs_5th_podrinje must exist in the OOB');

    assert.strictEqual(podrinje.home_mun, 'gorazde');
    assert.strictEqual(podrinje.home_osid, PODKOZARA);
});

test('G2: machine-readable provenance retains the municipality-only evidence boundary', async () => {
    const record = (await readJson(PROVENANCE_PATH)).records?.['brigade:rs_5th_podrinje'];
    assert.ok(record, 'the Goražde evidence record must remain present');

    const citation = String(record.citation ?? '');
    for (const fragment of ['footnote 121', 'footnote 42', '1st GORAZDE Light Infantry Brigade']) {
        assert.ok(citation.includes(fragment), `missing provenance fragment: ${fragment}`);
    }
    assert.ok(citation.includes('MUNICIPALITY ONLY — THIS CITATION DOES NOT COVER THE home_osid'));
});

test('G3: Podkožara remains outside the Goražde enclave guard', () => {
    const gorazdeGuard = ENCLAVE_DEFINITIONS.find((definition) => definition.id === 'gorazde');
    assert.ok(gorazdeGuard?.osid_list, 'the Goražde enclave definition must expose an OSID list');
    assert.ok(!gorazdeGuard!.osid_list!.includes(PODKOZARA),
        'the RS local position must not become protected by the RBiH enclave guard');
});
