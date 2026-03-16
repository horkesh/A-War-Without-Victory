import { describe, it, expect } from 'vitest';
import { SCENARIO_REGISTRY, getScenarioEntry, getAvailableScenarios } from '../src/scenario/scenario_registry';

describe('scenario_registry', () => {
    it('has exactly 6 entries', () => {
        expect(SCENARIO_REGISTRY.length).toBe(6);
    });

    it('each entry has all required fields', () => {
        for (const entry of SCENARIO_REGISTRY) {
            expect(typeof entry.key).toBe('string');
            expect(entry.key.length).toBeGreaterThan(0);
            expect(typeof entry.name).toBe('string');
            expect(typeof entry.description).toBe('string');
            expect(typeof entry.startDate).toBe('string');
            expect(typeof entry.startWeek).toBe('number');
            expect(typeof entry.durationWeeks).toBe('number');
            expect(entry.durationWeeks).toBeGreaterThan(0);
            expect(typeof entry.difficulty).toBe('object');
            expect(typeof entry.available).toBe('boolean');
        }
    });

    it('entries are in chronological order by startWeek', () => {
        for (let i = 1; i < SCENARIO_REGISTRY.length; i++) {
            expect(SCENARIO_REGISTRY[i].startWeek).toBeGreaterThanOrEqual(SCENARIO_REGISTRY[i - 1].startWeek);
        }
    });

    it('available scenarios have non-empty scenarioFile', () => {
        for (const entry of SCENARIO_REGISTRY) {
            if (entry.available) {
                expect(entry.scenarioFile.length).toBeGreaterThan(0);
            }
        }
    });

    it('unavailable scenarios have empty scenarioFile', () => {
        for (const entry of SCENARIO_REGISTRY) {
            if (!entry.available) {
                expect(entry.scenarioFile).toBe('');
            }
        }
    });

    it('getScenarioEntry returns correct entry by key', () => {
        const entry = getScenarioEntry('apr1992_definitive_52w');
        expect(entry).toBeDefined();
        expect(entry!.name).toBe('The War Begins');
    });

    it('getScenarioEntry returns undefined for unknown key', () => {
        expect(getScenarioEntry('nonexistent')).toBeUndefined();
    });

    it('getAvailableScenarios excludes unavailable', () => {
        const available = getAvailableScenarios();
        expect(available.every(e => e.available)).toBe(true);
        expect(available.length).toBe(4);
    });

    it('all three factions have difficulty ratings', () => {
        for (const entry of SCENARIO_REGISTRY) {
            expect(entry.difficulty.RBiH).toBeDefined();
            expect(entry.difficulty.RS).toBeDefined();
            expect(entry.difficulty.HRHB).toBeDefined();
        }
    });
});
