/**
 * RBiH "best achievable outcome" exploration — runs several distinct presidential
 * strategies through the full 188-week war via the real desktop sim pipeline (not
 * headless scenario_runner — this uses the same player-decision seam Electron IPC
 * uses, ported onto tools/ai_play/president_playthrough.ts per the 2026-08-05
 * Pyrrhic panel review's recommendation instead of driving it through
 * Electron/Playwright again).
 *
 * Each strategy is a full, real, deterministic campaign. Compares final territory,
 * casualties, and the engine's own endgame verdict/historical_comparison across
 * strategies to find which comes closest to (or exceeds) the historical RBiH/
 * Federation outcome, and writes a findings log as it goes.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/ai_play/run_rbih_best_outcome.ts
 */
import { writeFileSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
    startCampaign, advance, serializeDecisionContext, injectDecision, stateHash,
    requestOp, stopOp, replaceCo, forceLaunch, eliteDeploy, localSupport,
    resolvePeacePlanChoice, resolveParamilitary, resolveDayton, blockingDecisions,
    resolveProposal, pendingProposals, REPO_BASE_DIR,
    type DecisionLogEntry,
} from './president_playthrough.js';
import type { GameState, FactionId } from '../../src/state/game_state.js';
import type { DaytonProposal } from '../../src/state/negotiation_types.js';

const FACTION: FactionId = 'RBiH';
const TURN_CAP = 200; // safety margin past 188w
const OUT_DIR = 'C:/Users/User/AppData/Local/Temp/claude/F--A-War-Without-Victory/9734fb27-cf65-4213-8371-96c33f5cb07e/scratchpad/rbih_best_outcome_run';
mkdirSync(OUT_DIR, { recursive: true });
const LOG_PATH = join(OUT_DIR, 'log.jsonl');
const SUMMARY_PATH = join(OUT_DIR, 'SUMMARY.md');

let logTurnCounter = 0;
function log(entry: Record<string, unknown>) {
    appendFileSync(LOG_PATH, JSON.stringify({ seq: logTurnCounter++, ...entry }) + '\n');
}

// ── Territorial-package IDs (src/sim/negotiation/territorial_packages.ts) ──────
const ALL_PACKAGES = [
    'gorazde_corridor', 'brcko_district', 'posavina_pocket', 'sarajevo_suburbs',
    'western_bosnia', 'mostar', 'central_bosnia', 'srebrenica_area',
];

// ── Institutional-package IDs (src/sim/negotiation/institutional_packages.ts) ──
// NOT the same list as ALL_PACKAGES above — dayton_negotiation.ts resolves
// institutional_choices by these six keys only; using territorial IDs here
// silently no-ops the resolver (found by Gameplay Programmer, panel review 2026-08-06).
const INSTITUTIONAL_PACKAGES = ['military', 'presidency', 'police', 'judiciary', 'economy', 'education'] as const;

interface Strategy {
    name: string;
    description: string;
    /** Political decision choice for a pending event decision. */
    chooseResponse: (d: any) => string;
    /** Whether to raise autonomy_level so RBiH's own corps AI proposes ops. */
    autonomyLevel: 0 | 1;
    /** Accept every HISTORICAL_OP: pre-planned-operation authorization review. */
    acceptHistoricalOps: boolean;
    /** Force-launch every APPROVE_OP: proposal seen. */
    forceLaunchProposals: boolean;
    /** Fire REQUEST-OP toward non-RBiH OSIDs every turn CA allows. */
    requestOpAggressive: boolean;
    /** Attempt REPLACE-CO opportunistically. */
    replaceCoAggressive: boolean;
    /** Paramilitary policy. */
    paramilitaryDecision: 'allow' | 'deny';
    /** Peace-plan policy: always reject, or accept once a turn threshold passes. */
    peacePlanPolicy: (turn: number) => 'accepted' | 'rejected';
    /** Dayton proposal to submit. */
    buildDaytonProposal: () => DaytonProposal;
}

