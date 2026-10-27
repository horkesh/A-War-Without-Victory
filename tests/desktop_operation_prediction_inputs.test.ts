import * as operational from '../src/data/operational_data.js';
import * as terrain from '../src/map/terrain_scalars_node.js';
import * as census from '../src/data/settlement_ethnicity.js';
import * as turnInputs from '../src/scenario/turn_inputs.js';
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {queryOperationPrediction,startNewCampaign} from '../src/desktop/desktop_sim.js';
import * as operationPrediction from '../src/sim/combat/operation_prediction.js';
import type {GameState} from '../src/state/game_state.js';
import type {OperationPredictionResponse} from '../src/sim/combat/operation_prediction.js';

const root=process.cwd();let state:GameState;
beforeAll(async()=>{state=(await startNewCampaign(root,'RS','apr_1992')).state;},60_000);
afterEach(()=>vi.restoreAllMocks());
describe('desktop operation forecast known inputs',()=>{
 it('supplies nonempty current supply, population, slope and ethnicity through the public query without mutating state',async()=>{
  const spy=vi.spyOn(operationPrediction,'computeOperationPrediction').mockReturnValue({overall:{},axes:[],commanderAssessment:{}} as unknown as OperationPredictionResponse);
  const before=JSON.stringify(state);
  await queryOperationPrediction(state,{corpsId:'vrs_drina',axes:[],tempo:'standard',artilleryPreparation:false},root);
  expect(spy).toHaveBeenCalledTimes(1);const args=spy.mock.calls[0];
  expect(args[5]?.turn).toBe(state.meta.turn);expect(args[5]?.factions.length).toBeGreaterThan(0);
  expect(args[6]?.size).toBeGreaterThan(0);
  expect(Object.values(args[7]??{}).some(v=>v>0)).toBe(true);
  expect(args[8]?.size).toBeGreaterThan(0);
  expect(JSON.stringify(state)).toBe(before);
 },60_000);
});


it('keeps operational query caches bound to each explicit root across warm switches',async()=>{
 const spy=vi.spyOn(operationPrediction,'computeOperationPrediction').mockReturnValue({overall:{},axes:[],commanderAssessment:{}} as unknown as OperationPredictionResponse);
 vi.spyOn(operational,'loadOperationalData').mockImplementation(async baseDir=>({canonicalToOperational:{},operationalToCanonical:new Map([[String(baseDir).endsWith('fixture-root-a')?'root:a':'root:b',['S']]])} as any));
 vi.spyOn(operational,'loadOperationalEdges').mockResolvedValue([]);
 vi.spyOn(terrain,'loadTerrainScalars').mockResolvedValue({by_sid:{}});
 vi.spyOn(census,'loadSettlementEthnicityData').mockResolvedValue({by_settlement_id:{}});
 vi.spyOn(turnInputs,'loadSharedTurnInputs').mockResolvedValue({municipalityPopulation1991:{}} as any);
 for(const key of ['a','b','a']){
  await queryOperationPrediction(state,{corpsId:'vrs_drina',axes:[],tempo:'standard',artilleryPreparation:false},root+'/fixture-root-'+key);
  expect([...spy.mock.lastCall![3].keys()]).toEqual(['root:'+key]);
 }
});
