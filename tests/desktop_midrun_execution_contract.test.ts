import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {deserialize as deserializeV8} from 'node:v8';
import {createHash} from 'node:crypto';
import {normalizeScenario} from '../src/scenario/scenario_loader.js';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {inspect,isDeepStrictEqual} from 'node:util';
import {runScenario} from '../src/scenario/scenario_runner.js';
import {BotManager} from '../src/sim/bot/bot_manager.js';
import {serializeState} from '../src/state/serialize.js';
import {loadStateFromPath} from '../src/desktop/desktop_sim.js';
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {advanceTurn,startNewCampaign} from '../src/desktop/desktop_sim.js';
import {loadOperationalEdges} from '../src/data/operational_data.js';
import {deserializeState,serializeRuntimeState} from '../src/state/serialize.js';
import type {FactionId,GameState} from '../src/state/game_state.js';
import * as pipeline from '../src/sim/turn_pipeline.js';
import type {TurnInput} from '../src/sim/turn_pipeline_types.js';

const bases=new Map<FactionId,GameState>();
let edges:Awaited<ReturnType<typeof loadOperationalEdges>>;
const actualRunTurn=pipeline.runTurn;
beforeAll(async()=>{
 for(const faction of ['RS','RBiH','HRHB'] as const)bases.set(faction,(await startNewCampaign(process.cwd(),faction,'apr_1992')).state);
 edges=await loadOperationalEdges(process.cwd());
},60_000);
afterEach(()=>vi.restoreAllMocks());

function fixture(faction:FactionId,autonomy:0|1|2,headless:boolean){
 const state=structuredClone(bases.get(faction)!);
 // Synthetic later-turn boundary, not a campaign result or historical outcome.
 state.meta.turn=12;state.meta.autonomy_level=autonomy;state.meta.headless_scenario_auto_control=headless;
 state.meta.supply_reserves_enabled=true;
 state.military.general_supply_reserve={RS:35,RBiH:19,HRHB:55};
 state.military.heavy_munitions_reserve={RS:40,RBiH:20,HRHB:60};
 const active=Object.entries(state.military.corps_command??{}).sort(([a],[b])=>a<b?-1:a>b?1:0).flatMap(([,c])=>c.active_operations??[]).find(op=>op.participating_brigades.length>0)!;
 expect(active).toBeDefined();active.phase='execution';active.phase_started_turn=12;
 for(const axis of active.axes??[])if(axis.status!=='complete')axis.status='executing';
 const pc=state.political.political_controllers??{};
 const candidate=Object.values(state.military.formations).filter(f=>f.kind==='brigade'&&f.status==='active'&&f.location_osid).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0).map(f=>({f,edge:edges.find(e=>(e.a===f.location_osid&&pc[e.b]===f.faction)||(e.b===f.location_osid&&pc[e.a]===f.faction))})).find(x=>x.edge)!;
 expect(candidate).toBeDefined();const {f,edge}=candidate;const from=f.location_osid!;const to=edge!.a===from?edge!.b:edge!.a;
 state.military.brigade_movement_state??={};state.military.brigade_movement_state[f.id]={status:'in_transit',stance:'column',destination_sids:[to],path:[from,to],turns_remaining:2,owner:'bot_discretionary'};
 for(const [i,formation] of Object.values(state.military.formations).filter(f=>f.kind==='brigade').entries())formation.ops={fatigue:6.5+i%4,last_supplied_turn:10};
 return {state,transitId:f.id,operationName:active.name};
}

