/**
 * Save compatibility for the reviewed RBiH identity card (citation audit, 2026-11-15).
 *
 * A pending decision copies the event's display text into the save when it fires. The identity card
 * fires at campaign birth, so a save made before the card is answered carries the display text of the
 * build that wrote it. The reviewed-contract check must therefore judge the decision by its structure
 * (event id, turn, faction, option ids, effects, flags, dimension shifts, defaults) and not by the
 * copied display text; otherwise every wording correction to the event strands those saves with
 * "stale, forged, or already completed". Forged or already-completed decisions must still be refused.
 */

import { describe, expect, it } from 'vitest';

import {
    deserializeState,
    resolveDesktopEventDecision,
    serializeState,
    startNewCampaign,
} from '../src/desktop/desktop_sim.js';
import type { GameState } from '../src/state/game_state.js';

async function openingState(): Promise<GameState> {
    return (await startNewCampaign(process.cwd(), 'RBiH', 'apr_1992', 'historical')).state;
}

function clone(state: GameState): GameState {
    return deserializeState(serializeState(state));
}

function pendingIdentity(state: GameState): any {
    return (state.military.pending_event_decisions ?? []).find((d) => d.event_id === 'rbih_state_identity');
}

/** What a save written by an older build looks like: the same decision with different display text. */
function withOldDisplayText(state: GameState): GameState {
    const old = clone(state);
    const pending = pendingIdentity(old);
    pending.event_title = `${pending.event_title} (older wording)`;
    pending.narrative = `${pending.narrative} Older sentence.`;
    pending.staff_assessment = 'Older staff assessment.';
    pending.trigger_evidence = ['Older evidence line.'];
    pending.historical_source = 'Older source line.';
    pending.source_note = 'Older source note.';
    for (const option of pending.response_options) {
        option.label = `${option.label} (older)`;
        option.description = `${option.description} Older.`;
        for (const consequence of option.future_consequences ?? []) {
            consequence.label = `${consequence.label} (older)`;
            consequence.explanation = `Older explanation for ${consequence.explanation.slice(0, 20)}.`;
        }
    }
    return old;
}

describe('rbih_state_identity pending decision across display-text drift', () => {
    it('answers a decision saved with older display text and applies the same structure as the current text', async () => {
        const current = await openingState();
        const old = withOldDisplayText(current);
        expect(pendingIdentity(old).staff_assessment).toBe('Older staff assessment.');

        const fromCurrent = resolveDesktopEventDecision(clone(current), 'rbih_state_identity', 'civic', process.cwd());
        const fromOld = resolveDesktopEventDecision(old, 'rbih_state_identity', 'civic', process.cwd());

        expect(fromOld.military.event_decision_log?.at(-1)).toMatchObject({ event_id: 'rbih_state_identity', response_id: 'civic', decision_source: 'player', turn: 0 });
        expect((fromOld.military.pending_event_decisions ?? []).map((d) => d.event_id)).toEqual(['rbih_paramilitary_policy_1992']);
        expect(fromOld.military.negotiation?.strategic_dimensions).toEqual(fromCurrent.military.negotiation?.strategic_dimensions);
        expect(fromOld.military.fired_event_ids).toEqual(fromCurrent.military.fired_event_ids);
    });

    it.each([
        ['an option id', (p: any) => { p.response_options[0].id = 'forged_option'; }],
        ['an effect', (p: any) => { p.response_options[0].effects = [...(p.response_options[0].effects ?? []), { kind: 'narrative', text: 'forged' }]; }],
        ['a dimension shift', (p: any) => { p.response_options[0].dimension_shifts = [{ dimension: 'international_standing', delta: 99 }]; }],
        ['a set flag', (p: any) => { p.response_options[0].sets_flags = { forged_flag: true }; }],
        ['the fire turn', (p: any) => { p.turn_fired = 1; }],
        ['the faction', (p: any) => { p.faction = 'RS'; }],
        ['the default response', (p: any) => { p.historical_default_response_id = 'forged_option'; }],
    ])('still refuses a decision with a forged %s', async (_label, forge) => {
        const forged = withOldDisplayText(await openingState());
        forge(pendingIdentity(forged));
        expect(() => resolveDesktopEventDecision(forged, 'rbih_state_identity', 'civic', process.cwd())).toThrow();
    });

    it('still refuses a decision that was already answered', async () => {
        const answered = resolveDesktopEventDecision(withOldDisplayText(await openingState()), 'rbih_state_identity', 'civic', process.cwd());
        expect(() => resolveDesktopEventDecision(answered, 'rbih_state_identity', 'civic', process.cwd())).toThrow();
    });
});

