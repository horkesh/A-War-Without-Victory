import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
    djb2Hash,
    deterministicRandom,
    deterministicInt,
    deterministicPick,
} from '../src/state/deterministic_random';

describe('djb2Hash', () => {
    it('returns same value for same input (stability)', () => {
        const a = djb2Hash('hello');
        const b = djb2Hash('hello');
        expect(a).toBe(b);
    });

    it('returns different values for different inputs', () => {
        const a = djb2Hash('hello');
        const b = djb2Hash('world');
        expect(a).not.toBe(b);
    });

    it('returns unsigned (non-negative) values', () => {
        const inputs = ['', 'a', 'test', 'negative?', '\xff\xff\xff'];
        for (const input of inputs) {
            expect(djb2Hash(input)).toBeGreaterThanOrEqual(0);
        }
    });
});

describe('deterministicRandom', () => {
    it('returns value in [0, 1)', () => {
        for (let i = 0; i < 50; i++) {
            const val = deterministicRandom('seed', `ctx_${i}`);
            expect(val).toBeGreaterThanOrEqual(0);
            expect(val).toBeLessThan(1);
        }
    });

    it('is deterministic (same seed+context = same result)', () => {
        const a = deterministicRandom('mySeed', 'myContext');
        const b = deterministicRandom('mySeed', 'myContext');
        expect(a).toBe(b);
    });

    it('varies with different seeds', () => {
        const a = deterministicRandom('seed1', 'ctx');
        const b = deterministicRandom('seed2', 'ctx');
        expect(a).not.toBe(b);
    });

    it('varies with different contexts', () => {
        const a = deterministicRandom('seed', 'ctx1');
        const b = deterministicRandom('seed', 'ctx2');
        expect(a).not.toBe(b);
    });
});

describe('deterministicInt', () => {
    it('returns value within [min, max] inclusive', () => {
        for (let i = 0; i < 50; i++) {
            const val = deterministicInt('seed', `ctx_${i}`, 3, 7);
            expect(val).toBeGreaterThanOrEqual(3);
            expect(val).toBeLessThanOrEqual(7);
        }
    });

    it('100 calls with sequential contexts hit variety of values', () => {
        const values = new Set<number>();
        for (let i = 0; i < 100; i++) {
            values.add(deterministicInt('seed', `seq_${i}`, 0, 9));
        }
        // With 100 calls over 10 possible values, expect at least 5 distinct
        expect(values.size).toBeGreaterThanOrEqual(5);
    });
});

describe('deterministicPick', () => {
    it('returns element from array', () => {
        const items = ['alpha', 'bravo', 'charlie', 'delta'];
        const picked = deterministicPick('seed', 'ctx', items);
        expect(items).toContain(picked);
    });

    it('throws on empty array', () => {
        expect(() => deterministicPick('seed', 'ctx', [])).toThrow('deterministicPick: empty array');
    });
});

describe('no Math.random()', () => {
    it('source file does not contain Math.random', () => {
        const src = readFileSync(
            resolve(__dirname, '../src/state/deterministic_random.ts'),
            'utf-8',
        );
        expect(src).not.toContain('Math.random');
    });
});
