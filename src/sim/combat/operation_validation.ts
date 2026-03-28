/**
 * Operation injection validation gate.
 *
 * Validates pre-planned and triggered operation definitions BEFORE they are
 * injected into the live game. The gate WARNS but never BLOCKS — existing
 * graceful degradation in buildAxesFromDef/buildOperation handles actual
 * behavior. This makes silent failures VISIBLE.
 *
 * Five checks:
 *   A. all_objectives_owned  — every objective on an axis is already faction-controlled
 *   B. brigade_missing / brigade_ineligible — formation absent or ineligible
 *   C. staging_adjacency — staging OSID not adjacent to first enemy objective
 *   D. axis_empty — axis has 0 valid brigades or 0 valid objectives
 *   E. op_empty — all axes would be dropped
 *
 * Determinism: no Math.random(), no Date.now(). Sorted iteration via strictCompare.
 */

import type { FactionId, FormationId, GameState } from '../../state/game_state.js';
import { getPoliticalControllerOSID } from '../../state/settlement_control.js';
import { isEligibleOperationFormation } from '../../state/formation_constants.js';
import { strictCompare } from '../../state/validateGameState.js';
import type { Osid } from './osid_adjacency.js';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type OpInjectionCheck =
    | 'staging_adjacency'
    | 'brigade_missing'
    | 'brigade_ineligible'
    | 'all_objectives_owned'
    | 'axis_empty'
    | 'op_empty';

export interface OpInjectionWarning {
    op_name: string;
    axis_id?: string;
    check: OpInjectionCheck;
    detail: string;
    severity: 'error' | 'warning';
    turn: number;
}

/** Minimal axis definition accepted by the validator (common subset of AxisDef / TriggeredAxisDef). */
interface ValidatableAxisDef {
    axis_id: string;
    brigades: FormationId[];
    objectives: string[];
    staging_osid?: string;
}

