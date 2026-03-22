import { describe, it, expect } from 'vitest';
import { validateCorpsDecision, validateArmyDecision } from '../src/sim/ai_commander/decision_validator.js';
import type { EventConstraints } from '../src/sim/events/event_constraints.js';
import type { CorpsDecision, ArmyDecision } from '../src/sim/ai_commander/ai_types.js';

function makeCorpsDecision(overrides: Partial<CorpsDecision> = {}): CorpsDecision {
    return {
        corps_id: 'vrs_drina',
        faction: 'RS',
        turn: 10,
        sector_stances: {},
        brigade_movements: {},
        assessment: 'test',
        ...overrides,
    };
}

function makeArmyDecision(overrides: Partial<ArmyDecision> = {}): ArmyDecision {
    return {
        faction: 'RS',
        turn: 10,
        corps_directives: {},
        operation_decisions: { approve: [], postpone: [], abort: [] },
        strategic_reasoning: 'test',
        briefing_text: 'test',
        ...overrides,
    };
}

describe('AI decision validation — CorpsDecision', () => {
    it('rejects offensive stance when doctrine override forces defensive', () => {
        const decision = makeCorpsDecision({ sector_stances: { 'sec-1': 'offensive' } });
        const constraints: EventConstraints = {
            doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', expires_turn: 20, reason: 'ceasefire' }],
            operation_blocks: [],
            scope_restrictions: [],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('doctrine_override');
    });

    it('rejects balanced stance when doctrine override forces defensive', () => {
        const decision = makeCorpsDecision({ sector_stances: { 'sec-1': 'balanced' } });
        const constraints: EventConstraints = {
            doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', expires_turn: 20, reason: 'ceasefire' }],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('doctrine_override');
    });

    it('rejects operation plan when faction is blocked', () => {
        const decision = makeCorpsDecision({
            operation_plan: { target: 'op:tuzla:tuzla_1', force: ['brig1'], approach: 'broad_front', timing: 'immediate' },
        });
        const constraints: EventConstraints = {
            operation_blocks: [{ faction: 'RS', reason: 'ceasefire', expires_turn: 20 }],
            doctrine_overrides: [],
            scope_restrictions: [],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('operation_blocked');
    });

    it('accepts valid decision with no constraints', () => {
        const decision = makeCorpsDecision({ sector_stances: { 'sec-1': 'balanced' } });
        const constraints: EventConstraints = { operation_blocks: [], doctrine_overrides: [], scope_restrictions: [] };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(true);
        expect(result.violations).toHaveLength(0);
    });

    it('accepts valid decision with undefined constraints', () => {
        const decision = makeCorpsDecision({ sector_stances: { 'sec-1': 'offensive' } });
        const result = validateCorpsDecision(decision, undefined, 'RS', 10);
        expect(result.valid).toBe(true);
    });

    it('ignores expired constraints', () => {
        const decision = makeCorpsDecision({ sector_stances: { 'sec-1': 'offensive' } });
        const constraints: EventConstraints = {
            doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', expires_turn: 5, reason: 'old' }],
            operation_blocks: [],
            scope_restrictions: [],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(true);
    });

    it('ignores constraints for other factions', () => {
        const decision = makeCorpsDecision({
            operation_plan: { target: 'op:tuzla:tuzla_1', force: ['brig1'], approach: 'broad_front', timing: 'immediate' },
        });
        const constraints: EventConstraints = {
            operation_blocks: [{ faction: 'RBiH', reason: 'ceasefire', expires_turn: 20 }],
            doctrine_overrides: [],
            scope_restrictions: [],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(true);
    });

    it('rejects operation target in blocked municipality', () => {
        const decision = makeCorpsDecision({
            operation_plan: { target: 'op:sarajevo:sarajevo_1', force: ['brig1'], approach: 'concentrated_assault', timing: 'immediate' },
        });
        const constraints: EventConstraints = {
            scope_restrictions: [{
                faction: 'RS',
                blocked_municipalities: ['sarajevo'],
                reason: 'exclusion zone',
            }],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('scope_restricted');
    });

    it('allows defensive stance when doctrine forces defensive', () => {
        const decision = makeCorpsDecision({ sector_stances: { 'sec-1': 'defensive' } });
        const constraints: EventConstraints = {
            doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', expires_turn: 20, reason: 'ceasefire' }],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(true);
    });

    it('accepts null operation_plan without triggering block', () => {
        const decision = makeCorpsDecision({ operation_plan: null });
        const constraints: EventConstraints = {
            operation_blocks: [{ faction: 'RS', reason: 'ceasefire', expires_turn: 20 }],
        };
        const result = validateCorpsDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(true);
    });
});

describe('AI decision validation — ArmyDecision', () => {
    it('rejects offensive corps directive when doctrine forces defensive', () => {
        const decision = makeArmyDecision({
            corps_directives: { 'vrs_drina': { stance: 'offensive' } },
        });
        const constraints: EventConstraints = {
            doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', expires_turn: 20, reason: 'ceasefire' }],
        };
        const result = validateArmyDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('doctrine_override');
    });

    it('rejects operation approvals when blocked', () => {
        const decision = makeArmyDecision({
            operation_decisions: { approve: ['op-1'], postpone: [], abort: [] },
        });
        const constraints: EventConstraints = {
            operation_blocks: [{ faction: 'RS', reason: 'ceasefire', expires_turn: 20 }],
        };
        const result = validateArmyDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('operation_blocked');
    });

    it('allows postpones and aborts even when operations are blocked', () => {
        const decision = makeArmyDecision({
            operation_decisions: { approve: [], postpone: ['op-1'], abort: ['op-2'] },
        });
        const constraints: EventConstraints = {
            operation_blocks: [{ faction: 'RS', reason: 'ceasefire', expires_turn: 20 }],
        };
        const result = validateArmyDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(true);
    });

    it('rejects offensive targets in blocked municipalities', () => {
        const decision = makeArmyDecision({
            corps_directives: {
                'vrs_drina': { stance: 'balanced', offensive_targets: ['op:sarajevo:sarajevo_1'] },
            },
        });
        const constraints: EventConstraints = {
            scope_restrictions: [{
                faction: 'RS',
                blocked_municipalities: ['sarajevo'],
                reason: 'exclusion zone',
            }],
        };
        const result = validateArmyDecision(decision, constraints, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('scope_restricted');
    });

    it('accepts valid army decision with undefined constraints', () => {
        const decision = makeArmyDecision({
            corps_directives: { 'vrs_drina': { stance: 'offensive' } },
        });
        const result = validateArmyDecision(decision, undefined, 'RS', 10);
        expect(result.valid).toBe(true);
    });
});
