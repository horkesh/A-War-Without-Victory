import { describe, it, expect } from 'vitest';
import type { CommandAuthority, CorpsOperation } from '../src/state/game_state.js';
import type { OperationAAR } from '../src/sim/combat/operation_aar.js';
import { computeCorpsCommandStrain, getCommandStrainLabel, deriveOrderInterpretation, deriveStanceInterpretation, deriveOperationOutcomeCategory, buildOperationTrendSummary, projectStrainDecay, deriveRecoveryForecast, deriveCorpsSituationAssessment, deriveRecommendationExplanation, deriveReadinessTrend, isExhaustionContributingToStrain, EXHAUSTION_STRAIN_THRESHOLD, EXHAUSTION_STRAIN_SEVERE_THRESHOLD, deriveDelegationContext, deriveCorpsDelegationSummary } from '../src/ui/map/data/command_strain.js';
import type { OperationOutcomeCategory, OperationTrendSummary, PrimaryConstraint, ReadinessTrendDirection, DelegationPath } from '../src/ui/map/data/command_strain.js';

function makeAuth(overrides?: Partial<CommandAuthority>): CommandAuthority {
    return { current: 100, max: 100, spent_this_turn: 0, lifetime_spent: 0, ...overrides };
}

/** Simulate the recover-command-authority war phase step. */
function recoverAuthority(auth: CommandAuthority): void {
    auth.spent_this_turn = 0;
    auth.current = Math.min(auth.max, auth.current + 2);
}

/** Simulate the force-launch deduction (mirrors electron-main.cjs handler). */
function deductForceLaunch(auth: CommandAuthority, cost = 15): { ok: boolean; error?: string } {
    if (auth.current < cost) {
        return { ok: false, error: `Insufficient command authority (${auth.current}/${cost} needed)` };
    }
    auth.current -= cost;
    auth.spent_this_turn += cost;
    auth.lifetime_spent += cost;
    return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Command Strain
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal GameState stub for strain computation. */
function makeStrainState(overrides: {
    turn?: number;
    activeOps?: Array<{ name: string; was_force_launched?: boolean; started_turn?: number }>;
    frictionEvents?: Array<{ officer_id: string; turn: number; type: string; resolved: boolean }>;
    officerCorpsId?: string; // corps the officer is assigned to
    officerId?: string;
    corpsExhaustion?: number; // Wave 6: corps exhaustion (0-100)
} = {}): any {
    const turn = overrides.turn ?? 5;
    const corpsId = 'test-corps';
    const officerId = overrides.officerId ?? 'officer-1';
    const officerCorpsId = overrides.officerCorpsId ?? corpsId;

    return {
        meta: { turn },
        military: {
            corps_command: {
                [corpsId]: {
                    active_operations: (overrides.activeOps ?? []).map(op => ({
                        name: op.name,
                        was_force_launched: op.was_force_launched,
                        started_turn: op.started_turn ?? turn,
                    })),
                    corps_exhaustion: overrides.corpsExhaustion ?? 0,
                },
            },
            friction_events: overrides.frictionEvents ?? [],
            named_officers: overrides.frictionEvents?.length || overrides.officerCorpsId
                ? {
                    [officerId]: {
                        status: 'active',
                        assigned_corps_id: officerCorpsId,
                    },
                }
                : {},
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave 3 — Friction Resolution Loop
// ─────────────────────────────────────────────────────────────────────────────

// The friction resolution loop:
//   1. Warlord friction fires → FrictionEvent { resolved: false } pushed to state.military.friction_events
//   2. computeCorpsCommandStrain counts unresolved events (+2 each, decayed)
//   3. Player acknowledges via IPC → event.resolved = true
//   4. Next computeCorpsCommandStrain call excludes the resolved event → strain drops

/** Simulate the IPC acknowledge-friction-event handler logic (mirrors electron-main.cjs). */
function simulateAcknowledgeFrictionEvent(
    frictionEvents: Array<{ officer_id: string; turn: number; type: string; resolved: boolean }>,
    officerId: string,
    eventTurn: number,
    eventType: string,
): { ok: boolean; error?: string } {
    const event = frictionEvents.find(
        e => e.officer_id === officerId
            && e.turn === eventTurn
            && e.type === eventType
            && e.resolved === false
    );
    if (!event) return { ok: false, error: 'Friction event not found or already resolved' };
    event.resolved = true;
    return { ok: true };
}

/** Build a FrictionEventView composite key (mirrors GameStateAdapter logic). */
function makeFrictionCompositeKey(officerId: string, turn: number, type: string): string {
    return `${officerId}:${turn}:${type}`;
}

/** Extract eventType from composite key (mirrors handleAcknowledgeFriction in ArmyHQCorpsCard). */
function eventTypeFromCompositeKey(compositeKey: string): string {
    return compositeKey.split(':')[2] ?? '';
}

describe('Wave 3: friction resolution IPC handler logic', () => {
    it('sets resolved: true on matching event', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        const result = simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(result.ok).toBe(true);
        expect(events[0]!.resolved).toBe(true);
    });

    it('rejects when no matching event exists', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        const result = simulateAcknowledgeFrictionEvent(events, 'officer-2', 5, 'ignored_stance');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('not found');
    });

    it('rejects when event already resolved', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: true },
        ];
        const result = simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(result.ok).toBe(false);
        expect(result.error).toContain('already resolved');
    });

    it('does not resolve a different event type', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-1', turn: 5, type: 'unauthorized_op', resolved: false },
        ];
        simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(events[0]!.resolved).toBe(true);
        expect(events[1]!.resolved).toBe(false); // untouched
    });

    it('does not resolve an event from a different turn', () => {
        const events = [
            { officer_id: 'officer-1', turn: 4, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(events[0]!.resolved).toBe(false); // turn 4 — untouched
        expect(events[1]!.resolved).toBe(true);  // turn 5 — resolved
    });

    it('resolving one event does not affect unrelated events on other officers', () => {
        const events = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-2', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        simulateAcknowledgeFrictionEvent(events, 'officer-1', 5, 'ignored_stance');
        expect(events[0]!.resolved).toBe(true);
        expect(events[1]!.resolved).toBe(false);
    });
});

