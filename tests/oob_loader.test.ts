import assert from 'node:assert';
import { test } from 'node:test';
import { loadOobBrigades, loadOobCorps, loadMunicipalityHqSettlement } from '../src/scenario/oob_loader.js';

test('loadOobBrigades returns stable order (faction then name) and valid home_mun', async () => {
  const baseDir = process.cwd();
  const brigades = await loadOobBrigades(baseDir);
  assert.ok(Array.isArray(brigades));
  assert.ok(brigades.length >= 1);
  for (let i = 1; i < brigades.length; i++) {
    const a = brigades[i - 1];
    const b = brigades[i];
    const fc = a.faction.localeCompare(b.faction);
    assert.ok(fc <= 0, `order: ${a.faction} vs ${b.faction}`);
    if (fc === 0) {
      assert.ok(a.name.localeCompare(b.name) <= 0, `order: ${a.name} vs ${b.name}`);
    }
  }
  const ids = new Set<string>();
  for (const b of brigades) {
    assert.ok(['RBiH', 'RS', 'HRHB'].includes(b.faction), `faction ${b.faction}`);
    assert.ok(b.home_mun.length > 0, `home_mun ${b.id}`);
    assert.ok(!ids.has(b.id), `duplicate id ${b.id}`);
    ids.add(b.id);
  }
});

test('loadOobCorps returns stable order (faction then name) and valid hq_mun', async () => {
  const baseDir = process.cwd();
  const corps = await loadOobCorps(baseDir);
  assert.ok(Array.isArray(corps));
  assert.ok(corps.length >= 1);
  for (let i = 1; i < corps.length; i++) {
    const a = corps[i - 1];
    const b = corps[i];
    const fc = a.faction.localeCompare(b.faction);
    assert.ok(fc <= 0);
    if (fc === 0) assert.ok(a.name.localeCompare(b.name) <= 0);
  }
  const ids = new Set<string>();
  for (const c of corps) {
    assert.ok(['RBiH', 'RS', 'HRHB'].includes(c.faction));
    assert.ok(c.hq_mun.length > 0);
    assert.ok(!ids.has(c.id));
    ids.add(c.id);
  }
});

test('loadMunicipalityHqSettlement returns record of mun1990_id to sid', async () => {
  const baseDir = process.cwd();
  const hq = await loadMunicipalityHqSettlement(baseDir);
  assert.ok(typeof hq === 'object' && hq !== null);
  for (const [mun, sid] of Object.entries(hq)) {
    assert.ok(typeof mun === 'string' && mun.length > 0);
    assert.ok(typeof sid === 'string' && sid.length > 0);
  }
});
