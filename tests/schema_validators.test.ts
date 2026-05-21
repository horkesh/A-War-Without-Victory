import { describe, expect, it } from 'vitest';

import {
    asArray,
    asBoolean,
    asFiniteNumber,
    asRecord,
    asString,
    asTypedArray,
} from '../src/state/schema_validators.js';

describe('schema_validators primitives', () => {
    it('asRecord narrows plain objects and rejects arrays/null/primitives', () => {
        expect(asRecord({})).toEqual({});
        expect(asRecord({ a: 1 })).toEqual({ a: 1 });
        expect(asRecord(null)).toBeNull();
        expect(asRecord([])).toBeNull();
        expect(asRecord([1, 2])).toBeNull();
        expect(asRecord('a')).toBeNull();
        expect(asRecord(0)).toBeNull();
        expect(asRecord(undefined)).toBeNull();
        expect(asRecord(true)).toBeNull();
    });

    it('asArray narrows arrays and rejects array-like objects', () => {
        expect(asArray([])).toEqual([]);
        expect(asArray([1, 'a', null])).toEqual([1, 'a', null]);
        expect(asArray({ length: 0 })).toBeNull();
        expect(asArray('a')).toBeNull();
        expect(asArray(null)).toBeNull();
        expect(asArray(undefined)).toBeNull();
    });

    it('asString accepts strings (including empty) and rejects everything else', () => {
        expect(asString('a')).toBe('a');
        expect(asString('')).toBe('');
        expect(asString(0)).toBeNull();
        expect(asString(null)).toBeNull();
        expect(asString(undefined)).toBeNull();
        expect(asString(false)).toBeNull();
        expect(asString({})).toBeNull();
    });

    it('asFiniteNumber accepts finite numbers (including 0) and rejects NaN/Infinity/non-numbers', () => {
        expect(asFiniteNumber(0)).toBe(0);
        expect(asFiniteNumber(1.5)).toBe(1.5);
        expect(asFiniteNumber(-100)).toBe(-100);
        expect(asFiniteNumber(NaN)).toBeNull();
        expect(asFiniteNumber(Infinity)).toBeNull();
        expect(asFiniteNumber(-Infinity)).toBeNull();
        expect(asFiniteNumber('1')).toBeNull();
        expect(asFiniteNumber(null)).toBeNull();
        expect(asFiniteNumber(undefined)).toBeNull();
    });

    it('asBoolean accepts booleans exactly and does not coerce', () => {
        expect(asBoolean(true)).toBe(true);
        expect(asBoolean(false)).toBe(false);
        expect(asBoolean(0)).toBeNull();
        expect(asBoolean(1)).toBeNull();
        expect(asBoolean('true')).toBeNull();
        expect(asBoolean(null)).toBeNull();
        expect(asBoolean(undefined)).toBeNull();
    });

    it('asTypedArray filters items by parser, preserves order, returns [] for empty', () => {
        const isNumber = (x: unknown): number | null =>
            typeof x === 'number' && Number.isFinite(x) ? x : null;

        expect(asTypedArray([1, 'a', 2, null, 3], isNumber)).toEqual([1, 2, 3]);
        expect(asTypedArray([], isNumber)).toEqual([]);
        expect(asTypedArray(['a', null, false], isNumber)).toEqual([]);

        const parseStringEntry = (x: unknown): string | null =>
            typeof x === 'string' ? x : null;
        expect(asTypedArray(['a', 1, 'b', 'c'], parseStringEntry)).toEqual(['a', 'b', 'c']);
    });
});
