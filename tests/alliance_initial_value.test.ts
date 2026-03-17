import { describe, it, expect } from 'vitest';
import { DEFAULT_INIT_ALLIANCE } from '../src/sim/early_war/alliance_update.js';

describe('alliance initial value', () => {
    it('starts at 0.75 (functional cooperation)', () => {
        expect(DEFAULT_INIT_ALLIANCE).toBe(0.75);
    });

    it('is above strong alliance threshold (0.50)', () => {
        expect(DEFAULT_INIT_ALLIANCE).toBeGreaterThan(0.50);
    });
});
