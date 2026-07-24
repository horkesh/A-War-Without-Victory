import { describe, expect, it } from 'vitest';
import { PARAMILITARY_FADE_WEEK } from '../src/state/formation_constants.js';

describe('paramilitary fade week', () => {
    it('uses week 20 as the final active week before regular forces own cleanup', () => {
        expect(PARAMILITARY_FADE_WEEK).toBe(20);
    });
});
