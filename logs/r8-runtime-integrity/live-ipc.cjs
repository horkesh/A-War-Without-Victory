'use strict';
// Disposable development Electron proof: unmodified main/preload/bundle, real IPC.
// The HTML is only a bridge host; this is not UI or packaged acceptance.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { _electron } = require('playwright');
const repo = path.resolve(__dirname, '../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const fingerprint = file => hash(fs.readFileSync(file));
const write = (file, value) => { fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, value); };
function mixedInvalidRow(relative, bytes) {
  const raw=JSON.parse(bytes);
  const first=record=>Object.keys(record)[0];
  if(relative.endsWith('municipality_population_1991.json')) {
    const rows=raw.by_mun1990_id ?? raw.by_municipality_id;
    rows[first(rows)].total='invalid';
  } else if(relative.endsWith('census_rolled_up_wgs84.json')) raw.by_sid[first(raw.by_sid)].p='invalid';
  else if(relative.endsWith('settlement_ethnicity_data.json')) raw.by_settlement_id[first(raw.by_settlement_id)].composition='invalid';
  else if(relative.endsWith('municipality_hq_settlement.json')) raw.by_mun1990_id[first(raw.by_mun1990_id)]=7;
  else if(relative.endsWith('oob_brigades.json')) raw.push(null);
  else if(relative.endsWith('municipalities_1990_registry_110.json')) raw.rows.push({mun1990_id:7});
  else throw new Error(`No mixed-row negative defined for ${relative}`);
  return JSON.stringify(raw);
}
async function main() {
  const fixture = path.resolve(process.argv[2]);
  const out = path.resolve(__dirname, process.argv[3] || 'live-ipc-01');
  assert(!fs.existsSync(out), 'Fresh evidence directory required');
  assert(path.dirname(out) === __dirname, 'Evidence must remain inside packet directory');
  const appRoot = path.join(out, 'app');
  fs.mkdirSync(appRoot, {recursive:true});
  fs.cpSync(path.join(fixture, 'data'), path.join(appRoot, 'data'), {recursive:true});
  fs.mkdirSync(path.join(appRoot, 'src/desktop'), {recursive:true});
  const copiedSources = [];
  for (const name of fs.readdirSync(path.join(repo,'src/desktop')).sort()) {
    if (!name.endsWith('.cjs')) continue;
    const rel = `src/desktop/${name}`;
    fs.copyFileSync(path.join(repo,rel),path.join(appRoot,rel)); copiedSources.push(rel);
  }
  const bundle = 'dist/desktop/desktop_sim.cjs';
  write(path.join(appRoot,bundle), fs.readFileSync(path.join(repo,bundle))); copiedSources.push(bundle);
  write(path.join(appRoot,'package.json'), JSON.stringify({name:'bc09-local-ipc',version:'1.0.0',main:'src/desktop/electron-main.cjs'}));
  write(path.join(appRoot,'dist/warroom/index.html'), '<!doctype html><title>BC09 local IPC fixture</title><p>Real desktop IPC boundary proof</p>');
  const saves = path.join(out,'saves');
  write(path.join(saves,'fixture.json'), fs.readFileSync(path.join(fixture,'state.json')));
  const inputPaths = [];
  function walk(dir) { for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name < b.name ? -1 : 1)) { const p=path.join(dir,e.name); if(e.isDirectory()) walk(p); else inputPaths.push(path.relative(appRoot,p).replaceAll('\\','/')); } }
  walk(path.join(appRoot,'data'));
  const provenance = {kind:'development Electron real IPC; synthetic single-turn fixture; no campaign or packaged acceptance',
    head:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),node:process.version,
    sources:Object.fromEntries(copiedSources.map(p=>[p,fingerprint(path.join(appRoot,p))])),
    harnesses:Object.fromEntries(['live-ipc.cjs','prepare-live-fixture.ts','baseline-one-turn.cjs'].map(p=>[p,fingerprint(path.join(__dirname,p))])),
    inputs:Object.fromEntries(inputPaths.map(p=>[p,fingerprint(path.join(appRoot,p))])),fixture:fingerprint(path.join(fixture,'state.json'))};
  write(path.join(out,'provenance.json'),JSON.stringify(provenance,null,2));
  const env = {...process.env,AWWV_MAP_TRANSITION_PROFILE:'1',AWWV_MAP_TRANSITION_SAVE_ROOT:saves,ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};
  delete env.ELECTRON_RUN_AS_NODE; delete env.AWWV_DESKTOP_RUNTIME_PROBE;
  const app = await _electron.launch({cwd:appRoot,args:[appRoot,`--user-data-dir=${path.join(out,'profile')}`],env,timeout:60000});
  const results = [];
  app.process().stdout.on('data',c=>fs.appendFileSync(path.join(out,'main.stdout.log'),c));
  app.process().stderr.on('data',c=>fs.appendFileSync(path.join(out,'main.stderr.log'),c));
  try {
    const observer = await app.firstWindow(); await observer.waitForFunction(()=>!!window.awwv);
    // Production broadcasts to its main/tactical windows only. Invoke from a
    // second real renderer so the actual main window observes state broadcasts.
    await app.evaluate(async ({BrowserWindow}, preload)=>{ const observer=new BrowserWindow({show:false,webPreferences:{preload,contextIsolation:true,nodeIntegration:false}}); await observer.loadURL('data:text/html,<title>BC09 observer</title>'); },path.join(appRoot,'src/desktop/preload.cjs'));
    const page = app.windows().find(p=>p!==observer); assert(page);
    await page.waitForFunction(()=>!!window.awwv);
    await observer.evaluate(()=>{window.events=[];window.awwv.subscribeGameStateUpdated(()=>window.events.push('state'));window.awwv.subscribeTurnReportUpdated(()=>window.events.push('report'));window.awwv.subscribeReplayManifestUpdated(()=>window.events.push('replay'));});
    assert.equal((await page.evaluate(()=>window.awwv.loadSaveRecord('fixture.json'))).ok,true);
    assert.equal((await page.evaluate(()=>window.awwv.saveGame({filename:'autosave.json'}))).ok,true);
    const before = await page.evaluate(()=>window.awwv.getCurrentGameState());
    const beforeHash = fingerprint(path.join(saves,'autosave.json'));
    const allRequired = JSON.parse(fs.readFileSync(path.join(fixture,'required-files.json'),'utf8'));
    const required = process.argv[4] ? allRequired.filter(p=>p===process.argv[4]) : allRequired;
    assert(required.length>0,'Required-file selection must not be empty');
    for(const rel of required) {
      const target=path.resolve(appRoot,rel); assert(target.startsWith(appRoot+path.sep));
      const original=fs.readFileSync(target);
      for(const kind of ['missing','malformed','structural','mixed']) {
        if(kind==='missing') fs.unlinkSync(target);
        else fs.writeFileSync(target,kind==='malformed' ? '{' : kind==='structural' ? '[]' : mixedInvalidRow(rel,original));
        try {
          const result=await page.evaluate(()=>window.awwv.advanceTurn());
          assert.equal(result.ok,false,`${rel} ${kind} must reject`);
          assert(result.error.includes(path.basename(rel)),`${rel}: file-specific error missing: ${result.error}`);
          assert.equal(await page.evaluate(()=>window.awwv.getCurrentGameState()),before,'Runtime state unchanged');
          assert.equal(fingerprint(path.join(saves,'autosave.json')),beforeHash,'Canonical save unchanged');
          assert.deepEqual(await observer.evaluate(()=>window.events),[],'No rejected-advance broadcasts');
          results.push({file:rel,kind,result,stateUnchanged:true,canonicalSaveUnchanged:true,broadcasts:0});
        } finally {fs.writeFileSync(target,original);}
      }
    }
    const result=await page.evaluate(()=>window.awwv.advanceTurn()); assert.equal(result.ok,true,JSON.stringify(result));
    const after=await page.evaluate(()=>window.awwv.getCurrentGameState());
    assert.equal(JSON.parse(after).meta.turn,JSON.parse(before).meta.turn+1);
    assert.notEqual(fingerprint(path.join(saves,'autosave.json')),beforeHash);
    const canonicalSha256=fingerprint(path.join(saves,'autosave.json'));
    const baselineSha256=fingerprint(path.join(__dirname,'baseline-one-turn-save.json'));
    assert.equal(canonicalSha256,baselineSha256,'Valid-input canonical output must match untouched base source');
    await observer.waitForFunction(()=>window.events.includes('state')&&window.events.includes('report'));
    results.push({kind:'valid-control',ok:true,beforeTurn:JSON.parse(before).meta.turn,afterTurn:JSON.parse(after).meta.turn,broadcasts:await observer.evaluate(()=>window.events),canonicalSaveChanged:true,baselineByteIdentical:true,canonicalSha256});
    write(path.join(out,'before.json'),before); write(path.join(out,'after.json'),after);
    for(const rel of inputPaths) assert.equal(fingerprint(path.join(appRoot,rel)),provenance.inputs[rel]);
    write(path.join(out,'result.json'),JSON.stringify({pass:true,results},null,2));
    console.log(JSON.stringify({pass:true,cases:results.length,evidence:out}));
  } catch(error) {write(path.join(out,'result.json'),JSON.stringify({pass:false,error:String(error.stack||error),results},null,2));throw error;}
  finally {await app.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