describe('production/shared-turn and mid-run reload contract',()=>{
 it.each([
  ['RS',0,false],['RBiH',1,false],['HRHB',2,false],['RS',0,true],
 ] as const)('full next state/report agree for %s autonomy%s headless%s',async(faction,autonomy,headless)=>{
  const {state,transitId,operationName}=fixture(faction,autonomy,headless);
  const bytes=serializeRuntimeState(state),loaded=deserializeState(bytes);
  expect(loaded.military.brigade_movement_state?.[transitId].status).toBe('in_transit');
  expect(Object.values(loaded.military.corps_command??{}).flatMap(c=>c.active_operations).some(op=>op.name===operationName&&op.phase==='execution')).toBe(true);
  expect(loaded.military.general_supply_reserve).toEqual(state.military.general_supply_reserve);
  expect(serializeRuntimeState(loaded)).toBe(bytes);
  let captured:{state:GameState,input:TurnInput}|undefined;
  const spy=vi.spyOn(pipeline,'runTurn').mockImplementation(async(s,input)=>{captured={state:structuredClone(s),input};return actualRunTurn(s,input);});
  const before=JSON.stringify(state),desktop=await advanceTurn(state,process.cwd());
  expect(desktop.error).toBeUndefined();expect(JSON.stringify(state)).toBe(before);expect(captured).toBeDefined();
  const shared=await actualRunTurn(structuredClone(captured!.state),captured!.input);
  expect(shared.status).toBe('success');
  if(shared.status!=='success')throw new Error('Shared turn failed');
  expect(serializeRuntimeState(shared.nextState)).toBe(serializeRuntimeState(desktop.state));
  expect(shared.report).toEqual(desktop.report?.details);
  spy.mockRestore();
  const reloaded=await advanceTurn(loaded,process.cwd());expect(reloaded.error).toBeUndefined();
  expect(serializeRuntimeState(reloaded.state)).toBe(serializeRuntimeState(desktop.state));
  expect(reloaded.report).toEqual(desktop.report);
 },90_000);
});


