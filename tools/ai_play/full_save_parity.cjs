#!/usr/bin/env node
/**
 * FULL-SAVE LIVE PARITY (rulings §53 stage 2, LIVE-HIDDEN-SPLIT, lane B s34, 2026-11-27).
 *
 * usage: node tools/ai_play/full_save_parity.cjs <headless final_save.json> <player final_save.json> [--max N]
 *
 * Compares two final saves of a desktop_calibration_compare run leaf by leaf (arrays by index) and
 * fails (exit 1) on any differing leaf outside the declared live-only allowlist below. Control-level
 * parity (0 cells at four checkpoints) can hide a state split; this compares everything else too.
 *
 * THE ALLOWLIST. Each path exists, or takes its value, only because a live player is present. None
 * is read by a sim reader in a way that changes a hands-off turn (measured: with LIVE-HIDDEN-SPLIT
 * the t188 saves differ in nothing else, RBiH a2, historical and emergent).
 */
'use strict';
const fs = require('node:fs');

/** Exact paths (and everything under them) that may differ live vs headless, with the reason. */
const LIVE_ONLY = [
    ['meta.player_faction', 'the live player\'s faction; absent headless by definition'],
    ['meta.autonomy_level', 'the live player\'s autonomy setting; headless has none'],
    ['meta.headless_scenario_auto_control', 'the mode switch itself (true headless, false live)'],
    ['meta.pending_proposal_reviews', 'the player\'s proposal desk (staff proceeded under standing authorization)'],
    ['meta.proposal_decision_history', 'receipts of the player\'s desk, incl. silence receipts'],
    ['meta.stance_matters', 'stance matters raised to the player; headless has no President'],
    ['meta.stance_matter_history', 'receipts of stance matters raised to the player'],
    ['military.stance_matter_state', 'cooldowns of stance matters raised to the player'],
    ['military.command_authority', 'the President\'s command-authority reserve (player lever budget)'],
    ['military.last_briefing', 'the player\'s weekly briefing text'],
    ['military.pending_officer_events', 'officer-arrival notices: the live player\'s stay unacknowledged; no sim '
        + 'reader gates on an unacknowledged row (officer_system.ts dedupe/prune only)'],
    ['paramilitary_policy', 'mirror of the policy card\'s answer (headless keeps the migration default ask). Live staff '
        + 'read it as an explicit order equal to the bot\'s event flag, so it is not independent state (paramilitary_policy.ts)'],
    ['military.negotiation.pending_dayton.delegation_folder', 'the player delegation\'s Dayton folder, built for the '
        + 'player\'s faction only and read only by the UI (negotiation_types.ts)'],
];

/**
 * Compared normalised, not leaf by leaf: the event decision log must hold the same answers
 * (event, faction, response) in both branches. Order, turn and decision_source may differ only on the
 * rows the live player answered in person (decision_source 'player'): the bot_equivalent harness answers
 * as a player at the pause and files opening answers at campaign birth (turn 0), where headless the bot
 * answers in the settle step. Every non-player row must match a headless row exactly and in order: with the
 * in-person rows taken out of the headless log one for one by answer, the rest of the two logs are identical
 * sequences (PARITY-ORDER, rulings §65).
 */
const NORMALISED = 'military.event_decision_log';

function isLiveOnly(path) {
    return LIVE_ONLY.some(([p]) => path === p || path.startsWith(p + '.'));
}

function diffLeaves(a, b, path, out, max) {
    if (out.length >= max) return;
    if (path === NORMALISED || isLiveOnly(path)) return;
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === 'object' && typeof b === 'object' && Array.isArray(a) === Array.isArray(b)) {
        if (Array.isArray(a)) {
            if (a.length !== b.length) out.push(`${path} len ${a.length} vs ${b.length}`);
            for (let i = 0; i < Math.max(a.length, b.length); i += 1) diffLeaves(a[i], b[i], `${path}.${i}`, out, max);
            return;
        }
        const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
        for (const k of keys) diffLeaves(a[k], b[k], path ? `${path}.${k}` : k, out, max);
        return;
    }
    out.push(`${path}  headless=${String(JSON.stringify(a)).slice(0, 160)}  player=${String(JSON.stringify(b)).slice(0, 160)}`);
}

