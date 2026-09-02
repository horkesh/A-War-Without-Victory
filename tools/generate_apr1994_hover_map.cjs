'use strict';

const fs = require('fs');
const path = require('path');

const [templatePath, runDir, paintedPath, outputPath] = process.argv.slice(2);
if (!templatePath || !runDir || !paintedPath || !outputPath) {
  throw new Error('Usage: node tools/generate_apr1994_hover_map.cjs <template.html> <run_dir> <painted.json> <output.html>');
}

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const finalSave = readJson(path.join(runDir, 'final_save.json'));
const initialSave = readJson(path.join(runDir, 'initial_save.json'));
const paintedFile = readJson(paintedPath);
const mergeMap = readJson(path.resolve(__dirname, 'micro_osid_merge_map.json'));
const finalControl = finalSave.political.political_controllers;
const initialControl = initialSave.political.political_controllers;
const painted = paintedFile.by_settlement_id;

let html = fs.readFileSync(templatePath, 'utf8');
const dataMatch = html.match(/const osids=(\[.*?\]);/s);
if (!dataMatch) throw new Error('Template does not contain OSID tooltip data');
const osids = JSON.parse(dataMatch[1]);

for (const item of osids) {
  const controlOsid = mergeMap[item.osid] ?? item.osid;
  if (!(controlOsid in finalControl)) throw new Error(`Missing final control for ${item.osid}`);
  if (!(controlOsid in painted)) throw new Error(`Missing painted control for ${item.osid}`);
  item.simulated = finalControl[controlOsid];
  item.painted = painted[controlOsid];
  item.mismatch = item.simulated !== item.painted;
  item.changedFrom = initialControl[controlOsid] ?? null;
  item.changedTo = item.simulated;
  item.changed = item.changedFrom !== null && item.changedFrom !== item.changedTo;
  item.canonicalOsid = controlOsid === item.osid ? null : controlOsid;
}

const paintedOsids = Object.keys(painted);
const correct = paintedOsids.filter((osid) => finalControl[osid] === painted[osid]).length;
const pct = ((correct / paintedOsids.length) * 100).toFixed(2);
html = html
  .replace(/const osids=\[.*?\];/s, `const osids=${JSON.stringify(osids)};\nconst controlFill={RS:'#b03636',RBiH:'#4a7c54',HRHB:'#486ebe'};\ndocument.querySelectorAll('.hit-region').forEach((region,index)=>{const item=osids[index];region.style.setProperty('--cell-fill',item.mismatch?'#c98e26':controlFill[item.simulated]);region.setAttribute('tabindex','0');region.setAttribute('aria-label',item.osid+' — '+item.settlement+' — '+item.simulated);});`)
  .replace(/\d+ \/ 712 correct · \d+\.\d+%/, `${correct} / ${paintedOsids.length} correct · ${pct}%`)
  .replace(/April 1994 calibration · 104-week run/g, 'April 1994 calibration · corrected 104-week run')
  .replace(/\.hit-region\{fill:transparent;stroke:transparent;stroke-width:2;/,
    '.hit-region{fill:var(--cell-fill,transparent);fill-opacity:.92;stroke:rgba(8,12,17,.58);stroke-width:.65;')
  .replace(/\.hit-region:hover,\.hit-region:focus\{fill:rgba\(255,255,255,\.16\);stroke:rgba\(255,255,255,\.95\);/,
    '.hit-region:hover,.hit-region:focus{fill:var(--cell-fill,transparent);fill-opacity:1;stroke:rgba(255,255,255,.98);stroke-width:1.8;')
  .replace('Amber fill marks a wrong OSID; its outline and center dot show the painted controller.',
    'Amber fill marks a wrong OSID; hover or tap it to see the painted controller.')
  .replace('Full north-up April 1994 operational control map with amber mismatches and expected-faction marks.',
    'Full north-up corrected April 1994 operational control map with hoverable OSIDs and amber mismatches.');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html);
console.log(JSON.stringify({ outputPath, total: paintedOsids.length, hoverRegions: osids.length, correct, mismatch: paintedOsids.length - correct }));
