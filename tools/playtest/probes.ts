/**
 * Probes — the seed set of automatic checks.
 *
 * Each probe encodes a defect CLASS this repo has already produced at least once,
 * so the harness catches the next instance instead of the next playthrough report
 * catching it in prose. Adding a probe is how a one-off discovery becomes a
 * permanent guard: write the check, and every future run inherits it.
 *
 * Probes observe only. They never mutate state.
 */

import { appendFileSync } from 'node:fs';
import type { Finding, Probe } from './types.js';

// ── Shared walker ────────────────────────────────────────────────────────────

/**
 * Walk a state tree collecting paths whose value fails `predicate`. Bounded on
 * both depth and hits so a pathological state cannot stall the run.
 */
function collectPaths(
    root: unknown,
    predicate: (v: unknown) => boolean,
    opts: { maxHits: number; maxDepth: number },
): string[] {
    const hits: string[] = [];
    const seen = new WeakSet<object>();

    const walk = (node: unknown, path: string, depth: number): void => {
        if (hits.length >= opts.maxHits || depth > opts.maxDepth) return;
        if (node === null || node === undefined) return;
        if (typeof node === 'object') {
            if (seen.has(node as object)) return;
            seen.add(node as object);
            if (Array.isArray(node)) {
                for (let i = 0; i < node.length; i++) walk(node[i], `${path}[${i}]`, depth + 1);
            } else {
                for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
                    walk(v, path ? `${path}.${k}` : k, depth + 1);
                }
            }
            return;
        }
        if (predicate(node)) hits.push(path);
    };

    walk(root, '', 0);
    return hits;
}

/** Strip array indices so `a[3].b` and `a[7].b` report as the same defect. */
function genericPath(path: string): string {
    return path.replace(/\[\d+\]/g, '[]');
}

// ── 1. Non-finite numbers ────────────────────────────────────────────────────

/**
 * Catches the `recruitment_modifiers[].pool_multiplier` class: a counterfactual
 * event branch writes NaN/Infinity, which survives silently until
 * `serializeGameState` shape validation throws several turns later — by which
 * point the true cause is off-screen. Known real instance: the `pragmatic` branch
 * of `rbih_state_identity` (documented in tools/ai_play/README.md).
 */
export const nonFiniteNumeric: Probe = {
    id: 'nonfinite-numeric',
    description: 'Any NaN or Infinity anywhere in GameState.',
    onTurn({ state, turn, faction }) {
        const bad = collectPaths(state, (v) => typeof v === 'number' && !Number.isFinite(v), {
            maxHits: 12,
            maxDepth: 14,
        });
        return [...new Set(bad.map(genericPath))].map<Finding>((path) => ({
            kind: 'bug',
            severity: 'critical',
            probe: 'nonfinite-numeric',
            title: `Non-finite number at \`${path}\``,
            detail:
                `GameState holds a NaN/Infinity at \`${path}\`. This survives in state and typically ` +
                `surfaces much later as a serialization shape-validation failure, far from its cause.`,
            surface: `engine:${path.split('.').slice(0, 2).join('.')}`,
            turn,
            faction,
            evidence: { path, sample_paths: bad.slice(0, 5) },
        }));
    },
};

// ── 2. Levers that claim success and do nothing ──────────────────────────────

/**
 * Catches the `forceLaunch` class: a lever reads the wrong field path, returns a
 * success-shaped result, spends the player's Command Authority, and changes
 * nothing. The shipped `electron-main.cjs` had exactly this bug and it was only
 * found by a specialist reading the code — not by any test.
 */
export const leverNoop: Probe = {
    id: 'lever-noop',
    description: 'A lever returned ok:true but left the state hash unchanged.',
    onLever({ lever, payload, result, hashBefore, hashAfter, turn, faction }) {
        if (!result.ok || hashBefore !== hashAfter) return [];
        // A refusal is a real, modelled outcome, not a silent no-op.
        if (result.refused === true) return [];
        return [
            {
                kind: 'bug',
                severity: 'high',
                probe: 'lever-noop',
                title: `Lever \`${lever}\` reported success but changed nothing`,
                detail:
                    `\`${lever}\` returned ok:true, yet the canonical state hash is identical before and ` +
                    `after. Either the lever silently failed, or it succeeded without any observable effect — ` +
                    `both of which read to the player as "I pressed the button and nothing happened".`,
                surface: `lever:${lever}`,
                turn,
                faction,
                evidence: { lever, payload, result, hash: hashBefore },
                repro_note: `Call ${lever} with ${JSON.stringify(payload)} at turn ${turn}.`,
            },
        ];
    },
};

