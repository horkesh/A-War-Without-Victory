import * as terrainLoader from '../src/map/terrain_scalars_node.js';
import * as ethnicityLoader from '../src/data/settlement_ethnicity.js';
import * as sectorOffensive from '../src/sim/combat/sector_offensive.js';
import {warPhases} from '../src/sim/turn_phases/war_phases.js';
import {axisHasExecutableOpeningAttack} from '../src/sim/combat/sector_offensive_launch_helpers.js';
import {isOutcomeSufficientForAttack} from '../src/sim/combat/bot_brigade_targeting.js';
import {afterEach,expect,it,vi} from 'vitest';
import * as predictor from '../src/sim/combat/combat_predictor.js';
import {generateAllBotOrdersOsid} from '../src/sim/combat/bot_brigade_ai_osid.js';
import type {GameState} from '../src/state/game_state.js';
afterEach(()=>vi.restoreAllMocks());
const terrain={by_sid:{S:{road_access_index:0.1,river_crossing_penalty:0.6,elevation_mean_m:1500,elevation_stddev_m:500,slope_index:0.7,terrain_friction_index:0.8}}};
function call(terrainData?:typeof terrain){
 const state={meta:{turn:4,phase:'war'},factions:[],political:{political_controllers:{}},military:{formations:{},corps_command:{}}} as unknown as GameState;
 generateAllBotOrdersOsid(state,[],{edges:[],reverseMap:new Map([['op:test:t',['S']]]),terrainData} as any);
}
it('public bot generation builds its prediction cache from supplied terrain',()=>{
 const spy=vi.spyOn(predictor,'buildTerrainCache');call(terrain);
 expect(spy).toHaveBeenCalledWith(new Map([['op:test:t',['S']]]),terrain);
 expect(spy.mock.results[0].value['op:test:t']).toBeGreaterThan(1);
});
it('explicit minimal fixtures retain the absent-terrain fallback',()=>{
 const spy=vi.spyOn(predictor,'buildTerrainCache');call();
 expect(spy.mock.results[0].value).toEqual({});
});

it('loaded terrain makes opening admission and execution agree across a real threshold',async()=>{
 const loadSpy=vi.spyOn(terrainLoader,'loadTerrainScalars').mockResolvedValue(terrain);
 vi.spyOn(ethnicityLoader,'loadSettlementEthnicityData').mockRejectedValue(new Error('explicit minimal ethnic fixture'));
 const advance=vi.spyOn(sectorOffensive,'advanceSectorOffensives').mockReturnValue([]);
 const reverseMap=new Map([['op:test:t',['S']]]);
 const adjacency=new Map([['op:test:s',['op:test:t']],['op:test:t',['op:test:s']]]);
 const state={meta:{phase:'war',turn:4},factions:[],political:{political_controllers:{'op:test:s':'RS','op:test:t':'RBiH'}},military:{corps_command:{},formations:{
  A:{id:'A',faction:'RS',kind:'brigade',status:'active',location_osid:'op:test:s',personnel:1000,cohesion:70,morale:70},
  D:{id:'D',faction:'RBiH',kind:'brigade',status:'active',location_osid:'op:test:t',personnel:1000,cohesion:70,morale:70},
 }}} as unknown as GameState;
 const context={state,report:{phases:[]},input:{operationalData:{opData:{operationalToCanonical:reverseMap},edges:[{a:'op:test:s',b:'op:test:t'}]}}} as any;
 await warPhases.find(p=>p.name==='advance-sector-offensives')!.run(context);
 expect(loadSpy).toHaveBeenCalled();
 const opening=advance.mock.calls[0][4]!;
 expect(opening.terrainMultByOsid['op:test:t']).toBeGreaterThan(1);
 // Obtain execution cache through its actual public API, rather than reconstructing it.
 const cacheSpy=vi.spyOn(predictor,'buildTerrainCache');
 generateAllBotOrdersOsid(structuredClone(state),[],{edges:[],reverseMap,adjacency,terrainData:terrain});
 const executionCache=cacheSpy.mock.results[0].value;
 let witnessed=false;
 for(let personnel=500;personnel<=5000;personnel+=50){
  state.military.formations!.A.personnel=personnel;
  const direct=predictor.predictCombatOutcome(state,'A','op:test:t',adjacency,reverseMap,executionCache,'attack')!;
  const flat=predictor.predictCombatOutcome(state,'A','op:test:t',adjacency,reverseMap,{},'attack')!;
  if(!isOutcomeSufficientForAttack(flat.predicted_outcome,'costly_victory') || isOutcomeSufficientForAttack(direct.predicted_outcome,'costly_victory'))continue;
  const launch=axisHasExecutableOpeningAttack(state,'RS','op:test:t',['A'],adjacency,'costly_victory',undefined,undefined,opening);
  const stripped=axisHasExecutableOpeningAttack(state,'RS','op:test:t',['A'],adjacency,'costly_victory',undefined,undefined,{...opening,terrainMultByOsid:{}});
  expect(stripped).toBe(true);
  expect(launch).toBe(false);
  expect(launch).toBe(isOutcomeSufficientForAttack(direct.predicted_outcome,'costly_victory'));
  witnessed=true;break;
 }
 expect(witnessed).toBe(true);
});
