// @vitest-environment jsdom

import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
    deriveCorpsSituationAssessment,
    deriveDelegationContext,
    deriveOrderInterpretation,
    deriveRecoveryForecastToken,
    deriveStanceInterpretation,
} from '../../src/ui/map/data/command_strain.js';
import { CorpsSituationSection } from '../../src/ui/map/components/army_hq/CorpsSituationSection';
import { OperationConstraintContext } from '../../src/ui/map/components/OperationBriefingModal';
import { setLocale, t } from '../../src/ui/map/i18n/index.js';

const ENGLISH_LEAKS = [
    'STRAIN-SHAPED',
    'Offensive posture is unavailable',
    'Strain resolving in',
    'Corps exhaustion limiting operational tempo',
    'Corps is heavily exhausted',
    'Commander recommends abort',
    'Commander recommends postponement',
    'Institutional damage will compound',
    'Enemy offensive',
    'Hold defensive positions',
    'â€”',
    '\uFFFD',
];

function expectBcsCopy(value: string) {
    for (const leak of ENGLISH_LEAKS) {
        expect(value).not.toContain(leak);
    }
}

describe('command strain i18n boundary', () => {
    afterEach(() => {
        cleanup();
        setLocale('en', undefined);
    });

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

    it('emits BCS tokens for threat context, dominant reason, and relief path', () => {
        const assessment = deriveCorpsSituationAssessment(
            {
                threat_assessment: { overall_pressure: 'critical', enemy_concentration_zones: ['north'] },
                force_assessment: { total_brigades: 4, combat_effective: 4, total_surplus: 1 },
                zone_assessments: [],
            },
            'balanced',
            10,
            0,
        );

        expect(assessment.threatContextToken).toBeTruthy();
        expect(assessment.dominantReasonToken).toBeTruthy();
        expect(assessment.reliefPathToken).toBeTruthy();
        expectBcsCopy(t(assessment.threatContextToken!.key, assessment.threatContextToken!.params, 'bcs'));
        expectBcsCopy(t(assessment.dominantReasonToken!.key, assessment.dominantReasonToken!.params, 'bcs'));
        expectBcsCopy(t(assessment.reliefPathToken!.key, assessment.reliefPathToken!.params, 'bcs'));
    });

    it('renders Army HQ and Operation Briefing constraint copy through BCS tokens', () => {
        setLocale('bcs', undefined);
        const assessment = deriveCorpsSituationAssessment(
            {
                threat_assessment: { overall_pressure: 'critical', enemy_concentration_zones: ['north'] },
                force_assessment: { total_brigades: 4, combat_effective: 4, total_surplus: 1 },
                zone_assessments: [],
            },
            'balanced',
            10,
            0,
        );

        const army = render(React.createElement(CorpsSituationSection, { assessment }));
        const armyCopy = army.container.textContent ?? '';
        cleanup();

        const briefing = render(React.createElement(OperationConstraintContext, { assessment }));
        const briefingCopy = briefing.container.textContent ?? '';

        expectBcsCopy(armyCopy);
        expectBcsCopy(briefingCopy);
    });
});
