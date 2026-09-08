'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sourcePaths=git('ls-files','src','tools/desktop_bundle_sim.mjs','tools/scenario_runner/build_startup_snapshot.ts','package.json','package-lock.json').split(/\r?\n/).filter(Boolean).sort();
const inputPaths=[
  'data/source/settlements_initial_master.json','data/derived/settlement_edges.json',
  'data/derived/municipality_population_1991.json','data/derived/census_rolled_up_wgs84.json',
  'data/derived/settlement_ethnicity_data.json','data/derived/municipality_hq_settlement.json',
  'data/source/oob_brigades.json','data/source/oob_corps.json','data/source/municipalities_1990_registry_110.json',
  'data/derived/operational/operational_settlements.geojson','data/derived/operational/operational_contact_graph.json',
  'data/derived/operational/canonical_to_operational_map.json','data/derived/operational/operational_initial_master.json',
  'data/derived/terrain/settlements_terrain_scalars.json','data/derived/startup/apr_1992_initial_save.json',
].sort();
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const files=paths=>Object.fromEntries(paths.map(p=>[p,fs.existsSync(path.join(root,p)) ? hash(fs.readFileSync(path.join(root,p))) : 'ABSENT']));
const sources=files(sourcePaths), inputs=files(inputPaths);
const output={head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),node:process.version,
  note:'Named source byte manifest and bounded production input inventory; does not certify a campaign. Live probe records every fixture input separately.',
  sources,inputs,sourceDigest:hash(JSON.stringify(sources)),inputDigest:hash(JSON.stringify(inputs))};
const out=path.join(__dirname,process.argv[2]||'fingerprint.json');
fs.writeFileSync(out,JSON.stringify(output,null,2));
console.log(JSON.stringify({out,sources:sourcePaths.length,inputs:inputPaths.length,sourceDigest:output.sourceDigest,inputDigest:output.inputDigest}));
