#!/usr/bin/env node
/**
 * Militia casualty gap diagnostic (read-only).
 *
 * Reads a run directory's `weekly_report.jsonl` and reports militia-only battles —
 * battles resolved with no defender formation — together with the raw defender
 * casualties they produced. Before the durable-militia-accounting change those raw
 * casualties were REPORTED by the resolver but never persisted: no pool debit and no
 * casualty-ledger row. This tool measures that gap and, after the change, verifies
 * that the ledger actually carries them.
 *
 * A battle is militia-only when `defender_kind === 'militia'` (post-change provenance)
 * or, for artifacts written before that field existed, when `defender_brigade` is null.
 *
 * Deterministic: no wall clock, no randomness. Faction and OSID output is ordered by
 * descending raw casualties, ties broken lexically. Never mutates the run directory.
 *
 * With `--preflight`, it additionally answers the architecture question the militia
 * persistence plan gates on: for every militia-only battle, was there a matching
 * (municipality, faction) militia pool, and how much `available` manpower did that pool
 * hold AT BATTLE TIME? Pool state is read from `replay_save_sequence.json`, so the run
 * must have been produced with `--full-replay-save-sequence`. Snapshot-only joins against
 * initial/final saves are NOT equivalent — militia pools drain steadily across a run, so
 * an end-state zero says nothing about what the pool held when the battle was fought.
 *
 * Usage:
 *   node tools/diagnostics/militia_casualty_gap.cjs <run_dir> [--json] [--preflight]
 */

const fs = require('fs');
const path = require('path');

const NEWLINE = String.fromCharCode(10);

/** Lexical comparator matching the engine's `strictCompare` ordering. */
function strictCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

/** Rank by descending numeric value, ties broken lexically by key. */
function byCasualtiesThenKey(a, b) {
    if (b.raw !== a.raw) return b.raw - a.raw;
    return strictCompare(a.key, b.key);
}

/**
 * Per-faction permanent-casualty fractions applied at ledger accumulation
 * (`src/state/casualty_ledger.ts`). Mirrored here so the projection reports what the
 * CURRENT ledger regime would record for casualties the resolver reported but dropped.
 */
const CASUALTY_REALISM_FRACTION = { RBiH: 0.39, RS: 0.50, HRHB: 0.75 };

/**
 * KIA/WIA/MIA split used by `splitKiaWiaMia`
 * (src/sim/combat/attack_casualty_distribution.ts). These are the SHIPPED flag-OFF
 * fractions of the casualty-realism V2 gate (`getMainCasualtySplit()`); a run made with
 * that gate flag ON would need the gate's fractions instead. Retained pre-change
 * artifacts were all produced flag-OFF.
 */
const KIA_FRAC = 0.22;
const WIA_FRAC = 0.74;

/** Split a raw casualty total into KIA/WIA/MIA the way the engine does. */
function splitKiaWiaMia(total) {
    const killed = Math.floor(total * KIA_FRAC);
    const wounded = Math.floor(total * WIA_FRAC);
    return { killed, wounded, missing_captured: Math.max(0, total - killed - wounded) };
}

function isMilitiaOnly(battle) {
    if (typeof battle.defender_kind === 'string') return battle.defender_kind === 'militia';
    return battle.defender_brigade == null;
}

function collect(runDir) {
    const reportPath = path.join(runDir, 'weekly_report.jsonl');
    if (!fs.existsSync(reportPath)) {
        throw new Error(`no weekly_report.jsonl in ${runDir}`);
    }
    const lines = fs.readFileSync(reportPath, 'utf8').split('\n').filter((l) => l.trim().length > 0);

    const byFaction = new Map();
    const byOsid = new Map();
    let battleCount = 0;
    let rawTotal = 0;
    let ledgerRowsSeen = 0;

    for (const line of lines) {
        const report = JSON.parse(line);
        for (const battle of report.battles || []) {
            if (!isMilitiaOnly(battle)) continue;
            battleCount += 1;
            const raw = battle.defender_casualties || 0;
            rawTotal += raw;
            if (battle.defender_militia_pool_key) ledgerRowsSeen += 1;

            const faction = battle.defender_faction || '(unknown)';
            byFaction.set(faction, (byFaction.get(faction) || 0) + raw);

            const osid = battle.target_osid || '(unknown)';
            byOsid.set(osid, (byOsid.get(osid) || 0) + raw);
        }
    }

    const factions = [...byFaction.entries()]
        .map(([key, raw]) => {
            const frac = CASUALTY_REALISM_FRACTION[key] ?? 1.0;
            const split = splitKiaWiaMia(raw);
            return {
                key,
                raw,
                realism_fraction: frac,
                projected_killed: Math.round(split.killed * frac),
                projected_wounded: Math.round(split.wounded * frac),
                projected_missing: Math.round(split.missing_captured * frac),
            };
        })
        .sort(byCasualtiesThenKey);

    const osids = [...byOsid.entries()]
        .map(([key, raw]) => ({ key, raw }))
        .sort(byCasualtiesThenKey)
        .slice(0, 20);

    return {
        run_dir: runDir,
        weeks: lines.length,
        militia_only_battles: battleCount,
        raw_defender_casualties: rawTotal,
        battles_with_pool_provenance: ledgerRowsSeen,
        by_faction: factions,
        top_osids: osids,
    };
}

