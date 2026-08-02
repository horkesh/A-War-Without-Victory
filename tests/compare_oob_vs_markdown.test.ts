import { describe, expect, it } from 'vitest';

import { normalizeOobBrigades } from '../tools/audit/compare_oob_vs_markdown.js';

describe('compare_oob_vs_markdown OOB reader', () => {
    it('accepts the canonical top-level brigade array', () => {
        const brigades = [
            { id: 'b-rbih', faction: 'RBiH' },
            { id: 'b-rs', faction: 'RS' },
        ];

        expect(normalizeOobBrigades(brigades)).toEqual(brigades);
    });

    it('keeps compatibility with the legacy wrapped shape', () => {
        const brigades = [{ id: 'b-hrhb', faction: 'HRHB' }];

        expect(normalizeOobBrigades({ brigades })).toEqual(brigades);
    });

    it('rejects malformed input instead of silently reporting zero brigades', () => {
        expect(() => normalizeOobBrigades({ brigades: 'not-an-array' })).toThrow(/brigade array/i);
    });
});
