/**
 * One operative assignment per power (DC plan, stage 3; amendment A4, 2026-11-08).
 *
 * The Dayton table grew two vocabularies for the same powers: the six legacy
 * centralized/decentralized toggles (`institutional_choices`, Phase 1) and the
 * Annex-4 competency matrix plus constitutional choices (`competency_allocation`,
 * `constitutional_choices`, the 2026-06-07 expansion). They were resolved
 * independently, so a signed treaty could carry "Police Forces: decentralized" and
 * "Police: State" on one sheet (seen in the packaged clause-review proof).
 *
 * This module names the overlap and reconciles it with a fixed precedence:
 *
 *   explicit operative slot  >  explicit legacy toggle  >  historical default
 *
 * The competency and constitutional rows are the OPERATIVE division of powers; the
 * legacy toggles are a projection kept for save compatibility, the legacy cost path
 * and the entity-autonomy index. Costs are not changed here: a legacy toggle still
 * prices through `getInstitutionalCost`, an operative slot through the dial-adjusted
 * competency/constitutional cost. Reconciliation only rewrites a legacy toggle that
 * contradicts an explicit operative slot, and after resolution mirrors whichever side
 * was explicit onto the other, so the record and the binder show one answer.
 *
 * Deterministic: constant table, sorted iteration, pure functions.
 */
import type {
    CompetencyOwnerChoice,
    DaytonProposal,
    DaytonResult,
} from '../../state/negotiation_types.js';
import { strictCompare } from '../../state/validateGameState.js';
import { getCompetencyById } from './competency_packages.js';
import { getConstitutionalChoiceById } from './constitutional_packages.js';

export type LegacyChoice = 'centralized' | 'decentralized';

/** A legacy toggle and the operative slot that carries the same power. */
export interface PowerOverlap {
    legacy: string;
    kind: 'competency' | 'constitutional';
    slot: string;
    /** Constitutional only: the option that reads as centralized / decentralized. */
    centralized?: string;
    decentralized?: string;
}

/**
 * The overlap table. `economy` maps to taxation (fiscal autonomy), not to the
 * central bank: Dayton created a Central Bank and common currency but left fiscal
 * policy with the entities, which is what the legacy toggle's historical default
 * (decentralized) describes. Presidency maps to the constitutional presidency slot.
 */
export const POWER_OVERLAP: readonly PowerOverlap[] = Object.freeze([
    { legacy: 'military', kind: 'competency', slot: 'comp_defense' },
    { legacy: 'police', kind: 'competency', slot: 'comp_police' },
    { legacy: 'judiciary', kind: 'competency', slot: 'comp_judiciary' },
    { legacy: 'education', kind: 'competency', slot: 'comp_education' },
    { legacy: 'economy', kind: 'competency', slot: 'comp_taxation' },
    {
        legacy: 'presidency', kind: 'constitutional', slot: 'arch_presidency',
        centralized: 'single_elected', decentralized: 'tripartite_rotating',
    },
] as const);

const BY_LEGACY: ReadonlyMap<string, PowerOverlap> = new Map(POWER_OVERLAP.map(o => [o.legacy, o]));

/** The legacy toggle that an operative slot's value projects to. */
export function legacyFromOperative(overlap: PowerOverlap, value: string): LegacyChoice {
    if (overlap.kind === 'competency') return value === 'state' ? 'centralized' : 'decentralized';
    // A collective civic presidency is not a single elected president, but it removes
    // the entity/ethnic key; in autonomy terms it is state-ward, so it reads centralized.
    return value === overlap.decentralized ? 'decentralized' : 'centralized';
}

/** The operative slot value a legacy toggle implies when the slot is unset. */
export function operativeFromLegacy(overlap: PowerOverlap, choice: LegacyChoice): string {
    if (overlap.kind === 'competency') return choice === 'centralized' ? 'state' : 'entity';
    return (choice === 'centralized' ? overlap.centralized : overlap.decentralized) as string;
}

/** Historical (Annex 4) default of an operative slot. */
export function operativeDefault(overlap: PowerOverlap): string {
    if (overlap.kind === 'competency') return getCompetencyById(overlap.slot)?.default_owner ?? 'entity';
    const choice = getConstitutionalChoiceById(overlap.slot);
    return choice?.options.find(o => o.is_default)?.id ?? (overlap.decentralized as string);
}

interface OperativeFields {
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    constitutional_choices?: Record<string, string>;
}

function operativeValue(fields: OperativeFields, overlap: PowerOverlap): string | undefined {
    return overlap.kind === 'competency'
        ? fields.competency_allocation?.[overlap.slot]
        : fields.constitutional_choices?.[overlap.slot];
}

/**
 * Proposal entry: where a legacy toggle contradicts an explicit operative slot, the
 * operative slot wins and the toggle is rewritten to agree. A legacy toggle with no
 * operative slot set is left alone (it still prices and resolves on the legacy
 * path), and an operative slot with no toggle adds none (no new cost). Returns the
 * same object when nothing changes, so the historical default is byte-identical.
 */