// ── 3. Levers that refuse, and why ───────────────────────────────────────────

/**
 * Not automatically a bug — an engine that says no for a modelled reason is
 * working. Recorded so that the DISTRIBUTION of refusals is visible: a refusal
 * reason that fires every turn for 188 turns is a design problem whether or not
 * any single instance is.
 */
export const leverRefusal: Probe = {
    id: 'lever-refusal',
    description: 'A lever returned ok:false; the reason is recorded for frequency analysis.',
    onLever({ lever, payload, result, turn, faction }) {
        if (result.ok) return [];
        const reason = String(result.error ?? 'unspecified');
        return [
            {
                kind: 'friction',
                severity: 'low',
                probe: 'lever-refusal',
                title: `Lever \`${lever}\` refused: ${reason.replace(/\d+/g, '#')}`,
                detail:
                    `\`${lever}\` was refused with "${reason}". Recorded to measure how often the president ` +
                    `reaches for a lever and is turned away, and whether the reason is one the UI ever shows.`,
                surface: `lever:${lever}`,
                turn,
                faction,
                evidence: { lever, payload, error: reason },
            },
        ];
    },
};

// ── 4. Malformed decisions ───────────────────────────────────────────────────

/** A decision the player cannot meaningfully answer is a hard progress defect. */
export const decisionShape: Probe = {
    id: 'decision-shape',
    description: 'Decisions with no options, duplicate option ids, or no authored default.',
    onTurn({ decisionContext, turn, faction }) {
        const out: Finding[] = [];
        for (const d of decisionContext.pending_decisions) {
            if (d.options.length === 0) {
                out.push({
                    kind: 'bug',
                    severity: 'critical',
                    probe: 'decision-shape',
                    title: `Decision \`${d.event_id}\` offers zero options`,
                    detail: `Event "${d.event_title}" reached the player with an empty option list — unanswerable, and blocking if it requires a response.`,
                    surface: `event:${d.event_id}`,
                    turn,
                    faction,
                    evidence: { event_id: d.event_id, requires_player_response: d.requires_player_response },
                });
                continue;
            }
            const ids = d.options.map((o) => o.id);
            const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
            if (dupes.length > 0) {
                out.push({
                    kind: 'bug',
                    severity: 'high',
                    probe: 'decision-shape',
                    title: `Decision \`${d.event_id}\` has duplicate option ids`,
                    detail: `Options ${[...new Set(dupes)].join(', ')} appear more than once. Whichever the player clicks, resolution takes the first match — so at least one visible choice is unreachable.`,
                    surface: `event:${d.event_id}`,
                    turn,
                    faction,
                    evidence: { event_id: d.event_id, duplicate_ids: [...new Set(dupes)] },
                });
            }
            if (!d.historical_default_response_id) {
                out.push({
                    kind: 'question',
                    severity: 'medium',
                    probe: 'decision-shape',
                    title: `Decision \`${d.event_id}\` has no authored historical default`,
                    detail:
                        `No \`historical_default_response_id\`. The R8 choice policy cannot rank this decision, ` +
                        `so a "historical" playthrough is silently guessing here. Needs an authored default or an ` +
                        `explicit note that history offers none.`,
                    surface: `event:${d.event_id}`,
                    turn,
                    faction,
                    evidence: { event_id: d.event_id, option_ids: ids },
                });
            }
        }
        return out;
    },
};

// ── 5. Decisions with nothing to read ────────────────────────────────────────

/**
 * The presidential premise is that you decide from a briefing, not from a label.
 * A decision with no situation, no staff assessment and no narrative is a
 * multiple-choice quiz — working behavior, insufficiently presidential. Friction.
 */
export const decisionTextGap: Probe = {
    id: 'decision-text-gap',
    description: 'Player-facing decisions missing situation / staff assessment / narrative.',
    onTurn({ decisionContext, turn, faction }) {
        return decisionContext.pending_decisions
            .filter((d) => d.requires_player_response)
            .filter((d) => !d.situation && !d.staff_assessment && !d.narrative)
            .map<Finding>((d) => ({
                kind: 'friction',
                severity: 'medium',
                probe: 'decision-text-gap',
                title: `Decision \`${d.event_id}\` gives the player nothing to read`,
                detail:
                    `"${d.event_title}" requires a response but carries no situation, no staff assessment and ` +
                    `no narrative. The player is picking between labels with no basis for judgement.`,
                surface: `event:${d.event_id}`,
                turn,
                faction,
                evidence: { event_id: d.event_id, option_labels: d.options.map((o) => o.label) },
            }));
    },
};

