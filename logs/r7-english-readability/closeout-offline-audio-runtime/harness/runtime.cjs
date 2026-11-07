const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launch,sha,within}=require('./launch.cjs');

assert(process.argv[2] && process.argv[3],'Provide the package executable and a fresh evidence path');
const exe=path.resolve(process.argv[2]);
const out=path.resolve(process.argv[3]);
assert(!fs.existsSync(out),'Evidence path already exists');
const resources=path.join(path.dirname(exe),'resources');
const asar=path.join(resources,'app.asar');
const mediaDir=path.join(resources,'app','assets');
const manifest=fs.readFileSync('src/ui/map/audio/audioAssets.ts','utf8');
const sourceAssets=[...manifest.matchAll(/^import \w+Url from '([^']+\.ogg)';$/gm)]
  .map(m=>path.resolve('src/ui/map/audio',m[1]));
const packagedAssets=fs.readdirSync(mediaDir).filter(name=>name.endsWith('.ogg'));
const identities=files=>files.map(file=>({file,sha256:sha(fs.readFileSync(file))}));
const source=identities(sourceAssets), packaged=identities(packagedAssets.map(name=>path.join(mediaDir,name)));
assert.equal(source.length,30);
assert.deepEqual(packaged.map(a=>a.sha256).sort(),source.map(a=>a.sha256).sort());
const original=identities([exe,asar]);
const packagedAsar=require('@electron/asar');
const entry='src/desktop/electron-main.cjs';
assert.equal(sha(packagedAsar.extractFile(asar,path.normalize(entry))),sha(fs.readFileSync(entry)));
const result={commit:fs.readFileSync(path.join(__dirname,'source-commit.txt'),'utf8').trim(),assetIdentity:{source,packaged},packageIdentity:original,deniedProxy:[],requests:[],responses:[],requestFailures:[],console:[],errors:[],checks:[],snapshots:[],campaignStarts:0};
const isRemote=url=>/^https?:/i.test(url)&&!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname);
const isOgg=url=>/\.ogg(?:$|[?#])/i.test(url);
const nameOf=url=>path.basename(new URL(url).pathname);
const hasMusic=(src,kind)=>{
  const name=nameOf(src);
  if (kind==='opening') return name.startsWith('what_remains_of_home_opening-');
  if (kind==='menu') return name.startsWith('what_remains_of_home-');
  return sourceAssets.some(file=>file.includes(path.sep+'music'+path.sep)&&!path.basename(file).startsWith('what_remains_of_home')&&name.startsWith(path.basename(file,'.ogg')+'-'));
};
let run,page,frame;
const save=()=>fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(result,null,2)+'\n');
const check=(name,evidence={})=>{result.checks.push({name,...evidence});save();console.log(name);};
async function snap(label) {
  const data=await frame.evaluate(()=>{
    const proof=window.__audioQa;
    return {events:proof.events,elements:proof.elements.map(e=>({src:e.src,paused:e.paused,ended:e.ended,currentTime:e.currentTime,duration:e.duration,readyState:e.readyState,loop:e.loop,volume:e.volume,error:e.error?.code??null}))};
  });
  result.snapshots.push({label,...data});
  save();
  return data;
}
const active=(data,kind)=>data.elements.find(e=>hasMusic(e.src,kind)&&!e.paused&&e.currentTime>.1&&e.readyState>=2);
const observe = () => {
  const Original=window.Audio;
  const proof={elements:[],events:[]};
  Object.defineProperty(window,'__audioQa',{value:proof});
  window.Audio=new Proxy(Original,{
    construct(target,args,newTarget) {
      const e=Reflect.construct(target,args,newTarget);
      proof.elements.push(e);
      for(const type of ['playing','pause','ended','error','loadeddata','volumechange']) e.addEventListener(type,()=>{
        proof.events.push({type,src:e.src,time:e.currentTime,volume:e.volume,error:e.error?.code??null});
      });
      return e;
    }
  });
};
const waitForSound=(names,timeout=12000)=>frame.waitForFunction(names=>window.__audioQa.elements.some(e=>names.some(name=>new URL(e.src).pathname.split('/').at(-1).startsWith(name+'-'))&&!e.paused&&e.currentTime>.1&&e.readyState>=2),names,{timeout});
const mediaSources=dir=>sourceAssets.filter(f=>f.includes(path.sep+dir+path.sep)).map(f=>path.basename(f,'.ogg'));

(async()=>{
  try {
    run=await launch(exe,out,null,result);
    const context=run.browser.contexts()[0];
    context.setDefaultTimeout(15000);
    context.on('request',r=>result.requests.push({url:r.url(),type:r.resourceType()}));
    context.on('requestfailed',r=>result.requestFailures.push({url:r.url(),error:r.failure()?.errorText}));
    context.on('response',r=>{if(isOgg(r.url())) result.responses.push({url:r.url(),status:r.status()});});
    context.on('page',p=>p.on('pageerror',e=>result.errors.push(String(e))));
    page=context.pages()[0]||await context.waitForEvent('page',{timeout:15000});
    page.on('pageerror',e=>result.errors.push(String(e)));
    page.on('console',m=>{if(['warning','error'].includes(m.type())) result.console.push({type:m.type(),text:m.text()});});
    await context.addInitScript(observe);
    const iframe=await page.locator('iframe[src*="embedded=1"]').elementHandle({timeout:20000});
    frame=await iframe.contentFrame();
    assert(frame);
    await frame.waitForURL(/embedded=1/,{timeout:20000});
    result.frameUrl=frame.url();
    const u=new URL(result.frameUrl);
    assert.equal(u.hostname,'127.0.0.1');
    assert(!/^300[2-5]$/.test(u.port),'Foreign Vite selected');
    await frame.goto(frame.url(),{waitUntil:'domcontentloaded'});
    await frame.locator('.opening-splash__dismiss').waitFor({state:'visible'});
    const proxy=await run.node.eval("globalThis.__audioQaElectron.session.defaultSession.resolveProxy('https://offline-audio-control.invalid/sample.ogg')");
    assert.equal(proxy,'PROXY 127.0.0.1:'+result.proxyPort);
    const scripts=await frame.locator('script[src]').evaluateAll(es=>es.map(e=>e.src));
    assert(scripts.length>0);
    const binding=[];
    for (const url of scripts) {
      const parsed=new URL(url);
      assert.equal(parsed.origin,u.origin);
      const file=path.join(resources,'app',parsed.pathname.replace(/^\/(?:app\/)?/,''));
      const served=await page.request.get(url);
      assert(served.ok());
      const servedSha=sha(await served.body());
      assert.equal(servedSha,sha(fs.readFileSync(file)));
      binding.push({url,file,sha256:servedSha});
    }
    check('Packaged boot, isolated profile, proxy and served bundle identity',{proxy,binding});
    let current=await snap('before gesture');
    assert.equal(current.elements.length,0);
    await frame.locator('.opening-splash__dismiss').click();
    await frame.getByRole('button',{name:'Settings',exact:true}).click();
    const dialog=frame.getByRole('dialog',{name:'Settings',exact:true});
    await dialog.getByRole('button',{name:'Audio',exact:true}).click();
    const music=dialog.getByRole('button',{name:'Toggle background music',exact:true});
    const sound=dialog.getByRole('button',{name:'Toggle soundscape audio',exact:true});
    assert.equal(await music.getAttribute('aria-pressed'),'false');
    await frame.waitForFunction(()=>window.__audioQa.events.some(e=>e.type==='playing'&&e.src.includes('/ui_open_panel-')));
    current=await snap('fresh defaults and open-panel cue');
    assert(current.elements.every(e=>!['opening','menu','campaign'].some(kind=>hasMusic(e.src,kind))));
    check('Default music opt-in and real UI opening effect');
    await music.click();
    await waitForSound(['what_remains_of_home_opening']);
    current=await snap('opening playback');
    const opening=active(current,'opening');
    assert(opening && !opening.loop && Math.abs(opening.duration-35)<.2 && opening.volume>0);
    const musicVolume=dialog.getByRole('slider',{name:'Music volume',exact:true});
    await musicVolume.press('ArrowLeft');
    await frame.waitForFunction(({src,volume})=>window.__audioQa.elements.some(e=>e.src===src&&e.volume<volume),opening);
    let changed=await snap('music volume decreased');
    assert(changed.elements.find(e=>e.src===opening.src).volume<opening.volume);
    const master=dialog.getByRole('slider',{name:'Master volume',exact:true});
    current=await snap('master baseline');
    await master.press('ArrowLeft');
    await frame.waitForFunction(({src,volume})=>window.__audioQa.elements.some(e=>e.src===src&&e.volume<volume),current.elements.find(e=>e.src===opening.src));
    changed=await snap('master volume decreased');
    assert(changed.elements.find(e=>e.src===opening.src).volume<current.elements.find(e=>e.src===opening.src).volume);
    await sound.click();
    await frame.waitForFunction(()=>window.__audioQa.elements.every(e=>e.paused));
    current=await snap('global mute');
    assert(current.elements.every(e=>e.paused));
    const pausedAt=current.elements.find(e=>e.src===opening.src).currentTime;
    await sound.click();
    await waitForSound(['what_remains_of_home_opening']);
    current=await snap('global unmute');
    assert(active(current,'opening').currentTime>=pausedAt-.05);
    await waitForSound(['what_remains_of_home'],45000);
    current=await snap('natural transition to menu');
    assert(current.elements.find(e=>e.src===opening.src).ended);
    assert(active(current,'menu').loop);
    assert(!current.elements.some(e=>hasMusic(e.src,'campaign')));
    check('Natural opening to calm menu with working master/music volume and mute/resume');
    await music.click();
    await frame.waitForFunction(()=>window.__audioQa.elements.filter(e=>e.src.includes('/what_remains_of_home-')).every(e=>e.paused));
    current=await snap('music disabled independently');
    assert(!active(current,'menu'));
    await music.click();
    await waitForSound(['what_remains_of_home']);
    result.preferences=await frame.evaluate(()=>JSON.parse(localStorage.getItem('awwv.audio.preferences.v2')));
    assert(result.preferences.musicEnabled&&result.preferences.masterVolume<.5&&result.preferences.musicVolume<.5);
    await dialog.getByRole('button',{name:'Close',exact:true}).click();
    await frame.waitForFunction(()=>window.__audioQa.events.some(e=>e.type==='playing'&&e.src.includes('/ui_close_panel-')));
    await frame.getByRole('button',{name:'New War',exact:true}).click();
    await frame.getByTestId('main-menu-faction-RBiH').click();
    await frame.getByRole('button',{name:'Take command',exact:true}).click();
    const begin=frame.getByRole('button',{name:'Begin',exact:true});
    await begin.waitFor({state:'visible'});
    result.campaignStarts++;
    await begin.click();
    const campaignNames=mediaSources('music').filter(n=>!n.startsWith('what_remains_of_home'));
    await waitForSound(campaignNames,45000);
    current=await snap('campaign playback');
    const campaign=active(current,'campaign');
    assert(campaign && !campaign.loop && campaign.duration>=180 && campaign.duration<=240);
    assert(!active(current,'menu'));
    const saveFile=path.join(out,'saves','autosave.json');
    for(let i=0;i<50&&!fs.existsSync(saveFile);i++) await new Promise(r=>setTimeout(r,200));
    assert(fs.existsSync(saveFile),'Isolated autosave absent');
    const saveBytes=fs.readFileSync(saveFile);
    assert.equal(JSON.parse(saveBytes).meta.turn,0);
    result.save={sha256:sha(saveBytes),turn:0};
    assert(current.events.some(e=>e.type==='playing'&&e.src.includes('/ui_click-')));
    check('Campaign plays an approved track at turn zero, and open/click/close effects decoded',{track:nameOf(campaign.src)});
    await page.screenshot({path:path.join(out,'campaign-audio.png')});
    result.nodeDenied=await run.node.eval('globalThis.__audioQaNodeDenied');
    assert(!result.nodeDenied.some(r=>isRemote(r.url)&&isOgg(r.url)));
    assert(!result.requests.some(r=>isRemote(r.url)&&(isOgg(r.url)||r.type==='media')));
    assert(result.responses.some(r=>[200,206].includes(r.status)&&r.url===campaign.src));
    assert(!result.errors.length,result.errors.join('\n'));
    assert(current.elements.every(e=>!e.error));
    for (const event of current.events.filter(e=>e.type==='playing')) {
      assert.equal(new URL(event.src).origin,u.origin);
      assert(packagedAssets.includes(nameOf(event.src)));
    }
    result.pass=true;
  } catch(error) {
    result.pass=false;result.error=String(error.stack||error);
    if(page) await page.screenshot({path:path.join(out,'failure.png'),timeout:5000}).catch(()=>{});
  } finally {
    if(run) await run.close();
    try {
      assert.deepEqual(identities([exe,asar]),original);
      const net=JSON.parse(fs.readFileSync(path.join(out,'chromium-netlog.json'),'utf8'));
      const urls=[...new Set(net.events.flatMap(e=>typeof e.params?.url==='string'?[e.params.url]:[]))];
      result.netlog={totalEvents:net.events.length,localOgg:urls.filter(x=>isOgg(x)&&!isRemote(x)),remote:urls.filter(isRemote),remoteOgg:urls.filter(x=>isOgg(x)&&isRemote(x))};
      if(result.pass) {
        assert(result.netlog.localOgg.length>=5,'Incomplete NetLog audio coverage');
        assert.equal(result.netlog.remoteOgg.length,0);
        assert(!result.deniedProxy.some(r=>isOgg(r.url)));
        assert(!result.forcedCleanup && result.exit?.code===0,'Package did not close cleanly');
      }
    } catch(error) {result.pass=false;result.finalError=String(error.stack||error);}
    save();
    console.log(JSON.stringify({pass:result.pass,checks:result.checks.length,error:result.error,finalError:result.finalError,receipt:path.join(out,'receipt.json')}));
    process.exitCode=result.pass?0:1;
  }
})();
