'use strict';
// BC06 disposable live proof. Prepared only; launch requires root coordination.
// Config contains reviewed fixture, visible click steps and exact before/after
// assertions. No game-state injection or mocked mutation bridge is permitted.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = 'F:/A-War-Without-Victory/logs/bc06';
const repo = 'F:/A-War-Without-Victory';
const req = createRequire(path.join(repo, 'package.json'));
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
function within(p, base) {
  const rel = path.relative(path.resolve(base), path.resolve(p));
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}
function valueAt(object, keys) { return keys.reduce((v, k) => v?.[k], object); }
function check(state, assertions) {
  assert(assertions.length > 0, 'No assertion is not evidence');
  for (const item of assertions) assert.deepEqual(valueAt(state, item.path), item.equals, item.label);
}
async function target(app, spec) {
  for (const page of app.windows()) {
    if (page.url().startsWith('devtools:')) continue;
    for (const frame of page.frames()) {
      if (spec.frameUrlIncludes && !frame.url().includes(spec.frameUrlIncludes)) continue;
      let locator = spec.selector ? frame.locator(spec.selector) : frame.getByRole('button', { name: spec.buttonRegex ? new RegExp(spec.buttonRegex,'i') : spec.buttonName, exact: !spec.buttonRegex });
      if(spec.selector && spec.buttonRegex) locator=locator.filter({hasText:new RegExp(spec.buttonRegex,'i')});
      const visible=[];
      for(const candidate of await locator.all()) if(await candidate.isVisible()) visible.push(candidate);
      if(visible.length===1) return { page, frame, locator:visible[0] };
    }
  }
  return null;
}
async function waitTarget(app, spec) {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    const found = await target(app, spec);
    if (found) return found;
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Visible unique control absent: ${JSON.stringify(spec)}`);
}
async function readState(app) {
  for (const page of app.windows()) {
    if (page.url().startsWith('devtools:')) continue;
    const raw = await page.evaluate(async () => window.awwv?.getCurrentGameState()).catch(() => null);
    if (raw) return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  throw new Error('Real preload current-state bridge unavailable');
}
async function main() {
  assert.equal(process.argv[2], '--execute-reviewed-proof', 'Launch gate: explicit reviewed-proof argument required');
  const configPath = path.resolve(process.argv[3] || '');
  assert(within(configPath, root), 'Config must stay in isolated evidence root');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert(config.reviewed && config.caseId && config.steps.length, 'Reviewed proof config required');
  const out = path.resolve(root, config.caseId);
  assert(within(out, root) && !fs.existsSync(out), 'Fresh isolated output required');
  assert(within(config.fixture, root), 'Fixture must be a local evidence copy, never a real save');
  assert(config.after.length > 0 && config.before.length > 0, 'Both state boundaries required');
  fs.mkdirSync(out, { recursive: true });
  const saveRoot = path.join(out, 'saves');
  const profile = path.join(out, 'profile');
  fs.mkdirSync(saveRoot); fs.mkdirSync(profile);
  const fixtureHash = hash(fs.readFileSync(config.fixture));
  // Field Records uses list-save-records/load-save-record against this isolated
  // directory. The visible Resume action loads canonical main-process state.
  const fixtureRecord = 'bc06-proof-fixture.json';
  fs.copyFileSync(config.fixture, path.join(saveRoot, fixtureRecord));
  fs.writeFileSync(path.join(out, 'provenance.json'), JSON.stringify({
    repo, head: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: repo, encoding:'utf8'}).trim(),
    diff: execFileSync('git', ['diff', '--binary'], {cwd:repo, encoding:'utf8'}),
    node: process.version, fixture: config.fixture, fixtureHash, saveRoot, profile,
    runtimeHashes: Object.fromEntries(['src/desktop/player_visible_state.cjs','src/desktop/electron-main.cjs','dist/desktop/desktop_sim.cjs','dist/tactical-map/index.html','dist/warroom/index.html'].map(file=>[file,hash(fs.readFileSync(path.join(repo,file)))])),
    proofKind: 'development Electron visible actions through real IPC, not packaged acceptance',
  }, null, 2));
  const { _electron: electron } = req('playwright');
  const app = await electron.launch({cwd:repo, args:['.', `--user-data-dir=${profile}`],
    env:{...process.env,AWWV_MAP_TRANSITION_PROFILE:'1',AWWV_MAP_TRANSITION_SAVE_ROOT:saveRoot,
      AWWV_MAP_TRANSITION_COLD_CACHE:'1',ELECTRON_DISABLE_SECURITY_WARNINGS:'true'},timeout:90000});
  const events = [];
  const diagnostics = [];
  function observe(page) {
    page.on('pageerror', error => diagnostics.push({kind:'pageerror', message:String(error)}));
    page.on('requestfailed', request => diagnostics.push({kind:'requestfailed', url:request.url(), error:request.failure()}));
    page.on('response', response => { if(response.status() >= 400) diagnostics.push({kind:'http',url:response.url(),status:response.status()}); });
  }
  app.windows().forEach(observe);
  app.on('window', observe);
  app.process().stdout.on('data', c => fs.appendFileSync(path.join(out,'main.stdout.log'),c));
  app.process().stderr.on('data', c => fs.appendFileSync(path.join(out,'main.stderr.log'),c));
  try {
    // Only replace the OS file chooser; real load/deserialization and all later
    // mutations remain production handlers. This cannot write the fixture.
    await app.evaluate(({dialog}, fixture) => {
      dialog.showOpenDialog = async () => ({canceled:false,filePaths:[fixture]});
      dialog.showOpenDialogSync = () => [fixture];
    }, config.fixture);
    for (const step of config.loadSteps) {
      const {locator} = await waitTarget(app,step); await locator.click();
    }
    let before;
    for(let attempt=0;attempt<75;attempt++) {
      try {before=await readState(app);break;} catch {await new Promise(r=>setTimeout(r,200));}
    }
    assert(before,'Real load did not establish current state'); check(before,config.before);
    fs.writeFileSync(path.join(out,'before.json'),JSON.stringify(before,null,2));
    for (let i=0;i<config.steps.length;i++) {
      const step=config.steps[i];
      if(step.optional && !await target(app,step)) {events.push({step:i,spec:step,absentOptionalControl:true});continue;}
      const {page,frame,locator}=await waitTarget(app,step);
      if(step.observeReceipt) await frame.evaluate(expected=>{
        window.__bc06ReceiptEvidence=null;
        const observe=()=>{
          const el=[...document.querySelectorAll('[role="status"]')].find(e=>e.textContent?.trim()===expected);
          if(!el) return;
          const r=el.getBoundingClientRect();
          if(r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden') {
            window.__bc06ReceiptEvidence={text:el.textContent.trim(),width:r.width,height:r.height};
          }
        };
        new MutationObserver(observe).observe(document.body,{subtree:true,childList:true,characterData:true});
        observe();
      },step.observeReceipt);
      if(step.textIncludes) assert((await frame.locator('body').innerText()).includes(step.textIncludes));
      for (const selector of step.absentSelectors ?? []) assert.equal(await frame.locator(selector).count(),0,`Unexpected control: ${selector}`);
      if(step.inspectOnly) { assert(await locator.isVisible()); }
      else if(step.disabled) { assert(await locator.isDisabled()); }
      else { assert(await locator.isEnabled()); await locator.click(); }
      if(step.observeReceipt) {
        await frame.waitForFunction(()=>window.__bc06ReceiptEvidence!==null,undefined,{timeout:10000});
        events.push({receiptObservation:await frame.evaluate(()=>window.__bc06ReceiptEvidence)});
      }
      await page.screenshot({path:path.join(out,`step-${i}.png`)});
      fs.writeFileSync(path.join(out,`step-${i}.txt`),await frame.locator('body').innerText());
      fs.writeFileSync(path.join(out,`step-${i}-state.json`),JSON.stringify(await readState(app),null,2));
      events.push({step:i,spec:step,url:frame.url(),visible:true});
    }
    const deadline=Date.now()+15000; let after;
    while(Date.now()<deadline) {
      after=await readState(app);
      try {check(after,config.after);break;} catch(e){await new Promise(r=>setTimeout(r,200));}
    }
    check(after,config.after);
    fs.writeFileSync(path.join(out,'after.json'),JSON.stringify(after,null,2));
    if(config.expectsMutation) {
      assert.notEqual(hash(JSON.stringify(before)),hash(JSON.stringify(after)));
      const persisted=JSON.parse(fs.readFileSync(path.join(saveRoot,'autosave.json'),'utf8'));
      check(persisted,config.persisted);
      fs.writeFileSync(path.join(out,'persisted.json'),JSON.stringify(persisted,null,2));
    }
    if(config.repeatAction) {
      const autosave=path.join(saveRoot,'autosave.json');
      const beforeRepeat=hash(fs.readFileSync(autosave));
      const page=app.windows().find(p=>!p.url().startsWith('devtools:'));
      const repeated=await page.evaluate(async method=>window.awwv[method](),config.repeatAction);
      assert.equal(repeated.ok,false,'Repeated request must be rejected');
      assert.equal(repeated.reason,config.repeatReason);
      assert.equal(hash(fs.readFileSync(autosave)),beforeRepeat,'Rejected request must preserve canonical autosave');
      events.push({repeatKind:'real preload IPC after visible player action',method:config.repeatAction,result:repeated,autosaveUnchanged:true});
    }
    assert.equal(hash(fs.readFileSync(config.fixture)),fixtureHash,'Fixture changed');
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:true,events,diagnostics},null,2));
  } catch(error) {
    for (let w=0;w<app.windows().length;w++) {
      const page=app.windows()[w];
      await page.screenshot({path:path.join(out,`failure-window-${w}.png`)}).catch(()=>{});
      for(let f=0;f<page.frames().length;f++) fs.writeFileSync(path.join(out,`failure-window-${w}-frame-${f}.txt`),await page.frames()[f].locator('body').innerText().catch(()=>''));
    }
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({pass:false,error:String(error.stack||error),events,diagnostics},null,2));
    throw error;
  } finally {await app.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