describe('rbih_paramilitary_policy_1992 pending decision across provenance-note drift', () => {
    async function pendingPolicy(): Promise<GameState> {
        return resolveDesktopEventDecision(await openingState(), 'rbih_state_identity', 'civic', process.cwd());
    }

    it('answers a policy decision saved with older developer provenance notes', async () => {
        const current = await pendingPolicy();
        const old = clone(current);
        const pending = (old.military.pending_event_decisions ?? []).find((d) => d.event_id === 'rbih_paramilitary_policy_1992')!;
        pending.historical_source = 'Older historical source.';
        pending.source_note = 'Older source note.';
        pending.source = 'Older source.';
        const resolved = resolveDesktopEventDecision(old, 'rbih_paramilitary_policy_1992', 'ask', process.cwd());
        expect(resolved.military.event_decision_log?.at(-1)).toMatchObject({ event_id: 'rbih_paramilitary_policy_1992', response_id: 'ask' });
    });

    function option(p: any, id: string): any {
        return p.response_options.find((o: any) => o.id === id);
    }

    it('answers a policy decision saved before RF-PM1 with the old preview (always_deny opens the refusal; ask names its id)', async () => {
        const current = await pendingPolicy();
        const old = clone(current);
        const pending = (old.military.pending_event_decisions ?? []).find((d) => d.event_id === 'rbih_paramilitary_policy_1992')!;
        const deny = option(pending, 'always_deny').future_consequences[0];
        expect(deny.opens_events).toEqual([]);
        deny.opens_events = ['csq_paramilitary_authorization_refused'];
        const ask = option(pending, 'ask').future_consequences.find((fc: any) => /international-standing penalty/.test(fc.explanation));
        ask.explanation = 'Per-decision review routes each proposed deployment through a modal with full casualty projection. The csq_paramilitary_authorization_refused counterfactual remains reachable if approvals are never granted; the international-standing penalty remains modest until a deployment is actually approved.';
        for (const response of ['always_deny', 'ask']) {
            const fromOld = resolveDesktopEventDecision(clone(old), 'rbih_paramilitary_policy_1992', response, process.cwd());
            const fromCurrent = resolveDesktopEventDecision(clone(current), 'rbih_paramilitary_policy_1992', response, process.cwd());
            expect(fromOld.military.event_decision_log?.at(-1)).toMatchObject({ event_id: 'rbih_paramilitary_policy_1992', response_id: response });
            expect(fromOld.military.event_flags).toEqual(fromCurrent.military.event_flags);
            expect(fromOld.military.negotiation?.strategic_dimensions).toEqual(fromCurrent.military.negotiation?.strategic_dimensions);
        }
    });

    it('answers a policy decision saved before the staff-sweep disclosure (staff assessment without the closing sentence)', async () => {
        const current = await pendingPolicy();
        const old = clone(current);
        const pending = (old.military.pending_event_decisions ?? []).find((d) => d.event_id === 'rbih_paramilitary_policy_1992')!;
        const sentence = ' A standing order governs only the deployments you decide yourself: with your staff in charge (Assisted command or above), rear-area sweeps are decided without it, and each one counts against your side.';
        expect(pending.staff_assessment?.endsWith(sentence)).toBe(true);
        pending.staff_assessment = pending.staff_assessment!.slice(0, -sentence.length);
        for (const response of ['always_deny', 'ask', 'always_allow']) {
            const fromOld = resolveDesktopEventDecision(clone(old), 'rbih_paramilitary_policy_1992', response, process.cwd());
            expect(fromOld.military.event_decision_log?.at(-1)).toMatchObject({ event_id: 'rbih_paramilitary_policy_1992', response_id: response });
        }
    });

    it('still refuses a policy decision whose player-facing text or options were altered', async () => {
        for (const forge of [
            (p: any) => { p.narrative = 'forged'; },
            (p: any) => { p.response_options[0].label = 'forged'; },
            (p: any) => { p.notifications_to_other_factions = {}; },
            (p: any) => { option(p, 'always_deny').future_consequences[0].opens_events = ['csq_some_other_event']; },
            (p: any) => { option(p, 'ask').future_consequences[0].explanation = 'forged'; },
        ]) {
            const forged = clone(await pendingPolicy());
            forge((forged.military.pending_event_decisions ?? []).find((d) => d.event_id === 'rbih_paramilitary_policy_1992'));
            expect(() => resolveDesktopEventDecision(forged, 'rbih_paramilitary_policy_1992', 'ask', process.cwd())).toThrow();
        }
    });
});
