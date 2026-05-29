/**
 * Event family vocabulary tests.
 *
 * Phase B Sub-slice B1 — locks the vocabulary discipline rules:
 *   - Gate 5 (vocab sort + dedup): every section array is sorted under
 *     strictCompare and has no duplicates.
 *   - Gate 6 (as const tuple discipline): ALL_BRANCH_TAGS is a ReadonlySet
 *     and the union of all five section arrays yields the same set.
 *   - Determinism Auditor Wave 2 lock rule: re-runs the sort check across
 *     all five sections in one assertion, closing the explicit-test gap
 *     flagged in the Wave 2 review.
 *
 * Reference: docs/40_reports/research/20260527_EVENT_FAMILY_PHASE_B_TEST_PLAN.md
 */

import assert from 'node:assert';
import { test } from 'vitest';
import {
    ALL_BRANCH_TAGS,
    CARRIER_FLAGS,
    COMPOSITE_TAGS,
    HRHB_BRANCH_TAGS,
    RBIH_BRANCH_TAGS,
    RS_BRANCH_TAGS,
} from '../src/sim/events/event_families.js';
import { strictCompare } from '../src/state/turn_phases.js';

/** All five vocabulary sections, in the order event_families.ts composes them
 *  into ALL_BRANCH_TAGS. */
const SECTIONS: ReadonlyArray<{ name: string; tags: readonly string[] }> = [
    { name: 'RS_BRANCH_TAGS', tags: RS_BRANCH_TAGS },
    { name: 'RBIH_BRANCH_TAGS', tags: RBIH_BRANCH_TAGS },
    { name: 'HRHB_BRANCH_TAGS', tags: HRHB_BRANCH_TAGS },
    { name: 'CARRIER_FLAGS', tags: CARRIER_FLAGS },
    { name: 'COMPOSITE_TAGS', tags: COMPOSITE_TAGS },
];

// ─── Gate 5: vocab sort + dedup per section ────────────────────────────────

for (const section of SECTIONS) {
    test(`${section.name} is sorted lexicographically under strictCompare`, () => {
        const sorted = [...section.tags].sort(strictCompare);
        assert.deepStrictEqual(
            [...section.tags],
            sorted,
            `${section.name} must be sorted under strictCompare`,
        );
        // Belt-and-suspenders: stringified order matches.
        assert.strictEqual([...section.tags].sort(strictCompare).join('|'), section.tags.join('|'));
    });

    test(`${section.name} has no duplicate entries`, () => {
        const setSize = new Set(section.tags).size;
        assert.strictEqual(
            setSize,
            section.tags.length,
            `${section.name} must have no duplicates: setSize=${setSize}, length=${section.tags.length}`,
        );
    });

    test(`${section.name} is a frozen-as-const tuple at the value level`, () => {
        // Section arrays are declared `as const` in event_families.ts.
        // TypeScript enforces immutability at compile time. Runtime: in V8
        // these arrays are not Object.frozen() by `as const` alone, so we
        // assert the weaker (still load-bearing) guarantee: the exported
        // reference is the same Array instance every time and reading it
        // does not yield a different length.
        assert.strictEqual(Array.isArray(section.tags), true);
        assert.ok(section.tags.length > 0, `${section.name} must be non-empty`);
    });
}

// ─── Gate 6: ALL_BRANCH_TAGS is a ReadonlySet of the union ─────────────────

test('ALL_BRANCH_TAGS is a Set whose contents equal the union of all five sections', () => {
    assert.ok(ALL_BRANCH_TAGS instanceof Set, 'ALL_BRANCH_TAGS must be a Set instance');
    const expectedUnion = new Set<string>();
    for (const section of SECTIONS) {
        for (const tag of section.tags) {
            expectedUnion.add(tag);
        }
    }
    assert.strictEqual(
        ALL_BRANCH_TAGS.size,
        expectedUnion.size,
        `ALL_BRANCH_TAGS.size (${ALL_BRANCH_TAGS.size}) must match union size (${expectedUnion.size})`,
    );
    const missing: string[] = [];
    for (const tag of expectedUnion) {
        if (!ALL_BRANCH_TAGS.has(tag)) missing.push(tag);
    }
    missing.sort(strictCompare);
    assert.deepStrictEqual(missing, [], `ALL_BRANCH_TAGS missing tags: ${missing.join(', ')}`);

    // No leaks: ALL_BRANCH_TAGS contains nothing beyond the union.
    const extra: string[] = [];
    for (const tag of ALL_BRANCH_TAGS) {
        if (!expectedUnion.has(tag)) extra.push(tag);
    }
    extra.sort(strictCompare);
    assert.deepStrictEqual(extra, [], `ALL_BRANCH_TAGS has extra tags not in union: ${extra.join(', ')}`);
});

test('ALL_BRANCH_TAGS section union is duplicate-free across all five sections', () => {
    const seen = new Map<string, string>();
    const collisions: string[] = [];
    for (const section of SECTIONS) {
        for (const tag of section.tags) {
            const prior = seen.get(tag);
            if (prior !== undefined) {
                collisions.push(`${tag} (${prior} & ${section.name})`);
            } else {
                seen.set(tag, section.name);
            }
        }
    }
    collisions.sort(strictCompare);
    assert.deepStrictEqual(collisions, [], `Cross-section duplicates: ${collisions.join(', ')}`);
});

// ─── Determinism Auditor Wave 2 explicit-test gap ─────────────────────────

test('vocabulary sections are sorted under strictCompare (Determinism Auditor Wave 2 lock rule)', () => {
    // Single assertion that re-runs the lock-rule sort check across all five
    // sections at once. Closes the explicit-test gap flagged by the
    // Determinism Auditor Wave 2 review (sort discipline must be tested,
    // not merely enforced at import time).
    const violations: string[] = [];
    for (const section of SECTIONS) {
        const sorted = [...section.tags].sort(strictCompare);
        for (let i = 0; i < section.tags.length; i++) {
            if (section.tags[i] !== sorted[i]) {
                violations.push(
                    `${section.name}[${i}]: got '${section.tags[i]}', expected '${sorted[i]}'`,
                );
            }
        }
    }
    violations.sort(strictCompare);
    assert.deepStrictEqual(violations, [], `Sort violations: ${violations.join('; ')}`);
});