export function reconcileProposalPowers<P extends DaytonProposal>(proposal: P): P {
    let out: P | null = null;
    for (const overlap of POWER_OVERLAP) {
        const op = operativeValue(proposal, overlap);
        if (op === undefined) continue;
        const legacy = proposal.institutional_choices?.[overlap.legacy];
        if (legacy === undefined) continue;
        const derived = legacyFromOperative(overlap, op);
        if (legacy === derived) continue;
        if (!out) out = { ...proposal, institutional_choices: { ...proposal.institutional_choices } };
        out.institutional_choices[overlap.legacy] = derived;
    }
    return out ?? proposal;
}

/**
 * After resolution: one answer per power on the record. An explicit operative slot
 * (present in the resolved dimensions) writes the legacy toggle; a legacy toggle the
 * player raised (`proposedLegacy`) with no operative slot writes the slot when the
 * resolved toggle departs from the slot's historical default. Mutates `legacy` and
 * returns the (possibly extended) operative fields. Sorted, pure over its inputs.
 */
export function reconcileResolvedPowers(
    legacy: Record<string, LegacyChoice>,
    resolved: OperativeFields,
    proposedLegacy: ReadonlyArray<string>,
): OperativeFields {
    const out: OperativeFields = { ...resolved };
    const proposed = new Set(proposedLegacy);
    for (const overlap of POWER_OVERLAP) {
        const op = operativeValue(resolved, overlap);
        if (op !== undefined) {
            legacy[overlap.legacy] = legacyFromOperative(overlap, op);
            continue;
        }
        if (!proposed.has(overlap.legacy)) continue;
        const choice = legacy[overlap.legacy];
        if (!choice) continue;
        const implied = operativeFromLegacy(overlap, choice);
        if (implied === operativeDefault(overlap)) continue;
        if (overlap.kind === 'competency') {
            out.competency_allocation = sortRecord({ ...(out.competency_allocation ?? {}), [overlap.slot]: implied as CompetencyOwnerChoice });
        } else {
            out.constitutional_choices = sortRecord({ ...(out.constitutional_choices ?? {}), [overlap.slot]: implied });
        }
    }
    return out;
}

/**
 * Display and read-model view: the operative value of every overlapping slot, taking
 * an explicit slot first, then an explicit legacy toggle, then the default. Used by
 * the binder so each power is shown once, and by the autonomy readout.
 */
export function effectiveOperativePowers(terms: {
    institutional_choices?: Record<string, LegacyChoice>;
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    constitutional_choices?: Record<string, string>;
}): { competency: Record<string, CompetencyOwnerChoice>; constitutional: Record<string, string> } {
    const competency: Record<string, CompetencyOwnerChoice> = { ...(terms.competency_allocation ?? {}) };
    const constitutional: Record<string, string> = { ...(terms.constitutional_choices ?? {}) };
    for (const overlap of POWER_OVERLAP) {
        if (operativeValue(terms, overlap) !== undefined) continue;
        const legacy = terms.institutional_choices?.[overlap.legacy];
        if (!legacy) continue;
        const implied = operativeFromLegacy(overlap, legacy);
        if (overlap.kind === 'competency') competency[overlap.slot] = implied as CompetencyOwnerChoice;
        else constitutional[overlap.slot] = implied;
    }
    return { competency: sortRecord(competency), constitutional: sortRecord(constitutional) };
}

/**
 * The legacy projection of a set of terms, for readouts that still take the six
 * toggles (entity-autonomy index): explicit operative slots project onto their
 * toggles; other toggles pass through.
 */
export function legacyProjection(terms: {
    institutional_choices?: Record<string, LegacyChoice>;
    competency_allocation?: Record<string, CompetencyOwnerChoice>;
    constitutional_choices?: Record<string, string>;
}): Record<string, LegacyChoice> {
    const out: Record<string, LegacyChoice> = { ...(terms.institutional_choices ?? {}) };
    for (const overlap of POWER_OVERLAP) {
        const op = operativeValue(terms, overlap);
        if (op !== undefined) out[overlap.legacy] = legacyFromOperative(overlap, op);
    }
    return sortRecord(out);
}

/** Legacy toggle ids that an operative slot carries (hidden from one-row-per-power views). */
export function isOverlappedLegacy(legacyId: string): boolean {
    return BY_LEGACY.has(legacyId);
}

/** Narrow a result's operative fields for callers that hold a DaytonResult. */
export function operativeFieldsOf(result: Pick<DaytonResult, 'competency_allocation' | 'constitutional_choices'>): OperativeFields {
    return { competency_allocation: result.competency_allocation, constitutional_choices: result.constitutional_choices };
}

function sortRecord<V>(record: Record<string, V>): Record<string, V> {
    const out: Record<string, V> = {};
    for (const key of Object.keys(record).sort(strictCompare)) out[key] = record[key]!;
    return out;
}
