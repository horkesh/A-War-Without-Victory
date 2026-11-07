/**
 * territory_sweep — one live-equivalent player campaign driven by a JSON strategy file.
 *
 *   node --import tsx tools/ai_play/territory_sweep.ts --strategy <file.json> --out <dir> [--turns 188]
 *
 * Same setup as the player branch of desktop_calibration_compare.ts (production startNewCampaign,
 * production autonomy unless the strategy says otherwise, pause-before-combat answers), but only
 * the player branch runs. Every action the strategy takes is a player action the desktop UI
 * exposes: event responses, historical-operation authorization, paramilitary decisions, peace
 * plans, REQUEST-OP (with the same queryDirectiveObjection pre-check the IPC handler runs),
 * municipality support and reserve (elite) deployment. Nothing writes control, scoring or
 * combat state directly. Deterministic: no RNG, no clock; every choice is a pure function of
 * the state and the strategy file.
 *
 * Outputs <out>/final_save.json, <out>/summary.json and <out>/decisions.jsonl.
 */

import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
    advanceTurn,
    approveReserveRequest,
    queryDirectiveObjection,
    resolveEventDecision,
    resolvePlayerParamilitaryDecisions,
    serializeState,
    startNewCampaign,
} from '../../src/desktop/desktop_sim.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import type { EventDefinition, PendingEventDecision } from '../../src/sim/events/event_types.js';
import { loadEventDefinitionsFromDir } from '../../src/sim/events/event_loader.js';
import { selectBotEventResponse } from '../../src/sim/events/evaluate_events.js';
import { strictCompare } from '../../src/state/validateGameState.js';
import { isHistoricalOperationAuthorizationReview } from '../../src/sim/combat/historical_operation_authorization.js';
import { resolvePeacePlan } from '../../src/sim/negotiation/peace_plans.js';
import { getPeacePlanById } from '../../src/sim/negotiation/peace_plan_data.js';
import { computeFactionVerdict } from '../../src/sim/negotiation/scoring.js';
import { loadOperationalEdges } from '../../src/data/operational_data.js';
import { buildOsidAdjacency } from '../../src/sim/combat/osid_adjacency.js';
// @ts-ignore -- CommonJS staging modules (the same functions the Electron IPC handlers call)
import { stageOpDirective } from '../../src/desktop/op_directive_staging.cjs';
// @ts-ignore
import { stageMunicipalitySupportOrderOnState, SUPPORT_TYPE_BY_FACTION } from '../../src/desktop/municipality_support_staging.cjs';
// @ts-ignore
import { isNonFieldCommandCorps } from '../../src/desktop/field_command.cjs';

type EventMode = 'bot' | 'historical' | 'staff' | 'martial' | `max:${string}` | `min:${string}`;

interface Strategy {
    name: string;
    faction: FactionId;
    decision_mode?: 'historical' | 'emergent';
    autonomy?: 'production' | 0 | 1 | 2 | 3;
    events?: { default?: EventMode; overrides?: Record<string, string> };
    historical_ops?: { default?: 'accept' | 'decline'; decline_match?: string[]; accept_match?: string[] };
    paramilitary?: 'defer' | 'allow' | 'deny';
    /** One answer for every plan, or a per-plan map (plan id -> answer; unlisted plans: historical). */
    peace_plans?: 'historical' | 'reject' | 'accept' | Record<string, 'historical' | 'accept' | 'reject'>;
    request_ops?: {
        enabled: boolean;
        from_turn?: number;
        to_turn?: number;
        /** Max distinct (corps, target) objection queries per turn (cost bound). */
        max_queries_per_turn?: number;
        /** Accept 'delay' recommendations too, not only 'launch'. */
        accept_delay?: boolean;
        min_force_ratio?: number;
        /** Prefer targets in municipalities the player already mostly holds. */
        prefer_consolidation?: boolean;
    };
    /** Explicit priority objectives tried first each turn in their window. */
    priority_targets?: Array<{ osid: string; from_turn?: number; to_turn?: number; corps?: string[] }>;
    /** Accept every non-historical-op proposal review (APPROVE_OP / OPPORTUNITY / SET_STANCE); used with autonomy 1. */
    accept_all_proposals?: boolean;
    local_support?: { enabled: boolean };
    elite_deploy?: { enabled: boolean };
}

