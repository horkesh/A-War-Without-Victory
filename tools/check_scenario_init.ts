/**
 * Diagnostic: trace which mandatory brigades fail to spawn and why.
 */
import { createStateFromScenario } from '../src/scenario/scenario_runner.js';
import { loadOobBrigades } from '../src/scenario/oob_loader.js';
import { join } from 'node:path';

async function main() {
  const baseDir = process.cwd();
  const scenarioPath = join(baseDir, 'data/scenarios/apr1992_definitive_52w.json');

  console.log('Loading scenario...');
  const state = await createStateFromScenario(scenarioPath, baseDir);

  // Count formations
  const formations = state.formations ?? {};
  const counts: Record<string, { corps: number; brigade: number; personnel: number }> = {};
  for (const [_id, f] of Object.entries(formations)) {
    const fac = (f as any).faction as string;
    if (!counts[fac]) counts[fac] = { corps: 0, brigade: 0, personnel: 0 };
    if ((f as any).kind === 'corps_asset') counts[fac].corps++;
    else counts[fac].brigade++;
    counts[fac].personnel += ((f as any).personnel ?? 0) as number;
  }
  console.log('\n=== Formations ===');
  for (const [fac, c] of Object.entries(counts).sort()) {
    console.log(`  ${fac}: ${c.corps} corps, ${c.brigade} brigades, ${c.personnel} personnel`);
  }

  // Check which mandatory brigades didn't spawn
  const oobBrigades = await loadOobBrigades(baseDir);
  const mandatoryByFaction: Record<string, string[]> = {};
  const missingByFaction: Record<string, string[]> = {};

  for (const b of oobBrigades) {
    if (!b.mandatory || b.available_from > 0) continue;
    if (!mandatoryByFaction[b.faction]) mandatoryByFaction[b.faction] = [];
    mandatoryByFaction[b.faction].push(b.id);

    if (!formations[b.id]) {
      if (!missingByFaction[b.faction]) missingByFaction[b.faction] = [];
      missingByFaction[b.faction].push(`${b.id} (${b.home_mun})`);
    }
  }

  console.log('\n=== Missing mandatory brigades ===');
  for (const [fac, missing] of Object.entries(missingByFaction).sort()) {
    const total = mandatoryByFaction[fac]?.length ?? 0;
    console.log(`  ${fac}: ${missing.length} missing of ${total} mandatory`);
    for (const id of missing.slice(0, 15)) {
      console.log(`    - ${id}`);
    }
    if (missing.length > 15) console.log(`    ... and ${missing.length - 15} more`);
  }

  // Pool summary
  const poolSummary: Record<string, { pools: number; available: number; committed: number }> = {};
  for (const [_k, pool] of Object.entries(state.militia_pools ?? {})) {
    const p = pool as any;
    const fac = p.faction as string;
    if (!poolSummary[fac]) poolSummary[fac] = { pools: 0, available: 0, committed: 0 };
    poolSummary[fac].pools++;
    poolSummary[fac].available += (p.available ?? 0) as number;
    poolSummary[fac].committed += (p.committed ?? 0) as number;
  }
  console.log('\n=== Post-Recruitment Militia Pools ===');
  for (const [fac, s] of Object.entries(poolSummary).sort()) {
    console.log(`  ${fac}: available=${s.available}, committed=${s.committed}, total=${s.available + s.committed}`);
  }
}

main().catch((e) => {
  console.error('ERROR:', e);
  process.exit(1);
});
