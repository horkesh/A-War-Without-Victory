import {applyFatigueRecovery,applyFrontlineDutyFatigue} from '../src/state/formation_fatigue.js';
import * as resolver from '../src/sim/combat/attack_resolution_osid.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import type {GameState} from '../src/state/game_state.js';
import {makeAttackFormation} from './_helpers/combat.js';
import {initializeCasualtyLedger} from '../src/state/casualty_ledger.js';
import {warPhases} from '../src/sim/turn_phases/war_phases.js';
import * as terrain from '../src/map/terrain_scalars_node.js';
import * as ethnicity from '../src/data/settlement_ethnicity.js';

afterEach(()=>vi.restoreAllMocks());
describe('actual war-phase fatigue and battle ordering',()=>{
 it.each([60,61])('excludes real combatants from recovery, turn %s',async turn=>{
  vi.spyOn(terrain,'loadTerrainScalars').mockResolvedValue({by_sid:{}});
  vi.spyOn(ethnicity,'loadSettlementEthnicityData').mockResolvedValue({by_settlement_id:{}});
  const S='op:test:s',T='op:test:t',R='op:test:r',I='op:test:idle';
  const state={meta:{turn,phase:'war',scenario_start_date:{year:1992,month:4,day:6}},factions:[{id:'RS'},{id:'RBiH'}],political:{political_controllers:{[S]:'RS',[T]:'RBiH',[R]:'RBiH',[I]:'RS'},control_events:[]},military:{formations:{
   A:makeAttackFormation({id:'A',faction:'RS',posture:'attack',location_osid:S,ops:{fatigue:8,last_supplied_turn:turn}}),
   D:makeAttackFormation({id:'D',faction:'RBiH',posture:'defend',location_osid:T,ops:{fatigue:8,last_supplied_turn:turn}}),
   I:makeAttackFormation({id:'I',faction:'RS',location_osid:I,ops:{fatigue:8,last_supplied_turn:turn}}),
  },corps_command:{},brigade_attack_orders:{A:T},corps_front_sectors:{quiet:{assigned_brigade_ids:['A','D','I'],sub_segments:[]}},casualty_ledger:initializeCasualtyLedger(['RS','RBiH'])},displacement:{}} as unknown as GameState;
  const context={state,input:{operationalData:{opData:{operationalToCanonical:new Map()},edges:[{a:S,b:T},{a:T,b:R}]}},report:{phases:[]}} as any;
  const combatBoundary:number[][]=[];const actualResolve=resolver.resolveAttackOrdersOsid;
  vi.spyOn(resolver,'resolveAttackOrdersOsid').mockImplementation((...args)=>{combatBoundary.push(['A','D','I'].map(id=>args[0].military.formations![id].ops!.fatigue));return actualResolve(...args);});
  // Use the real registry order and real battle consumer, never inject engagement IDs.
  for(const phase of warPhases.filter(p=>['update-formation-fatigue','resolve-attack-orders','recover-formation-fatigue'].includes(p.name))){
   await phase.run(context);
   if(phase.name==='update-formation-fatigue')expect(['A','D','I'].map(id=>state.military.formations[id].ops!.fatigue)).toEqual([8.5,8.5,8.5]);
  }
  expect(combatBoundary).toEqual([[8.5,8.5,8.5]]);
  expect(context.report.attack_resolution_osid.battles).toHaveLength(1);
  expect(context.report.attack_resolution_osid.engaged_formation_ids).toEqual(expect.arrayContaining(['A','D']));
  expect(state.military.formations.A.ops!.fatigue).toBe(10.5);
  expect(state.military.formations.D.ops!.fatigue).toBe(9.5);
  expect(state.military.formations.I.ops!.fatigue).toBe(turn%2===0?7.5:8.5);
 });
 it('has exactly one recovery consumer after actual attack resolution',()=>{
  const names=warPhases.map(p=>p.name);
  expect(names.filter(n=>n==='recover-formation-fatigue')).toHaveLength(1);
  expect(names.indexOf('update-formation-fatigue')).toBeGreaterThanOrEqual(0);
  for(const consumer of ['generate-bot-corps-orders','generate-bot-brigade-orders','resolve-attack-orders'])expect(names.indexOf(consumer)).toBeGreaterThan(names.indexOf('update-formation-fatigue'));
  expect(names.indexOf('recover-formation-fatigue')).toBeGreaterThan(names.indexOf('resolve-attack-orders'));
 });
});


it('precombat duty and postcombat recovery preserve zero/cap boundaries without double duty',()=>{
 const state={meta:{turn:60,phase:'war'},military:{formations:{
  quiet:makeAttackFormation({id:'quiet',ops:{fatigue:0,last_supplied_turn:60}}),
  capped:makeAttackFormation({id:'capped',ops:{fatigue:29.75,last_supplied_turn:60}}),
  engaged:makeAttackFormation({id:'engaged',ops:{fatigue:0,last_supplied_turn:60}}),
 },corps_front_sectors:{s:{assigned_brigade_ids:['quiet','capped','engaged'],sub_segments:[]}}},political:{}} as unknown as GameState;
 applyFrontlineDutyFatigue(state);
 expect(['quiet','capped','engaged'].map(id=>state.military.formations[id].ops!.fatigue)).toEqual([.5,30,.5]);
 applyFatigueRecovery(state,new Set(['engaged']));
 expect(['quiet','capped','engaged'].map(id=>state.military.formations[id].ops!.fatigue)).toEqual([0,29,.5]);
});
