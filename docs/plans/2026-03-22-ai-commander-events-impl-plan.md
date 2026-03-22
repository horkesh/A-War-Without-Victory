# AI Commander + Event System Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the AI Commander aware of event state — fired events with context, active constraints, aggression modifiers, and pending decisions. Enable Claude to make event decisions in character.

**Architecture:** Three phases. Phase A enriches prompts with event context. Phase B adds `generateEventDecision()` so Claude responds to events instead of `pickBotResponseV1()`. Phase C validates AI decisions against constraints.

**Tech Stack:** TypeScript (sim engine). Vitest for tests. Existing `@anthropic-ai/sdk`.

**Audit reference:** `docs/plans/2026-03-22-integration-audit-findings.md` §2

---

### Task 1: Enrich Army Prompt with Event Context
**Role:** Systems Programmer

**Files:**
- Modify: `src/sim/ai_commander/prompt_builder.ts`
- Test: `tests/ai_commander_prompt.test.ts` (create if not exists)

**Step 1: Write the failing test**

```typescript
import { buildArmyPrompt } from '../src/sim/ai_commander/prompt_builder.js';

describe('army prompt event context', () => {
    it('includes fired event titles when events have fired', () => {
        const state = {
            meta: { turn: 10, player_faction: 'RS' },
            military: {
                formations: {},
                fired_event_ids: ['graz_accords_signed', 'arms_embargo'],
                event_aggression_modifiers: [
                    { faction: 'RS', delta: 0.3, expires_turn: 15 },
                ],
                event_constraints: {
                    operation_blocks: [],
                    scope_restrictions: [],
                    doctrine_overrides: [],
                },
                negotiation: { capital: { RS: {} }, strategic_dimensions: {} },
            },
            political: { political_controllers: {} },
        };
        const prompt = buildArmyPrompt(state as any, 'RS');
        expect(prompt.user).toContain('graz_accords_signed');
        expect(prompt.user).toContain('Aggression modifier');
        expect(prompt.user).toContain('+0.3');
    });

    it('includes active constraints when present', () => {
        const state = {
            meta: { turn: 10 },
            military: {
                formations: {},
                fired_event_ids: [],
                event_aggression_modifiers: [],
                event_constraints: {
                    operation_blocks: [{ faction: 'RS', reason: 'ceasefire', until_turn: 20 }],
                    scope_restrictions: [],
                    doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', until_turn: 15 }],
                },
                negotiation: { capital: { RS: {} }, strategic_dimensions: {} },
            },
            political: { political_controllers: {} },
        };
        const prompt = buildArmyPrompt(state as any, 'RS');
        expect(prompt.user).toContain('OPERATION BLOCKED');
        expect(prompt.user).toContain('FORCED STANCE: defensive');
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai_commander_prompt.test.ts`
Expected: FAIL — prompt doesn't contain event context

**Step 3: Implement — enrich buildArmyPrompt**

In `prompt_builder.ts`, find where `fired_event_ids` are serialized (around line 143-149). Replace the minimal ID list with rich context:

```typescript
// Event context
const firedIds = state.military.fired_event_ids ?? [];
if (firedIds.length > 0) {
    const recent = firedIds.slice(-8);
    lines.push(`\nRecent events fired: ${recent.join(', ')}`);
}

// Active aggression modifiers
const aggrMods = (state.military.event_aggression_modifiers ?? [])
    .filter(m => m.faction === faction && m.expires_turn > (state.meta?.turn ?? 0));
if (aggrMods.length > 0) {
    lines.push(`\nAggression modifiers:`);
    for (const m of aggrMods) {
        lines.push(`  ${m.delta > 0 ? '+' : ''}${m.delta} (expires turn ${m.expires_turn})`);
    }
}

// Active constraints
const constraints = state.military.event_constraints;
if (constraints) {
    const blocks = (constraints.operation_blocks ?? []).filter(b => b.faction === faction);
    if (blocks.length > 0) {
        lines.push(`\nOPERATION BLOCKED: ${blocks.map(b => `${b.reason} until turn ${b.until_turn}`).join('; ')}`);
    }
    const overrides = (constraints.doctrine_overrides ?? []).filter(d => d.faction === faction);
    if (overrides.length > 0) {
        lines.push(`\nFORCED STANCE: ${overrides.map(d => `${d.forced_stance} until turn ${d.until_turn}`).join('; ')}`);
    }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai_commander_prompt.test.ts`
