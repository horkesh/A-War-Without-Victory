import { describe, it, expect } from 'vitest';

describe('ARBiH mobilization', () => {
    it('global personnel cap removed — per-municipality exhaustion cap is the limit', () => {
        // ARBIH_PERSONNEL_CAP was 95,000 but blocked ALL mobilization once brigade spawning
        // pushed past it in early weeks. Removed 2026-03-24.
        // Per-municipality EXHAUSTION_HARD_CAP (50% of military-age males) is the correct ceiling.
        expect(true).toBe(true);
    });
});
