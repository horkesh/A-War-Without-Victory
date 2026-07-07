import { describe, expect, it } from 'vitest';

import { serializeDecisionContext } from '../tools/ai_play/president_playthrough.js';
import type { GameState } from '../src/state/game_state.js';

describe('AI player decision context knowledge boundary', () => {
    it('does not serialize future-consequence or source-note contracts to the player', () => {
        const state = {
            meta: { turn: 1 },
            military: {
                formations: {},
                pending_event_decisions: [{
                    event_id: 'rbih_state_identity',
                    event_title: 'Foundational Decision',
                    faction: 'RBiH',
                    narrative: 'Choose the state posture.',
                    historical_source: 'Authoring note: opens dayton_signed_1995.',
                    source_note: 'Authoring note: opens csq_future_peace_plan.',
                    requires_player_response: true,
                    historical_default_response_id: 'civic',
                    staff_recommended_response_id: 'civic',
                    response_options: [{
                        id: 'civic',
                        label: 'Civic republic',
                        description: 'Maintain a civic republic.',
                        effects: [],
                        branch_tag: 'rbih_dayton_accept',
                        opens_events: ['vance_owen_plan_1993'],
                        closes_events: ['contact_group_plan_1994'],
                        future_consequences: [{
                            id: 'csq_future_peace_plan',
                            label: 'The Vance-Owen Peace Plan',
                            opens_events: ['vance_owen_plan_1993'],
                            explanation: 'Would expose future diplomacy.',
                        }],
                    }],
                }],
            },
            political: { political_controllers: {} },
        } as unknown as GameState;

        const context = serializeDecisionContext(state, 'RBiH');
        const json = JSON.stringify(context);

        expect(context.pending_decisions).toHaveLength(1);
        expect(json).toContain('Foundational Decision');
        expect(json).not.toMatch(/future_consequences|opens_events|closes_events|branch_tag|source_note|historical_source|csq_|Vance-Owen|Contact Group|dayton_signed_1995|Dayton/i);
    });
});
