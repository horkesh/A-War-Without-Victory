/**
 * Sector (OG) stance churn probe — observation only.
 *
 * Runs the canonical scenario headless with `AWWV_DEBUG_REASON_CODES=sector_stance` and reads
 * the stdout receipts that topic emits:
 *   - `phase: 'commander'`  — the corps commander's chosen stance per sector, with its reason
 *                             ('default' when the commander made no recommendation);
 *   - `phase: 'pre_combat'` — the stance in effect when combat resolves (after holds and player
 *                             orders).
 * The turn-end save cannot answer this: sectors are rebuilt after combat with stance 'defend'.
 *
 * Sectors are renumbered every turn, so consecutive turns are matched on `stable_key`
 * (`stableSectorKey`: corps id + smallest edge id), the identity sector intel already uses.
 *
 * Reports, per faction and in total:
 *   - flips: a matched sector whose pre-combat stance differs from the previous turn;
 *   - ad_crossings: flips into or out of 'active_defense' (what raises an OG stance matter);
 *   - short_dwell_flips: flips that reverse a stance held for one turn only (A -> B -> A);
 *   - ceiling_violations: sector-turns whose stance is outside CORPS_STANCE_ALLOWED_SECTOR_STANCES
 *     for the corps stance;
 *   - transitions / flip_reasons: what each flip went to and the commander's reason for it.
 *
 * Usage:
 *   npx tsx tools/diagnostics/sector_stance_churn.ts [--weeks 188] [--out <json>] [--run-out <dir>]
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

process.env.AWWV_DEBUG_REASON_CODES = 'sector_stance';

const PREFIX = '[sector_stance] ';

interface Receipt {
    phase: 'commander' | 'pre_combat' | 'entrenchment';
    brigades?: number;
    entrenchment_sum?: number;
    buckets?: Record<string, number>;
    turn: number;
    faction?: string;
    corps_id: string;
    corps_stance?: string | null;
    sector_id: string;
    stable_key: string;
    stance: string | null;
    stance_source?: string | null;
    reason?: string;
}

function arg(name: string): string | undefined {
    const index = process.argv.indexOf(name);
    return index === -1 ? undefined : process.argv[index + 1];
}

function bump(record: Record<string, number>, key: string): void {
    record[key] = (record[key] ?? 0) + 1;
}

function sorted(record: Record<string, number>): Record<string, number> {
    return Object.fromEntries(Object.entries(record).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
}

/** Strip the per-sector figures from a reason so reasons group (e.g. "quiet for 7 turns"). */
function reasonClass(reason: string | undefined): string {
    if (!reason) return 'none';
    return reason.replace(/\d+/g, 'N');
}

