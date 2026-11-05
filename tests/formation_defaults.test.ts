import {initializeMilitiaPoolDefaults,initializeMilitiaPoolLifecycleDefaults,initializeMilitiaPoolWoundedDefault} from '../src/state/militia_pool_defaults.js';
import type {MilitiaPoolState} from '../src/state/game_state.js';
import {describe,it,expect} from 'vitest';
import {initializeFormationDefaults} from '../src/state/formation_defaults.js';
import type {FormationState} from '../src/state/game_state.js';

describe('shared live and migration formation defaults',()=>{
 it('initializes every migration-v9 formation default at creation',()=>{
  const f={id:'synthetic',faction:'RS',name:'Synthetic',created_turn:4,status:'active',assignment:null} as FormationState;
  initializeFormationDefaults(f,4);
  expect(f).toMatchObject({faction:'RS',force_label:'VRS',kind:'brigade',readiness:'active',cohesion:60,morale:60,ops:{fatigue:0,last_supplied_turn:null},activation_gated:false,activation_turn:null});
  const once=structuredClone(f);initializeFormationDefaults(f,4);expect(f).toEqual(once);
 });
 it('preserves valid authored and accumulated state rather than retuning it',()=>{
  const f={id:'synthetic',faction:'HRHB',force_label:'HVO',kind:'militia',readiness:'forming',cohesion:31,morale:27,ops:{fatigue:7.5,last_supplied_turn:2},activation_gated:true,activation_turn:8} as FormationState;
  const before=structuredClone(f);initializeFormationDefaults(f,4);expect(f).toEqual(before);
 });
 it.each([undefined,null,[],{fatigue:-1,last_supplied_turn:9},{fatigue:NaN,last_supplied_turn:1.5}])('repairs malformed ops using existing migration semantics: %j',ops=>{
  const f={id:'synthetic',faction:'RBiH',ops} as unknown as FormationState;initializeFormationDefaults(f,4);expect(f.ops).toEqual({fatigue:0,last_supplied_turn:null});
 });
 it.each([[-2,0],[120,100],[null,60],[undefined,60]])('uses the existing morale initialization/clamp for %j', (morale,expected)=>{
  const f={id:'synthetic',faction:'RBiH',morale} as FormationState;initializeFormationDefaults(f,4);expect(f.morale).toBe(expected);
 });
 it.each([['ARBiH','RBiH','ARBiH'],['VRS','RS','VRS'],['HVO','HRHB','HVO']])('canonicalizes legacy identity %s without changing label authority',(faction,side,label)=>{
  const f={id:'synthetic',faction} as FormationState;initializeFormationDefaults(f,0);expect(f.faction).toBe(side);expect(f.force_label).toBe(label);
 });
});

describe('shared militia pool initialization',()=>{
 it('initializes both migration domains while preserving their version ownership',()=>{
  const p={mun_id:'synthetic',faction:'RS',available:50,committed:1,exhausted:2,updated_turn:4} as MilitiaPoolState;
  initializeMilitiaPoolLifecycleDefaults(p);expect(p.fatigue).toBe(0);expect(p.wounded_pending).toBeUndefined();
  initializeMilitiaPoolWoundedDefault(p);expect(p.wounded_pending).toBe(0);
  const before=structuredClone(p);initializeMilitiaPoolDefaults(p);expect(p).toEqual(before);
 });
 it('preserves valid accumulated fatigue, wounded and manpower totals',()=>{
  const p={mun_id:'synthetic',faction:'RBiH',available:50,committed:1,exhausted:2,updated_turn:4,fatigue:8,wounded_pending:17} as MilitiaPoolState;
  const before=structuredClone(p);initializeMilitiaPoolDefaults(p);expect(p).toEqual(before);
 });
 it('uses existing migration repairs for malformed pool counters',()=>{
  const p={faction:'RS',fatigue:-1,wounded_pending:NaN} as MilitiaPoolState;initializeMilitiaPoolDefaults(p);expect(p.fatigue).toBe(0);expect(p.wounded_pending).toBe(0);
 });
});
