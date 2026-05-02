#!/usr/bin/env node
/**
 * LANE-2026-05-02-KRIVAJA-BRIGADE-LIFECYCLE — Read-only diagnostic.
 *
 * For a parametric watch-list of brigade IDs, reconstructs from preserved run
 * artifacts the per-brigade lifecycle evidence available WITHOUT per-turn
 * brigade-keyed snapshot emission:
 *
 *   - first_op_appearance_turn: earliest week_index where the brigade id
 *     appears in any `weekly_report.jsonl[*].operation_diagnostics[*]
 *     .participating_brigades`. Proxy for "active and committed to an op".
 *   - last_op_appearance_turn: latest such week_index.
 *   - op_appearance_count: number of (turn, op) tuples.
 *   - dissolution_turns: array of week_index where the brigade id appears in
 *     `weekly_report.jsonl[*].brigade_dissolution[*].id` with personnel-snapshot
 *     fields (personnel_remaining, personnel_to_reserve). Authoritative INACTIVE
 *     turn for dissolution path (engine emits this when a brigade is dissolved
 *     into the reserve pool).
 *   - destroyed_record: full row from `destroyed_brigades.json` if present
 *     (turn_destroyed, total_casualties_taken, location_osid, battles_fought,
 *     corps_id, faction). Authoritative INACTIVE turn for combat-destroy path.
 *   - lifecycle_path: classified from the cross-product of evidence:
 *       'destroyed_in_combat' — destroyed_brigades.json row present
 *       'dissolved'           — brigade_dissolution row present, no destroyed row
 *       'active_throughout'   — last_op_appearance_turn == final week and no
 *                                dissolution / destroy evidence
 *       'silent_inactive'     — no op participation AND no dissolution AND no
 *                                destroyed record (e.g. Skelani battalion case
 *                                where the brigade only appears as a dissolution
 *                                event, never as an op participant)
 *       'unknown_inactive'    — last op appearance < final week, no dissolution,
 *                                no destroyed record (gap; brigade went inactive
 *                                via a path not surfaced by current artifacts —
 *                                this is the case that motivates per-turn
 *                                brigade-keyed snapshots)
 *
 * Faction-agnostic. The watch-list is a CLI parameter, not a prefix scan.
 *
 * Determinism:
 *   - No Math.random / Date.now / new Date / locale-sensitive sort.
 *   - Watch-list is sorted via strictCompare before iteration.
 *   - dissolution_turns sorted ascending; participating_brigades scanned in the
 *     order the engine wrote them (already deterministic upstream).
 *   - JSON output uses 2-space indent; key order is fixed in code.
 *
 * Usage:
 *   node tools/diagnostics/krivaja_brigade_lifecycle.cjs <run_dir> [<id1>,<id2>,...]
 *
 * If the comma-separated id list is omitted, the diagnostic reads the watch
 * list from `<run_dir>/krivaja_watch_brigades.json` if present, otherwise
 * exits with a non-zero status. There is NO baked-in brigade list.
 *
 * Example:
 *   node tools/diagnostics/krivaja_brigade_lifecycle.cjs \
 *     runs/apr1992_definitive_188w__210e69404d054959__w188_n1619 \
 *     rs_1st_zvornik,rs_1st_bratunac,rs_skelani_battalion,rs_1st_milii,rs_5th_podrinje
 *
 * Exit codes:
 *   0  trace emitted
 *   1  invalid args / missing artifacts / empty watch list
 */

'use strict';

const fs = require('fs');
const path = require('path');

function strictCompare(a, b) {
    return a < b ? -1 : a > b ? 1 : 0;
}

function fail(msg) {
    process.stderr.write(`krivaja_brigade_lifecycle: ${msg}\n`);
    process.exit(1);
}

function readWatchList(runDir, argList) {
    if (argList) {
        const ids = argList.split(',').map((s) => s.trim()).filter(Boolean);
        if (ids.length === 0) fail('empty watch list (CLI arg)');
        return ids;
    }
    const wlPath = path.join(runDir, 'krivaja_watch_brigades.json');
    if (!fs.existsSync(wlPath)) {
        fail(
            'no watch list provided (CLI) and no krivaja_watch_brigades.json in run dir',
        );
    }
    const parsed = JSON.parse(fs.readFileSync(wlPath, 'utf8'));
    if (!Array.isArray(parsed)) fail('krivaja_watch_brigades.json must be a JSON array of brigade ids');
    if (parsed.length === 0) fail('krivaja_watch_brigades.json is empty');
    return parsed.map((s) => String(s));
}

function loadDestroyed(runDir) {
    const p = path.join(runDir, 'destroyed_brigades.json');
    if (!fs.existsSync(p)) return new Map();
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    const map = new Map();
    if (Array.isArray(arr)) {
        for (const row of arr) {
            if (row && typeof row.brigade_id === 'string') {
                map.set(row.brigade_id, row);
            }
        }
    }
    return map;
}

