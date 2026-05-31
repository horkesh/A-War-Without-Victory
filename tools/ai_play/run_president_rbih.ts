/**
 * Playthrough: President of the Presidency of RBiH — turns 0..N.
 *
 * I (the agent) sit exactly where a wired LLM API would: each turn I read the
 * serialized decision context (situation / staff_assessment / options /
 * recommendation), CHOOSE a responseId in-character, record a 1-2 sentence
 * rationale, inject the choice via resolveEventDecision (reduced to the
 * {eventId, responseId} primitive — no free-form text reaches the sim), log it,
 * and advance.
 *
 * Frame: the unnamed political leader. Constrained agency, "authorship of the
 * tragedy" — hold what can be held and name the cost, NOT conquest.
 *
 * Then PROVE determinism: replay the recorded log against a FRESH campaign and
 * assert the final state hash is byte-identical.
 *
 * Run: node node_modules/tsx/dist/cli.mjs tools/ai_play/run_president_rbih.ts
 */

import {
    startCampaign,
    serializeDecisionContext,
    injectDecision,
    advance,
    stateHash,
    replayDecisionLog,
    type DecisionLogEntry,
} from './president_playthrough.js';
import type { GameState } from '../../src/state/game_state.js';

const FACTION = 'RBiH' as const;
const TURNS = 6; // covers the two early President decisions (t3, t4) + buffer

/**
 * My in-character decision policy, keyed by event_id. Each returns the chosen
 * responseId + rationale. This is the seam an LLM call would replace: given the
 * serialized context, return {responseId, rationale}. I decide as a thinking
 * leader, NOT by reflexively copying historical_default.
 */
const PRESIDENT_DECISIONS: Record<string, { responseId: string; rationale: string }> = {
    // Turn 3 — "What Is Bosnia?" — civic vs Bosniak-national vs pragmatic.
    rbih_state_identity: {
        responseId: 'civic',
        rationale:
            'The republic\'s only real leverage is moral and international: a civic, multi-ethnic Bosnia keeps Serb and Croat soldiers in our ranks and the world\'s sympathy at our back. I will pay the cost of nationalist resentment at home rather than forfeit the one card a strangled, embargoed state can still play. (Matches historical_default `civic`.)',
    },
    // Turn 4 — Paramilitary Authorization Policy — deny / review / allow.
    rbih_paramilitary_policy_1992: {
        responseId: 'always_deny',
        rationale:
            'A single chain of command is not bureaucratic fastidiousness — it is the difference between an army and the thing we are fighting. I refuse standing paramilitary authorization: the integration line costs us tempo, but the alternative writes our own name into the Hague paper trail beside Pale and Mostar. (Matches historical_default `always_deny`.)',
    },
};

function pickForDecision(eventId: string): { responseId: string; rationale: string } | null {
    return PRESIDENT_DECISIONS[eventId] ?? null;
}

async function playLiveRun(): Promise<{ log: DecisionLogEntry[]; finalHash: string; finalState: GameState }> {
    let state = await startCampaign(FACTION);
    const log: DecisionLogEntry[] = [];

    for (let i = 0; i < TURNS; i++) {
        const ctx = serializeDecisionContext(state, FACTION);
        if (ctx.pending_decisions.length > 0) {
            console.log(`\n----- TURN ${ctx.turn}: ${ctx.pending_decisions.length} decision(s) for the President -----`);
            console.log(`Briefing: ${ctx.briefing.headline}`);
        }
        for (const d of ctx.pending_decisions) {
            const choice = pickForDecision(d.event_id);
            if (!choice) {
                // No authored policy for this event — fall back to historical default,
                // but flag it (legibility gap: I had no basis to decide differently).
                const fallback = d.historical_default_response_id ?? d.options[0]?.id;
                if (!fallback) continue;
                console.log(`  [${d.event_id}] "${d.event_title}" — NO AUTHORED CHOICE; defaulting to ${fallback}`);
                log.push(injectDecision(state, d.event_id, fallback, '(no authored President policy — defaulted)'));
                continue;
            }
            const chosenOpt = d.options.find((o) => o.id === choice.responseId);
            console.log(`  [${d.event_id}] "${d.event_title}"`);
            console.log(`     situation:        ${d.situation ?? '(none provided)'}`);
            console.log(`     staff_assessment: ${d.staff_assessment ?? '(none provided)'}`);
            console.log(`     options:          ${d.options.map((o) => o.id).join(', ')}`);
            console.log(`     historical_default=${d.historical_default_response_id ?? '(none)'}  staff_rec=${d.staff_recommended_response_id ?? '(none)'}`);
            console.log(`     >>> CHOSE: ${choice.responseId} — "${chosenOpt?.label ?? '?'}"`);
            console.log(`     RATIONALE: ${choice.rationale}`);
            const entry = injectDecision(state, d.event_id, choice.responseId, choice.rationale);
            console.log(`     diverged_from_historical: ${entry.diverged_from_historical}`);
            log.push(entry);
        }
        state = await advance(state);
    }

    return { log, finalHash: stateHash(state), finalState: state };
}

(async () => {
    console.log('=== LIVE RUN — President of the Presidency of RBiH ===');
    const live = await playLiveRun();

    console.log('\n=== DECISION LOG (the determinism primitive) ===');
    console.log(JSON.stringify(live.log.map((e) => ({ turn: e.turn, eventId: e.eventId, responseId: e.responseId, diverged_from_historical: e.diverged_from_historical })), null, 2));
    console.log(`\nLIVE final_state_hash (turn ${live.finalState.meta?.turn}): ${live.finalHash}`);

    console.log('\n=== DETERMINISM REPLAY — fresh campaign, same log ===');
    const replay = await replayDecisionLog(FACTION, live.log, TURNS);
    console.log(`REPLAY final_state_hash (turn ${replay.state.meta?.turn}): ${replay.finalHash}`);

    const pass = live.finalHash === replay.finalHash;
    console.log(`\n=== DETERMINISM: ${pass ? 'PASS — byte-identical' : 'FAIL — hashes differ'} ===`);
    if (!pass) process.exit(2);
})().catch((e) => {
    console.error('PLAYTHROUGH ERROR:', e);
    process.exit(1);
});
