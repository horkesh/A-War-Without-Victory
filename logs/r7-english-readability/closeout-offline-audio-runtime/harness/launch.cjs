const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { chromium } = require(process.env.AWWV_AUDIO_QA_PLAYWRIGHT || 'playwright');
const sha = b => require('node:crypto').createHash('sha256').update(b).digest('hex');

function within(promise, label, ms = 15000) {
  let timeout;
  return Promise.race([promise, new Promise((_, reject) => {
    timeout = setTimeout(() => reject(Error(label + ' timed out')), ms);
  })]).finally(() => clearTimeout(timeout));
}

async function inspector(url) {
  const socket = new WebSocket(url);
  const pending = new Map(), events = new Map();
  let id = 0;
  await within(new Promise((ok, fail) => {
    socket.addEventListener('open', ok, {once:true});
    socket.addEventListener('error', fail, {once:true});
  }), 'Node inspector connection');
  socket.addEventListener('message', ({data}) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const {resolve,reject} = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(Error(JSON.stringify(message.error)));
      else resolve(message.result);
    } else if (events.has(message.method)) {
      events.get(message.method)(message.params);
      events.delete(message.method);
    }
  });
  return {
    socket,
    send(method, params = {}) {
      const key = ++id;
      return within(new Promise((resolve, reject) => {
        pending.set(key, {resolve,reject});
        socket.send(JSON.stringify({id:key,method,params}));
      }), method);
    },
    event: name => within(new Promise(resolve => events.set(name,resolve)), name),
    async eval(expression) {
      const result = await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      if (result.exceptionDetails) throw Error(result.result.description);
      return result.result.value;
    }
  };
}