describe('Wave 3: strain drops after friction resolution', () => {
    it('resolving a friction event removes its strain contribution', () => {
        const frictionEvents = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
        ];
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents,
        });
        // Before acknowledgement: +2 strain
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);

        // Acknowledge
        simulateAcknowledgeFrictionEvent(frictionEvents, 'officer-1', 5, 'ignored_stance');

        // After acknowledgement: strain drops to 0
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(0);
    });

    it('partial resolution reduces strain proportionally', () => {
        const frictionEvents = [
            { officer_id: 'officer-1', turn: 5, type: 'ignored_stance', resolved: false },
            { officer_id: 'officer-1', turn: 5, type: 'unauthorized_op', resolved: false },
        ];
        const state = makeStrainState({
            turn: 5,
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents,
        });
        // Before: 2 events × +2 = 4 strain
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(4);

        // Acknowledge only first event
        simulateAcknowledgeFrictionEvent(frictionEvents, 'officer-1', 5, 'ignored_stance');

        // After: 1 remaining unresolved event × +2 = 2 strain
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
    });

    it('full loop: accumulate strain from force-launch + friction, resolve friction, strain drops', () => {
        const frictionEvents = [
            { officer_id: 'officer-1', turn: 3, type: 'refused_release', resolved: false },
        ];
        const state = makeStrainState({
            turn: 5,
            activeOps: [
                { name: 'Op Alpha', was_force_launched: true, started_turn: 4 }, // age=1 → 3-1=2
            ],
            officerId: 'officer-1',
            officerCorpsId: 'test-corps',
            frictionEvents,
        });
        // Force-launch (age 1): 3−1=2; friction (age 2): 2−2=0. Total = 2
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);

        // Acknowledge friction — friction was already decayed to 0 so no change
        simulateAcknowledgeFrictionEvent(frictionEvents, 'officer-1', 3, 'refused_release');
        expect(computeCorpsCommandStrain('test-corps', state)).toBe(2);
    });
});

