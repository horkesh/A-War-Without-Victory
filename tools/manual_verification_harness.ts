
import { loadScenario } from '../src/scenario/scenario_loader.js';
import { runScenario } from '../src/scenario/scenario_runner.js';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function run() {
    const scenarioPath = join(process.cwd(), 'data/scenarios/apr1992_50w_bots.json');
    console.log(`Loading scenario from: ${scenarioPath}`);

    const scenario = await loadScenario(scenarioPath);

    if (!scenario) {
        console.error('Scenario could not be loaded');
        process.exit(1);
    }

    console.log(`Running scenario: ${scenario.scenario_id}`);

    // Create output directory
    const runId = `verification_tuning_${Date.now()}`;
    const outDir = join(process.cwd(), 'runs', runId);
    // mkdirSync(outDir, { recursive: true }); // runScenario creates it if we pass outDirOverride

    const options = {
        scenarioPath,
        outDirOverride: outDir, // Force output to this directory
        weeksOverride: 25, // Override weeks to 25
        use_smart_bots: true
    };

    await runScenario(options);

    console.log(`Run complete. Check ${outDir}`);
}

run().catch(console.error);
