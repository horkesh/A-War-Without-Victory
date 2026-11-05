import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve, sep} from 'node:path';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {loadTerrainScalars} from '../src/map/terrain_scalars_node.js';
import {loadSettlementEthnicityData} from '../src/data/settlement_ethnicity.js';
import * as offensive from '../src/sim/combat/sector_offensive.js';
import {warPhases} from '../src/sim/turn_phases/war_phases.js';

const roots:string[]=[];
function root(value:number){
 const dir=mkdtempSync(join(tmpdir(),'awwv-combat-root-'));roots.push(dir);
 mkdirSync(join(dir,'data/derived/terrain'),{recursive:true});
 writeFileSync(join(dir,'data/derived/terrain/settlements_terrain_scalars.json'),JSON.stringify({by_sid:{S:{road_access_index:value,river_crossing_penalty:value,elevation_mean_m:1000*value,elevation_stddev_m:300*value,slope_index:value,terrain_friction_index:value}}}));
 writeFileSync(join(dir,'data/derived/settlement_ethnicity_data.json'),JSON.stringify({by_settlement_id:{S:{majority:value>.5?'serb':'bosniak',composition:{serb:value,bosniak:1-value,croat:0,other:0},provenance:'settlement_census'}}}));
 return dir;
}
afterEach(()=>{vi.restoreAllMocks();for(const dir of roots.splice(0)){expect(resolve(dir).startsWith(resolve(tmpdir())+sep)).toBe(true);rmSync(dir,{recursive:true});}});
describe('combat data root identity',()=>{
 it('keys terrain cache by resolved path, including warm switches and missing paths',async()=>{
  const a=root(.2),b=root(.8);
  expect((await loadTerrainScalars(join(a,'data/derived/terrain/settlements_terrain_scalars.json'))).by_sid.S.slope_index).toBe(.2);
  expect((await loadTerrainScalars(join(b,'data/derived/terrain/settlements_terrain_scalars.json'))).by_sid.S.slope_index).toBe(.8);
  await expect(loadTerrainScalars(join(b,'missing.json'))).rejects.toThrow();
  expect((await loadTerrainScalars(join(a,'data/derived/terrain/settlements_terrain_scalars.json'))).by_sid.S.slope_index).toBe(.2);
 });
 it('keeps ethnicity path identity across warm root switches',async()=>{
  const a=root(.2),b=root(.8);
  expect((await loadSettlementEthnicityData(join(a,'data/derived/settlement_ethnicity_data.json'))).by_settlement_id.S.majority).toBe('bosniak');
  expect((await loadSettlementEthnicityData(join(b,'data/derived/settlement_ethnicity_data.json'))).by_settlement_id.S.majority).toBe('serb');
 });
 it.each([false,true])('opening phase honors explicit root over conflicting CWD, warm=%s',async warm=>{
  const cwd=root(.2),selected=root(.8);
  if(warm)await loadTerrainScalars(join(cwd,'data/derived/terrain/settlements_terrain_scalars.json'));
  vi.spyOn(process,'cwd').mockReturnValue(cwd);
  const advance=vi.spyOn(offensive,'advanceSectorOffensives').mockReturnValue([]);
  const context={state:{meta:{turn:4,phase:'war'},factions:[],political:{political_controllers:{}},military:{formations:{},corps_command:{}}},input:{dataBaseDir:selected,operationalData:{opData:{operationalToCanonical:new Map([['op:test:t',['S']]])},edges:[{a:'op:test:s',b:'op:test:t'}]}},report:{phases:[]}} as any;
  await warPhases.find(p=>p.name==='advance-sector-offensives')!.run(context);
  const used=advance.mock.calls[0][4]!;
  const scalar=await loadTerrainScalars(join(selected,'data/derived/terrain/settlements_terrain_scalars.json'));
  expect(scalar.by_sid.S.slope_index).toBe(.8);
  // Compare the real phase cache with the selected substrate, not a spy-only call.
  const {buildTerrainCache}=await import('../src/sim/combat/combat_predictor.js');
  expect(used.terrainMultByOsid).toEqual(buildTerrainCache(context.input.operationalData.opData.operationalToCanonical,scalar));
  expect(used.ethnicComposition?.get('op:test:t')?.serb).toBe(.8);
 });
});
