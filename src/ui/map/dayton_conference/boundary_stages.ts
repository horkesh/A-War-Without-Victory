/**
 * The Boundary Map's stages (DC A3, owner adopted 2026-11-08): wartime front → the mediator's
 * opening line → the current draft → the signed line. Dayton drew the inter-entity line, so
 * the map reads by entity (Federation against Republika Srpska); the Federation parties'
 * split is shown inside it. Pure and deterministic: sorted iteration, no state writes.
 */
import type { FactionId } from '../../../state/game_state.js';
import { strictCompare } from '../../../state/validateGameState.js';
import {
    computeSettlementControllersFromFront,
    isSettlementPlan,
    planCellAssignments,
    settlementTerritoryPct,
} from '../../../sim/negotiation/peace_settlement.js';

export type Entity = 'FED' | 'RS';
export type StageId = 'front' | 'opening' | 'draft' | 'signed';
export type Controllers = Readonly<Record<string, string | null | undefined>>;

export interface BoundaryStage {
    id: StageId;
    controllers: Controllers;
}

export type ChangeReason =
    | { kind: 'mediator' }
    | { kind: 'package'; name: string }
    | { kind: 'adjusted' }
    | { kind: 'treaty' };

export interface CellChange {
    osid: string;
    from: string | null;
    to: string | null;
    /** True when the cell crosses the inter-entity line; false for a Federation party swap. */
    acrossLine: boolean;
    reason: ChangeReason;
}

export interface ReasonPackage {
    name: string;
    osids?: readonly string[];
}

export function entityOf(faction: string | null | undefined): Entity | null {
    if (faction === 'RS') return 'RS';
    if (faction === 'RBiH' || faction === 'HRHB') return 'FED';
    return null;
}

/**
 * Cells whose holder differs between two stages, each with a plain reason:
 * - into the opening line: the mediator's map;
 * - into the draft or the signed line: the package that covers the cell, else an adjustment
 *   that follows from the rest of the terms (contiguity, held enclaves); the signed line in
 *   the Verdict has no package list and reads "the treaty".
 */
export function stageChanges(
    previous: Controllers,
    next: BoundaryStage,
    packages: readonly ReasonPackage[] = [],
): CellChange[] {
    const owner = new Map<string, string>();
    for (const pkg of packages) for (const o of pkg.osids ?? []) if (!owner.has(o)) owner.set(o, pkg.name);
    const ids = [...new Set([...Object.keys(previous), ...Object.keys(next.controllers)])].sort(strictCompare);
    const out: CellChange[] = [];
    for (const osid of ids) {
        const from = previous[osid] ?? null;
        const to = next.controllers[osid] ?? null;
        if (from === to || to === null) continue;
        const pkgName = owner.get(osid);
        const reason: ChangeReason = next.id === 'opening' ? { kind: 'mediator' }
            : pkgName ? { kind: 'package', name: pkgName }
                : next.id === 'signed' && packages.length === 0 ? { kind: 'treaty' }
                    : { kind: 'adjusted' };
        out.push({ osid, from, to, acrossLine: entityOf(from) !== entityOf(to), reason });
    }
    return out;
}

/** Share of the country by entity, in percent (the engine's area denominator). */
export function entityShares(controllers: Controllers): Record<Entity, number> {
    const clean: Record<string, FactionId> = {};
    for (const o of Object.keys(controllers).sort(strictCompare)) {
        const f = controllers[o];
        if (f === 'RBiH' || f === 'RS' || f === 'HRHB') clean[o] = f;
    }
    const pct = settlementTerritoryPct(clean);
    return { FED: (pct.RBiH ?? 0) + (pct.HRHB ?? 0), RS: pct.RS ?? 0 };
}

/**
 * A refused plan's line, drawn the way its map would fall on today's front (the plan maps are
 * municipal shares filled from wartime control, peace_settlement.ts). Null for a plan without
 * a researched map.
 */
export function refusedPlanControllers(planId: string, wartime: Controllers): Record<string, FactionId> | null {
    if (!isSettlementPlan(planId) || planId === 'dayton') return null;
    const front: Record<string, FactionId> = {};
    for (const o of Object.keys(wartime).sort(strictCompare)) {
        const f = wartime[o];
        if (f) front[o] = f;
    }
    return computeSettlementControllersFromFront(front, planId, {}, planCellAssignments(planId)).controllers;
}
