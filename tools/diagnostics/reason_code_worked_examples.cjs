/**
 * REASON-CODE INSTRUMENTATION — worked-example extractor.
 *
 * Reads a FLAG-ON run directory and prints one worked example per instrumented
 * item, each chosen to demonstrate that the new field answers the specific
 * question it was added for. Read-only; writes nothing.
 *
 * Usage: node tools/diagnostics/reason_code_worked_examples.cjs <run_dir>
 */

const fs = require('fs');
const path = require('path');

const runDir = process.argv[2];
if (!runDir) { console.error('usage: reason_code_worked_examples.cjs <run_dir>'); process.exit(2); }

function readJsonl(p) {
    if (!fs.existsSync(p)) return [];
    return fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const weekly = readJsonl(path.join(runDir, 'weekly_report.jsonl'));
const battles = [];
for (const row of weekly) for (const b of row.battles ?? []) battles.push({ week: row.week_index, ...b });

console.log('=== RUN ' + runDir);
console.log('weeks=' + weekly.length + '  battles=' + battles.length);

// ── ITEM 1: stack vs named brigade ─────────────────────────────────────────
console.log('\n=== ITEM 1 — attacker_brigades / defender_contributions ===');
const withStack = battles.filter((b) => Array.isArray(b.attacker_brigades));
console.log('battles carrying attacker_brigades: ' + withStack.length + ' / ' + battles.length);
const multi = withStack.filter((b) => b.attacker_brigades.length > 1);
console.log('battles with a MULTI-BRIGADE attacker stack: ' + multi.length);
// The worked example: the largest stack, where the named/stack confusion is worst.
multi.sort((a, b) => b.attacker_brigades.length - a.attacker_brigades.length
    || (a.battle_id < b.battle_id ? -1 : a.battle_id > b.battle_id ? 1 : 0));
const ex1 = multi[0];
if (ex1) {
    console.log(JSON.stringify({
        battle_id: ex1.battle_id,
        week: ex1.week,
        target_osid: ex1.target_osid,
        operation_name: ex1.operation_name ?? null,
        NAMED_attacker_brigade: ex1.attacker_brigade,
        ACTUAL_attacker_brigades: ex1.attacker_brigades,
        stack_size: ex1.attacker_brigades.length,
        attacker_casualties_IS_A_STACK_TOTAL: ex1.attacker_casualties,
        NAMED_defender_brigade: ex1.defender_brigade,
        defender_contributions: ex1.defender_contributions ?? null,
    }, null, 2));
}
// How often would the old artifact have misled? Every multi-brigade battle.
const misleadable = multi.length;
console.log('battles where attacker_brigade + attacker_casualties would have been read as a pair '
    + 'and been WRONG: ' + misleadable
    + ' (' + (battles.length ? (100 * misleadable / battles.length).toFixed(1) : '0') + '% of all battles)');
const defMulti = withStack.filter((b) => Array.isArray(b.defender_contributions) && b.defender_contributions.length > 1);
console.log('battles where the defence was a MULTI-BRIGADE sector (defender_brigade names only the strongest): '
    + defMulti.length);

// ── ITEM 2: power decomposition ────────────────────────────────────────────
console.log('\n=== ITEM 2 — power_breakdown ===');
const withPower = battles.filter((b) => b.power_breakdown);
console.log('battles carrying power_breakdown: ' + withPower.length + ' / ' + battles.length);
if (withPower.length) {
    const paths = {};
    for (const b of withPower) paths[b.power_breakdown.defender_power_path] = (paths[b.power_breakdown.defender_power_path] ?? 0) + 1;
    console.log('defender_power_path distribution: ' + JSON.stringify(paths));
    console.log('min_floor_applied count: ' + withPower.filter((b) => b.power_breakdown.min_floor_applied).length);

    // THE WORKED EXAMPLE this field exists for: same attacker, same defender, same
    // OSID, DIFFERENT power_ratio. Before the breakdown this was indistinguishable
    // from a determinism break; the breakdown names the cause.
    const byPair = new Map();
    for (const b of withPower) {
        const key = b.target_osid + '|' + b.attacker_brigade + '|' + b.defender_brigade;
        if (!byPair.has(key)) byPair.set(key, []);
        byPair.get(key).push(b);
    }
    let best = null;
    for (const [key, group] of [...byPair.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
        if (group.length < 2) continue;
        const ratios = group.map((g) => g.power_ratio);
        const swing = Math.max(...ratios) / Math.max(1e-9, Math.min(...ratios));
        if (!best || swing > best.swing) best = { key, group, swing };
    }
    if (best && best.swing > 1.5) {
        const lo = best.group.reduce((a, b) => (a.power_ratio <= b.power_ratio ? a : b));
        const hi = best.group.reduce((a, b) => (a.power_ratio >= b.power_ratio ? a : b));
        console.log('\nIDENTICAL NAMED COMBATANTS, power_ratio swing x' + best.swing.toFixed(2) + ':');
        console.log('  ' + best.key);
        for (const [label, b] of [['LOW ', lo], ['HIGH', hi]]) {
            const p = b.power_breakdown;
            console.log('  ' + label + ' w' + b.week + '  ratio=' + b.power_ratio
                + '  att=' + p.attacker_power.toFixed(2)
                + '  def=' + p.defender_power.toFixed(2)
                + '  sector=' + p.defending_sector_id
                + '  sector_brigades=' + p.sector_brigade_count
                + '  stance=' + p.sector_stance
                + '  physical=' + p.physical_power.toFixed(2)
                + '  reactive=' + p.reactive_response.toFixed(2)
                + '  floor=' + p.min_floor_applied);
        }
        const lp = lo.power_breakdown, hp = hi.power_breakdown;
        console.log('  VERDICT: '
            + (lp.sector_brigade_count !== hp.sector_brigade_count || lp.defending_sector_id !== hp.defending_sector_id
                ? 'THE SECTOR WAS REPARTITIONED (roster/sector differ) — not a stronger defender.'
                : 'same sector and roster; the movement is inside the power terms.'));
    } else {
        console.log('(no repeated attacker/defender/OSID triple with a >1.5x ratio swing in this run)');
    }
}

// ── ITEM 3: axis rejection reason ──────────────────────────────────────────
console.log('\n=== ITEM 3 — launch_blocker_detail ===');
const aarPath = path.join(runDir, 'operation_aars.json');
if (fs.existsSync(aarPath)) {
    const aars = JSON.parse(fs.readFileSync(aarPath, 'utf8'));
    const list = Array.isArray(aars) ? aars : (aars.aars ?? aars.operation_aars ?? []);
    const blocked = [];
    // NOTE the field is `axis_summaries`, not `axes` — verified against a reference run.
    for (const aar of list) for (const ax of aar.axis_summaries ?? []) {
        if (ax.launch_blocker === 'zero_eligible_axis') {
            blocked.push({ op: aar.operation_name, corps: aar.corps_id, axis: ax });
        }
    }
    console.log('axes with launch_blocker=zero_eligible_axis: ' + blocked.length);
    const withDetail = blocked.filter((b) => b.axis.launch_blocker_detail);
    console.log('...of which now carry launch_blocker_detail: ' + withDetail.length);
    const states = {};
    for (const b of withDetail) {
        const st = b.axis.launch_blocker_detail.collapsed_state;
        states[st] = (states[st] ?? 0) + 1;
    }
    console.log('collapsed_state distribution: ' + JSON.stringify(states));
    const skips = {};
    for (const b of withDetail) for (const f of b.axis.launch_blocker_detail.brigades ?? []) {
        const k = f.considered ? (f.found_in_predictor ? 'considered_below_threshold' : 'not_in_predictor') : ('skip:' + f.skip_reason);
        skips[k] = (skips[k] ?? 0) + 1;
    }
    console.log('per-candidate reason codes: ' + JSON.stringify(skips, null, 2));
    if (withDetail[0]) {
        console.log('\nworked example:');
        console.log(JSON.stringify({
            operation: withDetail[0].op,
            corps: withDetail[0].corps,
            axis_id: withDetail[0].axis.axis_id,
            launch_blocker: withDetail[0].axis.launch_blocker,
            launch_blocker_detail: withDetail[0].axis.launch_blocker_detail,
        }, null, 2));
    }
} else {
    console.log('(no operation_aars.json in this run dir)');
}
// AARs only exist for FINALIZED operations, so also sweep the live save: an axis
// still blocked at scenario end never produces an AAR and would otherwise be invisible.
const savePath = path.join(runDir, 'final_save.json');
if (fs.existsSync(savePath)) {
    const save = JSON.parse(fs.readFileSync(savePath, 'utf8'));
    const cmds = save?.military?.corps_command ?? {};
    let live = 0; const liveStates = {}; let liveExample = null;
    for (const corpsId of Object.keys(cmds).sort()) {
        for (const op of cmds[corpsId]?.active_operations ?? []) {
            for (const ax of op.axes ?? []) {
                if (!ax.launch_blocker_detail) continue;
                live += 1;
                const st = ax.launch_blocker_detail.collapsed_state;
                liveStates[st] = (liveStates[st] ?? 0) + 1;
                if (!liveExample) liveExample = { corps: corpsId, op: op.name, phase: op.phase, axis_id: ax.axis_id, detail: ax.launch_blocker_detail };
            }
        }
    }
    console.log('\nLIVE axes in final_save carrying launch_blocker_detail: ' + live
        + '  ' + JSON.stringify(liveStates));
    if (liveExample) console.log(JSON.stringify(liveExample, null, 2));
}

// ── ITEM 4: recruitment refusals ───────────────────────────────────────────
console.log('\n=== ITEM 4 — recruitment_refusals ===');
const withRecruit = weekly.filter((r) => r.recruitment_refusals);
console.log('weeks carrying recruitment_refusals: ' + withRecruit.length + ' / ' + weekly.length);
if (withRecruit.length) {
    const tot = { no_control: 0, no_manpower: 0, no_capital: 0, no_equipment: 0 };
    for (const r of withRecruit) {
        const s = r.recruitment_refusals.skipped;
        if (s) for (const k of Object.keys(tot)) tot[k] += s[k] ?? 0;
    }
    console.log('SKIP COUNTERS previously computed every turn and DISCARDED, now summed over the run:');
    console.log('  ' + JSON.stringify(tot));
    const reasons = {};
    let refusalRows = 0;
    for (const r of withRecruit) for (const f of r.recruitment_refusals.emergent_formation_refusals ?? []) {
        reasons[f.reason] = (reasons[f.reason] ?? 0) + 1;
        refusalRows += 1;
    }
    console.log('EMERGENT-FORMATION refusals (counted NOWHERE in the shipped engine): ' + refusalRows);
    console.log('  by reason: ' + JSON.stringify(reasons, null, 2));
    // The discrimination this buys: "no manpower" vs "existing brigades not full".
    const wk = withRecruit.find((r) => (r.recruitment_refusals.emergent_formation_refusals ?? []).length > 0);
    if (wk) {
        console.log('\nworked example (week ' + wk.week_index + '), first 5 refusals:');
        console.log(JSON.stringify(wk.recruitment_refusals.emergent_formation_refusals.slice(0, 5), null, 2));
    }
}

// ── ITEM 5: disrupted_turns ────────────────────────────────────────────────
console.log('\n=== ITEM 5 — disrupted_turns on the temporal log ===');
const tlPath = path.join(runDir, 'brigade_temporal_log.jsonl');
if (fs.existsSync(tlPath)) {
    let rows = 0, withField = 0, disrupted = 0, withMorale = 0;
    const sample = [];
    const raw = fs.readFileSync(tlPath, 'utf8');
    for (const line of raw.split('\n')) {
        if (!line) continue;
        const r = JSON.parse(line);
        rows += 1;
        if (Object.prototype.hasOwnProperty.call(r, 'disrupted_turns')) withField += 1;
        if (Object.prototype.hasOwnProperty.call(r, 'morale')) withMorale += 1;
        if ((r.disrupted_turns ?? 0) > 0) {
            disrupted += 1;
            if (sample.length < 3) sample.push({ turn: r.turn, brigade_id: r.brigade_id, disrupted_turns: r.disrupted_turns, morale: r.morale, personnel: r.personnel, location_osid: r.location_osid });
        }
    }
    console.log('rows=' + rows + '  carrying disrupted_turns=' + withField + '  carrying morale=' + withMorale);
    console.log('rows with disrupted_turns > 0: ' + disrupted);
    if (sample.length) console.log('worked example: ' + JSON.stringify(sample, null, 2));
} else {
    console.log('(no brigade_temporal_log.jsonl in this run dir)');
}
