import { describe, expect, it } from 'vitest';
import {
    deriveDelegationContext,
    deriveOrderInterpretation,
    deriveRecoveryForecastToken,
    deriveStanceInterpretation,
} from '../../src/ui/map/data/command_strain.js';
import { t } from '../../src/ui/map/i18n/index.js';

const ENGLISH_LEAKS = [
    'STRAIN-SHAPED',
    'Offensive posture is unavailable',
    'Strain resolving in',
    'Corps exhaustion limiting operational tempo',
    'Commander recommends abort',
    'Commander recommends postponement',
    'Institutional damage will compound',
];

function expectBcsCopy(value: string) {
    for (const leak of ENGLISH_LEAKS) {
        expect(value).not.toContain(leak);
    }
}

describe('command strain i18n boundary', () => {
    it('renders order interpretation badges, factors, and warnings through BCS keys', () => {
        const interpretation = deriveOrderInterpretation(6, 'postpone');

        expect(interpretation.categoryLabel).toBe('STRAIN-SHAPED');
        expect(interpretation.categoryLabelKey).toBe('commandStrain.order.category.strainShaped');
        expectBcsCopy(t(interpretation.categoryLabelKey!, undefined, 'bcs'));
        expectBcsCopy(t(interpretation.cautionNoticeToken!.key, interpretation.cautionNoticeToken!.params, 'bcs'));
        expectBcsCopy(t(interpretation.dragFactors[0].labelToken!.key, interpretation.dragFactors[0].labelToken!.params, 'bcs'));
        expectBcsCopy(t('commandStrain.order.directInterventionWarning', undefined, 'bcs'));
    });

    it('renders stance, recovery, and delegation copy through BCS keys', () => {
        const stance = deriveStanceInterpretation(7, 'compromised', 'offensive');
        const recovery = deriveRecoveryForecastToken([
            { turn: 0, projectedStrain: 2 },
            { turn: 1, projectedStrain: 1 },
            { turn: 2, projectedStrain: 0 },
        ]);
        const delegation = deriveDelegationContext('abort', 0);

        expectBcsCopy(t(stance.noticeToken!.key, stance.noticeToken!.params, 'bcs'));
        expectBcsCopy(t(recovery!.key, recovery!.params, 'bcs'));
        expectBcsCopy(t(delegation.labelToken!.key, delegation.labelToken!.params, 'bcs'));
    });
});