Expected: PASS

**Step 5: Also enrich buildCorpsPrompt with the same constraint/modifier data**

Same pattern — add event context to corps prompts.

**Step 6: Verify full suite**

Run: `npx tsc --noEmit`
Run: `npx vitest run`

**Step 7: Commit**

```bash
git commit -m "feat(ai): enrich army/corps prompts with event context, constraints, aggression mods"
```

---

→ /simplify → commit

---

### Task 2: generateEventDecision — Claude responds to events
**Role:** Systems Programmer

**Files:**
- Create: `src/sim/ai_commander/event_decision_ai.ts`
- Test: `tests/ai_commander_event_decision.test.ts`

**Step 1: Write the failing test**

```typescript
import { buildEventDecisionPrompt } from '../src/sim/ai_commander/event_decision_ai.js';

describe('event decision AI', () => {
    it('builds prompt with event context and response options', () => {
        const eventDef = {
            id: 'drina_cleansing',
            title: 'The Drina Valley Question',
            narrative: 'Reports from the field...',
            response_options: [
                { id: 'systematic', label: 'Systematic cleansing', effects: [] },
                { id: 'restrained', label: 'Restrained approach', effects: [] },
            ],
        };
        const prompt = buildEventDecisionPrompt({} as any, 'RS', eventDef as any);
        expect(prompt.user).toContain('Drina Valley');
        expect(prompt.user).toContain('systematic');
        expect(prompt.user).toContain('restrained');
        expect(prompt.system).toContain('Mladić'); // RS personality
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai_commander_event_decision.test.ts`
Expected: FAIL — module not found

**Step 3: Implement event_decision_ai.ts**

```typescript
import type { GameState, FactionId } from '../../state/game_state.js';
import type { EventDefinition, EventResponseOption } from '../events/event_types.js';
import type { AiClient } from './ai_client.js';
import type { AiPrompt } from './ai_types.js';
import { AI_TEMPERATURE } from './ai_config.js';
import { getPersonalityProfile } from './personality_profiles.js';

const EVENT_DECISION_MODEL = 'claude-haiku-4-5-20251001';
const EVENT_DECISION_MAX_TOKENS = 256;

export function buildEventDecisionPrompt(
    state: GameState,
    faction: FactionId,
    eventDef: EventDefinition,
): AiPrompt {
    const personality = getPersonalityProfile(faction, 'army');
    const options = (eventDef.response_options ?? [])
        .map((o, i) => `${i + 1}. "${o.id}" — ${o.label}${o.description ? `: ${o.description}` : ''}`)
        .join('\n');

    return {
        model: EVENT_DECISION_MODEL,
        max_tokens: EVENT_DECISION_MAX_TOKENS,
        temperature: AI_TEMPERATURE,
        system: personality.system_prompt,
        user: `An event has occurred that requires your decision.

EVENT: ${eventDef.title}
${eventDef.narrative ?? ''}

OPTIONS:
${options}

Respond with a JSON object: { "choice": "<option_id>", "reasoning": "<1-2 sentences>" }
Choose the option that best fits your strategic personality and the current situation.`,
    };
}

export async function generateEventDecision(
    state: GameState,
    faction: FactionId,
    eventDef: EventDefinition,
    client: AiClient | null,
): Promise<EventResponseOption | null> {
    if (!client || !eventDef.response_options?.length) return null;

    const prompt = buildEventDecisionPrompt(state, faction, eventDef);
    try {
        const response = await client.generateDecision(prompt);
        const parsed = JSON.parse(response.content);
        const chosen = eventDef.response_options.find(o => o.id === parsed.choice);
        return chosen ?? eventDef.response_options[0];
    } catch {
        // Fallback to formula bot
        return null;
    }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai_commander_event_decision.test.ts`
Expected: PASS

**Step 5: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run`

**Step 6: Commit**

```bash
git commit -m "feat(ai): generateEventDecision — Claude responds to events in character"
```

---

→ /simplify → commit

---

### Task 3: Constraint Validation for AI Decisions
**Role:** Systems Programmer

**Files:**
- Create: `src/sim/ai_commander/decision_validator.ts`
- Test: `tests/ai_commander_validation.test.ts`

**Step 1: Write the failing test**

```typescript
import { validateCorpsDecision } from '../src/sim/ai_commander/decision_validator.js';

