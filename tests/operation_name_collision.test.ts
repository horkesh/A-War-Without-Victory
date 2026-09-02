/**
 * PHASE 0 ITEM 0.6 — operation-name collision assertion.
 *
 * WHY THIS EXISTS. Emergent operations draw their name from a shared pool
 * (`OPERATION_NAMES` in `src/sim/combat/operation_names.ts`); authored pre-planned operations
 * carry names written into `_ALL_PRE_PLANNED` in `src/sim/combat/pre_planned_operations.ts`
 * — TypeScript, not JSON, which is what defeated the first version of this test.
 * Measured 2026-08-26: **112 pool names, 19 authored operations, zero collisions.**
 * (The Phase 0 plan estimated 27 authored; the real figure is 19.) **Nothing prevents the two sets from
 * overlapping**, and `operation_names.ts` already carries a scar from the last time they did:
 * its header records a fix (`d622b762`) for history op names firing at non-canonical turns.
 *
 * WHY A COLLISION IS EXPENSIVE RATHER THAN COSMETIC. Operation identity is reconstructed from
 * names in several places — `operation_history` entries, AAR matching, ledger prose, and every
 * human investigation. On 2026-08-26 a full day was spent tracing `Operacija Ponos` and
 * `Operacija Naprijed` across three runs; had either name ALSO belonged to an authored
 * operation, every one of those traces would have silently merged two different operations and
 * the conclusions drawn from them would have been unrecoverable. The cost is not a wrong name,
 * it is a wrong attribution that looks correct.
 *
 * This test is an ASSERTION ON A PROPERTY, not a pin on today's numbers: it recomputes both
 * sets from source every run, so adding a pool name or authoring a new operation is checked
 * automatically rather than remembered.
 */
import { describe, it, expect } from 'vitest';
import { OPERATION_NAMES } from '../src/sim/combat/operation_names.js';
import {
    normalizeOperationNameStem,
    RESERVED_HISTORICAL_OPERATION_NAMES,
} from '../src/sim/combat/historical_operation_names.js';
import { _ALL_PRE_PLANNED } from '../src/sim/combat/pre_planned_operations.js';
import { _TRIGGERED_OPS } from '../src/sim/combat/triggered_operations.js';
import { FIFTH_CORPS_OPPORTUNITIES } from '../src/sim/combat/operation_opportunity_catalog_5th_corps.js';
import { CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES } from '../src/sim/combat/operation_opportunity_catalog_central_bosnia.js';
import { FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES } from '../src/sim/combat/operation_opportunity_catalog_federation_western_bosnia.js';

/** Every name the emergent picker can produce, flattened across factions. */
function poolNames(): string[] {
    const pool = OPERATION_NAMES as unknown as Record<string, string[]>;
    return Object.values(pool).flat();
}

/**
 * Every authored operation name, read from the CATALOG ITSELF.
 *
 * A first version of this walked `data/scenarios/**.json` looking for objects that "looked like"
 * an operation. It found ZERO — the pre-planned catalog is TypeScript, not JSON — and the
 * collision assertion below duly passed over an empty set. The liveness test caught it. That is
 * the sixth vacuous-check instance of 2026-08-26 and the first one caught by its own guard
 * rather than by the answer looking too convenient.
 */
function authoredNames(): Map<string, string[]> {
    const found = new Map<string, string[]>();
    for (const op of _ALL_PRE_PLANNED as ReadonlyArray<{ name?: string; faction?: string }>) {
        if (typeof op.name !== 'string') continue;
        const at = found.get(op.name) ?? [];
        const tag = op.faction ?? 'unknown-faction';
        if (!at.includes(tag)) at.push(tag);
        found.set(op.name, at);
    }
    return found;
}

function allCatalogOperationNames(): string[] {
    return [
        ..._ALL_PRE_PLANNED.map((operation) => operation.name),
        ..._TRIGGERED_OPS.map((operation) => operation.name),
        ...FIFTH_CORPS_OPPORTUNITIES.map((operation) => operation.name),
        ...CENTRAL_BOSNIA_VLASIC_OPPORTUNITIES.map((operation) => operation.name),
        ...FEDERATION_WESTERN_BOSNIA_OPPORTUNITIES.map((operation) => operation.name),
    ];
}

describe('operation-name collisions (Phase 0, item 0.6)', () => {
    it('keeps deterministic picker slot counts stable when historical names are replaced', () => {
        // pickOperationName hashes corps+turn modulo the faction pool length.
        // These are the pre-reservation slot counts; changing them globally
        // remaps names and can alter name-keyed operation ordering.
        expect(OPERATION_NAMES.RS).toHaveLength(38);
        expect(OPERATION_NAMES.RBiH).toHaveLength(39);
        expect(OPERATION_NAMES.HRHB).toHaveLength(35);
    });

    it('LIVENESS: both sets are non-empty — a collision check over an empty set proves nothing', () => {
        // Without this, deleting the pool or moving the catalogs would turn the assertion below
        // into a vacuous pass. Five such vacuous checks shipped in this repo on 2026-08-26 alone.
        const pool = poolNames();
        const authored = authoredNames();
        expect(pool.length).toBeGreaterThan(20);
        expect(authored.size).toBeGreaterThan(5);
        // Surfaced so a future reader sees the sizes the assertion actually ran against.
        console.log(`[0.6] pool names: ${pool.length}, authored operations: ${authored.size}`);
    });

    it('no emergent pool name collides with an authored operation name', () => {
        const pool = new Set(poolNames());
        const collisions: string[] = [];
        for (const [name, files] of authoredNames()) {
            if (pool.has(name)) collisions.push(`${name}  (authored for: ${files.join(", ")})`);
        }
        expect(collisions.sort(), collisions.length
            ? `Emergent operations can be handed a name that already belongs to an authored operation. `
              + `Operation identity is reconstructed from names in operation_history, AAR matching and every `
              + `manual trace, so a collision silently MERGES two different operations and the merge looks `
              + `correct. Rename in the pool (not in the catalog — authored names are historical).`
            : undefined,
        ).toEqual([]);
    });

    it('no emergent name semantically borrows a historical catalogue operation name', () => {
        const catalogStems = new Map<string, string[]>();
        for (const name of allCatalogOperationNames()) {
            const stem = normalizeOperationNameStem(name);
            const aliases = catalogStems.get(stem) ?? [];
            aliases.push(name);
            catalogStems.set(stem, aliases);
        }

        const collisions = poolNames()
            .map((name) => ({ name, stem: normalizeOperationNameStem(name) }))
            .filter(({ stem }) => catalogStems.has(stem))
            .map(({ name, stem }) => `${name} -> ${catalogStems.get(stem)!.join(', ')}`)
            .sort();

        expect(collisions).toEqual([]);
    });

    it('keeps every explicitly reserved historical name outside emergent pools', () => {
        const poolStems = new Set(poolNames().map(normalizeOperationNameStem));
        const leaked = RESERVED_HISTORICAL_OPERATION_NAMES
            .filter((name) => poolStems.has(normalizeOperationNameStem(name)))
            .sort();
        expect(leaked).toEqual([]);
    });

    it('the pool itself contains no duplicates within a faction', () => {
        const pool = OPERATION_NAMES as unknown as Record<string, string[]>;
        for (const [faction, names] of Object.entries(pool)) {
            const dupes = names.filter((n, i) => names.indexOf(n) !== i);
            expect(dupes, `duplicate names in the ${faction} pool halve the effective namespace and make two `
                + `distinct operations indistinguishable in history`).toEqual([]);
        }
    });
});
