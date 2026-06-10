'use strict';

/**
 * §6 HARD GATE verifier for the collapse pipeline (collapse Phase III enable).
 *
 * Asserts, against a single 188w final_save.json, every §6 invariant the owner's
 * absolute line requires when collapse is ENABLED:
 *   - Srebrenica + Žepa FALL to RS.
 *   - Goražde, Bihać, Sarajevo core, Teočak HELD by RBiH.
 *   - srebrenica_genocide_1995 rupture recorded at recorded_turn >= 160.
 *   - For ALL 9 ENCLAVE_DEFINITIONS OSIDs (6 RBiH + 3 HRHB): NO collapse_damage entry,
 *     NO capacity_modifier, will_not_recover NOT set.
 *
 * With --compare <off_final_save.json>, additionally asserts the rupture timing is
 * IDENTICAL ON vs OFF (panel directive #3(iv)).
 *
 * Usage:
 *   node tools/verify_collapse_section6.cjs <on_final_save.json> [--compare <off_final_save.json>]
 *
 * Determinism: reads only persisted JSON artifacts; no RNG/clock.
 * Exit 0 = §6 GATE PASS; exit 1 = §6 GATE FAIL (prints the exact failing assertion).
 */

const fs = require('fs');

function pol(save) {
  return save.political || (save.state && save.state.political) || {};
}
function controllers(save) {
  return pol(save).political_controllers || {};
}
function ruptures(save) {
  const mil = save.military || (save.state && save.state.military) || {};
  return (mil.negotiation && mil.negotiation.rupture_consequences) || [];
}

// All 9 ENCLAVE_DEFINITIONS capitals (6 RBiH + 3 HRHB) — must be collapse-inert.
const PROTECTED_ENCLAVE_OSIDS = [
  'op:srebrenica:srebrenica_2',
  'op:rogatica:zepa_2',
  'op:gorazde:gorazde_2',
  'op:bihac:bihac_2',
  'op:centar_sarajevo:centar_sarajevo',
  'op:ugljevik:teocak_krstac_2',
  'op:kiseljak:kiseljak_2',
  'op:vitez:vitez_2',
  'op:zepce:zepce_2',
];

const args = process.argv.slice(2);
const onPath = args[0];
let comparePath = null;
const ci = args.indexOf('--compare');
if (ci >= 0 && args[ci + 1]) comparePath = args[ci + 1];

if (!onPath) {
  console.error('usage: node tools/verify_collapse_section6.cjs <on_final_save.json> [--compare <off_final_save.json>]');
  process.exit(2);
}

const on = JSON.parse(fs.readFileSync(onPath, 'utf8'));
const pcOn = controllers(on);
const polOn = pol(on);
const cd = (polOn.collapse_damage && polOn.collapse_damage.by_entity) || {};
const cm = (polOn.capacity_modifiers && polOn.capacity_modifiers.by_sid) || {};
const trends = (polOn.loss_of_control_trends && polOn.loss_of_control_trends.by_settlement) || {};

const failures = [];
function check(cond, msg) {
  console.log((cond ? 'PASS ' : 'FAIL ') + msg);
  if (!cond) failures.push(msg);
}

console.log('=== §6 HARD GATE — collapse ENABLED run: ' + onPath + ' ===');

// 1. Srebrenica + Žepa fall to RS.
check(pcOn['op:srebrenica:srebrenica_2'] === 'RS', 'Srebrenica (op:srebrenica:srebrenica_2) falls to RS — got ' + pcOn['op:srebrenica:srebrenica_2']);
check(pcOn['op:rogatica:zepa_2'] === 'RS', 'Žepa (op:rogatica:zepa_2) falls to RS — got ' + pcOn['op:rogatica:zepa_2']);

// 2. Never-fell RBiH enclaves held at Dayton.
check(pcOn['op:gorazde:gorazde_2'] === 'RBiH', 'Goražde (op:gorazde:gorazde_2) HELD by RBiH — got ' + pcOn['op:gorazde:gorazde_2']);
check(pcOn['op:bihac:bihac_2'] === 'RBiH', 'Bihać (op:bihac:bihac_2) HELD by RBiH — got ' + pcOn['op:bihac:bihac_2']);
check(pcOn['op:centar_sarajevo:sarajevo_dio_centar_sajarevo'] === 'RBiH', 'Sarajevo core (op:centar_sarajevo:sarajevo_dio_centar_sajarevo) HELD by RBiH — got ' + pcOn['op:centar_sarajevo:sarajevo_dio_centar_sajarevo']);
check(pcOn['op:ugljevik:teocak_krstac_2'] === 'RBiH', 'Teočak (op:ugljevik:teocak_krstac_2) HELD by RBiH — got ' + pcOn['op:ugljevik:teocak_krstac_2']);

// 3. Genocide rupture recorded at turn >= 160.
const gOn = ruptures(on).find(r => r.id === 'srebrenica_genocide_1995');
check(!!gOn, 'srebrenica_genocide_1995 rupture is recorded');
if (gOn) {
  check(gOn.recorded_turn >= 160, 'rupture recorded_turn >= 160 — got ' + gOn.recorded_turn);
  check(gOn.perpetrator_faction === 'RS', 'rupture perpetrator RS — got ' + gOn.perpetrator_faction);
}

// 4. All 9 enclaves collapse-inert.
for (const osid of PROTECTED_ENCLAVE_OSIDS) {
  check(cd[osid] === undefined, 'NO collapse_damage for ' + osid + (cd[osid] !== undefined ? ' — FOUND ' + JSON.stringify(cd[osid]) : ''));
  check(cm[osid] === undefined, 'NO capacity_modifier for ' + osid + (cm[osid] !== undefined ? ' — FOUND ' + JSON.stringify(cm[osid]) : ''));
  const wnr = trends[osid] && trends[osid].will_not_recover;
  check(!wnr, 'will_not_recover NOT set for ' + osid + (wnr ? ' — FOUND true' : ''));
}

// 5. Optional rupture-timing identity ON vs OFF.
if (comparePath) {
  const off = JSON.parse(fs.readFileSync(comparePath, 'utf8'));
  const gOff = ruptures(off).find(r => r.id === 'srebrenica_genocide_1995');
  console.log('--- timing compare vs OFF (' + comparePath + ') ---');
  check(!!gOff, 'OFF run also records srebrenica_genocide_1995');
  if (gOn && gOff) {
    check(gOn.recorded_turn === gOff.recorded_turn, 'rupture timing IDENTICAL ON vs OFF — ON=' + gOn.recorded_turn + ' OFF=' + gOff.recorded_turn);
  }
}

console.log('');
console.log('collapse_damage entries (ON): ' + Object.keys(cd).length);
console.log('capacity_modifier entries (ON): ' + Object.keys(cm).length);
console.log('');
if (failures.length === 0) {
  console.log('§6 GATE VERDICT: PASS (' + (comparePath ? 'with OFF-timing compare' : 'standalone') + ')');
  process.exit(0);
} else {
  console.log('§6 GATE VERDICT: FAIL — ' + failures.length + ' assertion(s):');
  for (const f of failures) console.log('  - ' + f);
  process.exit(1);
}