interface Args { strategyPath: string; out: string; turns: number }

function parseArgs(argv: string[]): Args {
    const get = (k: string) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
    const strategyPath = get('--strategy');
    const out = get('--out');
    if (!strategyPath || !out) throw new Error('usage: --strategy <file.json> --out <dir> [--turns 188]');
    return { strategyPath, out, turns: Number(get('--turns') ?? '188') };
}

const baseDir = process.cwd();
let catalog: Map<string, EventDefinition> = new Map();

function dimDelta(option: { dimension_shifts?: Array<{ dimension: string; delta: number; faction?: string }> }, faction: string, dim: string): number {
    let total = 0;
    for (const s of option.dimension_shifts ?? []) if (s.dimension === dim && (!s.faction || s.faction === faction)) total += s.delta;
    return total;
}

function chooseResponse(state: GameState, strategy: Strategy, d: PendingEventDecision): string | undefined {
    const override = strategy.events?.overrides?.[d.event_id];
    if (override && d.response_options.some((o) => o.id === override)) return override;
    const mode = strategy.events?.default ?? 'bot';
    if (mode === 'historical') return d.historical_default_response_id ?? d.response_options[0]?.id;
    if (mode === 'staff') return d.staff_recommended_response_id ?? d.historical_default_response_id ?? d.response_options[0]?.id;
    if (mode === 'martial') {
        // Own-side direct military effects of each option (catalog definition), bot answer on ties.
        const def = catalog.get(d.event_id);
        const bot = botResponse(state, d);
        const score = (id: string | undefined): number => {
            const o: any = def?.response_options?.find((x) => x.id === id);
            if (!o) return -Infinity;
            let v = 0;
            for (const e of (o.effects ?? []) as any[]) {
                if (e.faction && e.faction !== d.faction) continue;
                if (e.kind === 'morale_change' || e.kind === 'cohesion_change' || e.kind === 'supply_delta') v += Number(e.delta ?? 0);
                if (e.kind === 'recruitment_modifier') v += (Number(e.pool_multiplier ?? 1) - 1) * 20;
            }
            return v;
        };
        let best = bot; let bestVal = score(bot);
        for (const o of d.response_options) { const v = score(o.id); if (v > bestVal) { bestVal = v; best = o.id; } }
        return best;
    }
    if (mode.startsWith('max:') || mode.startsWith('min:')) {
        const dim = mode.slice(4);
        const sign = mode.startsWith('max:') ? 1 : -1;
        const bot = botResponse(state, d);
        let best: string | undefined = bot;
        let bestVal = bot ? sign * dimDelta(d.response_options.find((o) => o.id === bot) ?? {}, d.faction, dim) : -Infinity;
        for (const o of d.response_options) {
            const v = sign * dimDelta(o, d.faction, dim);
            if (v > bestVal) { bestVal = v; best = o.id; }
        }
        return best;
    }
    return botResponse(state, d);
}

function botResponse(state: GameState, d: PendingEventDecision): string | undefined {
    const def = catalog.get(d.event_id);
    if (!def || !def.response_options?.length) return d.historical_default_response_id ?? d.response_options[0]?.id;
    return selectBotEventResponse(state, def, d.faction, false).chosen.id;
}

async function logLine(out: string, row: unknown) {
    await appendFile(resolve(out, 'decisions.jsonl'), JSON.stringify(row) + '\n', 'utf8');
}

const seenEvents = new Set<string>();

