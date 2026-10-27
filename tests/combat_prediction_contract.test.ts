import * as sectorIntel from '../src/sim/combat/sector_intel.js';
import {getEnclaveGarrisonPower} from '../src/sim/combat/enclave_resilience.js';
import {createHash} from 'node:crypto';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import type {FactionId, GameState} from '../src/state/game_state.js';
import type {EdgeRecord} from '../src/map/settlements.js';
import {makeAttackFormation} from './_helpers/combat.js';
import {initializeCasualtyLedger} from '../src/state/casualty_ledger.js';
import {buildOsidAdjacency} from '../src/sim/combat/osid_adjacency.js';
import {predictCombatOutcome} from '../src/sim/combat/combat_predictor.js';
import {resolveAttackOrdersOsid} from '../src/sim/combat/attack_resolution_osid.js';
import {resetReasonCodeTopicCacheForTests} from '../src/sim/combat/reason_code_debug.js';

const S='op:test:stage', T='op:test:target', R='op:test:rear', P='op:test:remote';
function fixture(faction: FactionId='RS') {
 const enemy: FactionId=faction==='RS'?'RBiH':'RS';
 const A=makeAttackFormation({id:'A',faction,location_osid:S,posture:'attack',corps_id:'C'});
 const D=makeAttackFormation({id:'D',faction:enemy,location_osid:T,posture:'defend',corps_id:'E'});
 const state={meta:{turn:60,phase:'war',scenario_start_date:{year:1992,month:4,day:6}},
  factions:[{id:faction},{id:enemy}],political:{political_controllers:{[S]:faction,[T]:enemy,[R]:enemy,[P]:faction},control_events:[]},
  military:{formations:{A,D},corps_command:{},brigade_attack_orders:{A:T},casualty_ledger:initializeCasualtyLedger([faction,enemy])},displacement:{}} as unknown as GameState;
 const edges=[{a:S,b:T},{a:T,b:R}] as EdgeRecord[];
 return {state,edges};
}
function measure(name:string,f:ReturnType<typeof fixture>,additional:string[]=[],posture?:string){
 const original=JSON.stringify(f.state);
 const pred=predictCombatOutcome(f.state,'A',T,buildOsidAdjacency(f.edges),new Map(),{},posture,additional)!;
 expect(JSON.stringify(f.state)).toBe(original);
 const resolved=structuredClone(f.state);
 for(const id of additional)resolved.military.brigade_attack_orders![id]=T;
 const report=resolveAttackOrdersOsid(resolved,f.edges,new Map());
 expect(report.battles).toHaveLength(1);
 const power=report.battles[0].power_breakdown!;
 expect(power).toBeDefined();
 if(process.env.AWWV_CONTRACT_CAPTURE==='1')console.info('CONTRACT_RESOLVER '+JSON.stringify({name,sha256:createHash('sha256').update(JSON.stringify({report,state:resolved})).digest('hex'),power}));
 return {pred,power,report};
}
function operation(f:ReturnType<typeof fixture>,support=false){
 f.state.military.corps_command={C:{active_operations:[{name:'synthetic',type:'sector_attack',phase:'execution',started_turn:59,phase_started_turn:59,participating_brigades:['A','B'],objectives:[T],axes:[{axis_id:'axis',assigned_brigades:['A','B'],support_brigades:support?['B']:[],objectives:[T],current_objective_index:0,status:'executing'}]}]}} as any;
}
beforeEach(()=>{vi.stubEnv('AWWV_DEBUG_REASON_CODES','battle_power');resetReasonCodeTopicCacheForTests();});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();resetReasonCodeTopicCacheForTests();});