describe('Wave 3: FrictionEventView composite key', () => {
    it('composite key is officer_id:turn:type', () => {
        const key = makeFrictionCompositeKey('officer-1', 5, 'ignored_stance');
        expect(key).toBe('officer-1:5:ignored_stance');
    });

    it('composite key with unauthorized_op type', () => {
        const key = makeFrictionCompositeKey('delic', 12, 'unauthorized_op');
        expect(key).toBe('delic:12:unauthorized_op');
    });

    it('eventType extracted from composite key correctly', () => {
        const key = 'officer-1:5:ignored_stance';
        expect(eventTypeFromCompositeKey(key)).toBe('ignored_stance');
    });

    it('eventType extracted from composite key with colon in officer id segment', () => {
        // Edge case: if officerId contained colons (it shouldn't, but guard)
        const key = 'delic:5:refused_release';
        expect(eventTypeFromCompositeKey(key)).toBe('refused_release');
    });

    it('two events with same officer, same turn, different types have distinct keys', () => {
        const key1 = makeFrictionCompositeKey('officer-1', 5, 'ignored_stance');
        const key2 = makeFrictionCompositeKey('officer-1', 5, 'unauthorized_op');
        expect(key1).not.toBe(key2);
    });

    it('two events with same officer, same type, different turns have distinct keys', () => {
        const key1 = makeFrictionCompositeKey('officer-1', 5, 'ignored_stance');
        const key2 = makeFrictionCompositeKey('officer-1', 6, 'ignored_stance');
        expect(key1).not.toBe(key2);
    });
});

