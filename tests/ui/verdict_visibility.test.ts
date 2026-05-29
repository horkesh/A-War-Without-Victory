/**
 * Proof tests for Cluster C verdict visibility helpers.
 *
 * Covers:
 *  - formatOutcomeClass returns correct labels for each outcome class
 *  - getOutcomeClassStyle returns non-empty style for each outcome class
 *  - formatCondemnationFlag returns restrained wording for genocide_condemnation
 *  - formatCondemnationFlag falls back to humanized flag name for unknown flags
 */

import { describe, it, expect } from 'vitest';
import {
    formatOutcomeClass,
    getOutcomeClassStyle,
    formatCondemnationFlag,
} from '../../src/ui/map/components/VerdictScreen';

// ─────────────────────────────────────────────────────────────────────────────
// formatOutcomeClass
// ─────────────────────────────────────────────────────────────────────────────

describe('formatOutcomeClass', () => {
    const cases: Array<[string, string]> = [
        ['strategic_success', 'Strategic Success'],
        ['survival', 'Survival'],
        ['negotiated_escape', 'Negotiated Escape'],
        ['pyrrhic_success', 'Pyrrhic Success'],
        ['hollow_victory', 'Hollow Victory'],
        ['failure', 'Failure'],
        ['collapse', 'Collapse'],
    ];

    for (const [input, expected] of cases) {
        it(`returns '${expected}' for '${input}'`, () => {
            expect(formatOutcomeClass(input)).toBe(expected);
        });
    }

    it('returns "Unknown" for undefined', () => {
        expect(formatOutcomeClass(undefined)).toBe('Unknown');
    });

    it('returns "Unknown" for unrecognized class', () => {
        expect(formatOutcomeClass('total_annihilation')).toBe('Unknown');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// getOutcomeClassStyle
// ─────────────────────────────────────────────────────────────────────────────

describe('getOutcomeClassStyle', () => {
    const knownClasses = [
        'strategic_success',
        'survival',
        'negotiated_escape',
        'pyrrhic_success',
        'hollow_victory',
        'failure',
        'collapse',
    ];

    for (const oc of knownClasses) {
        it(`returns non-empty style for '${oc}'`, () => {
            const style = getOutcomeClassStyle(oc);
            expect(style.length).toBeGreaterThan(0);
            expect(style).not.toBe('bg-panel-card text-text-secondary border border-panel-border');
        });
    }

    it('returns fallback style for undefined', () => {
        expect(getOutcomeClassStyle(undefined)).toBe('bg-panel-card text-text-secondary border border-panel-border');
    });

    it('returns fallback style for unrecognized class', () => {
        expect(getOutcomeClassStyle('unknown_class')).toBe('bg-panel-card text-text-secondary border border-panel-border');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// formatCondemnationFlag
// ─────────────────────────────────────────────────────────────────────────────

describe('formatCondemnationFlag', () => {
    it('returns restrained wording for genocide_condemnation', () => {
        const result = formatCondemnationFlag('genocide_condemnation');
        expect(result).toBe('Condemned for genocide - international tribunal proceedings inevitable');
    });

    it('returns restrained wording for civilian_atrocities', () => {
        const result = formatCondemnationFlag('civilian_atrocities');
        expect(result).toBe('Condemned for systematic atrocities against civilian population');
    });

    it('falls back to humanized flag name for unknown flags', () => {
        const result = formatCondemnationFlag('unknown_flag_name');
        expect(result).toBe('unknown flag name');
    });

    it('humanizes multi-word unknown flags correctly', () => {
        const result = formatCondemnationFlag('ethnic_cleansing_campaign');
        expect(result).toBe('ethnic cleansing campaign');
    });
});
