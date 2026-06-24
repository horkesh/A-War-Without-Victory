import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it } from 'vitest';
import { ForceReadiness, generateForceReadiness, readinessGradeLabel, type CorpsReadiness } from '../../src/ui/map/components/army_hq/ForceReadiness.js';
import { ThreatAssessment } from '../../src/ui/map/components/army_hq/ThreatAssessment.js';
import { generateThreatAssessment } from '../../src/ui/map/components/army_hq/generateThreatAssessment.js';
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

function makeThreatState(overrides: Record<string, unknown> = {}): any {
    return {
        formations: [
            { id: 'corps_1', name: '1st Corps', kind: 'corps', faction: 'RBiH' },
        ],
        corpsFrontSectors: [
            {
                sector_id: 'sector-offensive',
                corps_id: 'corps_1',
                corps_name: '1st Corps',
                display_name: 'Northern line',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segment_count: 1,
                length_edges: 3,
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 0.5,
                threat_ratio: 1.2,
                defensive_power: 20,
                intel_confidence: 0.9,
                offensive_signs: true,
            },
            {
                sector_id: 'sector-hardened',
                corps_id: 'corps_1',
                corps_name: '1st Corps',
                display_name: 'Central line',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segment_count: 1,
                length_edges: 2,
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 0.4,
                threat_ratio: 0.8,
                defensive_power: 18,
                intel_confidence: 0.8,
                offensive_signs: false,
            },
            {
                sector_id: 'sector-gap',
                corps_id: 'corps_1',
                corps_name: '1st Corps',
                display_name: 'Western line',
                faction: 'RBiH',
                opposing_factions: ['RS'],
                edge_ids: [],
                sub_segment_count: 1,
                length_edges: 2,
                assigned_brigade_ids: [],
                reserve_brigade_ids: [],
                density: 0.2,
                threat_ratio: 0.5,
                defensive_power: 8,
                intel_confidence: 0.1,
                offensive_signs: false,
            },
        ],
        sectorIntel: [
            { friendly_sector_id: 'sector-offensive', offensive_signs: true, posture_observed: 'offensive_prep', strength_category: 'dense', confidence: 0.86 },
            { friendly_sector_id: 'sector-offensive', offensive_signs: true, posture_observed: 'offensive_prep', strength_category: 'moderate', confidence: 0.75 },
            { friendly_sector_id: 'sector-hardened', offensive_signs: false, posture: 'defending', posture_observed: 'defending', strength_category: 'fortress', confidence: 0.8 },
            { friendly_sector_id: 'sector-gap', offensive_signs: false, strength_category: 'unknown', confidence: 0.1 },
        ],
        ...overrides,
    };
}

afterEach(() => {
    setLocale('en', undefined);
});