it('actual adapters and a fresh-process canonical reload agree at the full boundary',async()=>{
 const root=process.cwd(),dir=await mkdtemp(join(tmpdir(),'awwv-actual-adapter-'));
 let passed=false;
 try {
  const {state,transitId,operationName}=fixture('RS',2,true);
  const save=join(dir,'resume-canonical.json');await writeFile(save,serializeState(state));
  let beforeBot:GameState|undefined;let botCalls=0;
  const actualBots=BotManager.prototype.runBots;
  const botSpy=vi.spyOn(BotManager.prototype,'runBots').mockImplementation(function(this:BotManager,...args){beforeBot=structuredClone(args[0]);botCalls++;return actualBots.apply(this,args);});
  const actualInputs:TurnInput[]=[];const actualResults:Awaited<ReturnType<typeof actualRunTurn>>[]=[];
  const turnSpy=vi.spyOn(pipeline,'runTurn').mockImplementation(async(...args)=>{actualInputs.push(args[1]);const result=await actualRunTurn(...args);actualResults.push(structuredClone(result));return result;});
  const observations:Array<{state:GameState,report:unknown}>=[];
  // Match adapter inputs explicitly: the definitive fixture enables legacy harness
  // baseline_ops actions absent from desktop. Their behavior is a separate contract.
  const scenario=JSON.parse(await readFile(join(root,'data/scenarios/apr1992_definitive_188w.json'),'utf8'));
  expect(scenario.use_harness_bots).toBe(true);
  expect(normalizeScenario(scenario).turns?.find(t=>t.week_index===12)?.actions.some(a=>a.type==='baseline_ops')).toBe(true);
  scenario.use_harness_bots=false;
  expect(normalizeScenario(scenario).turns?.some(t=>t.actions.some(a=>a.type==='baseline_ops'))).toBe(false);
  const scenarioPath=join(dir,'same-input-scenario.json');await writeFile(scenarioPath,JSON.stringify(scenario));
  const result=await runScenario({scenarioPath,baseDir:root,resumeFromSavePath:save,resumeFromWeekIndex:12,weeksOverride:13,use_smart_bots:true,outDirOverride:join(dir,'scenario-one-step'),consoleDiagnostics:false,diagnosticTurnBoundaryObserver:({state,report})=>observations.push({state,report})});
  botSpy.mockRestore();expect(botCalls).toBe(1);expect(observations).toHaveLength(1);expect(result.paths.final_save).toBeTruthy();
  expect(beforeBot?.military.brigade_movement_state?.[transitId].status).toBe('in_transit');
  expect(Object.values(beforeBot!.military.corps_command??{}).flatMap(c=>c.active_operations).some(op=>op.name===operationName&&op.phase==='execution')).toBe(true);
  expect(beforeBot!.military.general_supply_reserve).toEqual(state.military.general_supply_reserve);
  const preparedSave=join(dir,'prepared-canonical.json');await writeFile(preparedSave,serializeState(beforeBot!));
  const cold=(await loadStateFromPath(preparedSave,root)).state;
  const direct=await advanceTurn(beforeBot!,root),loaded=await advanceTurn(cold,root);
  expect(direct.error).toBeUndefined();expect(loaded.error).toBeUndefined();
  turnSpy.mockRestore();
  const inputDifferences=Object.keys({...actualInputs[0],...actualInputs[1]}).filter(k=>!isDeepStrictEqual((actualInputs[0] as any)[k],(actualInputs[1] as any)[k]));
  expect(actualInputs).toHaveLength(3);
  expect(inputDifferences.sort()).toEqual(['historicalNameLookup','historicalCorpsLookup','historicalOobIdLookup','displacementEventStreamSink'].sort());
  const compare=async(name:string,a:unknown,b:unknown)=>{
   const same=isDeepStrictEqual(a,b);
   if(!same){await writeFile(join(dir,name+'-left.txt'),inspect(a,{depth:null,sorted:true,maxArrayLength:null,maxStringLength:null}));await writeFile(join(dir,name+'-right.txt'),inspect(b,{depth:null,sorted:true,maxArrayLength:null,maxStringLength:null}));}
   expect(same,name+'; artifacts='+dir).toBe(true);
  };
  await compare('public-turn-state',actualResults[1].nextState,actualResults[0].nextState);
  await compare('scenario-postprocessing-state',actualResults[0].nextState,observations[0].state);
  await compare('actual-adapter-state',direct.state,observations[0].state);
  await compare('actual-adapter-report',direct.report?.details,observations[0].report);
  await compare('canonical-cold-state',loaded.state,direct.state);
  await compare('canonical-cold-report',loaded.report,direct.report);
  expect(serializeRuntimeState(loaded.state)).toBe(serializeRuntimeState(direct.state));
  const childOutput=join(dir,'fresh-process-result.v8');
  const child=await promisify(execFile)(process.execPath,['--import','tsx',join(root,'tests/_helpers/desktop_cold_contract.ts'),root,preparedSave,childOutput],{cwd:root,timeout:60_000,maxBuffer:1024*1024});
  await writeFile(join(dir,'fresh-process.stdout.log'),child.stdout);await writeFile(join(dir,'fresh-process.stderr.log'),child.stderr);
  const fresh=deserializeV8(await readFile(childOutput));
  expect(fresh.childPid).not.toBe(process.pid);
  expect(fresh.canonicalSha256).toBe(createHash('sha256').update(await readFile(preparedSave)).digest('hex'));
  await compare('fresh-process-state',fresh.result.state,direct.state);
  await compare('fresh-process-report',fresh.result.report,direct.report);
  console.info('Fresh-process canonical proof '+JSON.stringify({parentPid:process.pid,childPid:fresh.childPid,canonicalSha256:fresh.canonicalSha256,stateAndReportEqual:true}));
  passed=true;
 } finally {
  vi.restoreAllMocks();
  if(passed&&process.env.AWWV_RETAIN_TEST_ARTIFACTS!=='1'){expect(resolve(dir).startsWith(resolve(tmpdir())+sep)).toBe(true);await rm(dir,{recursive:true});}
  else console.info('Actual adapter artifacts retained: '+dir);
 }
},120_000);