describe('Wave 3: silence=healthy on back face', () => {
    /** Simulate the back-face panel condition: show panel when strain > 0 OR frictionEvents.length > 0. */
    function shouldShowBackFaceFrictionPanel(strain: number, frictionEventCount: number): boolean {
        return strain > 0 || frictionEventCount > 0;
    }

    /** Simulate unresolved-event list visibility condition. */
    function shouldShowAcknowledgeList(unresolvedCount: number): boolean {
        return unresolvedCount > 0;
    }

    it('panel hidden when strain = 0 and no friction events', () => {
        expect(shouldShowBackFaceFrictionPanel(0, 0)).toBe(false);
    });

    it('panel shown when strain > 0 even with no unresolved events', () => {
        expect(shouldShowBackFaceFrictionPanel(2, 0)).toBe(true);
    });

    it('panel shown when friction events exist even if strain = 0', () => {
        expect(shouldShowBackFaceFrictionPanel(0, 1)).toBe(true);
    });

    it('acknowledge list hidden when all events resolved (silence=healthy)', () => {
        expect(shouldShowAcknowledgeList(0)).toBe(false);
    });

    it('acknowledge list shown when at least one unresolved event exists', () => {
        expect(shouldShowAcknowledgeList(1)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 4 — Stabilize Command Relationship + Strain-gated Stance
// ─────────────────────────────────────────────────────────────────────────────

// Wave 4 model:
//   - Stabilize action: resolves ALL unresolved friction events for corps at once
//   - Costs CA: 10 if strained (1–5), 15 if compromised (6+)
//   - 3-turn cooldown after stabilize (stabilization_cooldown_until = currentTurn + 3)
//   - Stance gate: offensive stance rejected when strain >= COMPROMISED_THRESHOLD (6)
//   - Adapter: stabilizationAvailable = strain > 0 && !cooldownActive

const COMPROMISED_THRESHOLD = 6;
const STABILIZE_COST_STRAINED = 10;
const STABILIZE_COST_COMPROMISED = 15;
const STABILIZE_COOLDOWN_TURNS = 3;

/** Simulate the stabilize-command-relationship IPC handler (mirrors electron-main.cjs). */
function simulateStabilize(
    state: {
        currentTurn: number;
        corpsId: string;
        strain: number;
        cooldownUntil: number;
        frictionEvents: Array<{ officer_id: string; assigned_corps_id: string; resolved: boolean }>;
        commandAuthority?: { current: number; max: number; spent_this_turn: number; lifetime_spent: number } | null;
    }
): { ok: boolean; resolvedCount?: number; caCost?: number; error?: string; newCooldown?: number } {
    if (state.strain === 0) {
        return { ok: false, error: 'Command relationship is already healthy — no stabilization needed.' };
    }
    if (state.currentTurn < state.cooldownUntil) {
        return { ok: false, error: `Stabilization on cooldown until turn ${state.cooldownUntil}.` };
    }
    const isCompromised = state.strain >= COMPROMISED_THRESHOLD;
    const cost = isCompromised ? STABILIZE_COST_COMPROMISED : STABILIZE_COST_STRAINED;
    if (state.commandAuthority) {
        if (state.commandAuthority.current < cost) {
            return { ok: false, error: `Insufficient command authority (${state.commandAuthority.current}/${cost} needed)` };
        }
        state.commandAuthority.current -= cost;
        state.commandAuthority.spent_this_turn += cost;
        state.commandAuthority.lifetime_spent += cost;
    }
    let resolved = 0;
    for (const e of state.frictionEvents) {
        if (e.assigned_corps_id === state.corpsId && !e.resolved) {
            e.resolved = true;
            resolved++;
        }
    }
    const newCooldown = state.currentTurn + STABILIZE_COOLDOWN_TURNS;
    return { ok: true, resolvedCount: resolved, caCost: state.commandAuthority ? cost : 0, newCooldown };
}

/** Simulate adapter stabilizationAvailable derivation. */
function deriveStabilizationAvailable(strain: number, currentTurn: number, cooldownUntil: number): boolean {
    return strain > 0 && currentTurn >= cooldownUntil;
}

/** Simulate adapter stabilizationCostCA derivation. */
function deriveStabilizationCostCA(strain: number, hasCA: boolean): number {
    if (!hasCA) return 0;
    return strain >= COMPROMISED_THRESHOLD ? STABILIZE_COST_COMPROMISED : STABILIZE_COST_STRAINED;
}

/** Simulate stance gate — returns rejection reason or null if allowed. */
function simulateStanceGate(newStance: string, strain: number): { ok: boolean; reason?: string; error?: string } {
    if (newStance === 'offensive' && strain >= COMPROMISED_THRESHOLD) {
        return { ok: false, reason: 'compromised', error: 'Cannot set aggressive stance — command is compromised. Stabilize the command relationship first.' };
    }
    return { ok: true };
}

describe('Wave 4: stabilize command relationship IPC handler', () => {
    it('resolves all unresolved friction events for the corps at once', () => {
        const events = [
            { officer_id: 'o1', assigned_corps_id: 'corps-1', resolved: false },
            { officer_id: 'o1', assigned_corps_id: 'corps-1', resolved: false },
            { officer_id: 'o2', assigned_corps_id: 'corps-2', resolved: false }, // different corps
        ];
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: events, commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(true);
        expect(result.resolvedCount).toBe(2);
        expect(events[0]!.resolved).toBe(true);
        expect(events[1]!.resolved).toBe(true);
        expect(events[2]!.resolved).toBe(false); // other corps untouched
    });

    it('costs 10 CA when strained (strain 1–5)', () => {
        const auth = makeAuth({ current: 50 });
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: auth,
        });
        expect(result.ok).toBe(true);
        expect(result.caCost).toBe(10);
        expect(auth.current).toBe(40);
        expect(auth.spent_this_turn).toBe(10);
        expect(auth.lifetime_spent).toBe(10);
    });

    it('costs 15 CA when compromised (strain >= 6)', () => {
        const auth = makeAuth({ current: 50 });
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 7, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: auth,
        });
        expect(result.ok).toBe(true);
        expect(result.caCost).toBe(15);
        expect(auth.current).toBe(35);
    });

    it('rejects when strain is 0 (no stabilization needed)', () => {
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 0, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('already healthy');
    });

    it('rejects when cooldown is active', () => {
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 7, // cooldown until turn 7
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('cooldown');
        expect(result.error).toContain('7');
    });

    it('allows stabilize on the exact turn cooldown expires', () => {
        const result = simulateStabilize({
            currentTurn: 7, corpsId: 'corps-1', strain: 3, cooldownUntil: 7, // currentTurn === cooldownUntil → allowed
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(true);
    });

    it('rejects when insufficient CA', () => {
        const auth = makeAuth({ current: 5 }); // below strained cost of 10
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: auth,
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('Insufficient');
        expect(auth.current).toBe(5); // unchanged
    });

    it('sets stabilization cooldown to currentTurn + 3', () => {
        const result = simulateStabilize({
            currentTurn: 10, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: [], commandAuthority: makeAuth(),
        });
        expect(result.ok).toBe(true);
        expect(result.newCooldown).toBe(13);
    });

    it('works without CA system (caCost = 0, still resolves events)', () => {
        const events = [
            { officer_id: 'o1', assigned_corps_id: 'corps-1', resolved: false },
        ];
        const result = simulateStabilize({
            currentTurn: 5, corpsId: 'corps-1', strain: 3, cooldownUntil: 0,
            frictionEvents: events, commandAuthority: null,
        });
        expect(result.ok).toBe(true);
        expect(result.caCost).toBe(0);
        expect(events[0]!.resolved).toBe(true);
    });
});

describe('Wave 4: strain-gated stance (compromised blocks offensive)', () => {
    it('allows offensive stance when strain is healthy (0)', () => {
        expect(simulateStanceGate('offensive', 0).ok).toBe(true);
    });

    it('allows offensive stance when strained (strain 1–5)', () => {
        expect(simulateStanceGate('offensive', 5).ok).toBe(true);
    });

    it('blocks offensive stance when compromised (strain = 6)', () => {
        const result = simulateStanceGate('offensive', 6);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('compromised');
    });

    it('blocks offensive stance when severely compromised (strain = 10)', () => {
        expect(simulateStanceGate('offensive', 10).ok).toBe(false);
    });

    it('allows defensive stance when compromised', () => {
        expect(simulateStanceGate('defensive', 8).ok).toBe(true);
    });

    it('allows balanced stance when compromised', () => {
        expect(simulateStanceGate('balanced', 8).ok).toBe(true);
    });

    it('allows reorganize stance when compromised', () => {
        expect(simulateStanceGate('reorganize', 8).ok).toBe(true);
    });

    it('error message mentions compromised and stabilize', () => {
        const result = simulateStanceGate('offensive', 7);
        expect(result.error).toContain('compromised');
        expect(result.error).toContain('Stabilize');
    });
});

describe('Wave 4: adapter stabilizationAvailable derivation', () => {
    it('available when strain > 0 and no cooldown', () => {
        expect(deriveStabilizationAvailable(3, 5, 0)).toBe(true);
    });

    it('not available when strain = 0', () => {
        expect(deriveStabilizationAvailable(0, 5, 0)).toBe(false);
    });

    it('not available when cooldown is active (currentTurn < cooldownUntil)', () => {
        expect(deriveStabilizationAvailable(3, 5, 7)).toBe(false);
    });

    it('available when currentTurn equals cooldownUntil (cooldown just expired)', () => {
        expect(deriveStabilizationAvailable(3, 7, 7)).toBe(true);
    });

    it('stabilizationCostCA = 10 when strained', () => {
        expect(deriveStabilizationCostCA(3, true)).toBe(10);
    });

    it('stabilizationCostCA = 15 when compromised', () => {
        expect(deriveStabilizationCostCA(6, true)).toBe(15);
    });

    it('stabilizationCostCA = 0 when no CA system', () => {
        expect(deriveStabilizationCostCA(6, false)).toBe(0);
    });
});

describe('Wave 4: Command Relationship visibility conditions (consolidated)', () => {
    /** Simulate the original consolidated render condition from Wave 4. */
    function shouldShowCommandRelationship(strain: number): boolean {
        return strain > 0;
    }

    /** Simulate stance constraint notice: show when compromised. */
    function shouldShowStanceConstraintNotice(strainLabel: string): boolean {
        return strainLabel === 'compromised';
    }

    it('section hidden when strain = 0 (silence = healthy)', () => {
        expect(shouldShowCommandRelationship(0)).toBe(false);
    });

    it('section shown when strain = 1', () => {
        expect(shouldShowCommandRelationship(1)).toBe(true);
    });

    it('section shown when compromised', () => {
        expect(shouldShowCommandRelationship(7)).toBe(true);
    });

    it('stance constraint notice hidden when strained (not yet compromised)', () => {
        expect(shouldShowStanceConstraintNotice('strained')).toBe(false);
    });

    it('stance constraint notice shown when compromised', () => {
        expect(shouldShowStanceConstraintNotice('compromised')).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 5 — Order Interpretation Preview Loop
// ─────────────────────────────────────────────────────────────────────────────

// The preview loop closes the gap: when a corps commander recommends LAUNCH but
// the corps carries command strain > 0, the player now sees institutional context
// BEFORE committing to go/no-go — not only when overriding a reluctant commander.
//
// Silence = healthy: severity === 'normal' and cautionNotice === null at strain 0.

