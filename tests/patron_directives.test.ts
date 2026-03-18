import { describe, it, expect } from 'vitest';

describe('patron directives', () => {
    const STANCE_RANK: Record<string, number> = { reorganize: 0, defensive: 1, balanced: 2, offensive: 3 };

    it('defensive ceiling blocks offensive', () => {
        const ceiling = 'defensive';
        const stance = 'offensive';
        const result = STANCE_RANK[stance] > STANCE_RANK[ceiling] ? ceiling : stance;
        expect(result).toBe('defensive');
    });

    it('offensive ceiling allows offensive', () => {
        const ceiling = 'offensive';
        const stance = 'offensive';
        const result = STANCE_RANK[stance] > STANCE_RANK[ceiling] ? ceiling : stance;
        expect(result).toBe('offensive');
    });

    it('defensive ceiling allows defensive', () => {
        const ceiling = 'defensive';
        const stance = 'defensive';
        const result = STANCE_RANK[stance] > STANCE_RANK[ceiling] ? ceiling : stance;
        expect(result).toBe('defensive');
    });
});