// ── 6. Options with no stated stakes ─────────────────────────────────────────

export const optionStakesGap: Probe = {
    id: 'option-stakes-gap',
    description: 'Decision options that show the player no dimension shifts.',
    onTurn({ decisionContext, turn, faction }) {
        return decisionContext.pending_decisions
            .filter((d) => d.requires_player_response)
            .filter((d) => d.options.every((o) => !o.dimension_shifts || o.dimension_shifts.length === 0))
            .map<Finding>((d) => ({
                kind: 'friction',
                severity: 'low',
                probe: 'option-stakes-gap',
                title: `Decision \`${d.event_id}\` shows no stakes on any option`,
                detail:
                    `No option on "${d.event_title}" carries \`dimension_shifts\`, so the modal can quantify ` +
                    `nothing. The player chooses blind and learns the cost only afterwards.`,
                surface: `event:${d.event_id}`,
                turn,
                faction,
                evidence: { event_id: d.event_id },
            }));
    },
};

// ── 7. Turn cost ─────────────────────────────────────────────────────────────

/**
 * Wall-clock is measured here, in a TOOL, never fed to the sim. A turn the player
 * waits on is friction whatever the engine is doing during it.
 */
export function turnTime(thresholdMs: number): Probe {
    return {
        id: 'turn-time',
        description: `Turns slower than ${thresholdMs}ms.`,
        onTurn({ advanceMs, turn, faction }) {
            if (advanceMs <= thresholdMs) return [];
            const bucket = advanceMs > thresholdMs * 4 ? 'severe' : 'over budget';
            return [
                {
                    kind: 'friction',
                    severity: advanceMs > thresholdMs * 4 ? 'high' : 'medium',
                    probe: 'turn-time',
                    title: `Turn advance ${bucket} (>${thresholdMs}ms)`,
                    detail: `Advancing this turn took ${Math.round(advanceMs)}ms against a ${thresholdMs}ms budget. Headless timing is a floor — the packaged UI will be slower.`,
                    surface: 'engine:turn_pipeline',
                    turn,
                    faction,
                    evidence: { advance_ms: Math.round(advanceMs), threshold_ms: thresholdMs },
                },
            ];
        },
        onEnd({ advanceMsByTurn, faction, turnsPlayed }) {
            if (advanceMsByTurn.length === 0) return [];
            const sorted = [...advanceMsByTurn].sort((a, b) => a - b);
            const p50 = sorted[Math.floor(sorted.length * 0.5)];
            const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
            if (p50 <= thresholdMs) return [];
            return [
                {
                    kind: 'friction',
                    severity: 'high',
                    probe: 'turn-time',
                    title: 'Median turn exceeds the turn-time budget for the whole campaign',
                    detail: `Across ${turnsPlayed} turns the median advance was ${Math.round(p50)}ms (p95 ${Math.round(p95)}ms) against a ${thresholdMs}ms budget. This is the campaign's baseline pace, not a spike.`,
                    surface: 'engine:turn_pipeline',
                    turn: turnsPlayed,
                    faction,
                    evidence: { p50_ms: Math.round(p50), p95_ms: Math.round(p95), threshold_ms: thresholdMs },
                },
            ];
        },
    };
}

// ── 8. Command Authority economy ─────────────────────────────────────────────

/**
 * Straight from the diary template's own prompt: "did you ever want to act and
 * could not afford it, or forget the levers existed?" Both failure directions are
 * measurable — starved (never enough to act) and saturated (income wasted at cap).
 */