async function launch(exe, out, entry, receipt, stateRoot = out) {
  fs.mkdirSync(out,{recursive:false});
  const proxy = http.createServer((req,res) => {
    receipt.deniedProxy.push({kind:'http',url:req.url});
    res.writeHead(502).end('Offline QA proxy');
  });
  proxy.on('connect',(req,socket) => {
    receipt.deniedProxy.push({kind:'connect',url:req.url});
    socket.end('HTTP/1.1 502 Offline QA Proxy\r\nConnection: close\r\n\r\n');
  });
  await new Promise((ok,fail)=>proxy.listen(0,'127.0.0.1',ok).once('error',fail));
  const proxyPort=proxy.address().port;
  receipt.proxyPort=proxyPort;
  const args = [
    '--inspect-brk=0','--remote-debugging-port=0','--disable-quic',
    '--disable-background-networking','--disable-component-update',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding',
    '--proxy-server=http://127.0.0.1:'+proxyPort,
    '--log-net-log='+path.join(out,'chromium-netlog.json'),
    ...(entry ? [entry] : [])
  ];
  const env={...process.env,APPDATA:path.join(stateRoot,'roaming'),LOCALAPPDATA:path.join(stateRoot,'local'),
    AWWV_MAP_TRANSITION_PROFILE:'1',AWWV_MAP_TRANSITION_SAVE_ROOT:path.join(stateRoot,'saves'),
    AWWV_RUNTIME_OUTPUT_ROOT:path.join(out,'runtime')};
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.NODE_OPTIONS;
  delete env.AWWV_DESKTOP_RUNTIME_PROBE;
  const child=spawn(exe,args,{env,cwd:path.dirname(exe),windowsHide:true,stdio:['ignore','pipe','pipe']});
  receipt.pid=child.pid;
  const exit=new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal})));
  const log=fs.createWriteStream(path.join(out,'electron.log'));
  let buffer='', node, browser;
  let findNode, findChrome, childError;
  const readyNode=new Promise(resolve=>findNode=resolve);
  const readyChrome=new Promise(resolve=>findChrome=resolve);
  child.once('error',e=>{ childError=e; });
  for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{
    log.write(chunk);
    buffer+=chunk.toString();
    const ns=buffer.match(/Debugger listening on (ws:\/\/[^\s]+)/);
    const cs=buffer.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if(ns)findNode(ns[1]);
    if(cs)findChrome(cs[1]);
  });
  const exited=exit.then(value=>{throw Error('Electron exited '+JSON.stringify(value));});
  exited.catch(()=>{});
  async function close() {
    if(node) {
      await node.eval('globalThis.__audioQaElectron.app.quit()').catch(()=>{});
      node.socket.close();
    }
    if(browser) await browser.close().catch(()=>{});
    if(child.exitCode===null && child.pid) {
      await within(exit,'clean Electron exit',8000).catch(()=>{
        receipt.forcedCleanup=true;
        spawnSync('taskkill',['/pid',String(child.pid),'/t','/f'],{windowsHide:true,encoding:'utf8'});
      });
    }
    if(child.pid) receipt.exit=await within(exit,'Electron process cleanup',8000).catch(()=>null);
    await new Promise(resolve=>proxy.close(resolve));
    await new Promise(resolve=>log.end(resolve));
  }
  try {
    node=await inspector(await within(Promise.race([readyNode,exited]),'debugger startup',15000));
    await node.send('Debugger.enable');
    const paused=node.event('Debugger.paused');
    await node.send('Runtime.runIfWaitingForDebugger');
    const pause=await paused;
    const first=pause.callFrames[0];
    receipt.firstScript=first.url || first.functionName;
    const bootstrap = `(() => {
      const req = typeof require === 'function' ? require : process.getBuiltinModule('node:module').createRequire(process.execPath);
      const electron = req('electron');
      globalThis.__audioQaElectron = electron;
      const root = ${JSON.stringify(stateRoot)};
      const paths = req('node:path');
      const fs = req('node:fs');
      const profile = paths.join(root,'profile');
      fs.mkdirSync(profile,{recursive:true});
      electron.app.setPath('userData',profile);
      electron.app.setPath('sessionData',profile);
      const denied = [];
      globalThis.__audioQaNodeDenied = denied;
      const E = req('node:events').EventEmitter;
      for (const scheme of ['http','https']) {
        const mod = req('node:'+scheme);
        for (const method of ['get','request']) {
          const original = mod[method];
          mod[method] = function(target,...rest) {
            const parsed=typeof target === 'string' || target instanceof URL
              ? new URL(target)
              : {hostname:target?.hostname || target?.host || 'localhost',port:String(target?.port || ''),href:JSON.stringify(target)};
            if (['127.0.0.1','localhost','::1','[::1]'].includes(parsed.hostname) && !/^300[2-5]$/.test(parsed.port))
              return original.call(this,target,...rest);
            denied.push({method,url:parsed.href});
            const result = new E();
            result.setTimeout=()=>result;
            result.destroy=()=>result;
            result.end=()=>result;
            queueMicrotask(()=>result.emit('error',Error('Task offline HTTP restriction')));
            return result;
          };
        }
      }
      return {userData:electron.app.getPath('userData'),sessionData:electron.app.getPath('sessionData'),packaged:electron.app.isPackaged};
    })()`;
    const boot=await node.send('Debugger.evaluateOnCallFrame',{callFrameId:first.callFrameId,expression:bootstrap,returnByValue:true});
    if(boot.exceptionDetails) throw Error(boot.result.description);
    receipt.isolation=boot.result.value;
    assert.equal(receipt.isolation.userData,path.join(stateRoot,'profile'));
    assert.equal(receipt.isolation.sessionData,path.join(stateRoot,'profile'));
    assert.equal(receipt.isolation.packaged,!entry);
    await node.send('Debugger.resume');
    const ws=await within(Promise.race([readyChrome,exited]),'Chromium CDP startup',25000);
    browser=await chromium.connectOverCDP(ws,{timeout:15000});
    return {browser,node,close};
  } catch(error) {
    receipt.launchError=String(childError || error);
    await close();
    throw error;
  }
}

module.exports={launch,sha,within};
