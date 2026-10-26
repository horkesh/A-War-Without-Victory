#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');

const ROOT = 'C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory';
const HERE = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1';
const REQUIRED_FILES = ['final_save.json','save_w15.json','save_w16.json','save_w33.json','save_w34.json','initial_save.json','run_meta.json','run_summary.json','weekly_report.jsonl','control_delta.json','activity_summary.json','formation_delta.json','destroyed_brigades.json','operation_aars.json','watched_operations.json','replay_save_manifest.json','brigade_temporal_log.jsonl','displacement_event_log.jsonl','end_report.md'];
const UNREACHED = ['apr1994_checkpoint','apr1995_checkpoint','oct1995_checkpoint','toljenak_turn135_capture','prisoje_turn188_capture','donji_vrbljani_turn188_capture','protected_late_outcomes','full_188_operation_gates'];
const ATTR_KEYS = ['total_changes','combat','paramilitary','consolidation','abandoned','init_overrides','other'];
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const slash = (s) => s.replaceAll('\\','/');
const abs = (p) => path.resolve(ROOT,p);
function write(file,value) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2)+'\n',{flag:'wx'}); }
function json(file) { return JSON.parse(fs.readFileSync(file,'utf8')); }
function args() { const a=process.argv.slice(2), out={}; for(let i=0;i<a.length;i+=2) out[a[i]]=a[i+1]; return out; }
function fail(message) { throw new Error(message); }
function currentHead() { return cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT,encoding:'utf8'}).trim().toLowerCase(); }
function clean() { return cp.execFileSync('git',['status','--porcelain=v1','--untracked-files=normal'],{cwd:ROOT,encoding:'utf8'}).trim()===''; }
function validateConfig(c) {
  if(c.schema!=='awwv.combat-fatigue-owner-prefix39.config.v1'||c.status!=='BOUND_REVIEW_REQUIRED') fail('unbound config');
  if(!/^[0-9a-f]{40}$/.test(c.expected_head)) fail('invalid expected head');
  if(c.weeks!==39||JSON.stringify(c.save_weeks)!=='[15,16,33,34]'||c.output_parent!=='runs/player-parity-fatigue-owner-39-20261026-01') fail('launch scope changed');
  const expectedEnvironment={AWWV_DEBUG_AXIS_READINESS:'Mistral',AWWV_DEBUG_MOVEMENT_FORMATIONS:'hvo_1st_guard_abb',AWWV_DEBUG_REASON_CODES:'movement_phase,commander_creation,battle_stack,operation_capture_ownership,mistral_tg_activation,battle_power',AWWV_MISTRAL_PREP_TRACE:'1',AWWV_S6_GRADE_RUN:'true'};
  if(JSON.stringify(c.diagnostic_environment)!==JSON.stringify(expectedEnvironment)) fail('diagnostic environment changed');
  if(c.score?.minimum!==707||c.score?.denominator!==712||c.score?.semantics!=='strict_minimum__no_tolerance__improvements_allowed'||c.score?.formerly_correct_n91_n92_max_losses!==0) fail('score contract changed');
  if(!/^[0-9a-f]{64}$/.test(c.score?.canonical_excerpt_sha256??'')) fail('canonical scorer excerpt is unbound');
  if(c.controls?.positive_expected_score!==707||c.controls?.negative_expected_score!==705||c.controls?.negative_expected_n91_losses!==2||c.controls?.negative_expected_n92_losses!==2||JSON.stringify(c.controls?.negative_expected_lost_osids)!=='["op:foca:donje_zesce","op:trnovo:tosici"]') fail('control contract changed');
  if(!c.control_fixture?.manifest||!c.control_fixture?.inputs||Object.keys(c.control_fixture.inputs).length!==5) fail('control fixture is unbound');
  if(!Array.isArray(c.retained_roots)||c.retained_roots.length!==14) fail('retained roots changed');
}
function validateRuntime(c, configFile, configSha) {
  const bytes=fs.readFileSync(configFile); if(sha(bytes)!==configSha) fail('external config sha256 mismatch'); validateConfig(c);
  if(process.cwd().replaceAll('\\','/')!==ROOT) fail('literal C worktree required');
  if(process.execPath.replaceAll('\\','/').toLowerCase()!==c.node.path.toLowerCase()||process.version!==c.node.version) fail('Node runtime mismatch');
  if(currentHead()!==c.expected_head||!clean()) fail('clean expected HEAD required');
  for(const row of Object.values(c.required_bindings)) { const b=fs.readFileSync(abs(row.path)); if(b.length!==row.bytes||sha(b)!==row.sha256) fail(`binding mismatch: ${row.path}`); }
  const manifestBytes=fs.readFileSync(abs(c.control_fixture.manifest.path));if(manifestBytes.length!==c.control_fixture.manifest.bytes||sha(manifestBytes)!==c.control_fixture.manifest.sha256)fail('control fixture manifest mismatch');
  const manifest=JSON.parse(manifestBytes.toString('utf8'));if(JSON.stringify(manifest.inputs)!==JSON.stringify(c.control_fixture.inputs)||manifest.canonical_excerpt_sha256!==c.score.canonical_excerpt_sha256)fail('control fixture manifest content mismatch');
  for(const row of Object.values(c.control_fixture.inputs)){const b=fs.readFileSync(abs(row.path));if(b.length!==row.bytes||sha(b)!==row.sha256)fail(`control fixture input mismatch: ${row.path}`);}
  const evaluator=fs.readFileSync(abs(c.score.authoritative_reader),'utf8'), excerptStart=evaluator.indexOf('  const checkpoints = {};\n  for (const [label, turn, floor] of CHECKPOINTS) {'), excerptEnd=evaluator.indexOf('\n\n  const sharedDeltas',excerptStart);
  if(excerptStart<0||excerptEnd<0||sha(Buffer.from(evaluator.slice(excerptStart,excerptEnd),'utf8'))!==c.score.canonical_excerpt_sha256) fail('canonical scoring excerpt mismatch');
  if(fs.existsSync(abs(c.output_parent))) fail('output parent must be absent');
}
function preflight(c,configFile,configSha) {
  validateRuntime(c,configFile,configSha);
  for(const p of [c.controls.positive,c.controls.negative,'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n91','runs/apr1992_definitive_188w__6deb5845c150c196__w188_n92']) {
    if(!fs.statSync(abs(p),{throwIfNoEntry:false})?.isDirectory()) fail(`missing retained run: ${p}`);
    if(!fs.statSync(abs(`${p}/save_w39.json`),{throwIfNoEntry:false})?.isFile()) fail(`missing week39 state: ${p}`);
  }
  for(const p of c.retained_roots) if(!fs.statSync(abs(p),{throwIfNoEntry:false})?.isDirectory()) fail(`missing retained root: ${p}`);
  const controls=controlChecks(c);if(!controls.pass)fail('live preflight control signature mismatch');
  return {pass:true,head:c.expected_head,node:process.version,bindings:Object.keys(c.required_bindings).length,control_fixture_manifest_sha256:c.control_fixture.manifest.sha256,controls,retained_inventory_deferred:true,simulation_executed:false};
}
function listFiles(root,dir=root) { let rows=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,e.name); if(e.isDirectory()) rows=rows.concat(listFiles(root,p)); else if(e.isFile()) rows.push(slash(path.relative(root,p))); else fail(`unsupported retained entry: ${p}`);} return rows; }
function fullInventory(rootRelative) {
  const root=abs(rootRelative), files=listFiles(root), digest=crypto.createHash('sha256'); let bytes=0;
  for(const rel of files){const b=fs.readFileSync(path.join(root,rel)); bytes+=b.length; digest.update(`${rel}\0${b.length}\0${sha(b)}\n`);}
  return {root:rootRelative,count:files.length,bytes,aggregate_sha256:digest.digest('hex')};
}
function inventories(c){return c.retained_roots.map(fullInventory);}
function child(name, executable, argv, evidence, timeout, environment) {
  const stdout=path.join(evidence,`${name}.stdout.log`), stderr=path.join(evidence,`${name}.stderr.log`); fs.mkdirSync(path.dirname(stdout),{recursive:true});
  let outFd,errFd,result; try{outFd=fs.openSync(stdout,'wx');errFd=fs.openSync(stderr,'wx');result=cp.spawnSync(executable,argv,{cwd:ROOT,env:environment?{...process.env,...environment}:process.env,windowsHide:true,timeout,killSignal:'SIGKILL',stdio:['ignore',outFd,errFd]});}finally{if(outFd!==undefined)fs.closeSync(outFd);if(errFd!==undefined)fs.closeSync(errFd);}
  const timed=result.error?.code==='ETIMEDOUT', record={name,status:result.status===0&&!result.error?'PASS':timed?'TIMEOUT':result.error?'SPAWN_ERROR':'FAIL',pass:result.status===0&&!result.error,exit:result.status??null,process_status:result.status??null,signal:result.signal??null,spawn_error:result.error?{name:result.error.name,code:result.error.code??null,message:result.error.message}:null,timed_out:timed,argv:[executable,...argv]};
  write(path.join(evidence,`${name}.execution.json`),record); return record;
}
function graphCheck(state) {
  const m=state?.military??{}, edges=m.war_front_edges_osid??[], sectors=m.corps_front_sectors??{}, forms=m.formations??{};
  const edgeIds=new Set(), invalidEndpoints=[], duplicateEdges=[];
  for(const e of edges){if(!String(e?.a).startsWith('op:')||!String(e?.b).startsWith('op:'))invalidEndpoints.push(e?.edge_id??null);if(edgeIds.has(e?.edge_id))duplicateEdges.push(e?.edge_id);edgeIds.add(e?.edge_id);}
  const missingSectorEdges=[], malformed=[], mismatches=[], duplicates=[], owners=new Map();
  for(const [sid,s] of Object.entries(sectors)){
    if(!s||typeof s!=='object'){malformed.push({sector_id:sid,field:'sector'});continue;}
    const invalidFields=[];if(!Array.isArray(s.edge_ids))invalidFields.push('edge_ids');if(!Array.isArray(s.assigned_brigade_ids))invalidFields.push('assigned_brigade_ids');if(!Array.isArray(s.reserve_brigade_ids))invalidFields.push('reserve_brigade_ids');if(s.rear_brigade_ids!==undefined&&!Array.isArray(s.rear_brigade_ids))invalidFields.push('rear_brigade_ids');
    if(invalidFields.length){for(const field of invalidFields)malformed.push({sector_id:sid,field});continue;}
    for(const eid of s.edge_ids)if(!edgeIds.has(eid))missingSectorEdges.push({sector_id:sid,edge_id:eid});
    for(const [role,field] of [['assigned','assigned_brigade_ids'],['reserve','reserve_brigade_ids'],['rear','rear_brigade_ids']]){
      const raw=s[field]; if(raw!==undefined&&!Array.isArray(raw)){malformed.push({sector_id:sid,field});continue;} const ids=raw??[];
      for(const fid of ids){if(typeof fid!=='string'){mismatches.push({sector_id:sid,role,formation_id:fid,reason:'non_string'});continue;} const owner=owners.get(fid);if(owner)duplicates.push({formation_id:fid,first:owner,duplicate:`${sid}:${role}`});else owners.set(fid,`${sid}:${role}`);if(!forms[fid]||forms[fid]?.assignment?.sector_id!==sid)mismatches.push({sector_id:sid,role,formation_id:fid,formation_sector_id:forms[fid]?.assignment?.sector_id??null});}
    }
  }
  for(const [fid,f] of Object.entries(forms)){const sid=f?.assignment?.sector_id;if(!sid)continue;const s=sectors[sid];if(!s){mismatches.push({formation_id:fid,sector_id:sid,reason:'missing_sector'});continue;}const rostered=['assigned_brigade_ids','reserve_brigade_ids','rear_brigade_ids'].some((field)=>Array.isArray(s[field])&&s[field].includes(fid));if(!rostered)mismatches.push({formation_id:fid,sector_id:sid,reason:'missing_from_all_rosters'});}
  const pass=edges.length>0&&Object.keys(sectors).length>0&&!invalidEndpoints.length&&!duplicateEdges.length&&!missingSectorEdges.length&&!malformed.length&&!mismatches.length&&!duplicates.length;
  return {pass,front_edges:edges.length,sectors:Object.keys(sectors).length,rostered_formations:owners.size,invalid_endpoints:invalidEndpoints,duplicate_edges:duplicateEdges,missing_sector_edges:missingSectorEdges,malformed_rosters:malformed,roster_mismatches:mismatches,duplicate_membership:duplicates};
}
function fixtureChecks() {
  const good={military:{war_front_edges_osid:[{a:'op:a',b:'op:b',edge_id:'e'}],corps_front_sectors:{s:{edge_ids:['e'],assigned_brigade_ids:['a'],reserve_brigade_ids:['v'],rear_brigade_ids:['r']}},formations:{a:{assignment:{sector_id:'s'}},v:{assignment:{sector_id:'s'}},r:{assignment:{sector_id:'s'}}}}};
  const clone=()=>structuredClone(good), rear=clone(), reserve=clone(), reverse=clone(), optionalRear=clone(), missingAssigned=clone(), missingReserve=clone(), malformedAssigned=clone(), malformedReserve=clone();
  rear.military.formations.r.assignment.sector_id='other'; delete reserve.military.formations.v; reverse.military.corps_front_sectors.s.reserve_brigade_ids=[];delete optionalRear.military.corps_front_sectors.s.rear_brigade_ids;delete optionalRear.military.formations.r;delete missingAssigned.military.corps_front_sectors.s.assigned_brigade_ids;delete missingReserve.military.corps_front_sectors.s.reserve_brigade_ids;malformedAssigned.military.corps_front_sectors.s.assigned_brigade_ids='a';malformedReserve.military.corps_front_sectors.s.reserve_brigade_ids='v';
  const checks={valid_roles_pass:graphCheck(good).pass,optional_rear_absence_passes:graphCheck(optionalRear).pass,missing_assigned_required_array_rejected:!graphCheck(missingAssigned).pass,missing_reserve_required_array_rejected:!graphCheck(missingReserve).pass,malformed_assigned_required_array_rejected:!graphCheck(malformedAssigned).pass,malformed_reserve_required_array_rejected:!graphCheck(malformedReserve).pass,rear_wrong_sector_rejected:!graphCheck(rear).pass,reserve_missing_formation_rejected:!graphCheck(reserve).pass,formation_to_reserve_reverse_mismatch_rejected:!graphCheck(reverse).pass};
  return {pass:Object.values(checks).every(Boolean),checks};
}
function evaluateJan(c,label,stateFile) {
  const reference=json(abs(c.score.reference)).by_settlement_id, ids=Object.keys(reference).sort(), candidate=json(stateFile).political?.political_controllers??{}, against={};
  for(const [name,dir] of [['n91','runs/apr1992_definitive_188w__6deb5845c150c196__w188_n91'],['n92','runs/apr1992_definitive_188w__6deb5845c150c196__w188_n92']]){
    const baseline=json(abs(`${dir}/save_w39.json`)).political?.political_controllers??{}, formerlyCorrect=ids.filter((id)=>baseline[id]===reference[id]);
    const lost=formerlyCorrect.filter((id)=>candidate[id]!==reference[id]).map((id)=>({id,baseline:baseline[id],candidate:candidate[id],expected:reference[id]}));
    against[name]={formerly_correct:formerlyCorrect.length,lost};
  }
  const score=ids.filter((id)=>candidate[id]===reference[id]).length;return {schema:'awwv.scenario-postturn-prefix39.canonical-jan-adapter.v2',label,source:{path:c.score.authoritative_reader,checkpoint_excerpt_sha256:c.score.canonical_excerpt_sha256,control_fixture_manifest_sha256:c.control_fixture.manifest.sha256},turn:39,denominator:ids.length,floor:c.score.minimum,score,against,n91_losses:against.n91.lost.length,n92_losses:against.n92.lost.length,n91_lost_osids:against.n91.lost.map((x)=>x.id),n92_lost_osids:against.n92.lost.map((x)=>x.id),pass:ids.length===c.score.denominator&&score>=c.score.minimum&&against.n91.lost.length===0&&against.n92.lost.length===0,later_horizons_evaluated:false};
}
function canonicalJan(c,label,stateFile,evidence){const result=evaluateJan(c,label,stateFile);write(path.join(evidence,`evaluation-${label}.json`),result);return result;}
function controlChecks(c){
  const positive=evaluateJan(c,'positive',abs(`${c.controls.positive}/save_w39.json`)),negative=evaluateJan(c,'negative',abs(`${c.controls.negative}/save_w39.json`)),lost=c.controls.negative_expected_lost_osids;
  const positivePass=positive.score===707&&positive.denominator===712&&positive.n91_losses===0&&positive.n92_losses===0&&positive.pass;
  const negativePass=negative.score===705&&negative.denominator===712&&negative.n91_losses===2&&negative.n92_losses===2&&JSON.stringify(negative.n91_lost_osids)===JSON.stringify(lost)&&JSON.stringify(negative.n92_lost_osids)===JSON.stringify(lost)&&!negative.pass;
  return {pass:positivePass&&negativePass,positive,negative,positive_pass:positivePass,negative_signature_pass:negativePass};
}
function validAttribution(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&JSON.stringify(Object.keys(value).sort())===JSON.stringify([...ATTR_KEYS].sort())&&ATTR_KEYS.every((key)=>Number.isSafeInteger(value[key])&&value[key]>=0)&&value.total_changes===value.combat+value.paramilitary+value.consolidation+value.abandoned+value.init_overrides+value.other;}
function sameAttribution(a,b){return validAttribution(a)&&validAttribution(b)&&ATTR_KEYS.every((key)=>a[key]===b[key]);}
function inspectAttribution(summary,weekly){
  const failures=[];if(!validAttribution(summary?.control_change_attribution))failures.push({kind:'summary_missing_or_malformed'});
  if(!Array.isArray(weekly)||weekly.length===0)failures.push({kind:'weekly_missing'});else weekly.forEach((row,index)=>{if(!validAttribution(row?.control_change_attribution))failures.push({kind:'weekly_missing_or_malformed',index});if(!sameAttribution(row?.control_change_attribution,row?.behavioral_health?.control_change_attribution))failures.push({kind:'weekly_behavioral_health_mirror_divergence',index});});
  return {pass:failures.length===0,authority:['src/scenario/control_change_attribution.ts','tests/scenario_control_change_attribution_contract.test.ts'],summary:summary?.control_change_attribution??null,weekly_rows:Array.isArray(weekly)?weekly.length:0,failures};
}
function attributionGate(candidate){const summary=json(path.join(candidate,'run_summary.json')),weekly=fs.readFileSync(path.join(candidate,'weekly_report.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);return {schema:'awwv.scenario-postturn-prefix39.control-attribution.v1',...inspectAttribution(summary,weekly)};}
function attributionFixtures(){const a={total_changes:3,combat:1,paramilitary:1,consolidation:0,abandoned:0,init_overrides:1,other:0},row={control_change_attribution:{...a},behavioral_health:{control_change_attribution:{...a}}},malformed={...a,combat:0.5},divergentTotal={...a,total_changes:4},mirror={...a,other:1,total_changes:4};const checks={positive_passes:inspectAttribution({control_change_attribution:a},[row]).pass,missing_summary_rejected:!inspectAttribution({},[row]).pass,malformed_summary_rejected:!inspectAttribution({control_change_attribution:malformed},[row]).pass,divergent_summary_total_rejected:!inspectAttribution({control_change_attribution:divergentTotal},[row]).pass,missing_weekly_rejected:!inspectAttribution({control_change_attribution:a},[]).pass,malformed_weekly_rejected:!inspectAttribution({control_change_attribution:a},[{...row,control_change_attribution:malformed}]).pass,divergent_weekly_mirror_rejected:!inspectAttribution({control_change_attribution:a},[{...row,behavioral_health:{control_change_attribution:mirror}}]).pass};return {pass:Object.values(checks).every(Boolean),checks};}
function saveProvenance(c,candidate) {
  const missing=REQUIRED_FILES.filter((x)=>!fs.statSync(path.join(candidate,x),{throwIfNoEntry:false})?.isFile()); const final=json(path.join(candidate,'final_save.json')), s15=json(path.join(candidate,'save_w15.json')), s16=json(path.join(candidate,'save_w16.json')), s33=json(path.join(candidate,'save_w33.json')), s34=json(path.join(candidate,'save_w34.json')), meta=json(path.join(candidate,'run_meta.json'));
  const weekly=fs.readFileSync(path.join(candidate,'weekly_report.jsonl'),'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const rows=meta.provenance?.consumed_inputs?.files??[], normalized=(b)=>sha(Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n').replace(/\r/g,'\n'),'utf8')), inputMismatches=[];
  for(const row of rows){const p=abs(row.path);if(!fs.existsSync(p)||normalized(fs.readFileSync(p))!==row.sha256)inputMismatches.push(row.path);}
  const pass=!missing.length&&final.meta?.turn===39&&s15.meta?.turn===15&&s16.meta?.turn===16&&s33.meta?.turn===33&&s34.meta?.turn===34&&weekly.length===39&&weekly.every((r,i)=>r.week_index===i+1)&&meta.provenance?.git_commit===c.expected_head&&meta.provenance?.git_dirty===false&&rows.length>0&&!inputMismatches.length;
  return {pass,missing,turns:{final:final.meta?.turn??null,save_w15:s15.meta?.turn??null,save_w16:s16.meta?.turn??null,save_w33:s33.meta?.turn??null,save_w34:s34.meta?.turn??null},weekly_rows:weekly.length,weekly_ordered:weekly.every((r,i)=>r.week_index===i+1),git_commit:meta.provenance?.git_commit??null,git_dirty:meta.provenance?.git_dirty??null,consumed_inputs:rows.length,current_input_mismatches:inputMismatches};
}
function horizon(){return {pass:true,gating:false,horizon:39,items:UNREACHED.map((name)=>({name,status:'UNREACHED_HORIZON',pass:null,retired:false}))};}
function selftest(c,configFile,configSha,evidence){validateRuntime(c,configFile,configSha);const fixtures=fixtureChecks(),attribution=attributionFixtures(),controls=controlChecks(c),positive=canonicalJan(c,'positive',abs(`${c.controls.positive}/save_w39.json`),evidence),negative=canonicalJan(c,'negative',abs(`${c.controls.negative}/save_w39.json`),evidence);const pass=fixtures.pass&&attribution.pass&&controls.pass;write(path.join(evidence,'selftest-result.json'),{schema:'awwv.scenario-postturn-prefix39.selftest.v2',pass,simulation_executed:false,fixtures,control_attribution_fixtures:attribution,controls,positive,negative});if(!pass)process.exitCode=2;}
function ensureJson(file,value){if(!fs.existsSync(file))write(file,value);}
function ensureText(file,value=''){if(!fs.existsSync(file))write(file,value);}
function unreached(name,reason){return {name,status:reason,pass:false,exit:null,process_status:null,signal:null,spawn_error:null,timed_out:false,argv:[]};}
function campaign(c,configFile,configSha,evidence){
  const started=Date.now(), deadline=started+300000; let opening,closing,candidate=null,campaignRecord=null,error=null,required=[];
  try{
    const pf=preflight(c,configFile,configSha);write(path.join(evidence,'preflight.json'),pf);opening=inventories(c);write(path.join(evidence,'opening-preservation.json'),opening);
    const argv=['node_modules/tsx/dist/cli.mjs','tools/scenario_runner/run_scenario_with_preflight.ts','--scenario',c.scenario,'--weeks','39','--out',c.output_parent,'--unique','--save-weeks','15,16,33,34'];write(path.join(evidence,'launch.json'),{argv:[process.execPath,...argv],diagnostic_environment:c.diagnostic_environment,cap_ms:300000,attempts:1,retries:0});
    campaignRecord=child('campaign',process.execPath,argv,evidence,Math.max(1,deadline-Date.now()-30000),c.diagnostic_environment);if(!campaignRecord.pass)fail(`campaign ${campaignRecord.status}`);
    const parent=abs(c.output_parent), children=fs.readdirSync(parent,{withFileTypes:true}).filter((x)=>x.isDirectory());if(children.length!==1)fail(`expected one candidate child, found ${children.length}`);candidate=path.join(parent,children[0].name);
    const post=path.join(evidence,'postrun');fs.mkdirSync(post);
    const candidateScore=canonicalJan(c,'candidate',path.join(candidate,'final_save.json'),post), positive=canonicalJan(c,'positive',abs(`${c.controls.positive}/save_w39.json`),post), negative=canonicalJan(c,'negative',abs(`${c.controls.negative}/save_w39.json`),post);
    const expectedLost=c.controls.negative_expected_lost_osids, scoring={schema:'awwv.scenario-postturn-prefix39.scoring.v2',pass:candidateScore.score>=707&&candidateScore.denominator===712&&candidateScore.n91_losses===0&&candidateScore.n92_losses===0&&positive.score===707&&positive.denominator===712&&positive.n91_losses===0&&positive.n92_losses===0&&positive.pass&&negative.score===705&&negative.denominator===712&&negative.n91_losses===2&&negative.n92_losses===2&&JSON.stringify(negative.n91_lost_osids)===JSON.stringify(expectedLost)&&JSON.stringify(negative.n92_lost_osids)===JSON.stringify(expectedLost)&&!negative.pass,candidate:candidateScore,positive_control:positive,negative_control:negative};write(path.join(post,'scoring.json'),scoring);
    const consistency=child('consistency',process.execPath,['tools/validate_run_consistency.cjs',candidate],post,Math.max(1,deadline-Date.now()-30000));
    const health=child('health',process.execPath,['tools/engine_health_gate.cjs',candidate,'--horizon','40w','--strict','--json'],post,Math.max(1,deadline-Date.now()-30000));
    const movementArg=['tools/diagnostics/movement_phase_coverage.cjs',candidate,'--json'];for(let t=1;t<=39;t++)movementArg.push('--expect-inactive-boundary',`hvo_1st_guard_abb:${t}`);const movement=child('movement',process.execPath,movementArg,post,Math.max(1,deadline-Date.now()-30000));
    const final=json(path.join(candidate,'final_save.json')), graph=graphCheck(final), saves=saveProvenance(c,candidate), attribution=attributionGate(candidate), horizons=horizon();write(path.join(post,'graph-roster.json'),graph);write(path.join(post,'save-provenance.json'),saves);write(path.join(post,'control-attribution.json'),attribution);write(path.join(post,'horizon-status.json'),horizons);
    required=[{name:'scoring',pass:scoring.pass},{name:'consistency',pass:consistency.pass},{name:'health',pass:health.pass},{name:'movement',pass:movement.pass},{name:'graph-roster',pass:graph.pass},{name:'save-provenance',pass:saves.pass},{name:'control-attribution',pass:attribution.pass}];
  }catch(e){error=String(e.stack||e);}finally{
    ensureJson(path.join(evidence,'preflight.json'),{pass:false,status:'UNREACHED_PREFLIGHT_FAILURE'});
    ensureJson(path.join(evidence,'opening-preservation.json'),{pass:false,status:'UNREACHED_PREFLIGHT_FAILURE'});
    ensureJson(path.join(evidence,'launch.json'),{status:'UNREACHED_PREFLIGHT_FAILURE',argv:[]});
    ensureText(path.join(evidence,'campaign.stdout.log'));ensureText(path.join(evidence,'campaign.stderr.log'),campaignRecord?'':'UNREACHED_PREFLIGHT_FAILURE\n');ensureJson(path.join(evidence,'campaign.execution.json'),campaignRecord??unreached('campaign','UNREACHED_PREFLIGHT_FAILURE'));
    if(Array.isArray(opening)){try{closing=inventories(c);}catch(e){closing={pass:false,status:'CLOSING_INVENTORY_ERROR',error:String(e)};if(!error)error=String(e);}}else closing={pass:false,status:'UNREACHED_OPENING_INVENTORY'};
    write(path.join(evidence,'closing-preservation.json'),closing);
    const post=path.join(evidence,'postrun');fs.mkdirSync(post,{recursive:true});
    for(const label of ['candidate','positive','negative'])ensureJson(path.join(post,`evaluation-${label}.json`),{pass:false,status:'UNREACHED_UPSTREAM_FAILURE',later_horizons_evaluated:false});
    ensureJson(path.join(post,'scoring.json'),{pass:false,status:'UNREACHED_UPSTREAM_FAILURE'});
    for(const name of ['consistency','health','movement']){ensureText(path.join(post,`${name}.stdout.log`));ensureText(path.join(post,`${name}.stderr.log`),'UNREACHED_UPSTREAM_FAILURE\n');ensureJson(path.join(post,`${name}.execution.json`),unreached(name,'UNREACHED_UPSTREAM_FAILURE'));}
    ensureJson(path.join(post,'graph-roster.json'),{pass:false,status:'UNREACHED_UPSTREAM_FAILURE'});ensureJson(path.join(post,'save-provenance.json'),{pass:false,status:'UNREACHED_UPSTREAM_FAILURE'});ensureJson(path.join(post,'control-attribution.json'),{pass:false,status:'UNREACHED_UPSTREAM_FAILURE'});ensureJson(path.join(post,'horizon-status.json'),horizon());
    const preservation=JSON.stringify(opening)===JSON.stringify(closing), pass=!error&&campaignRecord?.pass===true&&required.length===7&&required.every((x)=>x.pass)&&preservation&&Date.now()<=deadline;
    write(path.join(evidence,'result.json'),{schema:'awwv.scenario-postturn-prefix39.result.v1',pass,status:pass?'PREFIX39_PASS__ELIGIBLE_FOR_SEPARATE_188_PLAN':'STOP_NO_RETRY',candidate:candidate?slash(path.relative(ROOT,candidate)):null,error,campaign:campaignRecord,required,preservation_equal:preservation,elapsed_ms:Date.now()-started,cap_ms:300000,retries:0,simulation_count:campaignRecord?1:0,full_188_executed:false,full_suite_executed:false});if(!pass)process.exitCode=2;
  }
}
function main(){const a=args(),mode=a['--mode'],configFile=abs(a['--config']??''),evidence=path.resolve(a['--evidence']??'');if(!['selftest','preflight','campaign'].includes(mode)||!a['--config-sha256']||!a['--evidence'])fail('invalid arguments');if(!fs.statSync(evidence,{throwIfNoEntry:false})?.isDirectory())fail('preserved wrapper evidence directory required');const c=json(configFile);if(mode==='selftest')selftest(c,configFile,a['--config-sha256'],evidence);else if(mode==='preflight')write(path.join(evidence,'preflight-result.json'),preflight(c,configFile,a['--config-sha256']));else campaign(c,configFile,a['--config-sha256'],evidence);}
try{main();}catch(e){process.stderr.write(String(e.stack||e)+'\n');process.exitCode=1;}


