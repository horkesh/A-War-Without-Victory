import assert from 'node:assert/strict';
import {describe,it} from 'vitest';
import type {GameState,CorpsFrontSector,FormationState} from '../src/state/game_state.js';
import {collectSectorDefenseBrigades} from '../src/sim/combat/sector_defense_roster.js';

function fixture() {
 const names=['op:test:a','op:test:b','op:test:n','op:test:t'];
 const adjacency=new Map(names.map((n,i)=>[n,names.filter((_,j)=>Math.abs(i-j)===1)]));
 const formation=(id:string,loc:string)=>({id,faction:'RBiH',corps_id:'c',status:'active',kind:'brigade',personnel:900,location_osid:loc}) as FormationState;
 const anchor=formation('anchor',names[0]), near=formation('near',names[2]);
 const state={meta:{turn:4},political:{political_controllers:Object.fromEntries(names.map(n=>[n,'RBiH']))},military:{formations:{anchor,near},corps_command:{},must_hold_osids_by_corps:{c:[names[0]]}}} as unknown as GameState;
 const sector={corps_id:'c',assigned_brigade_ids:['anchor'],territory_osids:names,sub_segments:[]} as unknown as CorpsFrontSector;
 return {state,sector,adjacency,target:names[3],near};
}
describe('shared sector defender roster',()=>{
 it('excludes a distant anchor and uses the existing same-corps adjacent fallback',()=>{
  const f=fixture(),before=JSON.stringify(f.state);
  assert.deepEqual(collectSectorDefenseBrigades(f.state,f.sector,f.target,'RBiH',f.adjacency,[]).map(x=>x.id),['near']);
  assert.equal(JSON.stringify(f.state),before);
 });
 it('does not widen a nonempty eligible assigned roster',()=>{
  const f=fixture();f.state.military.must_hold_osids_by_corps={};
  assert.deepEqual(collectSectorDefenseBrigades(f.state,f.sector,f.target,'RBiH',f.adjacency,[]).map(x=>x.id),['anchor']);
 });
 it('keeps fallback unavailable, foreign-corps and understrength formations excluded',()=>{
  for(const mode of ['transit','foreign','understrength']){
   const f=fixture();
   if(mode==='transit')f.state.military.brigade_movement_state={near:{status:'in_transit'} as any};
   if(mode==='foreign')(f.near as any).corps_id='other';
   if(mode==='understrength')f.near.personnel=499;
   assert.deepEqual(collectSectorDefenseBrigades(f.state,f.sector,f.target,'RBiH',f.adjacency,[]),[],mode);
  }
 });
 it('retains physical defenders and canonical ordering without duplicates',()=>{
  const f=fixture();const physical={...f.near,id:'physical',location_osid:f.target};
  f.sector.assigned_brigade_ids=['physical','near'];f.state.military.formations!.physical=physical;
  assert.deepEqual(collectSectorDefenseBrigades(f.state,f.sector,f.target,'RBiH',f.adjacency,[physical]).map(x=>x.id),['near','physical']);
 });
});