describe('known friendly combat inputs agree with the real resolver',()=>{
 it.each(['RS','RBiH','HRHB'] as FactionId[])('preserves single attacker power for %s',faction=>{
  const {pred,power}=measure('single-'+faction,fixture(faction));expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
 it('includes known faction war-exhaustion tempo',()=>{
  const f=fixture();f.state.political.war_exhaustion={RS:8000};
  const {pred,power}=measure('tempo',f);expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
 it.each([false,true])('includes concentration and support-role=%s',support=>{
  const f=fixture();f.state.military.formations!.B=makeAttackFormation({id:'B',faction:'RS',corps_id:'C',location_osid:S,posture:'assault'});operation(f,support);
  const {pred,power}=measure('combined-'+support,f,['B']);expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
 it('uses known formation assault posture when no hypothetical override is supplied',()=>{
  const f=fixture();f.state.military.formations!.A.posture='assault';
  const {pred,power}=measure('assault',f);expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
 it('includes nearby same-axis concentration without treating that brigade as an attacker',()=>{
  const f=fixture();f.state.military.formations!.B=makeAttackFormation({id:'B',faction:'RS',corps_id:'C',location_osid:S});operation(f);
  const {pred,power}=measure('axis-support',f);expect(power.attacker_count).toBe(1);expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
 it('includes a friendly TG donor using donor stats and capped lent personnel',()=>{
  const f=fixture();f.state.military.formations!.B=makeAttackFormation({id:'B',faction:'RS',location_osid:P,personnel:800});
  f.state.military.tactical_groups={tg:{id:'tg',anchor_brigade_id:'A',status:'active',donor_contributions:[{brigade_id:'B',personnel_lent:1200}]}} as any;
  const {pred,power}=measure('tg-donor',f);expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
 it.each(['duplicate','remote','inactive'])('does not count a %s supporting attacker the resolver cannot execute',mode=>{
  const f=fixture();const ids=mode==='duplicate'?['A']:['B'];
  if(mode!=='duplicate')f.state.military.formations!.B=makeAttackFormation({id:'B',faction:'RS',location_osid:mode==='remote'?P:S,status:mode==='inactive'?'inactive' as any:'active'});
  const {pred,power}=measure('membership-'+mode,f,ids);expect(power.attacker_count).toBe(1);expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
 });
});


describe('shared base-power substrate and forecast purity',()=>{
 it.each(['fatigue','disruption','recent-supply','equipment','cohesion','morale'])('normalizes only documented enemy fog for %s',mode=>{
  const f=fixture();const A=f.state.military.formations!.A,D=f.state.military.formations!.D;
  if(mode==='fatigue')for(const b of [A,D])b.ops={fatigue:17,last_supplied_turn:null};
  if(mode==='disruption')for(const b of [A,D])b.disrupted_turns=2;
  if(mode==='recent-supply')for(const b of [A,D])b.ops={fatigue:0,last_supplied_turn:60};
  if(mode==='equipment')for(const b of [A,D])b.composition!.tank_condition.operational=.25;
  if(mode==='cohesion')for(const b of [A,D])b.cohesion=35;
  if(mode==='morale')for(const b of [A,D])b.morale=12;
  const {pred,power}=measure('substrate-'+mode,f);
  expect(pred.attacker_power).toBeCloseTo(power.attacker_power,10);
  expect(pred.defender_power/.70).toBeCloseTo(power.defender_power,10);
 });
 it.each(['RS','RBiH','HRHB'] as FactionId[])('missing equipment fallback remains read-only for %s',faction=>{
  const f=fixture(faction);delete f.state.military.formations!.A.composition;delete f.state.military.formations!.D.composition;
  const before=JSON.stringify(f.state);
  const result=predictCombatOutcome(f.state,'A',T,buildOsidAdjacency(f.edges),new Map(),{});
  expect(result).not.toBeNull();expect(JSON.stringify(f.state)).toBe(before);
 });
});


describe('noncontributing defender metadata',()=>{
 it('does not let an unreachable brigade change a militia forecast or morale resistance',()=>{
  const f=fixture();const D=f.state.military.formations!.D;
  D.location_osid=P;D.entrenchment_turns=12;D.disrupted_turns=0;D.disrupted=true;
  f.state.military.corps_front_sectors={enemy:{sector_id:'enemy',corps_id:'E',faction:'RBiH',territory_osids:[T,R],assigned_brigade_ids:['D'],reserve_brigade_ids:[],sector_stance:'defend',sub_segments:[{friendly_osids:[T,R],enemy_osids:[S],edge_ids:[],primary_brigade_ids:['D']}]}} as any;
  const adjacency=buildOsidAdjacency(f.edges);
  D.morale=0;
  const sample=predictCombatOutcome(f.state,'A',T,adjacency,new Map(),{})!;
  f.state.military.formations!.A.personnel=Math.round(1000*1.2/sample.power_ratio);
  const low=predictCombatOutcome(f.state,'A',T,adjacency,new Map(),{})!;
  expect(low.power_ratio).toBeGreaterThan(1);expect(low.power_ratio).toBeLessThan(1.5);D.morale=100;
  const high=predictCombatOutcome(f.state,'A',T,adjacency,new Map(),{})!;
  expect(high.power_ratio).toBe(low!.power_ratio);
  expect(high.predicted_outcome).toBe(low!.predicted_outcome);
  expect(high.predicted_outcome).toBe('costly_victory');
  expect(high.defender_has_reachable_brigade).toBe(false);
  expect(high.defender_has_brigade).toBe(false);
  expect(high.defender_disrupted).toBe(false);expect(high.defender_cohesion).toBe(60);expect(high.defender_entrenchment).toBe(0);
  const highState=structuredClone(f.state);D.morale=0;
  const lo=resolveAttackOrdersOsid(structuredClone(f.state),f.edges,new Map());
  const hi=resolveAttackOrdersOsid(highState,f.edges,new Map());
  expect(hi.battles).toEqual(lo.battles);expect(hi.battles[0].defender_kind).toBe('militia');
 });
});


describe('public coalition pressure',()=>{
 it('includes the public post-Washington mixed-municipality defense multiplier',()=>{
  const f=fixture();f.state.political.rbih_hrhb_state={washington_signed:true,allied_mixed_municipalities:['test']} as any;
  const {pred,power}=measure('public-joint-pressure',f);
  expect(pred.defender_power/.70).toBeCloseTo(power.defender_power,10);
 });
});


// These characterize the remaining review questions; a passing probe does not
// approve a new information policy or establish exact enemy-power parity.
describe('explicit forecast information boundary probes',()=>{
 it('does not consult exact enemy collapse capacity, while the resolver does',()=>{
  const healthy=fixture(),collapsed=fixture();
  collapsed.state.political.capacity_modifiers={by_sid:{[T]:{supply_mult:.7}}} as any;
  const a=measure('healthy-enemy-capacity',healthy),b=measure('collapsed-enemy-capacity',collapsed);
  expect(b.pred.defender_power).toBe(a.pred.defender_power);
  expect(b.power.defender_power).toBeCloseTo(a.power.defender_power*.7,10);
 });
 it('does not infer an exact enemy last stand from retreat availability',()=>{
  const open=fixture(),closed=fixture();closed.state.political.political_controllers![R]='RS';
  const a=measure('open-retreat',open),b=measure('no-enemy-retreat',closed);
  expect(b.pred.defender_power).toBe(a.pred.defender_power);
  expect(b.power.defender_power).toBeCloseTo(a.power.defender_power*1.5,10);
 });
 it.each([[0,false],[.5,false],[1,false],[0,true]] as const)('applies existing garrison uncertainty once, confidence=%s learned=%s',(confidence,learned)=>{
  vi.spyOn(sectorIntel,'getSectorPairIntelConfidence').mockReturnValue(confidence);
  const f=fixture(),target='op:centar_sarajevo:centar_sarajevo';
  const state=JSON.parse(JSON.stringify(f.state).split(T).join(target)) as GameState;
  const edges=f.edges.map(e=>({...e,a:e.a===T?target:e.a,b:e.b===T?target:e.b}));
  const adjacency=buildOsidAdjacency(edges),population=new Map([[target,100000]]);
  state.military.corps_front_sectors={enemy:{sector_id:'enemy',corps_id:'E',faction:'RBiH',territory_osids:[target,R],assigned_brigade_ids:['D'],reserve_brigade_ids:[],sector_stance:'defend',sub_segments:[{friendly_osids:[target,R],enemy_osids:[S],edge_ids:[],primary_brigade_ids:['D']}]}} as any;
  if(learned)(state.military.formations.A as any).last_repulsed_from={osid:target,turn:59};
  state.political.enclave_resilience={sarajevo:0} as any;
  const low=predictCombatOutcome(state,'A',target,adjacency,new Map(),{},undefined,undefined,undefined,population)!;
  const lowGarrison=getEnclaveGarrisonPower(state,target,100000),lowState=structuredClone(state);
  state.political.enclave_resilience={sarajevo:40} as any;
  const high=predictCombatOutcome(state,'A',target,adjacency,new Map(),{},undefined,undefined,undefined,population)!;
  const delta=getEnclaveGarrisonPower(state,target,100000)-lowGarrison;
  expect(delta).toBeGreaterThan(0);
  const fog=learned?Math.max(.70+.25*confidence,.95):.70+.25*confidence;
  expect(high.defender_power-low.defender_power).toBeCloseTo(delta*fog,10);
  const lowActual=resolveAttackOrdersOsid(lowState,edges,new Map(),undefined,undefined,population);
  const highActual=resolveAttackOrdersOsid(structuredClone(state),edges,new Map(),undefined,undefined,population);
  expect(highActual.battles[0].power_breakdown!.defender_power-lowActual.battles[0].power_breakdown!.defender_power).toBeCloseTo(delta,10);
 });
});


it('adding a wholly unreachable paper roster does not change the militia forecast',()=>{
 const absent=fixture();absent.state.military.formations!.D.location_osid=P;absent.state.military.formations!.A.personnel=300;
 const present=structuredClone(absent);
 present.state.military.corps_front_sectors={paper:{sector_id:'paper',corps_id:'E',faction:'RBiH',territory_osids:[T,R],assigned_brigade_ids:['D'],reserve_brigade_ids:[],sector_stance:'defend',sub_segments:[{friendly_osids:[T,R],enemy_osids:[S],edge_ids:[],primary_brigade_ids:['D']}]}} as any;
 const a=measure('militia-no-paper-roster',absent),b=measure('militia-paper-roster',present);
 // Debug routing labels identify the paper sector; all physical battle fields
 // and numerical power inputs must remain identical.
 const withoutDebug=(battle:typeof a.report.battles[number])=>{const {power_breakdown,...physical}=battle;return physical;};
 expect(a.report.battles.map(withoutDebug)).toEqual(b.report.battles.map(withoutDebug));
 expect(a.power.attacker_power).toBe(b.power.attacker_power);expect(a.power.defender_power).toBe(b.power.defender_power);
 expect(a.pred.predicted_outcome).toBe('stalemate');
 expect(b.report.battles[0].defender_kind).toBe('militia');
 expect(b.pred).toEqual(a.pred);
});
