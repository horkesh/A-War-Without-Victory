import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ForceReadiness, readinessGradeLabel, type CorpsReadiness } from '../../src/ui/map/components/army_hq/ForceReadiness.js';
import { ThreatAssessment } from '../../src/ui/map/components/army_hq/ThreatAssessment.js';
import { t } from '../../src/ui/map/i18n/index.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

function bcsMarkup(element: React.ReactElement): string {
    setLocale('bcs', undefined);
    try {
        return renderToStaticMarkup(element);
    } finally {
        setLocale('en', undefined);
    }
}

describe('Army HQ readiness and threat copy', () => {
    it('renders ForceReadiness labels through BCS copy instead of English staff labels', () => {
        const item: CorpsReadiness = {
            corpsId: 'corps_1',
            corpsName: '1st Corps',
            grade: 'COMBAT READY',
            ineffectiveCount: 2,
            totalBrigades: 5,
            avgFatigue: 7,
            avgCohesion: 82,
            disruptedCount: 1,
            overextendedCount: 1,
            activeOpName: 'Test Operation',
            activeOpBrigadeCount: 3,
            hasThreat: true,
            recommendation: 'Reinforce front sectors',
        };

        const html = bcsMarkup(createElement(ForceReadiness, { items: [item], onCorpsClick: () => undefined }));

        expect(html).not.toContain('FORCE READINESS');
        expect(html).not.toContain('COMBAT READY');
        expect(html).not.toContain('INCOMING');
        expect(html).not.toContain('fatigue');
        expect(html).not.toContain('ineff');
        expect(html).not.toContain('disrupted');
        expect(html).not.toContain('overextended');
        expect(html).not.toContain('Reinforce front sectors');
        expect(html).not.toContain('Corps</button>');
    });

    it('renders ThreatAssessment chrome through BCS copy instead of English section labels', () => {
        const html = bcsMarkup(createElement(ThreatAssessment, {
            items: [
                {
                    id: 'threat-1',
                    severity: 'offensive',
                    title: 'Front pressure',
                    detail: 'Enemy attack likely',
                    friendlyCorpsId: 'corps_1',
                },
            ],
            onCorpsClick: () => undefined,
        }));

        expect(html).not.toContain('THREAT ASSESSMENT');
        expect(html).not.toContain('OFFENSIVE THREATS');
        expect(html).not.toContain('Front</button>');
    });

    it('renders shared corps-card readiness labels through BCS copy', () => {
        setLocale('bcs', undefined);
        try {
            expect(readinessGradeLabel('COMBAT READY')).not.toBe('COMBAT READY');
            expect(t('armyHqCorps.readinessVitals', { fatigue: 7, cohesion: 82 })).not.toContain('fatigue');
            expect(t('armyHq.commandAccessReadiness', { grade: readinessGradeLabel('DEGRADED') })).not.toContain('DEGRADED');
        } finally {
            setLocale('en', undefined);
        }
    });
});