async function main(): Promise<void> {
    const weeks = Number(arg('--weeks') ?? '188');
    const outPath = resolve(arg('--out') ?? `runs/sector_stance_churn_w${weeks}.json`);
    const runOut = resolve(arg('--run-out') ?? 'runs');
    const scenarioPath = resolve(arg('--scenario') ?? 'data/scenarios/apr1992_definitive_188w.json');

    const receipts: Receipt[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
        const first = args[0];
        if (args.length === 1 && typeof first === 'string' && first.startsWith(PREFIX)) {
            receipts.push(JSON.parse(first.slice(PREFIX.length)) as Receipt);
            return;
        }
        originalLog(...args);
    };

    const { runScenario } = await import('../../src/scenario/scenario_runner.js');
    const { CORPS_STANCE_ALLOWED_SECTOR_STANCES } = await import('../../src/sim/combat/combat_math.js');
    try {
        await runScenario({
            scenarioPath,
            outDirBase: runOut,
            weeksOverride: weeks,
            uniqueRunFolder: true,
            consoleDiagnostics: false,
        });
    } finally {
        console.log = originalLog;
    }

    const commanderReason = new Map<string, string>();
    for (const r of receipts) {
        if (r.phase === 'commander') commanderReason.set(`${r.turn}|${r.sector_id}`, r.reason ?? 'default');
    }
    const preCombat = receipts.filter((r) => r.phase === 'pre_combat');
    const turns = [...new Set(preCombat.map((r) => r.turn))].sort((a, b) => a - b);

    type Tally = {
        sector_turns: number; matched_pairs: number; flips: number; ad_crossings: number;
        short_dwell_flips: number; ceiling_violations: number; commander_overridden: number;
        stance_turns: Record<string, number>; transitions: Record<string, number>;
        flip_reasons: Record<string, number>; dwell_before_flip: Record<string, number>;
        ceiling_violation_kinds: Record<string, number>;
    };
    const empty = (): Tally => ({
        sector_turns: 0, matched_pairs: 0, flips: 0, ad_crossings: 0, short_dwell_flips: 0,
        ceiling_violations: 0, commander_overridden: 0, stance_turns: {}, transitions: {},
        flip_reasons: {}, dwell_before_flip: {}, ceiling_violation_kinds: {},
    });
    const tallies = new Map<string, Tally>();
    const tally = (f: string): Tally => {
        let t = tallies.get(f);
        if (!t) { t = empty(); tallies.set(f, t); }
        return t;
    };

    let previous = new Map<string, { stance: string; prior?: string; dwell: number }>();
    for (const turn of turns) {
        const next = new Map<string, { stance: string; prior?: string; dwell: number }>();
        for (const r of preCombat.filter((x) => x.turn === turn)) {
            const faction = r.faction ?? 'unknown';
            const t = tally(faction);
            const stance = r.stance ?? 'defend';
            t.sector_turns += 1;
            bump(t.stance_turns, stance);
            const allowed = CORPS_STANCE_ALLOWED_SECTOR_STANCES[r.corps_stance ?? 'balanced']
                ?? CORPS_STANCE_ALLOWED_SECTOR_STANCES.balanced!;
            if (!allowed.includes(stance as never)) {
                t.ceiling_violations += 1;
                bump(t.ceiling_violation_kinds, `${r.corps_stance ?? 'balanced'}:${stance}`);
            }
            const chosen = commanderReason.has(`${turn}|${r.sector_id}`);
            const prev = previous.get(r.stable_key);
            if (!prev) {
                next.set(r.stable_key, { stance, dwell: 1 });
                continue;
            }
            t.matched_pairs += 1;
            if (prev.stance === stance) {
                next.set(r.stable_key, { stance, prior: prev.prior, dwell: prev.dwell + 1 });
                continue;
            }
            t.flips += 1;
            bump(t.transitions, `${prev.stance}->${stance}`);
            bump(t.flip_reasons, chosen ? reasonClass(commanderReason.get(`${turn}|${r.sector_id}`)) : 'no_commander_receipt');
            bump(t.dwell_before_flip, String(Math.min(prev.dwell, 10)));
            if ((prev.stance === 'active_defense') !== (stance === 'active_defense')) t.ad_crossings += 1;
            if (prev.dwell === 1 && prev.prior === stance) t.short_dwell_flips += 1;
            next.set(r.stable_key, { stance, prior: prev.stance, dwell: 1 });
        }
        previous = next;
    }
    // Commander choice differing from the pre-combat stance (holds or player orders won).
    const preByKey = new Map(preCombat.map((r) => [`${r.turn}|${r.sector_id}`, r] as const));
    for (const r of receipts) {
        if (r.phase !== 'commander') continue;
        const pre = preByKey.get(`${r.turn}|${r.sector_id}`);
        if (pre && pre.stance !== r.stance) tally(pre.faction ?? 'unknown').commander_overridden += 1;
    }

    const factions = [...tallies.keys()].sort();
    const total = empty();
    for (const f of factions) {
        const t = tallies.get(f)!;
        for (const k of ['sector_turns', 'matched_pairs', 'flips', 'ad_crossings', 'short_dwell_flips', 'ceiling_violations', 'commander_overridden'] as const) {
            total[k] += t[k];
        }
        for (const k of ['stance_turns', 'transitions', 'flip_reasons', 'dwell_before_flip', 'ceiling_violation_kinds'] as const) {
            for (const [key, n] of Object.entries(t[k])) total[k][key] = (total[k][key] ?? 0) + n;
        }
    }
    const view = (t: Tally) => ({
        ...t,
        stance_turns: sorted(t.stance_turns), transitions: sorted(t.transitions),
        flip_reasons: sorted(t.flip_reasons), dwell_before_flip: sorted(t.dwell_before_flip),
        ceiling_violation_kinds: sorted(t.ceiling_violation_kinds),
    });
    // Entrenchment at combat time (phase 'entrenchment'), summed over all turns: per faction and
    // OG stance, brigade-turns, mean entrenchment_turns and the bucket distribution.
    type Ent = { brigade_turns: number; sum: number; buckets: Record<string, number> };
    const ent = new Map<string, Ent>();
    const entOf = (key: string): Ent => {
        let e = ent.get(key);
        if (!e) { e = { brigade_turns: 0, sum: 0, buckets: {} }; ent.set(key, e); }
        return e;
    };
    for (const r of receipts) {
        if (r.phase !== 'entrenchment') continue;
        for (const key of [`${r.faction ?? 'unknown'}|${r.stance ?? 'defend'}`, `${r.faction ?? 'unknown'}|all`, `all|${r.stance ?? 'defend'}`, 'all|all']) {
            const e = entOf(key);
            e.brigade_turns += r.brigades ?? 0;
            e.sum += r.entrenchment_sum ?? 0;
            for (const [b, n] of Object.entries(r.buckets ?? {})) e.buckets[b] = (e.buckets[b] ?? 0) + n;
        }
    }
    const entrenchment = Object.fromEntries([...ent.keys()].sort().map((key) => {
        const e = ent.get(key)!;
        return [key, {
            brigade_turns: e.brigade_turns,
            mean: e.brigade_turns > 0 ? Math.round((e.sum / e.brigade_turns) * 1000) / 1000 : 0,
            buckets: sorted(e.buckets),
        }];
    }));

    const report = {
        schema: 'sector_stance_churn.v3',
        weeks,
        receipts: receipts.length,
        total: view(total),
        by_faction: Object.fromEntries(factions.map((f) => [f, view(tallies.get(f)!)])),
        entrenchment,
    };
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\nreport: ${outPath}\n`);
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
});
