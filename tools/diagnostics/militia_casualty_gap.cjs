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
 * Usage:
 *   node tools/diagnostics/militia_casualty_gap.cjs <run_dir> [--json]
 */

const fs = require('fs');
const path = require('path');

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

function main() {
    const args = process.argv.slice(2);
    const asJson = args.includes('--json');
    const runDir = args.find((a) => !a.startsWith('--'));
    if (!runDir) {
        console.error('usage: node tools/diagnostics/militia_casualty_gap.cjs <run_dir> [--json]');
        process.exit(2);
    }

    const result = collect(runDir);
    if (asJson) {
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
}

if (require.main === module) main();

module.exports = { collect, splitKiaWiaMia, strictCompare };
