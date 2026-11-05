#!/usr/bin/env node
/**
 * 203 fail-closed LOCAL reader for the opt-in `commander_creation` stdout receipt (201 reader + the four 202-review corrections).
 *   node 203-commander-creation-reader.cjs <stdout.log> --faction RS --corps id1,id2 --turns lo-hi [--emit file.jsonl]
 *   node 203-commander-creation-reader.cjs --selfcheck
 * Contract unchanged from 201 (exact pass_start/pass_end per requested turn+faction, exact inventory coverage, embedded turn/faction binding,
 * explicit no-spatial skip, requested pass/corps missing = UNMEASURED = failure) PLUS:
 *  (1) the pass_start inventory must be an array of NONEMPTY STRINGS in STRICT ascending code-unit order with no duplicates;
 *  (2) EVERY completion row of the requested pass (not only the selected corps) goes through checkRow; evidence output stays selector-limited;
 *  (3) exact built/returned identity and cardinality: *_created => exactly ONE built operation of that site and exactly ONE returned operation
 *      whose (name,type,started_turn) tuple equals the built one; *_overlap_suppressed => exactly ONE built operation of that site, none returned;
 *      every other exit => built and returned empty; operation entries are validated objects (null/non-object => controlled violation, never a throw);
 *  (4) below_min_after_eligibility requires reached finite nonnegative INTEGER counts, participating_count >= effective_min_for_op (enough
 *      participants BEFORE the eligibility filter), eligible_count < effective_min_for_op, a nonempty reached objective_ids (nonempty strings), and
 *      every later decision field ABSENT.
 * Types/shape of every field used by these checks are validated. Limits: emitted != admitted; upstream no-plan cause and downstream admission are
 * not observed; evaluator-time records of one run.
 * Exit codes: 0 pass; 2 violation/missing coverage; 3 invalid input.
 */
'use strict';
const fs = require('fs');
const PREFIX = '[commander_creation] ';
const SCHEMA = 'commander_creation.v1';
const EXITS = new Set(['active_slot_full', 'below_min_participants', 'no_objectives', 'below_min_after_eligibility', 'plan_probe_created', 'plan_probe_overlap_suppressed', 'general_created', 'general_overlap_suppressed', 'reduction_created', 'reduction_overlap_suppressed', 'fallback_probe_created', 'fallback_probe_overlap_suppressed', 'completed_no_operation']);
const SITES = new Set(['plan_probe', 'general', 'reduction', 'fallback_probe']);
const ABSENT_AFTER = {
  active_slot_full: ['primary_pool_size', 'attached_pool_size', 'participating_count', 'effective_min_for_op', 'reachable_enemy_osid_count', 'objective_ids', 'eligible_count', 'launch_probe_evaluated', 'launch_probe', 'probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered', 'overlap_checked'],
  below_min_participants: ['reachable_enemy_osid_count', 'objective_ids', 'eligible_count', 'launch_probe_evaluated', 'launch_probe', 'probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered', 'overlap_checked'],
  no_objectives: ['eligible_count', 'launch_probe_evaluated', 'launch_probe', 'probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered', 'overlap_checked'],
  below_min_after_eligibility: ['launch_probe_evaluated', 'launch_probe', 'probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered', 'overlap_checked', 'overlap_found'],
  plan_probe_created: ['probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered'],
  plan_probe_overlap_suppressed: ['probe_on_cooldown', 'can_consider_local_opportunity', 'fallback_considered'],
};
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => Number.isInteger(v) && v >= 0;
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const nonEmptyString = (v) => typeof v === 'string' && v.length > 0;

function parseLines(lines) {
  const records = []; const errs = [];
  lines.forEach((line, i) => {
    if (!line.startsWith(PREFIX)) return;
    let r;
    try { r = JSON.parse(line.slice(PREFIX.length)); } catch (e) { errs.push(`line ${i + 1}: malformed commander_creation JSON`); return; }
    if (!isObj(r) || r.schema !== SCHEMA) { errs.push(`line ${i + 1}: unknown or missing schema`); return; }
    if (!['pass_start', 'pass_end', 'build_operations_complete'].includes(r.phase)) { errs.push(`line ${i + 1}: unknown phase ${r.phase}`); return; }
    records.push({ line: i + 1, r });
  });
  return { records, errs };
}