export const commandAuthority: Probe = {
    id: 'command-authority',
    description: 'Command Authority pinned at zero (starved) or at cap (income wasted).',
    onEnd({ state, faction, turnsPlayed, leverAttempts }) {
        const auth = (state as any).military?.command_authority;
        if (!auth) {
            return [
                {
                    kind: 'bug',
                    severity: 'high',
                    probe: 'command-authority',
                    title: 'No command_authority block on state at end of campaign',
                    detail: 'The presidential lever economy has no state to read; every lever gate is unmeasurable.',
                    surface: 'engine:command_authority',
                    turn: turnsPlayed,
                    faction,
                },
            ];
        }
        const out: Finding[] = [];
        const { current, max, lifetime_spent: spent } = auth;
        // A policy that never reaches for a lever will trivially spend nothing. That
        // says something about the POLICY, not the engine, so both checks below are
        // gated on the policy having actually tried.
        if (leverAttempts === 0) return out;
        if (typeof spent === 'number' && spent === 0 && turnsPlayed > 20) {
            out.push({
                kind: 'friction',
                severity: 'high',
                probe: 'command-authority',
                title: 'Command Authority never spent across the whole campaign',
                detail: `${turnsPlayed} turns, ${leverAttempts} lever attempt(s), and lifetime_spent is 0. The policy DID reach for levers and every one of them was gated shut — the presidential surface is unreachable on this path.`,
                surface: 'engine:command_authority',
                turn: turnsPlayed,
                faction,
                evidence: { current, max, lifetime_spent: spent },
            });
        }
        // Guarded on run length: a short run ends at cap because nothing had time to
        // happen, which says nothing about the economy.
        if (turnsPlayed > 20 && typeof current === 'number' && typeof max === 'number' && max > 0 && current >= max) {
            out.push({
                kind: 'friction',
                severity: 'medium',
                probe: 'command-authority',
                title: 'Command Authority sitting at cap at end of campaign',
                detail: `Ended at ${current}/${max}. Income above the cap is wasted; a resource the player cannot spend is not a constraint, it is decoration.`,
                surface: 'engine:command_authority',
                turn: turnsPlayed,
                faction,
                evidence: { current, max },
            });
        }
        return out;
    },
};

// ── 9. Explanations the engine computes and throws away ──────────────────────

/**
 * The `op_directive_rejection` class: the engine records exactly WHY it refused
 * the president's order, persists it, projects it to the client — and no UI
 * anywhere reads it. Four specialists confirmed this independently in the 2026-08-05
 * panel. The probe records each instance so the volume is on the record.
 */
export const discardedExplanation: Probe = {
    id: 'discarded-explanation',
    description: 'Engine wrote a rejection reason that no player-facing surface reads.',
    onTurn({ state, turn, faction }) {
        const cc = (state as any).military?.corps_command ?? {};
        const out: Finding[] = [];
        for (const corpsId of Object.keys(cc).sort()) {
            const rejection = cc[corpsId]?.op_directive_rejection;
            if (!rejection || rejection.turn !== turn) continue;
            out.push({
                kind: 'bug',
                severity: 'medium',
                probe: 'discarded-explanation',
                title: 'Operation directive rejected with a reason the player is never shown',
                detail:
                    `Corps ${corpsId} rejected a directive toward ${rejection.target_osid} for reason ` +
                    `"${rejection.reason}". The engine computed, stored and projected this — no surface under ` +
                    `src/ui/ reads \`op_directive_rejection\`, so the player spends Command Authority, gets ` +
                    `nothing, and is told nothing.`,
                surface: 'ui:op_directive_rejection',
                turn,
                faction,
                evidence: { corps: corpsId, ...rejection },
            });
        }
        return out;
    },
};

// ── 10. Progress deadlock ────────────────────────────────────────────────────

/** The one class that ends a playthrough outright: a turn that cannot be advanced. */
export const advanceDeadlock: Probe = {
    id: 'advance-deadlock',
    description: 'Blocking decisions remain after the policy has answered everything it can.',
    onTurn({ prevState, decisionContext, choices, turn, faction }) {
        const unanswered = decisionContext.pending_decisions
            .filter((d) => d.requires_player_response)
            .filter((d) => !choices.some((c) => c.eventId === d.event_id));
        if (unanswered.length === 0) return [];
        return [
            {
                kind: 'bug',
                severity: 'critical',
                probe: 'advance-deadlock',
                title: 'Blocking decision left unanswered — the policy could not choose',
                detail:
                    `${unanswered.length} decision(s) require a response but the policy produced no choice for ` +
                    `them: ${unanswered.map((d) => d.event_id).join(', ')}. A human player facing this sees a ` +
                    `turn that will not advance.`,
                surface: `event:${unanswered[0]?.event_id ?? 'unknown'}`,
                turn: (prevState as any).meta?.turn ?? turn,
                faction,
                evidence: { unanswered: unanswered.map((d) => ({ id: d.event_id, options: d.options.length })) },
            },
        ];
    },
};

// ── 11. Decision cadence ─────────────────────────────────────────────────────

