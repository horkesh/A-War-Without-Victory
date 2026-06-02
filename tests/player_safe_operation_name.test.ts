import { describe, expect, it } from 'vitest';
import { getPlayerSafeOperationName } from '../src/ui/map/utils/playerSafeText';

describe('getPlayerSafeOperationName', () => {
    it('passes authored catalog names through unchanged', () => {
        expect(getPlayerSafeOperationName('Operation Sana')).toBe('Operation Sana');
        expect(getPlayerSafeOperationName('Operation Mistral 2')).toBe('Operation Mistral 2');
        expect(getPlayerSafeOperationName('Emergency Defense')).toBe('Emergency Defense');
    });

    it('humanizes a probe slug, resolving the corps and dropping the turn suffix', () => {
        const out = getPlayerSafeOperationName('probe_arbih_1st_corps_t12');
        expect(out).toBe('Probe — 1st Corps');
        expect(out).not.toMatch(/_/);
        expect(out).not.toMatch(/arbih/i);
        expect(out).not.toMatch(/_t12|t12/);
    });

    it('humanizes the "Emergency Defense (corps)" form into an em-dash phrase', () => {
        expect(getPlayerSafeOperationName('Emergency Defense (arbih_1st_corps)')).toBe(
            'Emergency Defense — 1st Corps',
        );
    });

    it('humanizes cmd/sync slugs, including non-corps-suffixed corps ids, and collapses duplication', () => {
        // vrs_drina is a corps id without a `_corps` suffix.
        expect(getPlayerSafeOperationName('cmd_vrs_drina_t8')).toBe('Command — Drina');
        // sync_<a>_<b> resolves both corps.
        expect(getPlayerSafeOperationName('sync_arbih_1st_corps_arbih_2nd_corps')).toBe(
            'Coordinated operation — 1st Corps & 2nd Corps',
        );
        // identical corps collapse to one.
        expect(getPlayerSafeOperationName('sync_arbih_1st_corps_arbih_1st_corps')).toBe(
            'Coordinated operation — 1st Corps',
        );
    });

    it('keeps a human-looking name with no underscore as-is', () => {
        expect(getPlayerSafeOperationName('Una Push')).toBe('Una Push');
    });

    it('preserves an authored prefix while humanizing the rest', () => {
        expect(getPlayerSafeOperationName('HQ: Operation Sana')).toBe('HQ: Operation Sana');
    });

    it('returns a fallback for empty input', () => {
        expect(getPlayerSafeOperationName('')).toBe('Active operation');
        expect(getPlayerSafeOperationName(null)).toBe('Active operation');
    });
});