/** validates one operation entry; returns a normalized tuple or null (a violation string is pushed). */
function opTuple(entry, where, v, needSite) {
  if (!isObj(entry)) { v.push(`${where}: operation entry is not an object`); return null; }
  if (!nonEmptyString(entry.name) || !nonEmptyString(entry.type) || !isInt(entry.started_turn)) { v.push(`${where}: operation entry needs nonempty name/type and an integer started_turn`); return null; }
  if (needSite && !SITES.has(entry.site)) { v.push(`${where}: unknown built site ${entry.site}`); return null; }
  return { site: entry.site, name: entry.name, type: entry.type, started_turn: entry.started_turn };
}

function checkRow(row, ctx) {
  const v = [];
  if (!isObj(row)) return [`${ctx}: row is not an object`];
  if (row.corps_id !== row.host_corps_id) v.push(`${ctx}: corps_id ${row.corps_id} != host_corps_id ${row.host_corps_id}`);
  if (!EXITS.has(row.exit)) { v.push(`${ctx}: unknown exit ${row.exit}`); return v; }
  if (!Array.isArray(row.built) || !Array.isArray(row.returned)) { v.push(`${ctx}: built/returned must be arrays`); return v; }
  const built = row.built.map((e, i) => opTuple(e, `${ctx} built[${i}]`, v, true));
  const returned = row.returned.map((e, i) => opTuple(e, `${ctx} returned[${i}]`, v, false));
  if (built.includes(null) || returned.includes(null)) return v;
  if (JSON.stringify(row).includes('feasib')) v.push(`${ctx}: a feasibility field/verdict is present (no evaluator runs in this path)`);
  const created = row.exit.endsWith('_created'); const suppressed = row.exit.endsWith('_overlap_suppressed');
  if (created) {
    const site = row.exit.replace('_created', '');
    if (built.length !== 1 || built[0].site !== site) v.push(`${ctx}: ${row.exit} requires exactly ONE built operation of site ${site} (got ${built.map((b) => b.site).join(',') || 'none'})`);
    if (returned.length !== 1) v.push(`${ctx}: ${row.exit} requires exactly ONE returned operation (got ${returned.length})`);
    if (built.length === 1 && returned.length === 1 && (built[0].name !== returned[0].name || built[0].type !== returned[0].type || built[0].started_turn !== returned[0].started_turn)) v.push(`${ctx}: returned (name,type,started_turn) does not equal the built operation`);
    if (has(row, 'overlap_found') && row.overlap_found !== false) v.push(`${ctx}: ${row.exit} but overlap_found is not false`);
  } else if (suppressed) {
    const site = row.exit.replace('_overlap_suppressed', '');
    if (built.length !== 1 || built[0].site !== site) v.push(`${ctx}: ${row.exit} requires exactly ONE built operation of site ${site}`);
    if (returned.length !== 0) v.push(`${ctx}: ${row.exit} but operations were returned`);
    if (row.overlap_checked !== true || row.overlap_found !== true) v.push(`${ctx}: ${row.exit} without overlap_checked/overlap_found true`);
  } else {
    if (returned.length !== 0) v.push(`${ctx}: ${row.exit} but operations were returned`);
    if (built.length !== 0) v.push(`${ctx}: ${row.exit} but an operation was built`);
  }
  for (const k of ['active_slot_users', 'max_operation_slots', 'primary_pool_size', 'attached_pool_size', 'participating_count', 'effective_min_for_op', 'reachable_enemy_osid_count', 'eligible_count', 'reduction_participant_count']) if (has(row, k) && !isInt(row[k])) v.push(`${ctx}: ${k} must be a nonnegative integer`);
  for (const k of ['launch_probe_evaluated', 'launch_probe', 'probe_on_cooldown', 'can_consider_local_opportunity', 'local_occupation_candidate_present', 'fallback_considered', 'probe_brigade_selected', 'probe_reachable', 'target_is_bounded_position', 'single_brigade_sufficient', 'escalate_to_operation', 'overlap_checked', 'overlap_found']) if (has(row, k) && typeof row[k] !== 'boolean') v.push(`${ctx}: ${k} must be a boolean`);
  for (const k of ['objective_ids', 'probe_objective_ids']) if (has(row, k) && !(Array.isArray(row[k]) && row[k].every(nonEmptyString))) v.push(`${ctx}: ${k} must be an array of nonempty strings`);
  if (row.exit === 'active_slot_full') {
    if (!isInt(row.active_slot_users) || !isInt(row.max_operation_slots)) v.push(`${ctx}: active_slot_full without integer slot counts`);
    else if (row.active_slot_users < row.max_operation_slots) v.push(`${ctx}: active_slot_full but users < max`);
  }
  if (row.exit === 'below_min_participants') {
    if (!(isInt(row.participating_count) && isInt(row.effective_min_for_op) && row.participating_count < row.effective_min_for_op)) v.push(`${ctx}: below_min_participants not supported by integer participating_count < effective_min_for_op`);
  }
  if (row.exit === 'no_objectives' && !(Array.isArray(row.objective_ids) && row.objective_ids.length === 0)) v.push(`${ctx}: no_objectives without an empty reached objective_ids`);
  if (row.exit === 'below_min_after_eligibility') {
    if (!isInt(row.participating_count) || !isInt(row.effective_min_for_op) || !isInt(row.eligible_count)) v.push(`${ctx}: below_min_after_eligibility needs reached integer participating_count/effective_min_for_op/eligible_count`);
    else {
      if (row.participating_count < row.effective_min_for_op) v.push(`${ctx}: below_min_after_eligibility but participants BEFORE the eligibility filter (${row.participating_count}) are already below the minimum (${row.effective_min_for_op})`);
      if (row.eligible_count >= row.effective_min_for_op) v.push(`${ctx}: below_min_after_eligibility but eligible_count (${row.eligible_count}) is not below the minimum (${row.effective_min_for_op})`);
    }
    if (!(Array.isArray(row.objective_ids) && row.objective_ids.length > 0)) v.push(`${ctx}: below_min_after_eligibility without a nonempty reached objective_ids`);
  }
  if (row.exit.startsWith('reduction_') && row.escalate_to_operation !== true) v.push(`${ctx}: ${row.exit} without escalate_to_operation true`);
  if (row.exit.startsWith('fallback_probe_') && row.escalate_to_operation !== false) v.push(`${ctx}: ${row.exit} without escalate_to_operation false`);
  if (row.exit.startsWith('plan_probe_') && row.launch_probe !== true) v.push(`${ctx}: ${row.exit} without launch_probe true`);
  for (const k of ABSENT_AFTER[row.exit] || []) if (has(row, k)) v.push(`${ctx}: field ${k} present although its decision was not reached for ${row.exit}`);
  if (row.exit === 'completed_no_operation' && has(row, 'fallback_considered') && !row.fallback_considered) v.push(`${ctx}: fallback_considered must be true or absent`);
  return v;
}

