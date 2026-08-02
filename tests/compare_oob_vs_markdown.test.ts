import { describe, expect, it } from 'vitest';

import {
    MARKDOWN_SOURCES,
    buildOobComparison,
    countBrigadesInMarkdown,
    normalizeOobBrigades,
} from '../tools/audit/compare_oob_vs_markdown.js';

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

describe('compare_oob_vs_markdown evidence inputs', () => {
    it('reads the three real brigade-list sources and reports their exact table counts', () => {
        expect(MARKDOWN_SOURCES).toEqual({
            RBiH: 'docs/knowledge/ARBIH_APPENDIX_H_FULL_BRIGADE_LIST.md',
            RS: 'docs/knowledge/VRS_APPENDIX_G_FULL_BRIGADE_LIST.md',
            HRHB: 'docs/knowledge/HVO_FULL_BRIGADE_LIST.md',
        });

        const report = buildOobComparison(process.cwd());

        expect(report.markdown_counts).toEqual({ RBiH: 106, RS: 76, HRHB: 35 });
        expect(report.oob_counts.RBiH).toBeGreaterThan(0);
        expect(report.oob_counts.RS).toBeGreaterThan(0);
        expect(report.oob_counts.HRHB).toBeGreaterThan(0);
    });

    it('throws instead of turning a missing evidence file into a zero count', () => {
        expect(() => countBrigadesInMarkdown(
            'docs/knowledge/DOES_NOT_EXIST.md',
            process.cwd(),
        )).toThrow(/evidence file not found/i);
    });
});
