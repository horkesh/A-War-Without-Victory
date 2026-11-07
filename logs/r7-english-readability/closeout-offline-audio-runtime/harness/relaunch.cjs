const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const {launch,sha}=require('./launch.cjs');
const [exePath,priorPath,newPath]=process.argv.slice(2);
assert(exePath&&priorPath&&newPath,'Explicit package and evidence roots required');
const exe=path.resolve(exePath), prior=path.resolve(priorPath), out=path.resolve(newPath);
assert(!fs.existsSync(out),'Evidence path already exists');
const baseline=JSON.parse(fs.readFileSync(path.join(prior,'receipt.json')));
assert(baseline.pass&&baseline.save.turn===0);
const old=new URL(baseline.frameUrl);
assert.equal(old.hostname,'127.0.0.1');
const saveFile=path.join(prior,'saves','autosave.json');
assert.equal(sha(fs.readFileSync(saveFile)),baseline.save.sha256);
const result={expected:baseline.preferences,previousOrigin:old.origin,deniedProxy:[]};
(async()=>{
  let run,page;
  const reserve=net.createServer();
  try {
    await new Promise((ok,fail)=>reserve.listen(Number(old.port),'127.0.0.1',ok).once('error',fail));
    run=await launch(exe,out,null,result,prior);
    const context=run.browser.contexts()[0];
    context.setDefaultTimeout(15000);
    page=context.pages()[0]||await context.waitForEvent('page',{timeout:15000});
    const iframe=await page.locator('iframe[src*="embedded=1"]').elementHandle({timeout:20000});
    const frame=await iframe.contentFrame();
    assert(frame);
    await frame.waitForURL(/embedded=1/,{timeout:20000});
    result.newOrigin=new URL(frame.url()).origin;
    assert.notEqual(result.newOrigin,old.origin);
    assert.equal(result.isolation.userData,baseline.isolation.userData);
    await frame.locator('.opening-splash__dismiss').click();
    await frame.getByRole('button',{name:'Settings',exact:true}).click();
    const dialog=frame.getByRole('dialog',{name:'Settings',exact:true});
    await dialog.getByRole('button',{name:'Audio',exact:true}).click();
    result.observed={
      musicEnabled:(await dialog.getByRole('button',{name:'Toggle background music'}).getAttribute('aria-pressed'))==='true',
      masterVolume:Number(await dialog.getByRole('slider',{name:'Master volume'}).inputValue())/100,
      musicVolume:Number(await dialog.getByRole('slider',{name:'Music volume'}).inputValue())/100,
    };
    result.storageAtNewOrigin=await frame.evaluate(()=>localStorage.getItem('awwv.audio.preferences.v2'));
    await page.screenshot({path:path.join(out,'relaunch-settings.png')});
    assert.equal(result.observed.musicEnabled,baseline.preferences.musicEnabled);
    assert.equal(result.observed.masterVolume,baseline.preferences.masterVolume);
    assert.equal(result.observed.musicVolume,baseline.preferences.musicVolume);
    result.pass=true;
  } catch(error) { result.pass=false;result.error=String(error.stack||error); }
  finally {
    if(run) await run.close();
    if(reserve.listening) await new Promise(resolve=>reserve.close(resolve));
    result.savePreserved=sha(fs.readFileSync(saveFile))===baseline.save.sha256;
    if(!result.savePreserved||result.forcedCleanup||result.exit?.code!==0) result.pass=false;
    if(fs.existsSync(out)) fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(result,null,2)+'\n');
    console.log(JSON.stringify(result));
    process.exitCode=result.pass?0:1;
  }
})();
