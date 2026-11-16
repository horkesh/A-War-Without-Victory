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

    it('still refuses a policy decision whose player-facing text or options were altered', async () => {
        for (const forge of [
            (p: any) => { p.narrative = 'forged'; },
            (p: any) => { p.response_options[0].label = 'forged'; },
            (p: any) => { p.notifications_to_other_factions = {}; },
        ]) {
            const forged = clone(await pendingPolicy());
            forge((forged.military.pending_event_decisions ?? []).find((d) => d.event_id === 'rbih_paramilitary_policy_1992'));
            expect(() => resolveDesktopEventDecision(forged, 'rbih_paramilitary_policy_1992', 'ask', process.cwd())).toThrow();
        }
    });
});
