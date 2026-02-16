import { runScenario } from '../src/scenario/scenario_runner.js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function main() {
  const baseDir = process.cwd();
  const result = await runScenario({
    scenarioPath: join(baseDir, 'data/scenarios/apr1992_definitive_52w.json'),
    baseDir,
    outDirBase: join(baseDir, 'runs'),
    weeksOverride: 4,
    uniqueRunFolder: true,
    use_smart_bots: true,
  });
  console.log('Run completed:', result.run_id);
  console.log('Hash:', result.final_state_hash);

  try {
    const endReport = await readFile(result.paths.end_report, 'utf8');
    console.log('\n' + endReport.slice(0, 3000));
  } catch {
    console.log('No end report');
  }
}

main().catch((e) => {
  console.error('ERROR:', e.message ?? e);
  process.exit(1);
});
