#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const ROOT = 'C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory';
const HERE = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1';
const NODE = 'C:/Users/User/AppData/Local/Volta/tools/image/node/22.23.2/node.exe';
const PATHS = [
  'src/scenario/scenario_runner.ts', 'tests/current-scenario-postturn-boundary.test.ts',
  'src/sim/combat/attack_resolution_osid.ts', 'src/sim/combat/attack_resource_aftermath.ts',
  'src/sim/turn_phases/war_phases.ts', 'tests/attack_resource_aftermath.test.ts',
  'tests/combat_fatigue_owner.test.ts', 'tests/op_directive_injection.test.ts', 'tests/op_directive_objection.test.ts',
  'tools/scenario_runner/run_scenario_with_preflight.ts', 'tools/diagnostics/run_preserved_preflight.cjs',
  'tmp/player-bot-capability-parity-20261024/policy-clean-validation/evaluate_candidate.cjs',
  'tools/validate_run_consistency.cjs', 'tools/engine_health_gate.cjs',
  'tools/diagnostics/movement_phase_coverage.cjs', 'data/scenarios/apr1992_definitive_188w.json',
  'data/source/calibration/painted_control_jan1993.json', 'data/calibration/engine_health_thresholds.json',
  'src/scenario/control_change_attribution.ts', 'tests/scenario_control_change_attribution_contract.test.ts',
  'tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-postturn-parity-repair-v1/implementation-v1/ACTUAL_CODE_REVIEW.json',
  'tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-postturn-parity-repair-v1/implementation-v1/retention-correction-v1/INDEPENDENT_POSTEXECUTION_VERIFICATION.json',
  'tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-postturn-parity-repair-v1/current-boundary-diagnostic-v2/INDEPENDENT_ACTUAL_IMPLEMENTATION_DECISION.json',
  'tmp/player-bot-capability-parity-20261024/fractional-fatigue-package-v6/scenario-postturn-parity-repair-v1/prefix39-validation-v1/WEEKS_OVERRIDE_FIDELITY_SUPPLEMENT.json',
  `${HERE}/PLAN.md`, `${HERE}/qualification.cjs`
];
const ALLOWED = [
  'opening-preservation.json','preflight.json','launch.json','campaign.stdout.log','campaign.stderr.log','campaign.execution.json',
  'postrun/evaluation-candidate.json','postrun/evaluation-positive.json','postrun/evaluation-negative.json','postrun/scoring.json',
  'postrun/consistency.stdout.log','postrun/consistency.stderr.log','postrun/consistency.execution.json',
  'postrun/health.stdout.log','postrun/health.stderr.log','postrun/health.execution.json',
  'postrun/movement.stdout.log','postrun/movement.stderr.log','postrun/movement.execution.json',
  'postrun/graph-roster.json','postrun/save-provenance.json','postrun/control-attribution.json','postrun/horizon-status.json',
  'closing-preservation.json','result.json'
];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
function row(p) { const b = fs.readFileSync(path.join(ROOT,p)); return { path:p, bytes:b.length, sha256:sha(b) }; }
function main() {
  if (process.cwd().replaceAll('\\','/') !== ROOT) throw new Error('literal C worktree required');
  const head = cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(head)) throw new Error('invalid HEAD');
  if (cp.execFileSync('git',['status','--porcelain=v1','--untracked-files=normal'],{cwd:ROOT,encoding:'utf8'}).trim()) throw new Error('clean committed HEAD required');
  if (fs.existsSync(path.join(ROOT,'runs/player-parity-fatigue-owner-39-20261026-01'))) throw new Error('frozen output parent already exists');
  const template = JSON.parse(fs.readFileSync(path.join(ROOT,HERE,'CONFIG.template.json'),'utf8'));
  const evaluatorSource=fs.readFileSync(path.join(ROOT,template.score.authoritative_reader),'utf8');
  const excerptStart=evaluatorSource.indexOf('  const checkpoints = {};\n  for (const [label, turn, floor] of CHECKPOINTS) {');
  const excerptEnd=evaluatorSource.indexOf('\n\n  const sharedDeltas',excerptStart);
  if(excerptStart<0||excerptEnd<0) throw new Error('canonical checkpoint excerpt not found');
  template.score.canonical_excerpt_sha256=sha(Buffer.from(evaluatorSource.slice(excerptStart,excerptEnd),'utf8'));
  const controlInputs={
    n91:row('runs/apr1992_definitive_188w__6deb5845c150c196__w188_n91/save_w39.json'),
    n92:row('runs/apr1992_definitive_188w__6deb5845c150c196__w188_n92/save_w39.json'),
    n101:row('runs/apr1992_definitive_188w__6deb5845c150c196__w188_n101/save_w39.json'),
    n102:row('runs/apr1992_definitive_188w__6deb5845c150c196__w188_n102/save_w39.json'),
    jan1993_reference:row('data/source/calibration/painted_control_jan1993.json')
  };
  const controlManifestPath=`${HERE}/CONTROL_FIXTURE_MANIFEST.v2.json`;
  const controlManifest={schema:'awwv.scenario-postturn-prefix39.control-fixture-manifest.v2',head,canonical_excerpt_sha256:template.score.canonical_excerpt_sha256,inputs:controlInputs,expected:{positive:{run:'n101',score:707,denominator:712,n91_losses:0,n92_losses:0},negative:{run:'n102',score:705,denominator:712,n91_losses:2,n92_losses:2,lost_osids:['op:foca:donje_zesce','op:trnovo:tosici']}}};
  fs.writeFileSync(path.join(ROOT,controlManifestPath),JSON.stringify(controlManifest,null,2)+'\n',{flag:'wx'});
  template.control_fixture={manifest:row(controlManifestPath),inputs:controlInputs};
  template.status='BOUND_REVIEW_REQUIRED'; template.expected_head=head;
  template.required_bindings=Object.fromEntries(PATHS.map((p)=>[p,row(p)]));
  const configPath=path.join(ROOT,HERE,'CONFIG.bound.v2.json');
  fs.writeFileSync(configPath,JSON.stringify(template,null,2)+'\n',{flag:'wx'});
  const config=row(`${HERE}/CONFIG.bound.v2.json`), entry=row(`${HERE}/qualification.cjs`);
  const attempt=`${HERE}/actual-attempt-01`;
  const argv=[NODE,'tools/diagnostics/run_preserved_preflight.cjs','--attempt-dir',attempt,'--entry-script',`${HERE}/qualification.cjs`,'--timeout-ms','300000',...ALLOWED.flatMap((x)=>['--allow-artifact',x]),'--',NODE,`${HERE}/qualification.cjs`,'--mode','campaign','--config',`${HERE}/CONFIG.bound.v2.json`,'--config-sha256',config.sha256,'--evidence','{evidenceDir}'];
  const quoteArg = (value) => value.includes(' ') || value.includes('{') || value.includes('}') || value.includes('"') ? JSON.stringify(value) : value;
  const frozen={schema:'awwv.scenario-postturn-prefix39.launch.v2',status:'HOLD_FOR_TARGETED_INDEPENDENT_GO__DO_NOT_EXECUTE',head,question:'Does the candidate pass the strict authoritative Jan-1993 first-39 reject gate?',cost:{expected:'1-3 minutes',cap_ms:300000,attempts:1,retries:0},pass:{score_minimum:707,denominator:712,formerly_correct_n91_n92_losses:0,positive_n101:{score:707,n91_losses:0,n92_losses:0},negative_n102:{score:705,n91_losses:2,n92_losses:2,lost_osids:template.controls.negative_expected_lost_osids},control_attribution:true,all_required_gates:true,preservation_equal:true},stop:'Any failure => STOP_NO_RETRY before any 188-week/full-suite/native/package/build work.',attempt_dir:attempt,allowed_artifacts:ALLOWED,exact_argv:argv,exact_command:argv.map(quoteArg).join(' '),bindings:{config,entry,control_fixture_manifest:row(controlManifestPath)}};
  fs.writeFileSync(path.join(ROOT,HERE,'FROZEN_LAUNCH_COMMAND.v2.json'),JSON.stringify(frozen,null,2)+'\n',{flag:'wx'});
  const cheapAllowed=['selftest-result.json','evaluation-positive.json','evaluation-negative.json'];
  const wrapper=(attempt,mode,allowed,timeout)=>[NODE,'tools/diagnostics/run_preserved_preflight.cjs','--attempt-dir',attempt,'--entry-script',`${HERE}/qualification.cjs`,'--timeout-ms',String(timeout),...allowed.flatMap((x)=>['--allow-artifact',x]),'--',NODE,`${HERE}/qualification.cjs`,'--mode',mode,'--config',`${HERE}/CONFIG.bound.v2.json`,'--config-sha256',config.sha256,'--evidence','{evidenceDir}'];
  const cheap={schema:'awwv.scenario-postturn-prefix39.cheap-checks.v2',status:'RUN_BEFORE_TARGETED_INDEPENDENT_GO',simulation_executed:false,retained_full_inventory_deferred:true,commands:[{name:'selftest',expected_exit:0,argv:wrapper(`${HERE}/selftest-02`,'selftest',cheapAllowed,90000)},{name:'preflight',expected_exit:0,argv:wrapper(`${HERE}/preflight-02`,'preflight',['preflight-result.json'],30000)}]};
  fs.writeFileSync(path.join(ROOT,HERE,'CHEAP_CHECK_COMMANDS.v2.json'),JSON.stringify(cheap,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(ROOT,HERE,'FINALIZED.v2.json'),JSON.stringify({schema:'awwv.scenario-postturn-prefix39.finalized.v2',status:frozen.status,head,production_bindings:Object.fromEntries(PATHS.filter((p)=>p.startsWith('src/')||p.startsWith('tests/')||p.startsWith('tools/')||p.startsWith('data/')).map((p)=>[p,row(p)])),plan:row(`${HERE}/PLAN.md`),finalizer:row(`${HERE}/finalize.cjs`),config,qualification:entry,control_fixture_manifest:row(controlManifestPath),cheap_commands:row(`${HERE}/CHEAP_CHECK_COMMANDS.v2.json`),launch_manifest:row(`${HERE}/FROZEN_LAUNCH_COMMAND.v2.json`),simulation_executed:false},null,2)+'\n',{flag:'wx'});
  process.stdout.write(JSON.stringify({pass:true,head,config_sha256:config.sha256,allowed_artifacts:ALLOWED.length,status:frozen.status})+'\n');
}
try { main(); } catch(e) { process.stderr.write(String(e.stack||e)+'\n'); process.exitCode=1; }


