import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import {
    getPeacePlanDismissalKey,
    shouldShowPeacePlanModal,
} from '../../src/ui/map/utils/peacePlanDismissal.js';

type PendingPeacePlan = NonNullable<LoadedGameState['pendingPeacePlan']>;

function makePlan(planId: string, turnOffered: number): PendingPeacePlan {
    return {
        planId,
        planName: `${planId} plan`,
        narrative: 'Diplomatic proposal awaiting presidential review.',
        turnOffered,
        proposedSplit: { RBiH: 39, RS: 43, HRHB: 18 },
        institutionalModel: 'test_model',
        botResponses: {
            RBiH: 'accepted',
            RS: 'rejected',
            HRHB: 'accepted',
        },
    };
}

describe('peace plan dismissal scope', () => {
    it('keys dismissal to the exact offered plan, not to all peace plan modals', () => {
        const vanceOwen = makePlan('vance_owen', 40);
        const contactGroup = makePlan('contact_group', 118);

        const dismissedKey = getPeacePlanDismissalKey(vanceOwen);

        expect(dismissedKey).toBe('vance_owen@40');
        expect(shouldShowPeacePlanModal(vanceOwen, dismissedKey)).toBe(false);
        expect(shouldShowPeacePlanModal(contactGroup, dismissedKey)).toBe(true);
    });

    it('guards App wiring against a single global dismissed boolean', () => {
        const appSource = readFileSync(join(process.cwd(), 'src/ui/map/App.tsx'), 'utf8');

        expect(appSource).toContain('dismissedPeacePlanKey');
        expect(appSource).toContain('shouldShowPeacePlanModal');
        expect(appSource).not.toContain('const [peacePlanDismissed, setPeacePlanDismissed] = useState(false)');
    });
});
