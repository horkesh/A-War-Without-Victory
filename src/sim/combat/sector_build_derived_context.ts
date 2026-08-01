import type { FormationId, FormationState } from '../../state/game_state.js';
import { strictCompare } from '../../state/validateGameState.js';
import { isSectorRosterEligibleFormation } from './sector_roster_eligibility.js';

const MAX_UINT32 = 0xffff_ffff;

export interface FormationOccupancyIndex {
    orderedOsids(): readonly string[];
    ordinalOf(osid: string): number | undefined;
    get(osid: string): number | undefined;
    count(osid: string): number;
    move(formationId: FormationId, from: string | undefined, to: string | undefined): void;
    syncFormation(
        formationId: FormationId,
        previous: FormationState | undefined,
        next: FormationState | undefined,
    ): void;
    assertEquivalent(formations: Readonly<Record<FormationId, FormationState>>): void;
}

function countedLocation(formation: FormationState | null | undefined): string | undefined {
    if (!isSectorRosterEligibleFormation(formation)) return undefined;
    return formation?.location_osid || undefined;
}

class DenseFormationOccupancyIndex implements FormationOccupancyIndex {
    private readonly osids: readonly string[];
    private readonly ordinalByOsid: ReadonlyMap<string, number>;
    private readonly counts: Uint32Array;
    private readonly trackedLocationByFormationId = new Map<FormationId, string>();

    constructor(
        osids: Iterable<string>,
        formations: Readonly<Record<FormationId, FormationState>>,
    ) {
        this.osids = Object.freeze([...new Set(osids)].sort(strictCompare));
        this.ordinalByOsid = new Map(this.osids.map((osid, ordinal) => [osid, ordinal]));
        this.counts = new Uint32Array(this.osids.length);

        for (const formationId of Object.keys(formations).sort(strictCompare)) {
            const formation = formations[formationId];
            const location = countedLocation(formation);
            if (!location) continue;
            this.addTrackedFormation(formationId, location);
        }
    }

    orderedOsids(): readonly string[] {
        return this.osids;
    }

    ordinalOf(osid: string): number | undefined {
        return this.ordinalByOsid.get(osid);
    }

    get(osid: string): number | undefined {
        const count = this.count(osid);
        return count === 0 ? undefined : count;
    }

    count(osid: string): number {
        const ordinal = this.ordinalByOsid.get(osid);
        return ordinal === undefined ? 0 : this.counts[ordinal]!;
    }

    move(
        formationId: FormationId,
        from: string | undefined,
        to: string | undefined,
    ): void {
        const normalizedFrom = from || undefined;
        const normalizedTo = to || undefined;
        const trackedLocation = this.trackedLocationByFormationId.get(formationId);
        if (trackedLocation !== normalizedFrom) {
            throw new Error(
                `FormationOccupancyIndex stale formation location for ${formationId}: `
                + `tracked=${trackedLocation ?? '<none>'}, from=${normalizedFrom ?? '<none>'}`,
            );
        }

        const fromOrdinal = normalizedFrom === undefined
            ? undefined
            : this.requireOrdinal(normalizedFrom);
        const toOrdinal = normalizedTo === undefined
            ? undefined
            : this.requireOrdinal(normalizedTo);

        if (normalizedFrom === normalizedTo) return;
        if (fromOrdinal !== undefined && this.counts[fromOrdinal] === 0) {
            throw new Error(`FormationOccupancyIndex underflow at ${normalizedFrom}`);
        }
        if (toOrdinal !== undefined && this.counts[toOrdinal] === MAX_UINT32) {
            throw new Error(`FormationOccupancyIndex overflow at ${normalizedTo}`);
        }

        if (fromOrdinal !== undefined) {
            this.counts[fromOrdinal] = this.counts[fromOrdinal]! - 1;
        }
        if (toOrdinal !== undefined) {
            this.counts[toOrdinal] = this.counts[toOrdinal]! + 1;
        }

        if (normalizedTo === undefined) {
            this.trackedLocationByFormationId.delete(formationId);
        } else {
            this.trackedLocationByFormationId.set(formationId, normalizedTo);
        }
    }

    syncFormation(
        formationId: FormationId,
        previous: FormationState | undefined,
        next: FormationState | undefined,
    ): void {
        this.assertMatchingId(formationId, previous);
        this.assertMatchingId(formationId, next);
        this.move(formationId, countedLocation(previous), countedLocation(next));
    }

    assertEquivalent(formations: Readonly<Record<FormationId, FormationState>>): void {
        const expectedCounts = new Uint32Array(this.osids.length);
        const expectedLocations = new Map<FormationId, string>();

        for (const formationId of Object.keys(formations).sort(strictCompare)) {
            const formation = formations[formationId];
            const location = countedLocation(formation);
            if (!location) continue;
            const ordinal = this.requireOrdinal(location);
            if (expectedCounts[ordinal] === MAX_UINT32) {
                throw new Error(`FormationOccupancyIndex expected-count overflow at ${location}`);
            }
            expectedCounts[ordinal] = expectedCounts[ordinal]! + 1;
            expectedLocations.set(formationId, location);
        }

        for (let ordinal = 0; ordinal < this.osids.length; ordinal++) {
            if (this.counts[ordinal] !== expectedCounts[ordinal]) {
                throw new Error(
                    `FormationOccupancyIndex count mismatch at ${this.osids[ordinal]}: `
                    + `indexed=${this.counts[ordinal]}, expected=${expectedCounts[ordinal]}`,
                );
            }
        }

        if (this.trackedLocationByFormationId.size !== expectedLocations.size) {
            throw new Error(
                `FormationOccupancyIndex tracked-formation mismatch: `
                + `indexed=${this.trackedLocationByFormationId.size}, expected=${expectedLocations.size}`,
            );
        }
        for (const [formationId, expectedLocation] of expectedLocations) {
            const indexedLocation = this.trackedLocationByFormationId.get(formationId);
            if (indexedLocation !== expectedLocation) {
                throw new Error(
                    `FormationOccupancyIndex location mismatch for ${formationId}: `
                    + `indexed=${indexedLocation ?? '<none>'}, expected=${expectedLocation}`,
                );
            }
        }
    }

    private addTrackedFormation(formationId: FormationId, location: string): void {
        if (this.trackedLocationByFormationId.has(formationId)) {
            throw new Error(`FormationOccupancyIndex duplicate formation id ${formationId}`);
        }
        const ordinal = this.requireOrdinal(location);
        if (this.counts[ordinal] === MAX_UINT32) {
            throw new Error(`FormationOccupancyIndex overflow at ${location}`);
        }
        this.counts[ordinal] = this.counts[ordinal]! + 1;
        this.trackedLocationByFormationId.set(formationId, location);
    }

    private requireOrdinal(osid: string): number {
        const ordinal = this.ordinalByOsid.get(osid);
        if (ordinal === undefined) {
            throw new Error(`FormationOccupancyIndex unknown OSID: ${osid}`);
        }
        return ordinal;
    }

    private assertMatchingId(
        formationId: FormationId,
        formation: FormationState | undefined,
    ): void {
        if (formation && formation.id !== formationId) {
            throw new Error(
                `FormationOccupancyIndex formation id mismatch: key=${formationId}, value=${formation.id}`,
            );
        }
    }
}

export function createFormationOccupancyIndex(
    osids: Iterable<string>,
    formations: Readonly<Record<FormationId, FormationState>>,
): FormationOccupancyIndex {
    return new DenseFormationOccupancyIndex(osids, formations);
}
