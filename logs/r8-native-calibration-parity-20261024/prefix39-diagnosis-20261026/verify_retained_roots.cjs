'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT='C:/Users/User/.codex/worktrees/october-calibration-checkpoint/A-War-Without-Victory';
const source='logs/r8-native-calibration-parity-20261024/prefix39-diagnosis-20261026/prefix-closing-preservation.json';
const expectedSha='';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const out=path.resolve(process.argv[2]);
const rel=p=>p.replaceAll('\\','/');
const expected=JSON.parse(fs.readFileSync(path.join(ROOT,source),'utf8'));
function walk(root,dir=root){let rows=[];for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,e.name);if(e.isDirectory())rows=rows.concat(walk(root,p));else if(e.isFile())rows.push(rel(path.relative(root,p)));else throw Error('Unsupported retained entry:'+p);}return rows;}
const rows=[];
for(const old of expected){const root=path.resolve(ROOT,old.root);if(!root.toLowerCase().startsWith(path.resolve(ROOT).toLowerCase()+path.sep))throw Error('Root outside authorized worktree');const files=walk(root),digest=crypto.createHash('sha256');let bytes=0;for(const name of files){const b=fs.readFileSync(path.join(root,name));bytes+=b.length;digest.update(`${name}\0${b.length}\0${sha(b)}\n`);}const actual={root:old.root,count:files.length,bytes,aggregate_sha256:digest.digest('hex')};rows.push({expected:old,actual,pass:JSON.stringify(old)===JSON.stringify(actual)});}
const result={schema:'awwv.retained-roots-post-forks-preservation.v1',reference:source,reference_sha256:sha(fs.readFileSync(path.join(ROOT,source))),method:'Exact prior Node22 localeCompare recursive file order and path\\0length\\0SHA256\\n digest, matching retained first39 entry snapshot.',scope:'14 recorded retained roots, including complete n91-n102; does not claim all workspace files or repair the earlier temporary-test cleanup gap.',pass:rows.every(x=>x.pass),roots:rows.length,files:rows.reduce((s,x)=>s+x.actual.count,0),bytes:rows.reduce((s,x)=>s+x.actual.bytes,0),rows};
fs.writeFileSync(path.join(out,'RESULT.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({pass:result.pass,roots:result.roots,files:result.files,bytes:result.bytes}));if(!result.pass)process.exitCode=2;