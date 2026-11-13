/** Focused pre-calibration checks; never launches a calibration or native session. */
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {resolveRootModules,resolveVitestCli} from './vitest_shared_config.mjs';

const root=process.cwd();
const tscCli=join(resolveRootModules(root,'typescript'),'typescript','bin','tsc');

const tests = [
 'tests/contextual_data_root_contract.test.ts',
 'tests/desktop_operation_prediction_inputs.test.ts',
 'tests/desktop_calibration_compare.test.ts',
 'tests/commander/probe_target_selection_filter.test.ts',
 'tests/commander/operation_emit_overlap_guards.test.ts',
 'tests/commander/local_occupation_population_threading.test.ts',
 'tests/bot_orders_perf_profile.test.ts',
 'tests/docs_desktop_v09_truth.test.ts',
 'tests/plan_index.test.ts',
 'tests/combat_prediction_contract.test.ts',
 'tests/combat_data_root_contract.test.ts',
 'tests/combat_fatigue_phase_contract.test.ts',
 'tests/desktop_midrun_execution_contract.test.ts',
 'tests/bot_terrain_context.test.ts',
 'tests/attack_resolution_osid_intel_friction.test.ts',
 'tests/sector_defense_roster.test.ts',
 'tests/sector_offensive_in_transit_predictor.test.ts',
 'tests/operation_preparation_in_transit_context.test.ts',
 'tests/combat_fatigue_owner.test.ts',
 'tests/formation_fatigue_frontline_assignment.test.ts',
 'tests/formation_fatigue_persistence.test.ts',
 'tests/fatigue_exhaustion_coupling.test.ts',
 'tests/desktop_combat_terrain_prerequisite.test.ts',
 'tests/bot_manager_a1.test.ts',
 'tests/desktop_start_campaign_authorization.test.ts',
 'tests/current-scenario-postturn-boundary.test.ts',
 'tests/early_war_injected_graph_parity.test.ts',
 'tests/war_phase_step_order.test.ts',
 'tests/combat_strict_ordering_contract.test.ts',
];

for (const [name,args,timeout] of [
 ['focused-regressions',[resolveVitestCli(root),'run',...tests,'--pool=forks','--maxWorkers=2','--minWorkers=1','--reporter=dot'],180_000],
 ['nonincremental-types',[tscCli,'--noEmit','--incremental','false'],120_000],
]) {
 console.log(JSON.stringify({check:name,timeout_ms:timeout,attempts:1}));
 const result=spawnSync(process.execPath,args,{cwd:process.cwd(),stdio:'inherit',timeout});
 console.log(JSON.stringify({check:name,exit:result.status,signal:result.signal,error:result.error?.code??null}));
 if(result.error || result.status!==0)process.exit(result.status??124);
}
console.log('Focused execution checks passed. Independent review and full-suite/campaign/native qualification remain separate gates.');