/** Minimal operation definition accepted by the validator. */
export interface ValidatableOpDef {
    name: string;
    faction: FactionId;
    axes: ValidatableAxisDef[];
    staging_osid: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate an operation definition at injection time.
 *
 * @param def       The operation definition (pre-planned or triggered).
 * @param state     Current GameState.
 * @param adjacency Optional OSID adjacency map. When provided, enables
 *                  staging-adjacency checks (Check C). When omitted, Check C
 *                  is silently skipped.
 * @returns Array of warnings (empty = clean injection).
 */
export function validateOpAtInjection(
    def: ValidatableOpDef,
    state: GameState,
    adjacency?: Map<Osid, Osid[]>,
): OpInjectionWarning[] {
    const warnings: OpInjectionWarning[] = [];
    const formations = state.military.formations ?? {};
    const turn = state.meta?.turn ?? 0;

    let validAxisCount = 0;

    for (const axisDef of def.axes) {
        let axisHasValidBrigades = false;
        let axisHasValidObjectives = false;

        // ── Check B: brigade_missing / brigade_ineligible ──────────────
        const sortedBrigades = [...axisDef.brigades].sort(strictCompare);
        for (const fid of sortedBrigades) {
            const formation = formations[fid];
            if (!formation) {
                warnings.push({
                    op_name: def.name,
                    axis_id: axisDef.axis_id,
                    check: 'brigade_missing',
                    detail: `Brigade "${fid}" not found in formations`,
                    severity: 'warning',
                    turn,
                });
                continue;
            }
            if (!isEligibleOperationFormation(formation)) {
                warnings.push({
                    op_name: def.name,
                    axis_id: axisDef.axis_id,
                    check: 'brigade_ineligible',
                    detail: `Brigade "${fid}" ineligible: kind="${formation.kind ?? 'undefined'}", status="${formation.status}"`,
                    severity: 'warning',
                    turn,
                });
                continue;
            }
            axisHasValidBrigades = true;
        }

        // ── Check A: all_objectives_owned ──────────────────────────────
        const sortedObjectives = [...axisDef.objectives].sort(strictCompare);
        let enemyObjectiveCount = 0;
        for (const osid of sortedObjectives) {
            const controller = getPoliticalControllerOSID(state, osid, undefined);
            if (controller !== null && controller !== def.faction) {
                enemyObjectiveCount++;
            }
        }
        if (sortedObjectives.length > 0 && enemyObjectiveCount === 0) {
            warnings.push({
                op_name: def.name,
                axis_id: axisDef.axis_id,
                check: 'all_objectives_owned',
                detail: `All ${sortedObjectives.length} objectives already controlled by ${def.faction}`,
                severity: 'warning',
                turn,
            });
        }
        if (enemyObjectiveCount > 0) {
            axisHasValidObjectives = true;
        }

        // ── Check C: staging_adjacency (only when adjacency provided) ──
        // Use DEFINITION order (march route), not sorted order.
        // Brigades march through already-owned objectives to reach enemy ones,
        // so the first objective in definition order must be adjacent to staging.
        if (adjacency) {
            const staging = axisDef.staging_osid ?? def.staging_osid;
            const firstObjective = axisDef.objectives[0]; // first in definition = first march target
            if (staging && firstObjective && staging !== firstObjective) {
                const neighbors = adjacency.get(staging) ?? [];
                if (!neighbors.includes(firstObjective)) {
                    warnings.push({
                        op_name: def.name,
                        axis_id: axisDef.axis_id,
                        check: 'staging_adjacency',
                        detail: `Staging "${staging}" not adjacent to first objective "${firstObjective}" in march order`,
                        severity: 'error',
                        turn,
                    });
                }
            }
        }

        // ── Check D: axis_empty ────────────────────────────────────────
        if (!axisHasValidBrigades || !axisHasValidObjectives) {
            warnings.push({
                op_name: def.name,
                axis_id: axisDef.axis_id,
                check: 'axis_empty',
                detail: `Axis would be empty: ${!axisHasValidBrigades ? '0 valid brigades' : ''}${(!axisHasValidBrigades && !axisHasValidObjectives) ? ' + ' : ''}${!axisHasValidObjectives ? '0 valid objectives' : ''}`,
                severity: 'warning',
                turn,
            });
        } else {
            validAxisCount++;
        }
    }

    // ── Check E: op_empty ──────────────────────────────────────────────
    if (validAxisCount === 0 && def.axes.length > 0) {
        warnings.push({
            op_name: def.name,
            check: 'op_empty',
            detail: `All ${def.axes.length} axes would be dropped — operation cannot execute`,
            severity: 'error',
            turn,
        });
    }

    return warnings;
}

// ═══════════════════════════════════════════════════════════════════════════
// Console output helper
// ═══════════════════════════════════════════════════════════════════════════

/** Log warnings to console in a compact, readable format. */
export function logOpInjectionWarnings(warnings: OpInjectionWarning[]): void {
    if (warnings.length === 0) return;
    const errors = warnings.filter(w => w.severity === 'error');
    const warns = warnings.filter(w => w.severity === 'warning');
    console.log(`[op-validation] ${warnings.length} issue(s) at injection: ${errors.length} error(s), ${warns.length} warning(s)`);
    for (const w of warnings) {
        const prefix = w.severity === 'error' ? 'ERROR' : 'WARN';
        const axis = w.axis_id ? ` [${w.axis_id}]` : '';
        console.log(`  [${prefix}] ${w.op_name}${axis}: ${w.check} — ${w.detail}`);
    }
}

/** Log + append warnings to state, deduplicating by op_name + axis_id + check. */
export function collectOpInjectionWarnings(state: GameState, warnings: OpInjectionWarning[]): void {
    if (warnings.length === 0) return;
    logOpInjectionWarnings(warnings);
    if (!state.military.op_injection_warnings) state.military.op_injection_warnings = [];
    const existing = state.military.op_injection_warnings;
    for (const w of warnings) {
        const isDupe = existing.some(e => e.op_name === w.op_name && e.axis_id === w.axis_id && e.check === w.check);
        if (!isDupe) existing.push(w);
    }
}