async function answerEvents(state: GameState, strategy: Strategy, out: string, decisions?: readonly PendingEventDecision[]) {
    const f = strategy.faction;
    const pending = decisions
        ? decisions.filter((d) => d.faction === f)
        : [...(state.military.pending_event_decisions ?? [])].filter((d) => d.faction === f)
            .sort((a, b) => strictCompare(a.event_id, b.event_id));
    for (const d of pending) {
        const responseId = chooseResponse(state, strategy, d);
        if (!seenEvents.has(d.event_id)) {
            seenEvents.add(d.event_id);
            await logLine(out, {
                turn: state.meta.turn, kind: 'event_catalog', event_id: d.event_id,
                historical_default: d.historical_default_response_id ?? null,
                bot: botResponse(state, d) ?? null,
                options: d.response_options.map((o) => ({ id: o.id, dims: o.dimension_shifts ?? [] })),
            });
        }
        if (!responseId) continue;
        resolveEventDecision(state, d.event_id, responseId);
        await logLine(out, { turn: state.meta.turn, kind: 'event', event_id: d.event_id, response: responseId });
    }
}

function opName(action: string | undefined): string { return action ?? ''; }

async function answerHistoricalOps(state: GameState, strategy: Strategy, out: string) {
    const f = strategy.faction;
    const reviews = [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((r) => r.faction === f && isHistoricalOperationAuthorizationReview(r))
        .filter((r) => r.accepted == null && r.resolved_turn == null)
        .sort((a, b) => strictCompare(a.id, b.id));
    const cfg = strategy.historical_ops ?? {};
    for (const r of reviews) {
        const name = opName(r.proposed_action);
        let accept = (cfg.default ?? 'accept') === 'accept';
        if (cfg.decline_match?.some((m) => name.includes(m))) accept = false;
        if (cfg.accept_match?.some((m) => name.includes(m))) accept = true;
        r.accepted = accept;
        r.resolved_turn = state.meta.turn;
        await logLine(out, { turn: state.meta.turn, kind: 'historical_op', id: r.id, action: name, accepted: accept });
    }
}

/** Mirrors electron-main.cjs accept-proposal: mark accepted, apply SET_STANCE / APPROVE_OP side fields. */
async function acceptProposals(state: GameState, strategy: Strategy, out: string) {
    if (!strategy.accept_all_proposals) return;
    const reviews = [...(state.meta.pending_proposal_reviews ?? [])]
        .filter((r: any) => r.faction === strategy.faction && !isHistoricalOperationAuthorizationReview(r))
        .filter((r: any) => r.accepted == null && r.resolved_turn == null)
        .sort((a: any, b: any) => strictCompare(a.id, b.id));
    for (const r of reviews as any[]) {
        r.accepted = true;
        r.resolved_turn = state.meta.turn;
        const action: string = r.proposed_action ?? '';
        if (action.startsWith('SET_STANCE:')) {
            const [, corpsId, stance] = action.split(':');
            const cc: any = state.military.corps_command?.[corpsId!];
            if (cc) { cc.stance = stance; cc.player_ordered_stance = stance; }
        } else if (action.startsWith('APPROVE_OP:')) {
            const [, corpsId, planId] = action.split(':');
            const cc: any = state.military.corps_command?.[corpsId!];
            if (cc) cc.player_op_response = { plan_id: planId, approved: true, turn: state.meta.turn };
        }
        await logLine(out, { turn: state.meta.turn, kind: 'proposal', id: r.id, action });
    }
}

function answerParamilitary(state: GameState, strategy: Strategy) {
    const policy = strategy.paramilitary ?? 'defer';
    if (policy === 'defer') return;
    let any = false;
    for (const req of [...(state.pending_paramilitary_requests ?? [])]
        .filter((r) => r.faction === strategy.faction && r.decision == null)
        .sort((a, b) => strictCompare(a.target_osid, b.target_osid))) {
        req.decision = policy;
        any = true;
    }
    if (any) resolvePlayerParamilitaryDecisions(state);
}

async function answerPeacePlan(state: GameState, strategy: Strategy, out: string) {
    const pending = state.military.negotiation?.pending_peace_plan;
    if (!pending) return;
    const f = strategy.faction;
    if (f === 'RBiH' && (pending.plan_id === 'vance_owen' || pending.plan_id === 'owen_stoltenberg')) return;
    const cfg = strategy.peace_plans ?? 'historical';
    const mode = typeof cfg === 'string' ? cfg : (cfg[pending.plan_id] ?? 'historical');
    const plan = getPeacePlanById(pending.plan_id);
    const response = mode === 'historical' ? plan?.historical_responses[f] : mode === 'accept' ? 'accepted' : 'rejected';
    if (!response) return;
    resolvePeacePlan(state, pending.plan_id, response);
    await logLine(out, { turn: state.meta.turn, kind: 'peace_plan', plan: pending.plan_id, response });
}

let adjacency: Map<string, string[]> | null = null;

function munOf(osid: string): string { return osid.split(':')[1] ?? ''; }

async function requestOps(state: GameState, strategy: Strategy, out: string) {
    const cfg = strategy.request_ops;
    const turn = state.meta.turn;
    const f = strategy.faction;
    const priority = (strategy.priority_targets ?? []).filter((p) => turn >= (p.from_turn ?? 0) && turn <= (p.to_turn ?? 9999));
    if (!cfg?.enabled && priority.length === 0) return;
    if (cfg?.enabled && (turn < (cfg.from_turn ?? 0) || turn > (cfg.to_turn ?? 9999)) && priority.length === 0) return;
    if (!adjacency) adjacency = buildOsidAdjacency(await loadOperationalEdges(baseDir)) as Map<string, string[]>;
    const ctrl = state.political.political_controllers ?? {};
    const formations = state.military.formations ?? {};
    const corpsIds = Object.keys(state.military.corps_command ?? {})
        .filter((id) => formations[id]?.faction === f && !isNonFieldCommandCorps(state, id))
        .sort(strictCompare);

    // Per-corps frontier: enemy-held OSIDs adjacent to that corps' brigade locations.
    const munShare = new Map<string, { own: number; total: number }>();
    for (const [osid, c] of Object.entries(ctrl)) {
        const m = munOf(osid); const e = munShare.get(m) ?? { own: 0, total: 0 };
        e.total += 1; if (c === f) e.own += 1; munShare.set(m, e);
    }
    const candidates: Array<{ corps: string; target: string; score: number }> = [];
    for (const corps of corpsIds) {
        const locs = new Set<string>();
        for (const fm of Object.values(formations)) {
            if (fm.faction === f && fm.kind === 'brigade' && fm.status === 'active' && fm.corps_id === corps && fm.location_osid) locs.add(fm.location_osid);
        }
        const targets = new Set<string>();
        for (const loc of locs) for (const n of adjacency.get(loc) ?? []) if (ctrl[n] && ctrl[n] !== f) targets.add(n);
        for (const t of targets) {
            const ms = munShare.get(munOf(t)) ?? { own: 0, total: 1 };
            const score = cfg?.prefer_consolidation ? ms.own / ms.total : 0;
            candidates.push({ corps, target: t, score });
        }
    }
    candidates.sort((a, b) => (b.score - a.score) || strictCompare(a.target, b.target) || strictCompare(a.corps, b.corps));

    const ordered: Array<{ corps: string; target: string }> = [];
    for (const p of priority) {
        if (ctrl[p.osid] === f) continue;
        for (const corps of (p.corps ?? corpsIds)) ordered.push({ corps, target: p.osid });
    }
    if (cfg?.enabled && turn >= (cfg.from_turn ?? 0) && turn <= (cfg.to_turn ?? 9999)) ordered.push(...candidates);

    const maxQueries = cfg?.max_queries_per_turn ?? 12;
    let queries = 0;
    const usedCorps = new Set<string>();
    const usedTargets = new Set<string>();
    for (const { corps, target } of ordered) {
        if (queries >= maxQueries) break;
        const ca = state.military.command_authority;
        if (ca && ca.current < 25) break;
        if (usedCorps.has(corps) || usedTargets.has(target)) continue;
        if (state.military.corps_command?.[corps]?.pending_op_directive) { usedCorps.add(corps); continue; }
        queries += 1;
        const objection = await queryDirectiveObjection(state, { corpsId: corps, targetOsid: target }, baseDir);
        if (objection.rejectionReason) continue;
        const okAction = objection.recommendedAction === 'launch' || (cfg?.accept_delay && objection.recommendedAction === 'delay');
        if (!okAction || objection.forceRatio < (cfg?.min_force_ratio ?? 0)) continue;
        // As in the UI: confirming past a shown objection (anything but 'launch') is a forced
        // launch, which the engine tags and records as a presidential override on the CO.
        const forced = objection.recommendedAction !== 'launch';
        const result = stageOpDirective(state, { corpsId: corps, targetOsid: target, ...(forced ? { forced_over_objection: true } : {}) }, {});
        if (result.ok) {
            usedCorps.add(corps); usedTargets.add(target);
            await logLine(out, { turn, kind: 'request_op', corps, target, force_ratio: objection.forceRatio, action: objection.recommendedAction });
        }
    }
}

function localSupport(state: GameState, strategy: Strategy) {
    if (!strategy.local_support?.enabled) return;
    const f = strategy.faction;
    // Most-contested municipality with a player militia pool: the one where the player holds
    // the most cells while not holding all of them (front consolidation).
    const ctrl = state.political.political_controllers ?? {};
    const share = new Map<string, { own: number; total: number }>();
    for (const [osid, c] of Object.entries(ctrl)) {
        const m = munOf(osid); const e = share.get(m) ?? { own: 0, total: 0 };
        e.total += 1; if (c === f) e.own += 1; share.set(m, e);
    }
    const pools = new Set(Object.values(state.military.militia_pools ?? {}).filter((p: any) => p?.faction === f).map((p: any) => p.mun_id as string));
    const ranked = [...share.entries()].filter(([m, s]) => pools.has(m) && s.own > 0 && s.own < s.total)
        .sort((a, b) => (b[1].total - b[1].own) - (a[1].total - a[1].own) || strictCompare(a[0], b[0]));
    const pick = ranked[0]?.[0];
    if (!pick) return;
    stageMunicipalitySupportOrderOnState(state, { faction: f, munId: pick, type: SUPPORT_TYPE_BY_FACTION[f] });
}

async function eliteDeploy(state: GameState, strategy: Strategy, out: string) {
    if (!strategy.elite_deploy?.enabled) return;
    const f = strategy.faction;
    const reqs = [...(state.military.pending_reserve_requests ?? [])].filter((r: any) => r.faction === f || state.military.formations?.[r.corps_id]?.faction === f);
    if (reqs.length === 0) return;
    const elites = Object.values(state.military.formations ?? {})
        .filter((fm: any) => fm.faction === f && fm.elite_loan_state && !fm.elite_loan_state.on_loan && !fm.elite_loan_state.permanently_degraded)
        .map((fm: any) => fm.id as string).sort(strictCompare);
    for (const r of reqs as any[]) {
        const rid = r.request_id ?? r.id;
        for (const b of elites) {
            const res = await approveReserveRequest(state, rid, b, 'territory_sweep', baseDir);
            if (res.ok) { await logLine(out, { turn: state.meta.turn, kind: 'elite_deploy', request: rid, brigade: b }); elites.splice(elites.indexOf(b), 1); break; }
        }
    }
}

function territory(state: GameState) {
    const counts: Record<string, number> = {};
    for (const c of Object.values(state.political.political_controllers ?? {})) if (typeof c === 'string') counts[c] = (counts[c] ?? 0) + 1;
    const pct: Record<string, number> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) pct[f] = state.military.negotiation?.capital?.[f]?.territory_controlled_pct ?? 0;
    return { osid_counts: counts, area_pct: pct };
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    const strategy = JSON.parse(await readFile(args.strategyPath, 'utf8')) as Strategy;
    await mkdir(args.out, { recursive: true });
    await writeFile(resolve(args.out, 'decisions.jsonl'), '', 'utf8');
    catalog = new Map(loadEventDefinitionsFromDir(0, resolve(baseDir, 'data/scenarios/events')).map((d) => [d.id, d]));

    let state = (await startNewCampaign(baseDir, strategy.faction as 'RBiH' | 'RS' | 'HRHB', 'apr_1992', strategy.decision_mode ?? 'historical')).state;
    const autonomy = strategy.autonomy ?? 'production';
    if (autonomy !== 'production') state.meta.autonomy_level = autonomy;

    const trajectory: unknown[] = [];
    const peak: Record<string, { area_pct: number; osids: number; turn: number }> = {};
    for (let i = 0; i < args.turns; i += 1) {
        await answerEvents(state, strategy, args.out);
        await answerPeacePlan(state, strategy, args.out);
        await answerHistoricalOps(state, strategy, args.out);
        answerParamilitary(state, strategy);
        await acceptProposals(state, strategy, args.out);
        await requestOps(state, strategy, args.out);
        localSupport(state, strategy);
        await eliteDeploy(state, strategy, args.out);
        const pendingAnswers: Array<Promise<void>> = [];
        const result = await advanceTurn(state, baseDir, {
            onPlayerDecisionsPending: (working, decisions) => {
                // Answered synchronously inside the turn (resolveEventDecision is sync); the log
                // write is queued and awaited after the turn.
                const f = strategy.faction;
                for (const d of decisions.filter((x) => x.faction === f)) {
                    const responseId = chooseResponse(working, strategy, d);
                    if (!seenEvents.has(d.event_id)) {
                        seenEvents.add(d.event_id);
                        pendingAnswers.push(logLine(args.out, {
                            turn: working.meta.turn, kind: 'event_catalog', event_id: d.event_id,
                            historical_default: d.historical_default_response_id ?? null,
                            bot: botResponse(working, d) ?? null,
                            options: d.response_options.map((o) => ({ id: o.id, dims: o.dimension_shifts ?? [] })),
                        }));
                    }
                    if (!responseId) continue;
                    resolveEventDecision(working, d.event_id, responseId);
                    pendingAnswers.push(logLine(args.out, { turn: working.meta.turn, kind: 'event', event_id: d.event_id, response: responseId, stage: 'paused_turn' }));
                }
            },
        });
        await Promise.all(pendingAnswers);
        if (result.error) throw new Error(`advance failed at turn ${state.meta.turn}: ${result.error}`);
        state = result.state;
        const now = territory(state);
        for (const f of ['RBiH', 'RS', 'HRHB']) {
            if (!peak[f] || now.area_pct[f] > peak[f].area_pct) peak[f] = { area_pct: now.area_pct[f], osids: now.osid_counts[f] ?? 0, turn: state.meta.turn };
        }
        if (state.meta.turn % 4 === 0 || i === args.turns - 1) {
            const t = now;
            trajectory.push({ turn: state.meta.turn, ...t, ca: state.military.command_authority?.current ?? null });
        }
        if (state.meta.game_over) break;
    }

    await writeFile(resolve(args.out, 'final_save.json'), serializeState(state), 'utf8');
    const verdicts: Record<string, unknown> = {};
    for (const f of ['RBiH', 'RS', 'HRHB']) {
        const v = computeFactionVerdict(state, f);
        const l = state.military.casualty_ledger?.[f];
        verdicts[f] = {
            grade: v.grade, pyrrhic_score: v.pyrrhic_score, outcome_class: v.outcome_class,
            condemnation_flags: v.condemnation_flags, description: v.grade_description,
            internal_cohesion: state.military.negotiation?.strategic_dimensions?.[f]?.internal_cohesion?.effective_value ?? null,
            casualties: l ? (l.killed ?? 0) + (l.wounded ?? 0) + (l.missing_captured ?? 0) : null,
        };
    }
    const summary = { strategy: strategy.name, faction: strategy.faction, final_turn: state.meta.turn, game_over: state.meta.game_over ?? false, outcome: state.meta.outcome ?? null, ...territory(state), peak, verdicts, trajectory };
    await writeFile(resolve(args.out, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    const t = territory(state);
    console.log(`${strategy.name} ${strategy.faction}: area ${t.area_pct[strategy.faction].toFixed(2)}% osids ${t.osid_counts[strategy.faction]} grade ${(verdicts[strategy.faction] as any).grade}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