/**
 * Join each militia-only battle to the militia-pool state at the START of the week the
 * battle was fought: the initial save for week 0, otherwise the replay sequence entry for
 * the preceding turn. Within-week drift is not modelled, which is sound for the question
 * asked — before this lane a militia battle debited nothing, so a pool cannot have been
 * reduced by the battle being measured.
 */
function preflight(runDir) {
    const seqPath = path.join(runDir, 'replay_save_sequence.json');
    const initPath = path.join(runDir, 'initial_save.json');
    if (!fs.existsSync(seqPath)) {
        throw new Error(`no replay_save_sequence.json in ${runDir} `
            + `(re-run the scenario with --full-replay-save-sequence)`);
    }
    const sequence = JSON.parse(fs.readFileSync(seqPath, 'utf8'));
    const initial = JSON.parse(fs.readFileSync(initPath, 'utf8'));
    const lines = fs.readFileSync(path.join(runDir, 'weekly_report.jsonl'), 'utf8')
        .split(NEWLINE).filter((l) => l.trim().length > 0);

    const poolsAtWeek = (i) => {
        const state = i === 0 ? initial : sequence[i - 1];
        return (state && state.military && state.military.militia_pools) || {};
    };

    const rows = [];
    let noPool = 0, zeroAvailable = 0, underBacked = 0, fullyBacked = 0;

    lines.forEach((line, i) => {
        const report = JSON.parse(line);
        for (const battle of report.battles || []) {
            if (!isMilitiaOnly(battle)) continue;
            const mun = (battle.target_osid || '').split(':')[1];
            const key = `${mun}:${battle.defender_faction}`;
            const pool = poolsAtWeek(i)[key];
            const available = pool ? (pool.available || 0) : null;
            const casualties = battle.defender_casualties || 0;

            let verdict;
            if (!pool) { verdict = 'no_pool'; noPool += 1; }
            else if (available === 0) { verdict = 'zero_available'; zeroAvailable += 1; }
            else if (available < casualties) { verdict = 'under_backed'; underBacked += 1; }
            else { verdict = 'fully_backed'; fullyBacked += 1; }

            rows.push({
                week: report.week_index != null ? report.week_index : i,
                pool_key: key,
                available,
                casualties,
                target_osid: battle.target_osid,
                verdict,
            });
        }
    });

    return {
        run_dir: runDir,
        militia_only_battles: rows.length,
        no_pool: noPool,
        zero_available: zeroAvailable,
        under_backed: underBacked,
        fully_backed: fullyBacked,
        rows,
    };
}

function printPreflight(result) {
    console.log('');
    console.log('  architecture preflight — pool availability AT BATTLE TIME');
    console.log(`    militia-only battles            ${result.militia_only_battles}`);
    console.log(`    no matching pool                ${result.no_pool}`);
    console.log(`    pool exists, available == 0     ${result.zero_available}`);
    console.log(`    available > 0 but < casualties  ${result.under_backed}`);
    console.log(`    fully backed                    ${result.fully_backed}`);
    console.log('');
    console.log('    wk  pool_key                       avail    cas  verdict         osid');
    for (const r of result.rows) {
        console.log(`    ${String(r.week).padStart(2)}  ${String(r.pool_key).padEnd(28)}`
            + `${String(r.available).padStart(6)}${String(r.casualties).padStart(7)}`
            + `  ${r.verdict.padEnd(14)}  ${r.target_osid}`);
    }
}

function main() {
    const args = process.argv.slice(2);
    const asJson = args.includes('--json');
    const wantPreflight = args.includes('--preflight');
    const runDir = args.find((a) => !a.startsWith('--'));
    if (!runDir) {
        console.error('usage: node tools/diagnostics/militia_casualty_gap.cjs <run_dir> [--json]');
        process.exit(2);
    }

    const result = collect(runDir);
    if (asJson) {
        if (wantPreflight) result.preflight = preflight(runDir);
        console.log(JSON.stringify(result, null, 2));
        return;
    }

    console.log(`militia casualty gap — ${result.run_dir}`);
    console.log(`  weeks read                 ${result.weeks}`);
    console.log(`  militia-only battles       ${result.militia_only_battles}`);
    console.log(`  raw defender casualties    ${result.raw_defender_casualties}`);
    console.log(`  battles w/ pool provenance ${result.battles_with_pool_provenance}`);
    const totalProjected = result.by_faction.reduce(
        (s, f) => s + f.projected_killed + f.projected_wounded + f.projected_missing, 0);
    const totalKilled = result.by_faction.reduce((s, f) => s + f.projected_killed, 0);
    console.log(`  projected ledger casualties ${totalProjected} (killed ${totalKilled})`);
    console.log('');
    console.log('  by defender faction (raw → projected KIA/WIA/MIA at current ledger fractions):');
    for (const f of result.by_faction) {
        console.log(`    ${f.key.padEnd(6)} raw ${String(f.raw).padStart(6)}  ×${f.realism_fraction}`
            + `  → K ${String(f.projected_killed).padStart(5)}`
            + `  W ${String(f.projected_wounded).padStart(5)}`
            + `  M ${String(f.projected_missing).padStart(5)}`);
    }
    console.log('');
    console.log('  top OSIDs by missing raw casualties:');
    for (const o of result.top_osids) {
        console.log(`    ${String(o.raw).padStart(6)}  ${o.key}`);
    }

    if (wantPreflight) printPreflight(preflight(runDir));
}

if (require.main === module) main();

module.exports = { collect, preflight, splitKiaWiaMia, strictCompare };
