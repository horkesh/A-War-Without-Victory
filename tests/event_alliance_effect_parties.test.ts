import { describe, expect, it } from 'vitest';
import {
    findNonPartyAllianceEffects,
    loadEventDefinitions,
    NON_PARTY_ALLIANCE_EFFECT_ALLOWLIST,
    validateAllianceEffectParties,
} from '../src/sim/events/event_loader.js';
import type { EventDefinition } from '../src/sim/events/event_types.js';

// §6 (orchestrator ruling 2026-11-17): alliance effects act only on the RBiH-HRHB alliance, so a
// row keyed by `responding_faction` to a faction that is not a party of it may not carry one.

const row = (partial: Record<string, unknown>): EventDefinition => ({
    trigger: { turn_min: 1 },
    effect: { kind: 'narrative', text: 'x' },
    ...partial,
}) as unknown as EventDefinition;

const allowlistedRows = (): EventDefinition[] =>
    [...NON_PARTY_ALLIANCE_EFFECT_ALLOWLIST].map((key) => {
        const [id, optionId] = key.split('#');
        return row({
            id,
            responding_faction: 'RS',
            response_options: [{ id: optionId, effects: [{ kind: 'alliance_change', delta: 0.05 }] }],
        });
    });

describe('alliance effects belong to a party of the alliance', () => {
    it('the shipped catalog loads, and the RS back-channel card carries no alliance effect', () => {
        const events = loadEventDefinitions(0);
        const card = events.find((e) => e.id === 'csq_back_channel_communication_RS');
        expect(card).toBeDefined();
        const kinds = [card!.effect, ...(card!.effects ?? [])].map((e) => e.kind);
        expect(kinds).not.toContain('alliance_lock');
        expect(kinds).not.toContain('alliance_change');
    });

    it('rejects an alliance_lock on an RS-keyed card (the back-channel defect)', () => {
        const rows = [
            ...allowlistedRows(),
            row({ id: 'rs_card', responding_faction: 'RS', effects: [{ kind: 'alliance_lock', mode: 'floor', value: 0.15, duration_turns: 25 }] }),
        ];
        expect(() => validateAllianceEffectParties(rows)).toThrow(/rs_card \(RS\)/);
    });

    it('rejects an alliance effect in the single `effect` field and on a non-allowlisted RS option', () => {
        const single = [...allowlistedRows(), row({ id: 'rs_single', responding_faction: 'RS', effect: { kind: 'alliance_change', delta: 0.1 } })];
        expect(() => validateAllianceEffectParties(single)).toThrow(/rs_single \(RS\)/);
        const option = [
            ...allowlistedRows(),
            row({ id: 'rs_choice', responding_faction: 'RS', response_options: [{ id: 'moderate', effects: [{ kind: 'alliance_change', delta: 0.05 }] }] }),
        ];
        expect(() => validateAllianceEffectParties(option)).toThrow(/rs_choice#moderate \(RS\)/);
    });

    it('allows alliance effects on RBiH, HRHB and global (no responding_faction) rows', () => {
        const rows = [
            ...allowlistedRows(),
            row({ id: 'rbih_card', responding_faction: 'RBiH', effects: [{ kind: 'alliance_change', delta: -0.1 }] }),
            row({ id: 'hrhb_card', responding_faction: 'HRHB', response_options: [{ id: 'a', effects: [{ kind: 'alliance_lock', mode: 'ceiling', value: 0.5, duration_turns: 4 }] }] }),
            row({ id: 'global_card', effects: [{ kind: 'alliance_lock', mode: 'floor', value: 0, duration_turns: 16 }] }),
        ];
        expect(() => validateAllianceEffectParties(rows)).not.toThrow();
    });

    it('the allowlist is closed and may only shrink: every entry still matches the shipped catalog', () => {
        expect([...NON_PARTY_ALLIANCE_EFFECT_ALLOWLIST].sort()).toEqual([
            'rs_autonomy_path_decision_1993#accept_federation_status',
            'rs_owen_stoltenberg_response_1993#accept_with_modifications',
            'rs_washington_rejection_1994#propose_trilateral',
        ]);
        const { violations, allowlisted } = findNonPartyAllianceEffects(loadEventDefinitions(0));
        expect(violations).toEqual([]);
        // A card-batch fix that drops one of these effects must also drop its allowlist entry.
        expect([...allowlisted].sort()).toEqual([...NON_PARTY_ALLIANCE_EFFECT_ALLOWLIST].sort());
    });
});