function scanWeekly(weeklyPath, watchSet) {
    const opAppearances = new Map(); // id -> { first, last, count }
    const dissolutions = new Map();  // id -> [{turn, personnel_remaining, personnel_to_reserve}]
    let lastWeekIndex = -1;

    const text = fs.readFileSync(weeklyPath, 'utf8');
    const lines = text.split(/\r?\n/);
    for (const ln of lines) {
        if (!ln) continue;
        let row;
        try {
            row = JSON.parse(ln);
        } catch (e) {
            fail(`malformed JSONL line in ${weeklyPath}: ${e.message}`);
        }
        const wk = row.week_index;
        if (typeof wk !== 'number') continue;
        if (wk > lastWeekIndex) lastWeekIndex = wk;

        const ops = Array.isArray(row.operation_diagnostics) ? row.operation_diagnostics : [];
        for (const op of ops) {
            const pb = Array.isArray(op.participating_brigades) ? op.participating_brigades : [];
            for (const bid of pb) {
                if (!watchSet.has(bid)) continue;
                let entry = opAppearances.get(bid);
                if (!entry) {
                    entry = { first: wk, last: wk, count: 0 };
                    opAppearances.set(bid, entry);
                }
                if (wk < entry.first) entry.first = wk;
                if (wk > entry.last) entry.last = wk;
                entry.count += 1;
            }
        }

        const diss = Array.isArray(row.brigade_dissolution) ? row.brigade_dissolution : [];
        for (const d of diss) {
            const bid = d && d.id;
            if (typeof bid !== 'string') continue;
            if (!watchSet.has(bid)) continue;
            let arr = dissolutions.get(bid);
            if (!arr) {
                arr = [];
                dissolutions.set(bid, arr);
            }
            arr.push({
                turn: wk,
                personnel_remaining: typeof d.personnel_remaining === 'number' ? d.personnel_remaining : null,
                personnel_to_reserve: typeof d.personnel_to_reserve === 'number' ? d.personnel_to_reserve : null,
            });
        }
    }

    for (const arr of dissolutions.values()) {
        arr.sort((a, b) => strictCompare(a.turn, b.turn));
    }
    return { opAppearances, dissolutions, lastWeekIndex };
}

function classify({ opEntry, dissolutionTurns, destroyedRecord, lastWeekIndex }) {
    if (destroyedRecord) return 'destroyed_in_combat';
    if (dissolutionTurns.length > 0 && opEntry) return 'dissolved';
    if (dissolutionTurns.length > 0 && !opEntry) return 'silent_inactive';
    if (opEntry && opEntry.last >= lastWeekIndex) return 'active_throughout';
    if (opEntry && opEntry.last < lastWeekIndex) return 'unknown_inactive';
    return 'silent_inactive';
}

function buildRow(id, opAppearances, dissolutions, destroyedMap, lastWeekIndex) {
    const opEntry = opAppearances.get(id) || null;
    const dissArr = dissolutions.get(id) || [];
    const destroyedRecord = destroyedMap.get(id) || null;
    const path = classify({
        opEntry,
        dissolutionTurns: dissArr,
        destroyedRecord,
        lastWeekIndex,
    });
    let inactiveTurn = null;
    if (destroyedRecord && typeof destroyedRecord.turn_destroyed === 'number') {
        inactiveTurn = destroyedRecord.turn_destroyed;
    } else if (dissArr.length > 0) {
        inactiveTurn = dissArr[0].turn;
    }
    return {
        brigade_id: id,
        first_op_appearance_turn: opEntry ? opEntry.first : null,
        last_op_appearance_turn: opEntry ? opEntry.last : null,
        op_appearance_count: opEntry ? opEntry.count : 0,
        dissolution_turns: dissArr.map((r) => r.turn),
        dissolution_records: dissArr,
        destroyed_record: destroyedRecord,
        inactive_turn: inactiveTurn,
        lifecycle_path: path,
    };
}

function main() {
    const runDir = process.argv[2];
    if (!runDir) {
        fail(
            'usage: krivaja_brigade_lifecycle.cjs <run_dir> [<id1>,<id2>,...]',
        );
    }
    const argList = process.argv[3] || null;

    const weeklyPath = path.join(runDir, 'weekly_report.jsonl');
    if (!fs.existsSync(weeklyPath)) fail(`missing ${weeklyPath}`);

    const watchListRaw = readWatchList(runDir, argList);
    const watchListSorted = [...watchListRaw].sort(strictCompare);
    const watchSet = new Set(watchListSorted);

    const destroyedMap = loadDestroyed(runDir);
    const { opAppearances, dissolutions, lastWeekIndex } = scanWeekly(weeklyPath, watchSet);

    const rows = watchListSorted.map((id) =>
        buildRow(id, opAppearances, dissolutions, destroyedMap, lastWeekIndex),
    );

    const out = {
        lane: 'LANE-2026-05-02-KRIVAJA-BRIGADE-LIFECYCLE',
        run_dir: runDir,
        last_week_index: lastWeekIndex,
        watch_list: watchListSorted,
        rows,
    };
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
}

main();
