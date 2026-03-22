/**
 * Validates AI Commander decisions against active event constraints.
 * Pure function — no side effects, deterministic.
 *
 * Reads EventConstraints (operation_blocks, doctrine_overrides, scope_restrictions)
 * and rejects decisions that violate active constraints for the given faction/turn.
 */

import type { EventConstraints } from '../events/event_constraints.js';
import type { CorpsDecision, ArmyDecision, ArmyCorpsDirective } from './ai_types.js';
import { munFromOsid } from '../combat/osid_adjacency.js';

export interface ValidationResult {
    valid: boolean;
    violations: string[];
}

/**
 * Validate a CorpsDecision against active event constraints.
 */
export function validateCorpsDecision(
    decision: CorpsDecision,
    constraints: EventConstraints | undefined,
    faction: string,
    currentTurn: number,
): ValidationResult {
    const violations: string[] = [];

    if (!constraints) return { valid: true, violations };

    // Check doctrine overrides — reject stances that conflict with forced stance
    checkDoctrineOverrides(constraints, faction, currentTurn, decision.sector_stances, violations);

    // Check operation blocks — reject operation plans when blocked
    if (decision.operation_plan != null) {
        checkOperationBlocks(constraints, faction, currentTurn, violations);
    }

    // Check scope restrictions on operation targets
    if (decision.operation_plan?.target) {
        checkScopeRestrictions(constraints, faction, currentTurn, [decision.operation_plan.target], violations);
    }

    return { valid: violations.length === 0, violations };
}

/**
 * Validate an ArmyDecision against active event constraints.
 */
export function validateArmyDecision(
    decision: ArmyDecision,
    constraints: EventConstraints | undefined,
    faction: string,
    currentTurn: number,
): ValidationResult {
    const violations: string[] = [];

    if (!constraints) return { valid: true, violations };

    // Check doctrine overrides on each corps directive stance
    const stanceMap: Record<string, string> = {};
    for (const [corpsId, directive] of Object.entries(decision.corps_directives)) {
        stanceMap[corpsId] = directive.stance;
    }
    checkDoctrineOverrides(constraints, faction, currentTurn, stanceMap, violations);

    // Check operation blocks — reject approvals when blocked
    if (decision.operation_decisions.approve.length > 0) {
        checkOperationBlocks(constraints, faction, currentTurn, violations);
    }

    // Check scope restrictions on offensive targets
    for (const directive of Object.values(decision.corps_directives)) {
        if (directive.offensive_targets && directive.offensive_targets.length > 0) {
            checkScopeRestrictions(constraints, faction, currentTurn, directive.offensive_targets, violations);
        }
    }

    return { valid: violations.length === 0, violations };
}

// ---- Internal helpers ----

function checkDoctrineOverrides(
    constraints: EventConstraints,
    faction: string,
    currentTurn: number,
    stances: Record<string, string>,
    violations: string[],
): void {
    const overrides = (constraints.doctrine_overrides ?? []).filter(
        d => d.faction === faction && d.expires_turn > currentTurn,
    );
    if (overrides.length === 0) return;

    const forcedStance = overrides[0].forced_stance;
    for (const stance of Object.values(stances)) {
        if (isStanceViolation(forcedStance, stance)) {
            violations.push('doctrine_override');
            return; // one violation per category is enough
        }
    }
}

function checkOperationBlocks(
    constraints: EventConstraints,
    faction: string,
    currentTurn: number,
    violations: string[],
): void {
    const blocks = (constraints.operation_blocks ?? []).filter(
        b => b.faction === faction && b.expires_turn > currentTurn,
    );
    if (blocks.length > 0) {
        violations.push('operation_blocked');
    }
}

function checkScopeRestrictions(
    constraints: EventConstraints,
    faction: string,
    currentTurn: number,
    targetOsids: string[],
    violations: string[],
): void {
    const restrictions = (constraints.scope_restrictions ?? []).filter(
        r => r.faction === faction && (r.expires_turn == null || r.expires_turn > currentTurn),
    );
    if (restrictions.length === 0) return;

    for (const osid of targetOsids) {
        const mun = munFromOsid(osid) ?? '';
        for (const restriction of restrictions) {
            if (restriction.blocked_municipalities?.includes(mun)) {
                violations.push('scope_restricted');
                return;
            }
            if (restriction.allowed_municipalities && !restriction.allowed_municipalities.includes(mun)) {
                violations.push('scope_restricted');
                return;
            }
        }
    }
}

/**
 * Returns true if the given stance violates the forced stance constraint.
 * 'defensive' forced stance blocks 'offensive'.
 * 'balanced' forced stance blocks 'offensive'.
 */
function isStanceViolation(forcedStance: string, actualStance: string): boolean {
    if (forcedStance === 'defensive' && actualStance === 'offensive') return true;
    if (forcedStance === 'defensive' && actualStance === 'balanced') return true;
    if (forcedStance === 'balanced' && actualStance === 'offensive') return true;
    return false;
}