describe('AI decision validation', () => {
    it('rejects offensive stance when doctrine override forces defensive', () => {
        const decision = { sector_stances: { 'sec-1': 'offensive' } };
        const constraints = {
            doctrine_overrides: [{ faction: 'RS', forced_stance: 'defensive', until_turn: 20 }],
            operation_blocks: [],
            scope_restrictions: [],
        };
        const result = validateCorpsDecision(decision as any, constraints as any, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('doctrine_override');
    });

    it('rejects operation launch when faction is blocked', () => {
        const decision = { launch_operation: true };
        const constraints = {
            operation_blocks: [{ faction: 'RS', reason: 'ceasefire', until_turn: 20 }],
            doctrine_overrides: [],
            scope_restrictions: [],
        };
        const result = validateCorpsDecision(decision as any, constraints as any, 'RS', 10);
        expect(result.valid).toBe(false);
        expect(result.violations).toContain('operation_blocked');
    });

    it('accepts valid decision with no constraints', () => {
        const decision = { sector_stances: { 'sec-1': 'balanced' } };
        const constraints = { operation_blocks: [], doctrine_overrides: [], scope_restrictions: [] };
        const result = validateCorpsDecision(decision as any, constraints as any, 'RS', 10);
        expect(result.valid).toBe(true);
    });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/ai_commander_validation.test.ts`
Expected: FAIL — module not found

**Step 3: Implement decision_validator.ts**

```typescript
import type { EventConstraints } from '../events/event_constraints.js';

export interface ValidationResult {
    valid: boolean;
    violations: string[];
}

export function validateCorpsDecision(
    decision: any,
    constraints: EventConstraints,
    faction: string,
    currentTurn: number,
): ValidationResult {
    const violations: string[] = [];

    // Check doctrine overrides
    const overrides = (constraints.doctrine_overrides ?? [])
        .filter(d => d.faction === faction && d.until_turn > currentTurn);
    if (overrides.length > 0) {
        const forcedStance = overrides[0].forced_stance;
        const stances = decision.sector_stances ?? {};
        for (const stance of Object.values(stances)) {
            if (stance !== forcedStance && forcedStance === 'defensive' && stance === 'offensive') {
                violations.push('doctrine_override');
                break;
            }
        }
    }

    // Check operation blocks
    const blocks = (constraints.operation_blocks ?? [])
        .filter(b => b.faction === faction && b.until_turn > currentTurn);
    if (blocks.length > 0 && decision.launch_operation) {
        violations.push('operation_blocked');
    }

    return { valid: violations.length === 0, violations };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/ai_commander_validation.test.ts`
Expected: PASS

**Step 5: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run`

**Step 6: Commit**

```bash
git commit -m "feat(ai): decision_validator — constraint validation for AI Commander decisions"
```

---

## Execution Order

```
Task 1 (prompt enrichment) — independent
Task 2 (event decisions) — independent of Task 1
Task 3 (validation) — independent

All 3 tasks are independent and can be parallelized.
```

## Done Gate

- [ ] Army + Corps prompts include event context (fired events, aggression mods, constraints)
- [ ] `generateEventDecision()` builds prompt with event context and personality
- [ ] `validateCorpsDecision()` rejects illegal decisions (forced stance, operation block)
- [ ] Fallback to formula bot when Claude returns invalid response
- [ ] `tsc --noEmit` clean
- [ ] `vitest run` passes (6+ new tests)
- [ ] No calibration impact (AI Commander is opt-in, not default)

---

## Protocol Enforcement

- [ ] Orchestrator oversees all phases
- [ ] Architect decisions flagged for user review
- [ ] Napkin read at start, updated during work
- [ ] Ledger entry appended on completion
- [ ] Life lessons scanned, relevant ones flagged
- [ ] tsc + vitest after every phase
- [ ] /simplify between each phase
- [ ] Version bump + tag on milestone completion

## Completion Checklist

- [ ] Implementation report in `docs/40_reports/implemented/`
- [ ] Canon docs updated (if applicable)
- [ ] Master files updated (if applicable)
- [ ] VERSIONING.md milestone marked complete
- [ ] PROJECT_LEDGER.md entry appended
- [ ] Napkin updated
