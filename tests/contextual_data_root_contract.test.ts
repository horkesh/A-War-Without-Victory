import {earlyWarPhases} from '../src/sim/turn_phases/early_war_phases.js';
import {makeAttackFormation} from './_helpers/combat.js';
import {mkdirSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {afterEach,beforeAll,describe,expect,it,vi} from 'vitest';
import {createStateFromScenario} from '../src/scenario/scenario_runner.js';
import {loadOobCorps} from '../src/scenario/oob_loader.js';
import {loadRecruitmentCatalog} from '../src/sim/turn_pipeline_types.js';
import {warPhases} from '../src/sim/turn_phases/war_phases.js';
import {getUrbanOsidSet,getForestOsidSet,setUrbanOsidSet,setForestOsidSet} from '../src/sim/combat/combat_math.js';
import {loadUrbanOsidSet,loadForestOsidSet} from '../src/sim/combat/combat_terrain_sets_node.js';
import type {GameState} from '../src/state/game_state.js';

const root=process.cwd(),scenario=join(root,'data/scenarios/apr1992_definitive_188w.json');
let base:GameState;let corps:Awaited<ReturnType<typeof loadOobCorps>>;
const roots:string[]=[];
function conflictingCwd(){const p=mkdtempSync(join(tmpdir(),'awwv-context-root-'));roots.push(p);mkdirSync(join(p,'data/derived/operational'),{recursive:true});writeFileSync(join(p,'data/derived/operational/urban_osids.json'),'["wrong:urban"]');writeFileSync(join(p,'data/derived/operational/forest_osids.json'),'["wrong:forest"]');vi.spyOn(process,'cwd').mockReturnValue(p);return p;}
beforeAll(async()=>{base=await createStateFromScenario(scenario,root);corps=await loadOobCorps(root);},60_000);
afterEach(()=>{vi.restoreAllMocks();setUrbanOsidSet(new Set());setForestOsidSet(new Set());for(const p of roots.splice(0)){expect(resolve(p).startsWith(resolve(tmpdir())+sep)).toBe(true);rmSync(p,{recursive:true});}});
describe('explicit data roots at real consumers',()=>{
 it('loads the nonempty recruitment catalog from the supplied root despite conflicting CWD',async()=>{
  conflictingCwd();const catalog=await loadRecruitmentCatalog(root);
  expect(catalog?.base_dir).toBe(root);expect(catalog!.brigades.length).toBeGreaterThan(0);expect(catalog!.corps.length).toBeGreaterThan(0);
 });
 it('actual corps activation uses the caller catalog rather than CWD',async()=>{
  const state=structuredClone(base);state.meta.turn=24;
  const c=corps.find(c=>c.available_from<=24)!;delete state.military.formations[c.id];
  expect(state.military.formations[c.id]).toBeUndefined();conflictingCwd();
  await warPhases.find(p=>p.name==='activate-corps')!.run({state,input:{dataBaseDir:root},report:{phases:[]}} as any);
  expect(state.military.formations[c.id]).toMatchObject({id:c.id,faction:c.faction,status:'active',created_turn:24});
 });
 it('actual scenario startup selects its own urban and forest files even after conflicting warm sets',async()=>{
  const expectedUrban=loadUrbanOsidSet(root),expectedForest=loadForestOsidSet(root);
  expect(expectedUrban.size).toBeGreaterThan(0);expect(expectedForest.size).toBeGreaterThan(0);
  setUrbanOsidSet(new Set(['wrong:urban']));setForestOsidSet(new Set(['wrong:forest']));conflictingCwd();
  const state=await createStateFromScenario(scenario,root);
  expect(Object.keys(state.military.formations).length).toBeGreaterThan(0);
  expect([...getUrbanOsidSet()].sort()).toEqual([...expectedUrban].sort());
  expect([...getForestOsidSet()].sort()).toEqual([...expectedForest].sort());
 },60_000);
});


it('actual early-war bottom-up activation and promotion use the explicit catalog root',async()=>{
 const state=structuredClone(base);state.meta.turn=24;state.meta.recruitment_mode='bottom_up';
 const catalog=(await loadRecruitmentCatalog(root))!;
 const c=corps.find(c=>c.available_from<=24)!;delete state.military.formations[c.id];
 const b=catalog.brigades.find(b=>b.faction===c.faction)!;
 state.military.formations.M=makeAttackFormation({id:'M',faction:c.faction,kind:'militia',personnel:2000,cohesion:60,created_turn:0,origin_mun:b.home_mun,tags:['mun:'+b.home_mun]});
 conflictingCwd();
 const context={state,input:{dataBaseDir:root},report:{phases:[]}} as any;
 await earlyWarPhases.find(p=>p.name==='activate-corps')!.run(context);
 expect(state.military.formations[c.id]).toMatchObject({id:c.id,status:'active',created_turn:24});
 await earlyWarPhases.find(p=>p.name==='promote-formations')!.run(context);
 expect(state.military.formations.M).toMatchObject({kind:'brigade',promoted_turn:24});
});
