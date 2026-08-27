/**
 * Headless playthrough driver.
 *
 * Plays a full campaign through the REAL player-decision seam — the same
 * `resolveEventDecision` / `advanceTurn` path the Electron IPC handlers call —
 * with a swappable policy, running the probe set every turn and recording every
 * finding.
 *
 * WHAT THIS LANE CAN AND CANNOT SEE
 *   CAN: engine defects, malformed event data, dead levers, deadlocks, missing
 *        player-facing text, turn cost, resource-economy failures.
 *   CANNOT: anything about the actual UI — layout, clipping, discoverability,
 *        whether a value is even rendered. Most *friction* is UI friction. This
 *        driver is the cheap, high-volume half; `run_electron.ts` is the other
 *        half and neither substitutes for the other.
 *
 * RECORD-ONLY. This lane never edits engine source.
 *
 * Usage:
 *   node node_modules/tsx/dist/cli.mjs tools/playtest/run_headless.ts \
 *     --faction RS --policy counterfactual --turns 188
 *
 *   --faction   RBiH | RS | HRHB              (default RBiH)
 *   --policy    historical | counterfactual | staff | passive | seeded:<n>
 *   --turns     N                             (default 188)
 *   --out       output dir                    (default tmp-playtest/<runId>)
 *   --run-id    stable id for the ledger      (default <faction>-<policy>-<turns>w)
 *   --turn-budget-ms  turn-time budget        (default 4000)
 *   --no-ledger       write the run log but leave the shared ledger untouched
 *   --skip-probe <id> (repeatable)
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    startCampaign,
    advance,
    serializeDecisionContext,
    injectDecision,
    stateHash,
    requestOp,
    stopOp,
    replaceCo,
    forceLaunch,
    localSupport,
    resolvePeacePlanChoice,
    resolveParamilitary,
    resolveDayton,
    resolveProposal,
    blockingDecisions,
    REPO_BASE_DIR,
    type DecisionLogEntry,
} from '../ai_play/president_playthrough.js';
import type { DesktopScenarioKey } from '../../src/desktop/desktop_sim.js';
import type { FactionId, GameState } from '../../src/state/game_state.js';
import { FindingsRecorder } from './findings.js';
// @ts-ignore -- cost ledger is engine-internal; read defensively for reporting only.
import { buildCostLedger } from '../../src/sim/endgame/cost_ledger.js';
import { resolvePolicy } from './policies.js';
import { defaultProbes } from './probes.js';
import type { DecisionChoice, LeverProbeContext, Probe, RunConfig } from './types.js';

/**
 * The desktop campaign has exactly ONE start — `DesktopScenarioKey` is a
 * single-member union (src/desktop/desktop_sim.ts). There is deliberately no
 * `--scenario` flag: the retired `apr1992_definitive_{40,52,104}w.json` files
 * belong to the scenario-runner pipeline, which this harness does not use.
 */
const DESKTOP_SCENARIO: DesktopScenarioKey = 'apr_1992';

/**
 * The full war. Anything shorter is a BUILD-LOOP run, not a findings run: the
 * late-war window (Srebrenica, Storm, Deliberate Force, Dayton) is where attrition
 * compounds and where most defects surface, so a short run that finds nothing has
 * proved nothing. Mirrors the repo's standing "40w GO is a false-green" rule.
 */
const FULL_CAMPAIGN_TURNS = 188;

const LEDGER_PATH = join(REPO_BASE_DIR, 'docs/40_reports/playtests/findings/FINDINGS.jsonl');

// ── CLI ──────────────────────────────────────────────────────────────────────

function arg(name: string, fallback?: string): string | undefined {
    const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
    if (!hit) return fallback;
    if (hit.includes('=')) return hit.slice(hit.indexOf('=') + 1);
    const idx = process.argv.indexOf(hit);
    return process.argv[idx + 1] ?? fallback;
}
function flag(name: string): boolean {
    return process.argv.includes(`--${name}`);
}
function repeatedArg(name: string): string[] {
    const out: string[] = [];
    for (let i = 0; i < process.argv.length; i++) {
        if (process.argv[i] === `--${name}` && process.argv[i + 1]) out.push(process.argv[i + 1]);
        else if (process.argv[i].startsWith(`--${name}=`)) out.push(process.argv[i].slice(name.length + 3));
    }
    return out;
}

