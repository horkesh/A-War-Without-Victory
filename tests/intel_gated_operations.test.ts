import { describe, it, expect } from 'vitest';
import { getSectorIntelConfidence } from '../src/sim/combat/sector_intel.js';
import { shouldLaunchProbeInstead } from '../src/sim/combat/bot_corps_directives.js';
import type { GameState } from '../src/state/game_state.js';

describe('getSectorIntelConfidence', () => {
    it('returns 0 when no sector_intel exists', () => {
        const state = { military: {} } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:1')).toBe(0);
    });

    it('returns 0 when sector has no intel records', () => {
        const state = {
            military: { sector_intel: { 'sector:1': [] } },
        } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:1')).toBe(0);
    });

    it('returns max confidence across all enemy sector records', () => {
        const state = {
            military: {
                sector_intel: {
                    'sector:1': [
                        { enemy_sector_id: 'enemy:1', confidence: 0.3 },
                        { enemy_sector_id: 'enemy:2', confidence: 0.6 },
                        { enemy_sector_id: 'enemy:3', confidence: 0.1 },
                    ],
                },
            },
        } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:1')).toBe(0.6);
    });

    it('returns 0 for unknown sector id', () => {
        const state = {
            military: { sector_intel: { 'sector:1': [{ enemy_sector_id: 'e:1', confidence: 0.5 }] } },
        } as unknown as GameState;
        expect(getSectorIntelConfidence(state, 'sector:nonexistent')).toBe(0);
    });
});

describe('shouldLaunchProbeInstead', () => {
    it('returns false when intel is above faction threshold (RS)', () => {
        expect(shouldLaunchProbeInstead('RS', 0.40, 0)).toBe(false);
    });

    it('returns true when intel is below faction threshold (RS)', () => {
        expect(shouldLaunchProbeInstead('RS', 0.30, 0)).toBe(true);
    });

    it('returns false when intel is below threshold but max probes reached', () => {
        expect(shouldLaunchProbeInstead('RS', 0.10, 2)).toBe(false);
    });

    it('returns true for RBiH at 0.35 (below 0.40 threshold)', () => {
        expect(shouldLaunchProbeInstead('RBiH', 0.35, 0)).toBe(true);
    });

    it('returns false for RBiH at 0.45 (above 0.40 threshold)', () => {
        expect(shouldLaunchProbeInstead('RBiH', 0.45, 0)).toBe(false);
    });

    it('returns true for HRHB at 0.25 (below 0.30 threshold)', () => {
        expect(shouldLaunchProbeInstead('HRHB', 0.25, 0)).toBe(true);
    });

    it('returns false during RS blitz phase (turn <= 12) regardless of intel', () => {
        expect(shouldLaunchProbeInstead('RS', 0.0, 0, 5)).toBe(false);
    });

    it('returns true for RS after blitz phase with low intel', () => {
        expect(shouldLaunchProbeInstead('RS', 0.10, 0, 20)).toBe(true);
    });
});
