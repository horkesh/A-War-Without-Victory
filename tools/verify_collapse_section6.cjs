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
// IV-b D2 KEY-SPACE FIX (Codex review on #382): 'op:centar_sarajevo:centar_sarajevo'
// is the LOGICAL Sarajevo capital, absent from persisted political-controller / 3D
// writer key space — checking it alone is vacuous for Sarajevo. The PAINTED core
// cell is pinned too, and the prefix/list scan below covers the full guarded space.
const PROTECTED_ENCLAVE_OSIDS = [
  'op:srebrenica:srebrenica_2',
  'op:rogatica:zepa_2',
  'op:gorazde:gorazde_2',
  'op:bihac:bihac_2',
  'op:centar_sarajevo:centar_sarajevo',
  'op:centar_sarajevo:sarajevo_dio_centar_sajarevo',
  'op:ugljevik:teocak_krstac_2',
  'op:kiseljak:kiseljak_2',
  'op:vitez:vitez_2',
  'op:zepce:zepce_2',
];

// Replicated G1 predicate geometry (getEnclaveDefForOsid / ENCLAVE_DEFINITIONS in
// src/sim/combat/enclave_resilience.ts) for the FULL-keyspace inertness scan: the
// capital pins above cannot enumerate every guarded OSID (Sarajevo + Bihać are PREFIX
// enclaves covering whole municipalities; the eastern + HRHB enclaves carry multi-OSID
// lists). Keep in sync with ENCLAVE_DEFINITIONS — the G2 vitest suite runs the same
// scan natively against the live predicate; this .cjs replication is the
// dependency-free second proof.
const PROTECTED_ENCLAVE_PREFIXES = [
  // sarajevo (SARAJEVO_CITY_CORE_MUN_IDS, src/state/enclave_integrity.ts)
  'op:centar_sarajevo:', 'op:novi_grad_sarajevo:', 'op:novo_sarajevo:', 'op:stari_grad_sarajevo:',
  // bihac_pocket
  'op:bihac:', 'op:cazin:', 'op:velika_kladusa:', 'op:bosanska_krupa:',
];
const PROTECTED_ENCLAVE_OSID_LISTS = [
  // srebrenica
  'op:srebrenica:bostahovine_2', 'op:srebrenica:brezovice_2', 'op:srebrenica:donji_potocari_2',
  'op:srebrenica:mala_daljegosta_2', 'op:srebrenica:ljeskovik_2', 'op:srebrenica:luka_2',
  'op:srebrenica:milacevici', 'op:srebrenica:radovcici', 'op:srebrenica:srebrenica_2',
  'op:srebrenica:suceska', 'op:srebrenica:sulice_2',
  // zepa
  'op:rogatica:zepa_2',
  // teocak
  'op:ugljevik:teocak_krstac_2',
  // gorazde
  'op:gorazde:bacci', 'op:gorazde:citluk_2', 'op:gorazde:faocici_2', 'op:gorazde:glamoc',
  'op:gorazde:gorazde_2', 'op:gorazde:hrancici', 'op:gorazde:kamen', 'op:gorazde:kola',
  'op:gorazde:kolovarice', 'op:gorazde:mravinjac_2', 'op:gorazde:novakovici',
  'op:gorazde:osjecani_2', 'op:gorazde:semihova_2', 'op:gorazde:slatina_2',
  'op:gorazde:sopotnica', 'op:gorazde:ustipraca_2', 'op:gorazde:zorlaci', 'op:gorazde:zorovici',
  // kiseljak
  'op:kiseljak:azapovici_2', 'op:kiseljak:brnjaci_2', 'op:kiseljak:gromiljak_2',
  'op:kiseljak:kiseljak_2', 'op:kresevo:kresevo_2', 'op:kresevo:polje_2',
  // lasva_valley
  'op:vitez:vitez_2', 'op:busovaca:bare_2', 'op:busovaca:buselji_2', 'op:busovaca:busovaca_2',
  'op:busovaca:polje_2', 'op:novi_travnik:rankovici_2', 'op:novi_travnik:rat_2', 'op:novi_travnik:ruda_2',
  // zepce
  'op:zepce:ozimica_2', 'op:zepce:viniste_2', 'op:zepce:zepce_2',
];
const PROTECTED_EXACT_SET = new Set(PROTECTED_ENCLAVE_OSID_LISTS.concat(PROTECTED_ENCLAVE_OSIDS));
function isEnclaveGuardedOsid(osid) {
  if (PROTECTED_EXACT_SET.has(osid)) return true;
  return PROTECTED_ENCLAVE_PREFIXES.some(p => osid.startsWith(p));
}

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

// 4. All 9 enclaves collapse-inert (exact capital + painted-core pins).
for (const osid of PROTECTED_ENCLAVE_OSIDS) {
  check(cd[osid] === undefined, 'NO collapse_damage for ' + osid + (cd[osid] !== undefined ? ' — FOUND ' + JSON.stringify(cd[osid]) : ''));
  check(cm[osid] === undefined, 'NO capacity_modifier for ' + osid + (cm[osid] !== undefined ? ' — FOUND ' + JSON.stringify(cm[osid]) : ''));
  const wnr = trends[osid] && trends[osid].will_not_recover;
  check(!wnr, 'will_not_recover NOT set for ' + osid + (wnr ? ' — FOUND true' : ''));
}

// 4b. FULL-keyspace inertness scan (IV-b D2 key-space fix): no key ACTUALLY WRITTEN
// into any of the three §6-protected fields may belong to any enclave (prefix or list).
const cdBreaches = Object.keys(cd).filter(isEnclaveGuardedOsid);
const cmBreaches = Object.keys(cm).filter(isEnclaveGuardedOsid);
const wnrBreaches = Object.keys(trends).filter(k => trends[k] && trends[k].will_not_recover === true && isEnclaveGuardedOsid(k));
check(cdBreaches.length === 0, 'FULL-SCAN: no collapse_damage key in any enclave prefix/list' + (cdBreaches.length ? ' — FOUND ' + cdBreaches.join(', ') : ''));
check(cmBreaches.length === 0, 'FULL-SCAN: no capacity_modifier key in any enclave prefix/list' + (cmBreaches.length ? ' — FOUND ' + cmBreaches.join(', ') : ''));
check(wnrBreaches.length === 0, 'FULL-SCAN: no will_not_recover=true key in any enclave prefix/list' + (wnrBreaches.length ? ' — FOUND ' + wnrBreaches.join(', ') : ''));

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