function buildConfig(): RunConfig {
    const faction = (arg('faction', 'RBiH') as FactionId) ?? 'RBiH';
    const policyId = arg('policy', 'historical')!;
    const turns = Number(arg('turns', String(FULL_CAMPAIGN_TURNS)));
    const runId = arg('run-id') ?? `${faction}-${policyId.replace(':', '')}-${turns}w`;
    return {
        runId,
        faction,
        policyId,
        turns,
        scenario: DESKTOP_SCENARIO,
        outDir: arg('out') ?? join(REPO_BASE_DIR, 'tmp-playtest', runId),
        decisionMode: (arg('decision-mode', 'historical') === 'emergent' ? 'emergent' : 'historical'),
        autonomyLevel: Number(arg('autonomy', '0')) as 0 | 1 | 2 | 3,
        updateLedger: !flag('no-ledger'),
        disabledProbes: repeatedArg('skip-probe'),
    };
}

// ── Lever firing, wrapped so every call is probed ────────────────────────────

/**
 * Fire one lever and hand the before/after hashes to the lever probes. Hashing
 * the whole state per lever call is not cheap, which is exactly why lever probes
 * only run when a policy actually asks for levers.
 */
function fireLever(
    state: GameState,
    turn: number,
    faction: FactionId,
    probes: Probe[],
    recorder: FindingsRecorder,
    lever: string,
    payload: Record<string, unknown>,
    call: () => { ok: boolean; error?: string; [k: string]: unknown },
): void {
    const hashBefore = stateHash(state);
    let result: { ok: boolean; error?: string; [k: string]: unknown };
    try {
        result = call();
    } catch (e) {
        recorder.record({
            kind: 'bug',
            severity: 'critical',
            probe: 'lever-throw',
            title: `Lever \`${lever}\` threw`,
            detail: `Calling \`${lever}\` raised: ${String((e as Error)?.message ?? e)}. A lever the player can press must never throw.`,
            surface: `lever:${lever}`,
            turn,
            faction,
            evidence: { lever, payload, stack: String((e as Error)?.stack ?? e).split('\n').slice(0, 4) },
        });
        return;
    }
    const hashAfter = stateHash(state);
    const ctx: LeverProbeContext = { lever, payload, result, hashBefore, hashAfter, turn, faction };
    for (const p of probes) if (p.onLever) recorder.recordAll(p.onLever(ctx));
}

function applyLevers(
    state: GameState,
    faction: FactionId,
    turn: number,
    probes: Probe[],
    recorder: FindingsRecorder,
    plan: ReturnType<NonNullable<import('./types.js').Policy['levers']>>,
): number {
    for (const p of plan.proposals ?? []) {
        fireLever(state, turn, faction, probes, recorder, 'resolve_proposal', { ...p }, () =>
            resolveProposal(state, p.proposalId, p.accept),
        );
    }
    for (const p of plan.request_op ?? []) {
        fireLever(state, turn, faction, probes, recorder, 'request_op', { ...p }, () =>
            requestOp(state, p.corpsId, p.targetOsid),
        );
    }
    for (const p of plan.stop_op ?? []) {
        fireLever(state, turn, faction, probes, recorder, 'stop_op', { ...p }, () => stopOp(state, p.corpsId, p.opName));
    }
    for (const p of plan.replace_co ?? []) {
        fireLever(state, turn, faction, probes, recorder, 'replace_co', { ...p }, () =>
            replaceCo(state, p.corpsId, p.replacementOfficerId),
        );
    }
    for (const p of plan.force_launch ?? []) {
        fireLever(state, turn, faction, probes, recorder, 'force_launch', { ...p }, () =>
            forceLaunch(state, p.corpsId, p.operationName),
        );
    }
    for (const p of plan.local_support ?? []) {
        fireLever(state, turn, faction, probes, recorder, 'local_support', { ...p }, () =>
            localSupport(state, faction, p.munId, p.type),
        );
    }
    return (
        (plan.proposals?.length ?? 0) +
        (plan.request_op?.length ?? 0) +
        (plan.stop_op?.length ?? 0) +
        (plan.replace_co?.length ?? 0) +
        (plan.force_launch?.length ?? 0) +
        (plan.local_support?.length ?? 0)
    );
}