function decisionLogProblems(headlessLog, playerLog, playerFaction) {
    const key = (r) => `${r.event_id}|${r.faction}|${r.response_id}`;
    const strict = (r) => JSON.stringify(r);
    const problems = [];
    const a = (headlessLog ?? []).map(key).sort();
    const b = (playerLog ?? []).map(key).sort();
    if (JSON.stringify(a) !== JSON.stringify(b)) {
        problems.push(`${NORMALISED}: answers differ (headless ${a.length} rows, player ${b.length} rows)`);
    }
    // PARITY-ORDER (rulings §65, Codex r4720444796): remove the live player's in-person rows from the headless log
    // one for one by (event, faction, response), first unmatched occurrence. What remains must equal the player
    // save's non-player rows exactly and IN ORDER (the firing order #905 fixed), not merely as a set.
    const remaining = [...(headlessLog ?? [])];
    for (const row of playerLog ?? []) {
        if (row.decision_source !== 'player') continue;
        const i = remaining.findIndex((h) => key(h) === key(row));
        if (i < 0) problems.push(`${NORMALISED}: in-person player row has no headless answer: ${strict(row).slice(0, 200)}`);
        else remaining.splice(i, 1);
    }
    const nonPlayer = (playerLog ?? []).filter((row) => row.decision_source !== 'player');
    if (remaining.length !== nonPlayer.length) {
        problems.push(`${NORMALISED}: non-player rows differ in count (headless ${remaining.length}, player ${nonPlayer.length})`);
    }
    // OBSERVER-LABEL (PARITY-EMER, lane B s35): an automatic answer for the live player's own seat (Observer at
    // answer time, or the staff by silence) is logged 'bot_ai_default' where headless logs the bot's own label for
    // the same answer. Every src reader tests decision_source only against 'player', so the bot labels are
    // interchangeable there; on the live faction's rows they are compared as one class. Answer, turn and order stay exact.
    // tests/decision_source_bot_label_guard.test.ts keeps that premise true (§68): it fails if any src reader compares
    // decision_source with a bot label. If it ever fails, remove this rule and unify the label in the engine instead.
    const BOT = new Set(['bot_political', 'bot_v1', 'bot_ai_default']);
    const rowKey = (r) => (playerFaction !== undefined && r && r.faction === playerFaction && BOT.has(r.decision_source)
        ? strict({ ...r, decision_source: 'bot' }) : strict(r));
    for (let i = 0; i < Math.max(remaining.length, nonPlayer.length); i += 1) {
        const h = remaining[i] === undefined ? 'none' : rowKey(remaining[i]);
        const p = nonPlayer[i] === undefined ? 'none' : rowKey(nonPlayer[i]);
        if (h !== p) {
            problems.push(`${NORMALISED}: non-player row ${i} differs (order or content): headless=${h.slice(0, 160)} player=${p.slice(0, 160)}`);
            break;
        }
    }
    return problems;
}

function compareSaves(headless, player, max = 200) {
    const out = [];
    diffLeaves(headless, player, '', out, max);
    const playerFaction = typeof player?.meta?.player_faction === 'string' ? player.meta.player_faction : undefined;
    out.push(...decisionLogProblems(headless?.military?.event_decision_log, player?.military?.event_decision_log, playerFaction));
    return out;
}

module.exports = { LIVE_ONLY, NORMALISED, compareSaves };

if (require.main === module) {
    const args = process.argv.slice(2);
    const maxIdx = args.indexOf('--max');
    const max = maxIdx >= 0 ? Number(args[maxIdx + 1]) : 200;
    const files = args.filter((x, i) => !(maxIdx >= 0 && (i === maxIdx || i === maxIdx + 1)));
    if (files.length !== 2) {
        console.error('usage: full_save_parity.cjs <headless final_save.json> <player final_save.json> [--max N]');
        process.exit(2);
    }
    const [h, p] = files.map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
    const problems = compareSaves(h, p, max);
    for (const line of problems) console.log(line);
    console.log(`full_save_parity: ${problems.length === 0 ? 'EQUAL' : 'DIFFERS'} outside the live-only allowlist (${problems.length} paths)`);
    process.exit(problems.length === 0 ? 0 : 1);
}
