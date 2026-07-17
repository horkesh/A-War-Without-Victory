import { describe, expect, it } from 'vitest';

import * as retiredModule from '../src/state/deterministic_random.js';

describe('retired seeded utility module', () => {
    it('exports no pseudo-random simulation API', () => {
        expect(Object.keys(retiredModule)).toEqual([]);
    });
});
