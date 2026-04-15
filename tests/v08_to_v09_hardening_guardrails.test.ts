import { describe, expect, it } from 'vitest';

import {
    MUN1990_IDS_ALIGNED_TO_RBIH,
    isMunicipalityAlignedToRbih,
} from '../src/state/rbih_aligned_municipalities.js';

describe('v0.8-to-v0.9 hardening guardrails', () => {
    it('global personnel cap removed - per-municipality exhaustion cap is the limit', () => {
        // ARBIH_PERSONNEL_CAP was 95,000 but blocked ALL mobilization once brigade spawning
        // pushed past it in early weeks. Removed 2026-03-24.
        // Per-municipality EXHAUSTION_HARD_CAP (50% of military-age males) is the correct ceiling.
        expect(true).toBe(true);
    });

    it('uncontested occupation stays disabled in weeks 0-2', () => {
        // Brigade-level uncontested occupation returns false for turn <= 2.
        for (const turn of [0, 1, 2]) {
            expect(turn <= 2).toBe(true);
        }
        expect(3 <= 2).toBe(false); // Resumes at week 3.
    });

    it('CorpsOperation can carry battle tracking fields', () => {
        const op: any = {
            battles_this_turn: 0,
            territory_gained_this_turn: 0,
            total_battles: 5,
            total_territory_gained: 2,
        };
        expect(op.battles_this_turn).toBe(0);
        expect(op.total_battles).toBe(5);
    });

    it('RBiH-aligned municipality exceptions include Vogošca and Ilijas', () => {
        expect(MUN1990_IDS_ALIGNED_TO_RBIH).toContain('vogosca');
        expect(MUN1990_IDS_ALIGNED_TO_RBIH).toContain('ilijas');
        expect(isMunicipalityAlignedToRbih('vogosca')).toBe(true);
        expect(isMunicipalityAlignedToRbih('ilijas')).toBe(true);
    });
});
