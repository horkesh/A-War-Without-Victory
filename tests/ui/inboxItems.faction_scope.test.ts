import { describe, expect, it } from 'vitest';

import { deriveInboxItems } from '../../src/ui/map/data/inboxItems.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function state(overrides: Partial<LoadedGameState>): LoadedGameState {
    return {
        label: 'test',
        phase: 'war',
        turn: 1,
        formations: [],
        militiaPools: [],
        controlBySettlement: {},
        statusBySettlement: {},
        brigadeAorByFormationId: {},
        attackOrders: [],
        movementOrders: [],
        recentControlEvents: [],
        ...overrides,
    } as LoadedGameState;
}

describe('inbox item faction scoping', () => {
    it('does not overshow faction-owned rows when the source row has no owner', () => {
        const items = deriveInboxItems(state({
            player_faction: 'RS',
            pendingEventDecisions: [
                {
                    event_id: 'missing_owner',
                    event_title: 'Missing Owner Decision',
                    turn_fired: 1,
                    response_options: [],
                    faction: undefined as unknown as string,
                },
            ],
            pendingProposalReviews: [
                {
                    id: 'proposal_missing_owner',
                    turn: 1,
                    faction: undefined as unknown as string,
                    domain: 'military',
                    description: 'Missing owner proposal',
                    proposed_action: 'SET_STANCE:test:offensive',
                },
            ],
            pendingReserveRequests: [
                {
                    request_id: 'reserve_missing_owner',
                    faction: undefined as unknown as string,
                    corps_id: 'test_corps',
                } as unknown as NonNullable<LoadedGameState['pendingReserveRequests']>[number],
            ],
            pendingOfficerEvents: [
                {
                    event_id: 'officer_missing_owner',
                    type: 'replacement_suggested',
                    faction: undefined as unknown as string,
                    turn: 1,
                } as unknown as NonNullable<LoadedGameState['pendingOfficerEvents']>[number],
            ],
        }), null);

        const ids = items.map((item) => item.id);
        for (const hiddenId of [
            'event:missing_owner',
            'proposal:proposal_missing_owner',
            'reserve:reserve_missing_owner',
            'officer:replacement_suggested:officer_missing_owner',
        ]) {
            expect(ids).not.toContain(hiddenId);
        }
    });
});