const STRATEGIES: Strategy[] = [
    {
        name: 'baseline_historical',
        description: 'Control: always pick the historical-default option; no presidential levers fired at all; autonomy_level stays 0 (bot corps AI does not act for the player, matching how the RS run accidentally behaved, kept here deliberately as the true baseline).',
        chooseResponse: (d) => d.historical_default_response_id ?? d.response_options?.[0]?.id,
        autonomyLevel: 0,
        acceptHistoricalOps: false,
        forceLaunchProposals: false,
        requestOpAggressive: false,
        replaceCoAggressive: false,
        paramilitaryDecision: 'deny',
        peacePlanPolicy: () => 'rejected',
        buildDaytonProposal: () => ({ territorial_demands: [], territorial_concessions: [], institutional_choices: {} }),
    },
    {
        name: 'maximal_activist',
        description: 'Counterfactual political choices where offered, autonomy_level=1 (corps AI free to propose), accept every historical pre-planned op, force-launch every proposal, REQUEST-OP toward non-RBiH territory every turn CA allows, opportunistic REPLACE-CO, deny paramilitaries, reject peace plans throughout, maximal Dayton demand (all 8 packages, concede nothing, centralized institutions).',
        chooseResponse: (d) => {
            const options = d.response_options ?? [];
            const counterfactual = options.find((o: any) => o.historical_marker === 'counterfactual');
            if (counterfactual) return counterfactual.id;
            const nonDefault = options.find((o: any) => o.id !== d.historical_default_response_id);
            return nonDefault?.id ?? options[0]?.id;
        },
        autonomyLevel: 1,
        acceptHistoricalOps: true,
        forceLaunchProposals: true,
        requestOpAggressive: true,
        replaceCoAggressive: true,
        paramilitaryDecision: 'deny',
        peacePlanPolicy: () => 'rejected',
        buildDaytonProposal: () => ({
            territorial_demands: [...ALL_PACKAGES],
            territorial_concessions: [],
            institutional_choices: Object.fromEntries(INSTITUTIONAL_PACKAGES.map((p) => [p, 'centralized' as const])),
        }),
    },
    {
        name: 'faithful_activist',
        description: 'Historical-default political choices throughout (RBiH\'s real diplomatic/political path was comparatively successful — test whether that plus maximal MILITARY activism beats pure counterfactual defiance), autonomy_level=1, accept historical ops, force-launch proposals, REQUEST-OP aggressive, REPLACE-CO aggressive, deny paramilitaries, accept peace plans once offered (bank gains via negotiation rather than always refusing), moderate Dayton demand (only packages not already RBiH-held by default, concede nothing).',
        chooseResponse: (d) => d.staff_recommended_response_id ?? d.historical_default_response_id ?? d.response_options?.[0]?.id,
        autonomyLevel: 1,
        acceptHistoricalOps: true,
        forceLaunchProposals: true,
        requestOpAggressive: true,
        replaceCoAggressive: true,
        paramilitaryDecision: 'deny',
        peacePlanPolicy: (turn) => (turn > 20 ? 'accepted' : 'rejected'),
        buildDaytonProposal: () => ({
            territorial_demands: ALL_PACKAGES.filter((p) => p !== 'central_bosnia' && p !== 'western_bosnia'),
            territorial_concessions: [],
            institutional_choices: Object.fromEntries(INSTITUTIONAL_PACKAGES.map((p) => [p, 'centralized' as const])),
        }),
    },
    {
        name: 'lever_isolated',
        description: 'Isolates the presidential LEVER contribution from autonomy/historical-ops: autonomy_level=1 (so historical corps AI proposals still fire, matching the other arms), accept historical pre-planned ops, but NO presidential levers are ever fired (no force-launch, no REQUEST-OP, no REPLACE-CO), historical-default political choices, reject peace plans, deny paramilitaries, and no Dayton counter-demand (accept as offered). Delta between this arm and maximal_activist/faithful_activist attributes territorial change to the levers specifically.',
        chooseResponse: (d) => d.historical_default_response_id ?? d.response_options?.[0]?.id,
        autonomyLevel: 1,
        acceptHistoricalOps: true,
        forceLaunchProposals: false,
        requestOpAggressive: false,
        replaceCoAggressive: false,
        paramilitaryDecision: 'deny',
        peacePlanPolicy: () => 'rejected',
        buildDaytonProposal: () => ({ territorial_demands: [], territorial_concessions: [], institutional_choices: {} }),
    },
];