/**
 * Added after the first real run: RBiH/counterfactual faced SIX decisions across
 * 52 turns. The premise of the presidential surface is that the player governs by
 * deciding; at that cadence they spend ~9 turns out of 10 pressing Advance with
 * nothing to weigh. Whether that is correct pacing is a design call, but it has to
 * be visible to be argued about — so the harness measures it.
 */
export function decisionCadence(minPerTenTurns: number): Probe {
    let decisionsSeen = 0;
    return {
        id: 'decision-cadence',
        description: `Fewer than ${minPerTenTurns} player decisions per 10 turns.`,
        onTurn({ choices }) {
            decisionsSeen += choices.length;
            return [];
        },
        onEnd({ turnsPlayed, faction }) {
            if (turnsPlayed < 20) return [];
            const perTen = (decisionsSeen / turnsPlayed) * 10;
            if (perTen >= minPerTenTurns) return [];
            return [
                {
                    kind: 'friction',
                    severity: 'high',
                    probe: 'decision-cadence',
                    title: 'Player faces almost no decisions across the campaign',
                    detail:
                        `${decisionsSeen} decision(s) in ${turnsPlayed} turns — ${perTen.toFixed(1)} per 10 turns, ` +
                        `against a ${minPerTenTurns} floor. The president spends most of the war pressing Advance ` +
                        `with nothing to weigh, which is the opposite of the surface's stated premise.`,
                    surface: 'design:decision_cadence',
                    turn: turnsPlayed,
                    faction,
                    evidence: {
                        decisions: decisionsSeen,
                        turns: turnsPlayed,
                        per_ten_turns: Number(perTen.toFixed(2)),
                        floor: minPerTenTurns,
                    },
                },
            ];
        },
    };
}

// ── Registry ─────────────────────────────────────────────────────────────────

export function defaultProbes(turnTimeBudgetMs: number): Probe[] {
    return [
        nonFiniteNumeric,
        leverNoop,
        leverRefusal,
        decisionShape,
        decisionTextGap,
        optionStakesGap,
        turnTime(turnTimeBudgetMs),
        commandAuthority,
        discardedExplanation,
        advanceDeadlock,
        decisionCadence(Number(process.env.PLAYTEST_DECISION_FLOOR ?? 2)),
        opsTrace(),
    ];
}

// ── Ops trace (diagnostic, env-gated) ────────────────────────────────────────

/**
 * LANE-RS-T42-CLIFF (2026-08-27): read-only per-turn trace of the operation
 * pipeline for one faction. Inert unless PLAYTEST_OPS_TRACE names an output
 * path, so it cannot perturb any other run.
 *
 * Observes only: reads `ctx.state`, appends one JSON line per turn, returns no
 * findings. No state is written, no RNG, no wall-clock.
 */
function opsTrace(): Probe {
    const out = process.env.PLAYTEST_OPS_TRACE;
    return {
        id: 'ops-trace',
        description: 'Diagnostic per-turn trace of corps operations and op authorizations (env-gated).',
        onTurn(ctx): Finding[] {
            if (!out) return [];
            const st = ctx.state as any;
            const forms = st?.military?.formations ?? {};
            const cc = st?.military?.corps_command ?? {};
            const corps: Record<string, unknown> = {};
            for (const id of Object.keys(cc).sort()) {
                if (forms[id]?.faction !== ctx.faction) continue;
                const cmd = cc[id] ?? {};
                corps[id] = {
                    active: (cmd.active_operations ?? []).map((o: any) => `${o?.name}|${o?.status ?? ''}`),
                    queued: cmd.queued_operations ?? null,
                    stance: cmd.stance ?? null,
                };
            }
            const reviews = (st?.meta?.pending_proposal_reviews ?? [])
                .filter((r: any) => typeof r?.proposed_action === 'string'
                    && /^(HISTORICAL_OP:|APPROVE_OP:|OPPORTUNITY:)/.test(r.proposed_action))
                .map((r: any) => `${r.proposed_action}|t${r.turn}|acc=${String(r.accepted)}|res=${String(r.resolved_turn)}`)
                .sort();
            const warns = (st?.military?.op_injection_warnings ?? [])
                .map((w: any) => `t${w.turn}|${w.op_name}|${w.check}|${w.detail}`)
                .sort();
            appendFileSync(out, JSON.stringify({
                turn: ctx.turn,
                faction: ctx.faction,
                autonomy: st?.meta?.autonomy_level ?? null,
                player: st?.meta?.player_faction ?? null,
                corps,
                reviews,
                warns,
            }) + '\n');
            return [];
        },
    };
}
