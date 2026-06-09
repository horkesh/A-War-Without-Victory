#!/usr/bin/env node
// Lane-3 (b) metric extractor. Reads a run dir (final_save.json + run_summary.json)
// and prints per-faction killed/shares, total killed, K:W, OSID control counts,
// anchor pass count + Zvornik/brijesnica, §6 (Srebrenica/Žepa), and hash.
const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) { console.error('usage: node lane3b_extract.cjs <runDir>'); process.exit(1); }

const finalSave = JSON.parse(fs.readFileSync(path.join(runDir, 'final_save.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(runDir, 'run_summary.json'), 'utf8'));

const cl = finalSave.military.casualty_ledger || {};
const factions = ['RBiH', 'RS', 'HRHB'];
let totalKilled = 0, totalWounded = 0;
const killed = {};
for (const f of factions) {
  const k = cl[f]?.killed ?? 0;
  killed[f] = k;
  totalKilled += k;
  const pf = cl[f]?.per_formation || {};
  for (const b of Object.keys(pf)) totalWounded += pf[b].wounded ?? 0;
}
console.log('=== KILLED (military) ===');
for (const f of factions) {
  const share = totalKilled ? (100 * killed[f] / totalKilled).toFixed(1) : '0.0';
  console.log(`  ${f.padEnd(5)} ${String(killed[f]).padStart(7)}  ${share}%`);
}
console.log(`  TOTAL ${String(totalKilled).padStart(7)}`);
console.log(`  Total wounded: ${totalWounded}`);
console.log(`  K:W = 1:${totalKilled ? (totalWounded / totalKilled).toFixed(2) : '0'}`);

console.log('\n=== OSID CONTROL ===');
const rows = summary.vs_historical?.counts_by_controller ?? [];
for (const r of rows) {
  console.log(`  ${String(r.controller).padEnd(6)} final=${r.final_count} expected=${r.expected_count ?? '?'} matched=${r.matched_count ?? '?'}`);
}
// overall match (OSID count correctly controlled)
// Spatial match vs painted reference (the "649/712" figure).
const refKey = summary.vs_historical?.reference_key ?? 'oct1995';
const refPath = path.join(__dirname, '..', 'data', 'source', 'calibration', `painted_control_${refKey}.json`);
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8')).by_settlement_id ?? {};
const pc0 = finalSave.political?.political_controllers ?? {};
let matched = 0, scored = 0;
const mismatches = [];
for (const osid of Object.keys(ref).sort()) {
  if (!(osid in pc0)) continue;
  scored++;
  if (pc0[osid] === ref[osid]) matched++;
  else mismatches.push({ osid, sim: pc0[osid], ref: ref[osid] });
}
console.log(`  spatial match vs ${refKey}: ${matched}/${scored}`);
// expose mismatch list for drift analysis
fs.writeFileSync(path.join(runDir, 'lane3b_mismatches.json'), JSON.stringify(mismatches, null, 0));
console.log(`  mismatches written: ${mismatches.length} (lane3b_mismatches.json)`);

console.log('\n=== ANCHORS ===');
const anchors = summary.anchor_checks ?? [];
const passed = anchors.filter(a => a.passed).length;
console.log(`  ${passed}/${anchors.length} passed`);
const watch = ['op:zvornik:zvornik', 'op:lukavac:brijesnica_donja_2', 'brijesnica_donja_2'];
for (const a of anchors) {
  if (watch.some(w => String(a.anchor_id).includes(w.replace('op:lukavac:', '').replace('op:zvornik:', '')))) {
    console.log(`  ${a.passed ? 'PASS' : 'FAIL'} ${a.anchor_id} expected=${a.expected_controller} actual=${a.actual_controller}`);
  }
}
const failed = anchors.filter(a => !a.passed);
if (failed.length) {
  console.log('  FAILED anchors:');
  for (const a of failed) console.log(`    ${a.anchor_id} expected=${a.expected_controller} actual=${a.actual_controller}`);
}

console.log('\n=== §6 ENCLAVES (control of key OSIDs) ===');
const pc = finalSave.political?.political_controllers ?? {};
const srebOsids = Object.keys(pc).filter(o => /srebrenica/i.test(o));
const zepaOsids = Object.keys(pc).filter(o => /zepa|žepa/i.test(o));
const summarize = (list, label) => {
  const byCtrl = {};
  for (const o of list) byCtrl[pc[o]] = (byCtrl[pc[o]] || 0) + 1;
  console.log(`  ${label}: ${list.length} OSIDs -> ${JSON.stringify(byCtrl)}`);
};
summarize(srebOsids, 'Srebrenica');
summarize(zepaOsids, 'Žepa');

console.log('\n=== HASH ===');
console.log('  final_state_hash:', summary.final_state_hash ?? '(see stdout)');