function countRsTerritory(state: GameState, faction: string) {
    const pc = (state as any)?.political?.political_controllers ?? {};
    let n = 0, total = 0;
    for (const k of Object.keys(pc)) { total++; if (pc[k] === faction) n++; }
    return { n, total };
}

async function runStrategy(strategy: Strategy): Promise<Record<string, unknown>> {
    log({ type: 'strategy_start', name: strategy.name, description: strategy.description });
    let state = await startCampaign(FACTION);
    if (state.meta) (state.meta as any).autonomy_level = strategy.autonomyLevel;

    // Local to this strategy run so campaigns run in the same process (e.g. main()'s
    // loop over STRATEGIES) don't bleed REQUEST-OP targeting state into each other.
    let requestOpCursor = 0;
    const decisionLog: DecisionLogEntry[] = [];
    let turnsRun = 0;
    // proposalsAccepted counts APPROVE_OP: proposal acceptances (the resolveProposal
    // call), NOT actual force-launch lever invocations — there is no separate
    // force-launch lever fired in this loop, so keep the name honest about what's measured.
    let leverAttempts = { requestOp: 0, requestOpOk: 0, replaceCo: 0, replaceCoOk: 0, proposalsAccepted: 0, proposalsAcceptedOk: 0, historicalOpsAccepted: 0 };

    for (let i = 0; i < TURN_CAP; i++) {
        if ((state.meta as any)?.game_over) {
            log({ type: 'game_over', turn: state.meta?.turn, strategy: strategy.name });
            break;
        }

        // 1. Resolve pending event decisions for the player faction.
        const pending = ((state.military as any)?.pending_event_decisions ?? []).filter((d: any) => d.faction === FACTION);
        for (const d of pending) {
            const responseId = strategy.chooseResponse(d);
            if (!responseId) continue;
            const entry = injectDecision(state, d.event_id, responseId);
            decisionLog.push(entry);
            log({ type: 'decision', turn: entry.turn, eventId: entry.eventId, chosen: entry.responseId, diverged: entry.diverged_from_historical, strategy: strategy.name });
        }

        // 2. Accept HISTORICAL_OP: pre-planned operation authorizations (the exact gate
        //    the RS run missed) and, if configured, force-launch APPROVE_OP proposals.
        if (strategy.acceptHistoricalOps) {
            for (const p of pendingProposals(state, 'HISTORICAL_OP:')) {
                const r = resolveProposal(state, p.proposal_id ?? p.id, true);
                if (r.ok) leverAttempts.historicalOpsAccepted++;
            }
        }
        if (strategy.forceLaunchProposals) {
            for (const p of pendingProposals(state, 'APPROVE_OP:')) {
                leverAttempts.proposalsAccepted++;
                const r = resolveProposal(state, p.proposal_id ?? p.id, true);
                if (r.ok) leverAttempts.proposalsAcceptedOk++;
            }
        }

        // 3. Peace plan.
        const planId = ((state.military as any)?.negotiation?.pending_peace_plan)?.plan_id;
        if (planId) {
            const response = strategy.peacePlanPolicy(state.meta?.turn ?? 0);
            resolvePeacePlanChoice(state, planId, response);
            log({ type: 'peace_plan', turn: state.meta?.turn, planId, response, strategy: strategy.name });
        }

        // 4. Paramilitary requests.
        const paraReqs = ((state as any).pending_paramilitary_requests ?? []).filter((r: any) => r.faction === FACTION);
        if (paraReqs.length > 0) {
            const decisions: Record<string, 'allow' | 'deny'> = {};
            for (const r of paraReqs) decisions[r.target_osid] = strategy.paramilitaryDecision;
            resolveParamilitary(state, decisions);
        }

        // 5. REQUEST-OP / REPLACE-CO levers.
        const corpsIds = Object.keys((state.military as any)?.corps_command ?? {}).filter(
            (id) => (state.military as any)?.formations?.[id]?.faction === FACTION,
        ).sort();
        const pc = (state as any)?.political?.political_controllers ?? {};
        const nonOwnIds = Object.keys(pc).filter((id) => pc[id] && pc[id] !== FACTION).sort();

        if (strategy.requestOpAggressive && nonOwnIds.length > 0) {
            for (const corpsId of corpsIds) {
                const cc = (state.military as any).corps_command[corpsId];
                if (cc.pending_op_directive) continue;
                const target = nonOwnIds[requestOpCursor % nonOwnIds.length];
                requestOpCursor++;
                leverAttempts.requestOp++;
                const r = requestOp(state, corpsId, target);
                if (r.ok) leverAttempts.requestOpOk++;
                else if (/insufficient_command_authority/.test(String(r.error ?? ''))) break;
            }
        }
        if (strategy.replaceCoAggressive) {
            for (const corpsId of corpsIds) {
                const cc = (state.military as any).corps_command[corpsId];
                if (cc.pending_co_replacement) continue;
                leverAttempts.replaceCo++;
                const r = replaceCo(state, corpsId);
                if (r.ok) leverAttempts.replaceCoOk++;
                if (/insufficient_command_authority/.test(String(r.error ?? ''))) break;
            }
        }

        // 6. Dayton.
        if ((state.military as any)?.negotiation?.pending_dayton) {
            const proposal = strategy.buildDaytonProposal();
            const { result, state: roundTripped } = resolveDayton(state, proposal);
            state = roundTripped;
            log({ type: 'dayton', turn: state.meta?.turn, proposal, result, strategy: strategy.name });
        }

        // 7. Advance, retrying through any remaining blocked decision defensively.
        let advanced = false;
        for (let guard = 0; guard < 5 && !advanced; guard++) {
            try {
                state = await advance(state, REPO_BASE_DIR);
                advanced = true;
            } catch (e) {
                const blocked = blockingDecisions(state, FACTION);
                if (blocked.length === 0) { log({ type: 'advance_error_unblocked', strategy: strategy.name, error: String(e) }); break; }
                for (const bd of blocked as any[]) {
                    if (bd.family_id === 'event_decision') {
                        const d = ((state.military as any)?.pending_event_decisions ?? []).find((x: any) => x.event_id === bd.event_id);
                        if (d) injectDecision(state, d.event_id, strategy.chooseResponse(d));
                    }
                }
            }
        }
        if (!advanced) { log({ type: 'stuck_abort', turn: state.meta?.turn, strategy: strategy.name }); break; }
        turnsRun++;

        if (i % 20 === 0) {
            const territory = countRsTerritory(state, FACTION);
            log({ type: 'progress', turn: state.meta?.turn, territory, leverAttempts: { ...leverAttempts }, strategy: strategy.name });
        }
    }

    const finalTerritory = countRsTerritory(state, FACTION);
    const verdict = (state.meta as any)?.endgame_snapshot?.verdict;
    const summary = {
        strategy: strategy.name,
        finalTurn: state.meta?.turn,
        gameOver: (state.meta as any)?.game_over ?? false,
        finalStateHash: stateHash(state),
        territory: finalTerritory,
        leverAttempts,
        decisionsResolved: decisionLog.length,
        decisionsDiverged: decisionLog.filter((d) => d.diverged_from_historical).length,
        rbihGrade: verdict?.faction_verdicts?.[FACTION]?.grade,
        rbihOutcomeClass: verdict?.faction_verdicts?.[FACTION]?.outcome_class,
        rbihCapital: verdict?.faction_verdicts?.[FACTION]?.capital_breakdown,
        historicalComparison: verdict?.historical_comparison,
        daytonResult: verdict?.dayton_result,
    };
    log({ type: 'strategy_complete', ...summary });
    writeFileSync(join(OUT_DIR, `final_state_${strategy.name}.json`), JSON.stringify(state, null, 2));
    return summary;
}

async function main() {
    const results: Record<string, unknown>[] = [];
    for (const strategy of STRATEGIES) {
        console.log(`\n=== Running strategy: ${strategy.name} ===`);
        const t0 = Date.now();
        const summary = await runStrategy(strategy);
        console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s:`, JSON.stringify(summary, null, 2).slice(0, 2000));
        results.push(summary);
    }
    writeFileSync(join(OUT_DIR, 'all_results.json'), JSON.stringify(results, null, 2));
    console.log('\nALL STRATEGIES COMPLETE. Results at', OUT_DIR);
}

main().catch((e) => { console.error('FATAL', e); process.exitCode = 1; });