function inventoryErrors(inv) {
  if (!Array.isArray(inv)) return ['pass_start corps_ids is not an array'];
  const e = [];
  if (!inv.every(nonEmptyString)) e.push('pass_start corps_ids has an empty/non-string element');
  else for (let i = 1; i < inv.length; i += 1) if (!(inv[i - 1] < inv[i])) { e.push(`pass_start corps_ids is not in strict ascending unique order (${inv[i - 1]} before ${inv[i]})`); break; }
  return e;
}

function analyse(lines, faction, corps, turns) {
  const res = { invalid: [], violations: [], evidence: [] };
  if (typeof faction !== 'string' || !faction) res.invalid.push('faction required');
  if (!Array.isArray(corps) || corps.length === 0 || corps.some((c) => typeof c !== 'string' || !c) || new Set(corps).size !== corps.length) res.invalid.push('corps must be a nonempty unique list of non-empty ids');
  if (!turns || !Number.isInteger(turns.lo) || !Number.isInteger(turns.hi) || turns.lo < 1 || turns.hi < turns.lo) res.invalid.push('turns must be integer lo-hi with 1 <= lo <= hi');
  if (res.invalid.length) return res;
  const { records, errs } = parseLines(lines);
  res.violations.push(...errs);
  for (let t = turns.lo; t <= turns.hi; t += 1) {
    const mine = records.filter(({ r }) => r.faction === faction && r.turn === t);
    const starts = mine.filter(({ r }) => r.phase === 'pass_start'); const ends = mine.filter(({ r }) => r.phase === 'pass_end'); const rows = mine.filter(({ r }) => r.phase === 'build_operations_complete');
    const tag = `${faction}@t${t}`;
    if (starts.length === 0) { res.violations.push(`${tag}: requested pass missing (UNMEASURED, never a legitimate skip by absence)`); continue; }
    if (starts.length > 1) { res.violations.push(`${tag}: duplicate pass_start markers`); continue; }
    if (ends.length === 0) { res.violations.push(`${tag}: pass_start without pass_end (truncated)`); continue; }
    if (ends.length > 1) { res.violations.push(`${tag}: duplicate pass_end markers`); continue; }
    const s = starts[0]; const e = ends[0];
    if (e.line < s.line) { res.violations.push(`${tag}: pass_end precedes pass_start`); continue; }
    const inside = rows.filter((x) => x.line > s.line && x.line < e.line);
    if (inside.length !== rows.length) res.violations.push(`${tag}: ${rows.length - inside.length} completion row(s) outside the start/end markers`);
    if (s.r.spatial_present === false) {
      if (e.r.status !== 'skipped_no_spatial') res.violations.push(`${tag}: no-spatial start but end status ${e.r.status}`);
      if (inside.length) res.violations.push(`${tag}: no-spatial pass has completion rows`);
      for (const c of corps) res.violations.push(`${tag}: requested corps ${c} UNMEASURED (pass skipped without spatial context)`);
      res.evidence.push({ faction, turn: t, status: 'skipped_no_spatial' });
      continue;
    }
    if (s.r.spatial_present !== true || !Array.isArray(s.r.corps_ids)) { res.violations.push(`${tag}: pass_start without spatial_present/corps_ids`); continue; }
    const inv = s.r.corps_ids;
    const invErrs = inventoryErrors(inv);
    res.violations.push(...invErrs.map((x) => `${tag}: ${x}`));
    if (invErrs.length) continue;
    for (const c of corps) if (!inv.includes(c)) res.violations.push(`${tag}: requested corps ${c} missing from the pass inventory (UNMEASURED)`);
    if (e.r.status !== 'completed') res.violations.push(`${tag}: pass_end status ${e.r.status} (expected completed)`);
    if (e.r.completed_corps_count !== inv.length) res.violations.push(`${tag}: pass_end completed_corps_count ${e.r.completed_corps_count} != inventory ${inv.length}`);
    for (const c of inv) {
      const m = inside.filter((x) => x.r.corps_id === c);
      if (m.length === 0) res.violations.push(`${tag}/${c}: missing completion row`);
      else if (m.length > 1) res.violations.push(`${tag}/${c}: duplicate completion rows`);
    }
    for (const x of inside) if (!inv.includes(x.r.corps_id)) res.violations.push(`${tag}: unexpected completion row for corps ${x.r.corps_id}`);
    for (const x of inside) {
      if (x.r.turn !== t || x.r.faction !== faction) res.violations.push(`${tag}/${x.r.corps_id}: embedded turn/faction ${x.r.turn}/${x.r.faction} mismatch`);
      // EVERY completion row of the pass is validated (not only the selected corps)
      res.violations.push(...checkRow(x.r, `${tag}/${x.r.corps_id}`));
      if (corps.includes(x.r.corps_id)) res.evidence.push({ faction, turn: t, corps_id: x.r.corps_id, exit: x.r.exit, built: x.r.built, returned: x.r.returned, row: x.r });
    }
  }
  return res;
}
const verdict = (r) => (r.invalid.length ? 3 : r.violations.length ? 2 : 0);

