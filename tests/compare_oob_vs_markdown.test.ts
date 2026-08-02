import fs from 'node:fs';
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
        expect((report as unknown as { unresolved_mismatches: unknown[] }).unresolved_mismatches).toEqual([]);
        expect((report as unknown as { identity_match_ok: boolean }).identity_match_ok).toBe(true);
    });

    it('throws instead of turning a missing evidence file into a zero count', () => {
        expect(() => countBrigadesInMarkdown(
            'docs/knowledge/DOES_NOT_EXIST.md',
            process.cwd(),
        )).toThrow(/evidence file not found/i);
    });

    it('makes every cross-faction alias an explicit cited operational relation', () => {
        const report = buildOobComparison(process.cwd());
        const matches = report.matched_identities as Array<{
            faction: string;
            evidence_faction?: string;
            oob_id: string;
            alias_reason?: string;
            alias_source_url?: string;
            faction_relation?: string;
        }>;
        const crossFaction = matches.filter((match) => match.evidence_faction !== match.faction);

        expect(crossFaction.map((match) => match.oob_id)).toEqual([
            'hrhb_108th_brko_brigade',
            'hrhb_110th_usora_brigade',
            'hrhb_115th_zrinski_brigade',
        ]);
        for (const match of crossFaction) {
            expect(match.faction_relation).toBe('cross_faction_operational_alignment');
            expect(match.alias_reason?.trim()).toBeTruthy();
            expect(match.alias_source_url).toMatch(/^repo:\/\//);
        }
    });

    it('uses explicit lexical ordering rather than host-locale ordering', () => {
        const source = fs.readFileSync('tools/audit/compare_oob_vs_markdown.ts', 'utf8');
        expect(source).not.toContain('localeCompare');
    });

    it('requires cross-faction repo citations to resolve to a file', () => {
        const source = fs.readFileSync('tools/audit/compare_oob_vs_markdown.ts', 'utf8');
        expect(source).toContain('statSync(resolvedSource).isFile()');
    });
});
