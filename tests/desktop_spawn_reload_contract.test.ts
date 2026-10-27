import {execFile} from 'node:child_process';
import {promisify,isDeepStrictEqual} from 'node:util';
import {mkdtemp,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {serialize as serializeV8,deserialize as deserializeV8} from 'node:v8';
import {createHash} from 'node:crypto';
import {it,expect} from 'vitest';
import {startNewCampaign,advanceTurn,loadStateFromPath} from '../src/desktop/desktop_sim.js';
import {serializeState} from '../src/state/serialize.js';
import {serializeRuntimeGameState} from '../src/state/serializeGameState.js';

// Exact JSON omission shapes independently checked for this real week1 fixture.
const ALLOWED_JSON_OMISSION_PATHS=new Set<string>([
  "/military/corps_command/jna_herzegovina_command/active_operations/0/recovery_reason",
  "/military/corps_command/vrs_1st_krajina/active_operations/0/recovery_reason",
  "/military/corps_command/vrs_2nd_krajina/active_operations/0/recovery_reason",
  "/military/corps_command/vrs_drina/active_operations/0/recovery_reason",
  "/military/corps_command/vrs_east_bosnian/active_operations/0/recovery_reason",
  "/military/corps_command/vrs_herzegovina/active_operations/0/recovery_reason",
  "/military/corps_command/vrs_sarajevo_romanija/active_operations/0/recovery_reason",
  "/turn_summaries/1/battles/0/defender_contributions",
  "/turn_summaries/1/battles/1/defender_contributions",
  "/turn_summaries/1/battles/2/defender_contributions",
  "/turn_summaries/1/battles/5/mun_id",
  "/turn_summaries/1/battles/6/mun_id",
  "/turn_summaries/1/battles/6/defender_contributions",
  "/turn_summaries/1/battles/7/defender_contributions",
  "/turn_summaries/1/battles/8/defender_contributions",
  "/turn_summaries/1/battles/9/defender_contributions",
  "/turn_summaries/1/battles/10/defender_contributions",
  "/turn_summaries/1/displacement_hotspot"
]);

it('real first-week formation and pool creation survives a canonical fresh-process reload without changing next-turn state or report',async()=>{
 const root=process.cwd(),dir=process.env.AWWV_RELOAD_CONTRACT_DIR??await mkdtemp(join(tmpdir(),'desktop-spawn-reload-'));
 const initial=(await startNewCampaign(root,'RS','apr_1992','historical',{observerParity:true})).state;
 const ids=new Set(Object.keys(initial.military.formations??{}));
 const first=await advanceTurn(initial,root);expect(first.error).toBeUndefined();
 const raw=first.state;expect(raw.meta.turn).toBe(1);
 const created=Object.keys(raw.military.formations??{}).filter(id=>!ids.has(id)).sort();expect(created.length).toBeGreaterThan(0);
 const save=join(dir,'campaign-week1.json');const canonical=serializeState(raw);await writeFile(save,canonical);
 await writeFile(join(dir,'campaign-week1-raw.v8'),serializeV8(raw));
 const loaded=(await loadStateFromPath(save,root)).state;
 const keys=['faction','force_label','kind','readiness','cohesion','morale','ops','activation_gated','activation_turn'] as const;
 const defaultDifferences=Object.keys(raw.military.formations??{}).sort().flatMap(id=>keys.filter(k=>!isDeepStrictEqual(raw.military.formations![id]![k],loaded.military.formations![id]![k])).map(k=>({id,field:k,raw:raw.military.formations![id]![k],loaded:loaded.military.formations![id]![k]})));
 const direct=await advanceTurn(raw,root);expect(direct.error).toBeUndefined();
 const output=join(dir,'fresh-process-result.v8');
 const child=await promisify(execFile)(process.execPath,['--import','tsx',join(root,'tests/_helpers/desktop_cold_contract.ts'),root,save,output],{cwd:root,timeout:60_000,maxBuffer:2*1024*1024});
 await writeFile(join(dir,'fresh-process.stdout.log'),child.stdout);await writeFile(join(dir,'fresh-process.stderr.log'),child.stderr);
 const fresh=deserializeV8(await readFile(output));expect(fresh.childPid).not.toBe(process.pid);
 await writeFile(join(dir,'direct-next-result.v8'),serializeV8(direct));
 const strictRawEqual=isDeepStrictEqual(direct.state,fresh.result.state);
 // Canonical JSON intentionally omits own undefined properties. Do not run
 // migrations while comparing: that would hide missing initialization again.
 const nextEqual=serializeRuntimeGameState(direct.state,2)===serializeRuntimeGameState(fresh.result.state,2);
 const reportEqual=isDeepStrictEqual(direct.report,fresh.result.report);
 const poolDifferences=Object.keys(raw.military.militia_pools??{}).sort().flatMap(id=>(['faction','fatigue','wounded_pending'] as const).filter(k=>!isDeepStrictEqual(raw.military.militia_pools[id][k],loaded.military.militia_pools[id][k])).map(k=>({id,field:k,raw:raw.military.militia_pools[id][k],loaded:loaded.military.militia_pools[id][k]})));
 const shapeOnlyDifferences:string[]=[];
 function compareRaw(a:unknown,b:unknown,p:string):void {
  if(isDeepStrictEqual(a,b))return;
  expect(a!==null&&b!==null&&typeof a==='object'&&typeof b==='object','non-JSON value drift at '+p).toBe(true);
  expect(Object.getPrototypeOf(a),'prototype drift at '+p).toBe(Object.getPrototypeOf(b));
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')throw Error('Non-JSON value drift '+p);
  if(a instanceof Map||a instanceof Set||b instanceof Map||b instanceof Set)throw Error('Map/Set drift '+p);
  const left=a as Record<string,unknown>,right=b as Record<string,unknown>;
  for(const key of new Set([...Object.keys(left),...Object.keys(right)])){
   if(!Object.prototype.hasOwnProperty.call(left,key)||!Object.prototype.hasOwnProperty.call(right,key)){
    expect(left[key],'lost defined value at '+p+'/'+key).toBeUndefined();expect(right[key],'added defined value at '+p+'/'+key).toBeUndefined();expect(ALLOWED_JSON_OMISSION_PATHS.has(p+'/'+key),'unexpected JSON omission path '+p+'/'+key).toBe(true);shapeOnlyDifferences.push(p+'/'+key);
   }else compareRaw(left[key],right[key],p+'/'+key);
  }
 }
 compareRaw(direct.state,fresh.result.state,'');
 const receipt={created,defaultDifferences,poolDifferences,strictRawEqual,shapeOnlyDifferences,nextEqual,reportEqual,parentPid:process.pid,childPid:fresh.childPid,canonicalSha256:createHash('sha256').update(canonical).digest('hex'),childCanonicalSha256:fresh.canonicalSha256};
 await writeFile(join(dir,'spawn-reload-witness.json'),JSON.stringify(receipt,null,2)+'\n');
 console.info('Actual campaign spawn/reload witness '+JSON.stringify({dir,created:created.length,defaultDifferences:defaultDifferences.length,nextEqual,reportEqual,childPid:fresh.childPid}));
 expect(defaultDifferences,'missing live initialization; artifacts='+dir).toEqual([]);
 expect(poolDifferences,'pool initialization drift; '+dir).toEqual([]);
 expect(fresh.canonicalSha256).toBe(receipt.canonicalSha256);
 expect(nextEqual,'full non-migrating runtime wire values after supported fresh-process canonical reload; '+dir).toBe(true);
 expect(reportEqual,'actual next-turn report; '+dir).toBe(true);
},120_000);