/** Cost ledger for reporting. Never let a reporting failure kill a completed run. */
function tryBuildCostLedger(state: GameState): any {
    try {
        return buildCostLedger(state as never);
    } catch {
        return null;
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const cfg = buildConfig();
    const policy = resolvePolicy(cfg.policyId);
    const probes = defaultProbes(Number(arg('turn-budget-ms', '4000'))).filter(
        (p) => !cfg.disabledProbes.includes(p.id),
    );

    mkdirSync(cfg.outDir, { recursive: true });
    const recorder = new FindingsRecorder(cfg.runId, join(cfg.outDir, 'findings.jsonl'));

    console.log(`▶ ${cfg.runId} — ${cfg.faction}, policy "${policy.id}", ${cfg.turns} turns`);
    console.log(`  ${policy.description}`);
    console.log(`  autonomy_level: ${cfg.autonomyLevel}`
        + (cfg.autonomyLevel === 0
            ? '  (opportunity + proposal channels OFF — Federation catalogs dormant)'
            : '  (assisted execution: opportunity + proposal channels live)'));
    console.log(`  decision_mode: ${cfg.decisionMode}`
        + (cfg.decisionMode === 'historical'
            ? '  (matches the calibration scenarios: bots take authored AI defaults)'
            : '  (NOT calibration-comparable: other factions run the political scorer)'));
    console.log(`  probes: ${probes.map((p) => p.id).join(', ')}`);
    if (cfg.turns < FULL_CAMPAIGN_TURNS) {
        console.log(
            `
  ⚠ SHORT RUN (${cfg.turns} < ${FULL_CAMPAIGN_TURNS} turns). This is a build-loop run.
` +
            `    It stops before the late-war window where most defects surface, so "few findings"
` +
            `    here means nothing. Findings runs are ${FULL_CAMPAIGN_TURNS} turns.
`,
        );
    }

    let state = await startCampaign(cfg.faction, DESKTOP_SCENARIO, REPO_BASE_DIR, cfg.decisionMode);

    // autonomy_level gates whole operation channels for the PLAYER's faction:
    // proposal_generation.ts:123,186 and operation_opportunities.ts:1662 all return []
    // unless it is exactly 1. The default is 0, so every run before 2026-08-27 had the
    // Federation opportunity catalogs switched off and reported the silence as missing
    // content. Level 1 is "assisted execution — explicit broad staff control".
    if (cfg.autonomyLevel !== 0) {
        (state.meta as any).autonomy_level = cfg.autonomyLevel;
    }
    const decisionLog: DecisionLogEntry[] = [];
    const advanceMsByTurn: number[] = [];
    let turnsPlayed = 0;
    let leverAttempts = 0;
    let stoppedBecause = 'reached turn cap';

    for (let i = 0; i < cfg.turns; i++) {
        const prevState = state;
        const turnBefore = state.meta?.turn ?? 0;

        // 1. Read the context a player would read, and decide.
        const decisionContext = serializeDecisionContext(state, cfg.faction);
        let choices: DecisionChoice[] = [];
        try {
            choices = policy.decide(decisionContext, state).filter((c) => c.responseId);
        } catch (e) {
            recorder.record({
                kind: 'bug',
                severity: 'critical',
                probe: 'policy-throw',
                title: 'Policy threw while reading the decision context',
                detail: `Policy "${policy.id}" could not choose: ${String((e as Error)?.message ?? e)}. Usually means a decision reached the player in a shape nothing can consume.`,
                surface: 'engine:pending_event_decisions',
                turn: turnBefore,
                faction: cfg.faction,
            });
        }

        // 2. Inject each choice through the same path the Electron IPC uses.
        for (const c of choices) {
            try {
                decisionLog.push(injectDecision(state, c.eventId, c.responseId, c.rationale));
            } catch (e) {
                recorder.record({
                    kind: 'bug',
                    severity: 'critical',
                    probe: 'decision-inject-throw',
                    title: `Resolving decision \`${c.eventId}\` threw`,
                    detail: `Choosing option "${c.responseId}" raised: ${String((e as Error)?.message ?? e)}. This option is unreachable for a real player.`,
                    surface: `event:${c.eventId}`,
                    turn: turnBefore,
                    faction: cfg.faction,
                    evidence: { event_id: c.eventId, response_id: c.responseId },
                    repro_note: `Play ${cfg.faction} to turn ${turnBefore} and choose ${c.responseId} on ${c.eventId}.`,
                });
            }
        }

        // 3. Peace plans and paramilitary requests.
        const planId = ((state.military as any)?.negotiation?.pending_peace_plan)?.plan_id;
        if (planId) {
            const response = policy.peacePlan?.(planId, state) ?? 'rejected';
            resolvePeacePlanChoice(state, planId, response);
        }
        const paraReqs = ((state as any).pending_paramilitary_requests ?? []).filter(
            (r: any) => r.faction === cfg.faction && !r.decision,
        );
        if (paraReqs.length > 0) {
            const targets = paraReqs.map((r: any) => r.target_osid as string);
            const decisions =
                policy.paramilitary?.(targets, state) ??
                Object.fromEntries(targets.map((t: string) => [t, 'deny' as const]));
            resolveParamilitary(state, decisions);
        }

        // 4. Levers.
        if (policy.levers) {
            leverAttempts += applyLevers(
                state, cfg.faction, turnBefore, probes, recorder, policy.levers(state, cfg.faction),
            );
        }

        // 4b. Dayton. Without this the campaign runs PAST the historical week-182
        // settlement and never terminates, so the endgame/verdict path is never
        // exercised at all — the run looks complete while silently testing less.
        if ((state.military as any)?.negotiation?.pending_dayton) {
            const proposal = policy.dayton?.(state) ?? {
                territorial_demands: [],
                territorial_concessions: [],
                institutional_choices: {},
            };
            const { state: roundTripped } = resolveDayton(state, proposal);
            state = roundTripped;
        }

        // 5. Advance. Wall-clock here is a MEASUREMENT in a tool — it never reaches the sim.
        const t0 = process.hrtime.bigint();
        let advanced = false;
        try {
            state = await advance(state, REPO_BASE_DIR);
            advanced = true;
        } catch (e) {
            const blocked = blockingDecisions(state, cfg.faction);
            recorder.record({
                kind: 'bug',
                severity: 'critical',
                probe: 'advance-throw',
                title: 'Turn advance threw',
                detail: `advanceTurn failed at turn ${turnBefore}: ${String((e as Error)?.message ?? e)}. ${blocked.length} blocking decision(s) outstanding. For a real player this is a campaign that cannot continue.`,
                surface: 'engine:turn_pipeline',
                turn: turnBefore,
                faction: cfg.faction,
                evidence: { blocking: (blocked as any[]).map((b) => b.family_id ?? b) },
                repro_note: `${cfg.faction} / policy ${policy.id} / turn ${turnBefore}.`,
            });
        }
        const advanceMs = Number(process.hrtime.bigint() - t0) / 1e6;

        if (!advanced) {
            stoppedBecause = `advance failed at turn ${turnBefore}`;
            break;
        }
        advanceMsByTurn.push(advanceMs);
        turnsPlayed++;

        // 6. Probe the turn.
        const turnCtx = {
            prevState,
            state,
            turn: state.meta?.turn ?? turnBefore + 1,
            faction: cfg.faction,
            advanceMs,
            decisionContext,
            choices,
        };
        for (const p of probes) if (p.onTurn) recorder.recordAll(p.onTurn(turnCtx));

        if ((state.meta as any)?.game_over) {
            stoppedBecause = `game over at turn ${state.meta?.turn}`;
            break;
        }
        if (i > 0 && i % 20 === 0) {
            console.log(`  turn ${state.meta?.turn}  findings ${recorder.count} (${recorder.distinctCount} distinct)`);
        }
    }

    // 6b. Resolve Dayton if the final advance created it.
    //
    // DAYTON_TRIGGER_WEEK is 188 and war_start_turn is 0, so `shouldInitiateDayton`
    // becomes true DURING the last advance of a 188-turn run. The loop above checks
    // `pending_dayton` at the TOP of each turn, so it exits without ever seeing the
    // packet — and every run all session ended `game_over: false` with the endgame,
    // verdict and cost-ledger paths completely unexercised while the summary read
    // `turns_played: 188, full_campaign: true`.
    let daytonResolved = false;
    if ((state.military as any)?.negotiation?.pending_dayton) {
        const proposal = policy.dayton?.(state) ?? {
            territorial_demands: [],
            territorial_concessions: [],
            institutional_choices: {},
        };
        try {
            const { state: roundTripped } = resolveDayton(state, proposal);
            state = roundTripped;
            daytonResolved = true;
        } catch (e) {
            recorder.record({
                kind: 'bug',
                severity: 'critical',
                probe: 'dayton-resolve-throw',
                title: 'Resolving Dayton threw at the end of the campaign',
                detail: `The war reached its settlement and resolving it raised: ${String((e as Error)?.message ?? e)}. `
                    + 'The campaign cannot conclude.',
                surface: 'engine:dayton',
                turn: state.meta?.turn ?? turnsPlayed,
                faction: cfg.faction,
            });
        }
    } else if (turnsPlayed >= FULL_CAMPAIGN_TURNS) {
        recorder.record({
            kind: 'bug',
            severity: 'high',
            probe: 'dayton-never-offered',
            title: 'A full campaign ended with no Dayton settlement offered',
            detail: `${turnsPlayed} turns played and no \`pending_dayton\` packet exists. The war `
                + 'reaches its historical end date without the settlement that ends it, so the endgame, '
                + 'verdict and cost-ledger paths are never reached.',
            surface: 'engine:dayton',
            turn: turnsPlayed,
            faction: cfg.faction,
        });
    }

    // 6c. The endgame is new territory: until the Dayton off-by-one was fixed, no run
    // ever reached it. Capture what the settlement produced and check it is populated.
    const endgame = (state.meta as any)?.endgame_snapshot;
    const verdict = endgame?.verdict;
    const comparison = endgame?.historical_comparison;
    if (daytonResolved) {
        if (!endgame) {
            recorder.record({
                kind: 'bug', severity: 'critical', probe: 'endgame-missing',
                title: 'Dayton resolved but no endgame snapshot was frozen',
                detail: 'The campaign concluded and `meta.endgame_snapshot` is absent, so the player is '
                    + 'given no verdict, no cost ledger and no historical comparison at the end of the war.',
                surface: 'engine:endgame', turn: turnsPlayed, faction: cfg.faction,
            });
        } else if (!comparison) {
            recorder.record({
                kind: 'bug', severity: 'high', probe: 'endgame-no-comparison',
                title: 'Endgame snapshot has no historical_comparison',
                detail: 'The settlement froze an endgame snapshot but `historical_comparison` is absent. '
                    + 'This is the block that tells the player how their war differed from the real one — '
                    + "the game's whole closing statement.",
                surface: 'engine:endgame', turn: turnsPlayed, faction: cfg.faction,
                evidence: { verdict_present: !!verdict },
            });
        }
    }

    // 6d. Human cost, broken out. Two DIFFERENT quantities, easy to conflate:
    //   civilian_killed          — civilians OF that nationality who died (victims)
    //   civilian_casualties_caused — civilians that faction killed (perpetrator)
    // The cost ledger sources the first from `displacement.civilian_casualties`, which
    // the code calls ethnicity-aligned (RBiH~Bosniak, RS~Serb, HRHB~Croat).
    // Operations per faction. This is the leading hypothesis for why a faction's
    // casualties change depending on whether it is the player: player operations need
    // presidential authorization, bot operations do not.
    const capital = (state.military as any)?.negotiation?.capital ?? {};
    // NAME the operations, do not just count them. The 2026-08-27 Operations-seat review
    // could not close its own residual — a level-0 RBiH run reported 2 operations where
    // the traced mechanism allowed at most 1 — because nothing persisted WHICH ones ran.
    // A bare count cannot distinguish "the mechanism is understood" from "there is a
    // channel nobody has listed". `operation_history` carries the AARs; keep the names.
    const aars: any[] = ((state as any).operation_history ?? []) as any[];
    const namesFor = (f: string) =>
        aars
            .filter((a) => a?.faction === f)
            .map((a) => `t${a.started_turn}-${a.ended_turn} ${a.operation_name ?? a.operation_id} [${a.corps_id}] ${a.outcome}`)
            .sort();
    const opsByFaction = Object.fromEntries(
        ['RBiH', 'RS', 'HRHB'].map((f) => [f, {
            operations_launched: capital[f]?.operations_launched ?? null,
            operations_successful: capital[f]?.operations_successful ?? null,
            // Sorted, turn-tagged, no wall-clock: two identical runs produce identical text.
            operations_named: namesFor(f),
        }]),
    );

    // ENCLAVE GUARD provenance. compute_capital.ts:322 FAILS OPEN: when
    // `state.military.enclave_state` is absent it returns every known enclave as HELD
    // and none lost — indistinguishable in the verdict from a genuinely intact war.
    // On the single most §6-sensitive field in the game, "I don't know" must not render
    // as "Srebrenica held". Capture the provenance so a run can tell the two apart.
    const enclaveState = (state as any).military?.enclave_state ?? null;
    const controllers = (state as any).political?.political_controllers ?? {};
    const enclaveProvenance = {
        enclave_state_present: enclaveState !== null && enclaveState !== undefined,
        enclave_state_keys: enclaveState ? Object.keys(enclaveState).sort() : [],
        // Ground truth, independent of the capital breakdown.
        srebrenica_2_controller: controllers['op:srebrenica:srebrenica_2'] ?? null,
        zepa_2_controller: controllers['op:rogatica:zepa_2'] ?? null,
        gorazde_2_controller: controllers['op:gorazde:gorazde_2'] ?? null,
    };

    // §6 ATROCITY LIVENESS, per faction — not just the player's.
    // `war_crimes_events_emergent` (paramilitary_sweep.ts:831, its SOLE writer) is the
    // input to the authorized_cleansing_condemnation flag at a threshold of 1. Bots
    // auto-approve paramilitary sweeps; the PLAYER gets `pending_paramilitary_requests`
    // and must answer them — a lever this harness does not yet fire. So a player faction
    // may be structurally unable to accrue the emergent counter that a bot accrues freely.
    // Capture per faction so "does being the player exempt you from the atrocity
    // mechanism?" is answerable from a run instead of argued from source.
    const negCap = (state as any).military?.negotiation?.capital ?? {};
    const atrocityByFaction = Object.fromEntries(
        ['RBiH', 'RS', 'HRHB'].map((f) => [f, {
            war_crimes_events: negCap[f]?.war_crimes_events ?? null,
            war_crimes_events_emergent: negCap[f]?.war_crimes_events_emergent ?? null,
            civilian_casualties_caused: negCap[f]?.civilian_casualties_caused ?? null,
            is_player: f === ((state as any).meta?.player_faction ?? null),
            // The flags are what the §6 cap actually reads. Capturing the counter without
            // them answers "did atrocity happen" but not "did the engine condemn it".
            condemnation_flags: [...(negCap[f]?.condemnation_flags ?? [])].sort(),
        }]),
    );
    const pendingParamilitary = Array.isArray((state as any).pending_paramilitary_requests)
        ? (state as any).pending_paramilitary_requests.length
        : null;

    const ledger = tryBuildCostLedger(state);
    const humanCost = ledger ? {
        total_military_killed: ledger.total_military_killed,
        total_civilian_killed: ledger.total_civilian_killed,
        by_faction: Object.fromEntries((ledger.entries ?? []).map((e: any) => [e.faction, {
            military_killed: e.military_killed,
            military_wounded: e.military_wounded,
            // NOT on the ledger entry: buildCostLedger reads civCasualties[faction].killed,
            // adds it to the total, and never stores it per faction. The breakdown is
            // computed and thrown away, so it is read from displacement state instead.
            civilian_killed_of_this_nationality:
                (state as any).displacement?.civilian_casualties?.[e.faction]?.killed ?? null,
            civilian_casualties_caused: e.civilian_casualties_caused,
            refugees_created: e.refugees_created,
        }])),
    } : null;

    // 7. End-of-run probes.
    for (const p of probes) {
        if (p.onEnd) recorder.recordAll(p.onEnd({ state, faction: cfg.faction, turnsPlayed, advanceMsByTurn, leverAttempts }));
    }

    // 8. Artifacts.
    const summary = {
        run_id: cfg.runId,
        faction: cfg.faction,
        policy: policy.id,
        scenario: cfg.scenario,
        turns_requested: cfg.turns,
        turns_played: turnsPlayed,
        full_campaign: cfg.turns >= FULL_CAMPAIGN_TURNS,
        stopped_because: stoppedBecause,
        final_turn: state.meta?.turn ?? null,
        game_over: (state.meta as any)?.game_over ?? false,
        final_state_hash: stateHash(state),
        lever_attempts: leverAttempts,
        autonomy_level: cfg.autonomyLevel,
        decisions_made: decisionLog.length,
        decisions_diverged: decisionLog.filter((d) => d.diverged_from_historical).length,
        dayton_resolved: daytonResolved,
        operations_by_faction: opsByFaction,
        enclave_provenance: enclaveProvenance,
        atrocity_by_faction: atrocityByFaction,
        pending_paramilitary_requests_at_end: pendingParamilitary,
        human_cost: humanCost,
        endgame: endgame ? {
            // The grade is per-faction, inside faction_verdicts — NOT a top-level field.
            // Reading verdict.grade returned null on three runs and nearly became a
            // "the endgame has no verdict" finding; the verdict was there the whole time.
            outcome: verdict?.outcome_label ?? verdict?.outcome_type ?? null,
            player_verdict: verdict?.faction_verdicts?.[cfg.faction] ?? null,
            // The engine grades EVERY faction (scoring.ts:921); narrowing to the player
            // hid that. It is the bot factions that answer the §6-liveness question —
            // authorized_cleansing_condemnation can only be observed on a faction that
            // accrues emergent war crimes WITHOUT tripping genocide_condemnation first,
            // and in practice that is never the player. Grade + flags only; the full
            // verdict objects would bloat the summary.
            all_faction_verdicts: Object.fromEntries(
                Object.entries((verdict?.faction_verdicts ?? {}) as Record<string, any>)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([f, v]) => [f, {
                        grade: v?.grade ?? null,
                        outcome_class: v?.outcome_class ?? null,
                        condemnation_flags: [...(v?.condemnation_flags ?? [])].sort(),
                        territory_controlled_pct: v?.capital_breakdown?.territory_controlled_pct ?? null,
                        war_crimes_events: v?.capital_breakdown?.war_crimes_events ?? null,
                    }]),
            ),
            divergence_notes: comparison?.divergence_notes ?? null,
            milestones_absent: Array.isArray(comparison?.milestone_comparison)
                ? comparison.milestone_comparison.filter((m: any) => m.status === 'absent').map((m: any) => m.id)
                : null,
        } : null,
        findings_total: recorder.count,
        findings_distinct: recorder.distinctCount,
    };
    writeFileSync(join(cfg.outDir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n', 'utf8');
    writeFileSync(join(cfg.outDir, 'decision_log.json'), JSON.stringify(decisionLog, null, 2) + '\n', 'utf8');

    console.log(`\n■ ${turnsPlayed} turns played — ${stoppedBecause}`);
    console.log(`  ${recorder.count} findings, ${recorder.distinctCount} distinct`);

    if (cfg.updateLedger) {
        const { added, repeated } = recorder.mergeIntoLedger(LEDGER_PATH);
        console.log(`  ledger: ${added.length} NEW, ${repeated.length} already known`);
        for (const f of added.slice(0, 15)) {
            console.log(`    + [${f.severity}] ${f.title}  (${f.surface})`);
        }
        if (added.length > 15) console.log(`    … and ${added.length - 15} more`);
    } else {
        console.log('  ledger untouched (--no-ledger)');
    }
    console.log(`  artifacts: ${cfg.outDir}`);

    // Documentation is part of the run, not an afterthought. On 2026-08-27 three real
    // findings lived only in commit messages because "I wrote it down" felt true.
    try {
        const { checkCoverage } = await import('./diary_check.js');
        const cov = checkCoverage();
        if (!cov.diaryPath) {
            console.log('  DIARY: none found — findings have nowhere to be documented.');
        } else if (cov.undocumented.length > 0) {
            console.log(`  DIARY: ${cov.undocumented.length} finding(s) NOT in the diary:`);
            for (const f of cov.undocumented.slice(0, 8)) {
                console.log(`    ! ${f.fingerprint} [${f.severity}] ${f.title.slice(0, 76)}`);
            }
            if (cov.undocumented.length > 8) console.log(`    ! … and ${cov.undocumented.length - 8} more`);
            console.log('    Write them up in the diary, then: diary_check.ts --update');
        } else {
            console.log(`  DIARY: all ${cov.documented.length} open findings documented.`);
        }
    } catch (e) {
        console.log(`  DIARY: coverage check failed — ${String((e as Error)?.message ?? e).slice(0, 120)}`);
    }

}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