describe('Army HQ readiness and threat copy', () => {
    it('renders ForceReadiness labels through BCS copy instead of English staff labels', () => {
        const item: CorpsReadiness = {
            corpsId: 'corps_1',
            corpsName: '1st Corps',
            grade: 'UNREPORTED',
            ineffectiveCount: 2,
            totalBrigades: 5,
            avgFatigue: 7,
            avgCohesion: 82,
            disruptedCount: 1,
            overextendedCount: 1,
            incompleteAssessmentCount: 0,
            missingAssessmentFields: [],
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

    it('generates typed ForceReadiness recommendation ids instead of using English strings as control flow', () => {
        const items = generateForceReadiness([
            { id: 'corps_1', name: '1st Corps', kind: 'corps', faction: 'RBiH' },
            { id: 'brigade_1', name: '1st Brigade', kind: 'brigade', faction: 'RBiH', readiness: 'ready', status: 'active', corps_id: 'corps_1', personnel: 1200, fatigue: 4, cohesion: 80, morale: 65, officer_quality: 0.6 },
        ] as any, [], 'RBiH', new Set(['corps_1']));

        expect(items).toHaveLength(1);
        expect(items[0]?.recommendationId).toBe('reinforce_front');
        expect(items[0]?.recommendation).toBe('Reinforce front sectors');

        const html = bcsMarkup(createElement(ForceReadiness, { items }));
        expect(html).toContain('Pojacati prednje sektore');
        expect(html).not.toContain('Reinforce front sectors');
    });

    it('excludes active-but-forming brigades from ForceReadiness combat counts', () => {
        const items = generateForceReadiness([
            { id: 'corps_1', name: '1st Corps', kind: 'corps', faction: 'RBiH' },
            { id: 'fielded', name: 'Fielded Brigade', kind: 'brigade', faction: 'RBiH', readiness: 'ready', status: 'active', corps_id: 'corps_1', personnel: 1200, fatigue: 4, cohesion: 80, morale: 65, officer_quality: 0.6 },
            { id: 'forming', name: 'Forming Brigade', kind: 'brigade', faction: 'RBiH', readiness: 'forming', status: 'active', corps_id: 'corps_1', personnel: 900, fatigue: 0, cohesion: 50 },
        ] as any, [], 'RBiH', new Set());

        expect(items[0]?.totalBrigades).toBe(1);
        expect(items[0]?.avgCohesion).toBe(80);
    });

    it('marks sparse grade-critical readiness fields as assessment incomplete', () => {
        const items = generateForceReadiness([
            { id: 'corps_1', name: '1st Corps', kind: 'corps', faction: 'RBiH' },
            { id: 'reported', name: 'Reported Brigade', kind: 'brigade', faction: 'RBiH', readiness: 'ready', status: 'active', corps_id: 'corps_1', personnel: 1200, fatigue: 6, cohesion: 76, morale: 60, officer_quality: 0.6 },
            { id: 'unreported', name: 'Unreported Brigade', kind: 'brigade', faction: 'RBiH', readiness: 'ready', status: 'active', corps_id: 'corps_1', personnel: 1200 },
        ] as any, [], 'RBiH', new Set());

        expect(items[0]?.avgFatigue).toBe(6);
        expect(items[0]?.avgCohesion).toBe(76);
        expect(items[0]?.grade).toBe('UNREPORTED');
        expect(items[0]?.recommendationId).toBe('assessment_incomplete');
        expect(items[0]?.incompleteAssessmentCount).toBe(1);
    });

    it('renders absent force-readiness condition data as unreported', () => {
        const item: CorpsReadiness = {
            corpsId: 'corps_1',
            corpsName: '1st Corps',
            grade: 'UNREPORTED',
            ineffectiveCount: 0,
            totalBrigades: 1,
            avgFatigue: null,
            avgCohesion: null,
            disruptedCount: 0,
            overextendedCount: 0,
            incompleteAssessmentCount: 1,
            missingAssessmentFields: ['fatigue', 'cohesion'],
            hasThreat: false,
            recommendationId: 'assessment_incomplete',
            recommendation: 'Assessment incomplete',
        };

        const html = renderToStaticMarkup(createElement(ForceReadiness, { items: [item] }));
        expect(html).toContain('fatigue unreported');
        expect(html).toContain('ASSESSMENT INCOMPLETE');
        expect(html).not.toContain('fatigue 0/30');
    });

    it('uses the shared fielded tactical boundary for Army HQ modal brigade lists', () => {
        const source = readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8');

        expect(source).toContain('isFieldedTacticalFormation(f)');
        expect(source).not.toContain("f.kind === 'brigade' && f.status === 'active'");
    });

    it('generates BCS threat copy without English intel prose or raw sector ids', () => {
        setLocale('bcs', undefined);
        const items = generateThreatAssessment(makeThreatState(), 'RBiH');
        const copy = items.flatMap(item => [item.title, item.detail]).join(' ');

        expect(items.map(item => item.severity)).toEqual(['offensive', 'hardened', 'gap']);
        expect(copy).not.toMatch(/High confidence|Moderate confidence|Low confidence/i);
        expect(copy).not.toMatch(/enemy strength unknown|limited enemy presence|moderate enemy strength|significant enemy presence|heavily fortified/i);
        expect(copy).not.toMatch(/hostile offensive preparation|hostile defenses consolidating|weak intelligence picture/i);
        expect(copy).not.toMatch(/Strength estimate|sector reporting|sectors reporting|Entrenchment|defensive posture|Blind sector|Reconnaissance/i);
        expect(copy).not.toMatch(/sector-offensive|sector-hardened|sector-gap|sector:/i);
        expect(copy).toMatch(/procjena|izvjestaj|slika/i);
    });
});