function selfcheck() {
  const J = (o) => PREFIX + JSON.stringify(o);
  const start = (turn, corps = ['c1'], extra = {}) => J({ schema: SCHEMA, phase: 'pass_start', faction: 'RS', turn, spatial_present: true, corps_ids: corps, ...extra });
  const end = (turn, n = 1, extra = {}) => J({ schema: SCHEMA, phase: 'pass_end', faction: 'RS', turn, status: 'completed', completed_corps_count: n, ...extra });
  const row = (turn, corps = 'c1', over = {}) => J({ schema: SCHEMA, phase: 'build_operations_complete', faction: 'RS', turn, corps_id: corps, host_corps_id: corps, plan_present: false, plan_source: null, plan_status: null, plan_target_ids: [], general_entry_passed: false, exit: 'completed_no_operation', built: [], returned: [], probe_on_cooldown: false, can_consider_local_opportunity: false, ...over });
  const op = (n = 'Op', t = 5) => ({ name: n, type: 'sector_attack', started_turn: t });
  const created = (turn, corps = 'c1', over = {}) => row(turn, corps, { exit: 'general_created', plan_present: true, plan_source: 'opportunity', plan_status: 'ready', plan_target_ids: ['o'], general_entry_passed: true, built: [{ site: 'general', ...op('Op', turn) }], returned: [op('Op', turn)], overlap_checked: true, overlap_found: false, primary_pool_size: 2, participating_count: 2, effective_min_for_op: 2, objective_ids: ['o'], launch_probe_evaluated: true, launch_probe: false, probe_on_cooldown: false, can_consider_local_opportunity: false, ...over });
  const suppressed = (turn, corps = 'c1', over = {}) => row(turn, corps, { exit: 'general_overlap_suppressed', plan_present: true, general_entry_passed: true, built: [{ site: 'general', ...op('Op', turn) }], returned: [], overlap_checked: true, overlap_found: true, primary_pool_size: 2, participating_count: 2, effective_min_for_op: 2, objective_ids: ['o'], launch_probe_evaluated: true, launch_probe: false, probe_on_cooldown: false, can_consider_local_opportunity: false, ...over });
  const elig = (turn, corps = 'c1', over = {}) => row(turn, corps, { exit: 'below_min_after_eligibility', plan_present: true, general_entry_passed: true, primary_pool_size: 2, attached_pool_size: 0, participating_count: 2, effective_min_for_op: 2, reachable_enemy_osid_count: 1, objective_ids: ['o'], eligible_count: 1, probe_on_cooldown: undefined, can_consider_local_opportunity: undefined, ...over });
  const ok = (t = 5) => [start(t), row(t), end(t)];
  const results = [];
  const ctl = (name, lines, want, sel = {}) => {
    let got; let pass;
    try { const r = analyse(lines, sel.faction ?? 'RS', sel.corps ?? ['c1'], sel.turns ?? { lo: 5, hi: 5 }); got = verdict(r); pass = got === want; } catch (e) { got = `THREW ${e.message}`; pass = false; }
    results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name} (exit ${got}, expected ${want})`);
  };
  // positive controls (rejection is not unconditional)
  ctl('valid pass (empty output with markers) PASSES', ok(), 0);
  ctl('valid general_created row PASSES', [start(5), created(5), end(5)], 0);
  ctl('valid multi-corps pass with created + suppressed + eligibility rows PASSES', [start(5, ['c0', 'c1', 'c2']), created(5, 'c0'), suppressed(5, 'c1'), elig(5, 'c2'), end(5, 3)], 0, { corps: ['c0', 'c2'] });
  ctl('valid below_min_after_eligibility row PASSES', [start(5), elig(5), end(5)], 0);
  ctl('valid plan_probe_created PASSES', [start(5), row(5, 'c1', { exit: 'plan_probe_created', plan_present: true, general_entry_passed: true, built: [{ site: 'plan_probe', ...op('probe', 5) }], returned: [op('probe', 5)], launch_probe_evaluated: true, launch_probe: true, overlap_checked: true, overlap_found: false, probe_on_cooldown: undefined, can_consider_local_opportunity: undefined }), end(5)], 0);
  // carried-over coverage controls
  ctl('CONTROL requested pass missing entirely FAILS (never skip by absence)', [], 2);
  ctl('CONTROL pass_start without pass_end (truncated) FAILS', [start(5), row(5)], 2);
  ctl('CONTROL pass_end before pass_start FAILS', [end(5), row(5), start(5)], 2);
  ctl('CONTROL duplicate pass_start FAILS', [start(5), start(5), row(5), end(5)], 2);
  ctl('CONTROL duplicate pass_end FAILS', [start(5), row(5), end(5), end(5)], 2);
  ctl('CONTROL malformed JSON line FAILS', [start(5), PREFIX + '{not json', row(5), end(5)], 2);
  ctl('CONTROL unknown schema FAILS', [start(5), J({ schema: 'x', phase: 'build_operations_complete' }), row(5), end(5)], 2);
  ctl('CONTROL wrong embedded turn on the completion row FAILS', [start(5), row(6), end(5)], 2);
  ctl('CONTROL wrong embedded faction on the completion row FAILS', [start(5), row(5).replace('"faction":"RS"', '"faction":"RBiH"'), end(5)], 2);
  ctl('CONTROL missing expected completion row FAILS', [start(5, ['c1', 'c2']), row(5), end(5, 2)], 2, { corps: ['c1'] });
  ctl('CONTROL duplicate completion row FAILS', [start(5), row(5), row(5), end(5)], 2);
  ctl('CONTROL unexpected completion row for a corps not in the inventory FAILS', [start(5), row(5), row(5, 'c9'), end(5)], 2);
  ctl('CONTROL requested corps missing from the pass inventory FAILS', [start(5, ['c2']), row(5, 'c2'), end(5)], 2);
  ctl('CONTROL pass_end completed_corps_count mismatch FAILS', [start(5), row(5), end(5, 3)], 2);
  ctl('CONTROL completion row outside the start/end markers FAILS', [row(5), start(5), end(5)], 2);
  ctl('CONTROL corps_id != host_corps_id FAILS', [start(5), row(5).replace('"host_corps_id":"c1"', '"host_corps_id":"c2"'), end(5)], 2);
  ctl('CONTROL no-spatial skip is UNMEASURED for the requested corps (fails)', [J({ schema: SCHEMA, phase: 'pass_start', faction: 'RS', turn: 5, spatial_present: false }), J({ schema: SCHEMA, phase: 'pass_end', faction: 'RS', turn: 5, status: 'skipped_no_spatial' })], 2);
  ctl('CONTROL unknown exit label FAILS', [start(5), row(5, 'c1', { exit: 'made_up' }), end(5)], 2);
  ctl('CONTROL unreached field present on an outer terminal FAILS', [start(5), row(5, 'c1', { exit: 'active_slot_full', active_slot_users: 2, max_operation_slots: 2, primary_pool_size: 0 }), end(5)], 2);
  ctl('CONTROL active_slot_full with users<max FAILS', [start(5), row(5, 'c1', { exit: 'active_slot_full', active_slot_users: 1, max_operation_slots: 2 }), end(5)], 2);
  ctl('CONTROL a feasibility verdict in the row FAILS', [start(5), row(5, 'c1', { feasibility_verdict: 'feasible' }), end(5)], 2);
  ctl('CONTROL malformed selectors (NaN turns) are invalid input', ok(), 3, { turns: { lo: NaN, hi: 5 } });
  ctl('CONTROL empty corps selector is invalid input', ok(), 3, { corps: [] });
  ctl('CONTROL duplicate corps selector is invalid input', ok(), 3, { corps: ['c1', 'c1'] });
  // DEFECT 1: strict inventory strings/order
  ctl('D1 CONTROL unsorted inventory [c1,c0] FAILS', [start(5, ['c1', 'c0']), row(5, 'c1'), row(5, 'c0'), end(5, 2)], 2, { corps: ['c0'] });
  ctl('D1 CONTROL duplicate inventory element FAILS', [start(5, ['c1', 'c1']), row(5), end(5, 2)], 2);
  ctl('D1 CONTROL empty-string inventory element FAILS', [start(5, ['c1', '']), row(5, 'c1'), row(5, ''), end(5, 2)], 2);
  ctl('D1 CONTROL non-string inventory element FAILS', [start(5, ['c1', 7]), row(5), end(5, 2)], 2);
  // DEFECT 2: exact built/returned identity and cardinality
  ctl('D2 CONTROL created: returned name differs from built FAILS', [start(5), created(5, 'c1', { returned: [op('Other', 5)] }), end(5)], 2);
  ctl('D2 CONTROL created: returned started_turn differs from built FAILS', [start(5), created(5, 'c1', { returned: [op('Op', 9)] }), end(5)], 2);
  ctl('D2 CONTROL created: two built operations of the same site FAILS', [start(5), created(5, 'c1', { built: [{ site: 'general', ...op('Op', 5) }, { site: 'general', ...op('Op', 5) }] }), end(5)], 2);
  ctl('D2 CONTROL created: two returned operations FAILS', [start(5), created(5, 'c1', { returned: [op('Op', 5), op('Op', 5)] }), end(5)], 2);
  ctl('D2 CONTROL created: built of the wrong site FAILS', [start(5), created(5, 'c1', { built: [{ site: 'reduction', ...op('Op', 5) }] }), end(5)], 2);
  ctl('D2 CONTROL suppressed that still returned an operation FAILS', [start(5), suppressed(5, 'c1', { returned: [op('Op', 5)] }), end(5)], 2);
  ctl('D2 CONTROL suppressed with no built operation FAILS', [start(5), suppressed(5, 'c1', { built: [] }), end(5)], 2);
  ctl('D2 CONTROL operation entry with a non-integer started_turn FAILS', [start(5), created(5, 'c1', { returned: [{ name: 'Op', type: 'sector_attack', started_turn: '5' }] }), end(5)], 2);
  ctl('D2 CONTROL null operation entry is a CONTROLLED violation (no throw)', [start(5), created(5, 'c1', { returned: [null] }), end(5)], 2);
  ctl('D2 CONTROL non-object built entry is a CONTROLLED violation (no throw)', [start(5), created(5, 'c1', { built: ['x'] }), end(5)], 2);
  ctl('D2 CONTROL a no-op exit that built an operation FAILS', [start(5), row(5, 'c1', { built: [{ site: 'general', ...op('Op', 5) }] }), end(5)], 2);
  // DEFECT 3: eligibility-recheck predicate
  ctl('D3 CONTROL eligible_count >= effective minimum FAILS', [start(5), elig(5, 'c1', { eligible_count: 5 }), end(5)], 2);
  ctl('D3 CONTROL participants BEFORE the filter already below the minimum FAILS', [start(5), elig(5, 'c1', { participating_count: 1 }), end(5)], 2);
  ctl('D3 CONTROL empty reached objective_ids FAILS', [start(5), elig(5, 'c1', { objective_ids: [] }), end(5)], 2);
  ctl('D3 CONTROL string/non-integer counts FAIL', [start(5), elig(5, 'c1', { participating_count: '2', effective_min_for_op: 2.5 }), end(5)], 2);
  ctl('D3 CONTROL missing eligible_count FAILS', [start(5), J({ ...JSON.parse(elig(5, 'c1').slice(PREFIX.length)), eligible_count: undefined })], 2);
  ctl('D3 CONTROL a later decision field present FAILS', [start(5), elig(5, 'c1', { launch_probe: false }), end(5)], 2);
  // DEFECT 4: every completion row is validated, not only the selected corps
  ctl('D4 CONTROL a bad row for a NON-selected corps in the inventory FAILS', [start(5, ['c1', 'c2']), row(5, 'c1'), created(5, 'c2', { returned: [] }), end(5, 2)], 2, { corps: ['c1'] });
  ctl('D4 CONTROL a bad eligibility row for a NON-selected corps FAILS', [start(5, ['c1', 'c2']), row(5, 'c1'), elig(5, 'c2', { eligible_count: 9 }), end(5, 2)], 2, { corps: ['c1'] });
  const failed = results.filter((x) => !x).length;
  console.log(`SELFCHECK ${failed === 0 ? 'PASS' : 'FAIL'}: ${results.length - failed}/${results.length}`);
  process.exit(failed === 0 ? 0 : 1);
}

function main() {
  const a = process.argv.slice(2);
  if (a[0] === '--selfcheck') return selfcheck();
  const arg = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const file = a[0]; const faction = arg('--faction'); const corpsArg = arg('--corps'); const turnsArg = arg('--turns');
  if (!file || file.startsWith('--') || !fs.existsSync(file) || faction === undefined || corpsArg === undefined || turnsArg === undefined) { console.error('usage: <stdout.log> --faction F --corps a,b --turns lo-hi [--emit f] | --selfcheck'); process.exit(3); }
  const ev = arg('--emit'); if (a.includes('--emit') && (ev === undefined || ev.startsWith('--'))) { console.error('--emit requires a value'); process.exit(3); }
  const m = /^(\d+)-(\d+)$/.exec(turnsArg);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const r = analyse(lines, faction, corpsArg.split(','), m ? { lo: Number(m[1]), hi: Number(m[2]) } : { lo: NaN, hi: NaN });
  if (r.invalid.length) { for (const e of r.invalid) console.error('INVALID', e); process.exit(3); }
  if (ev) fs.writeFileSync(ev, `${r.evidence.map((e) => JSON.stringify(e)).join('\n')}\n`);
  console.log(`evidence_rows=${r.evidence.length} violations=${r.violations.length}`);
  for (const e of r.evidence) console.log(JSON.stringify({ faction: e.faction, turn: e.turn, corps_id: e.corps_id, exit: e.exit || e.status }));
  for (const v of r.violations.slice(0, 60)) console.log('FAIL', v);
  process.exit(verdict(r));
}
if (require.main === module) main();
module.exports = { analyse, checkRow, parseLines, inventoryErrors };
