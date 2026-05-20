# AI Commander Response Parser Schema Validation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the remaining `response_parser.ts` `unknown -> FactionId` cast with explicit advisor-response schema validation while preserving current valid-response behavior and documenting fallback semantics.

**Architecture:** Keep the parser as the AI commander JSON boundary. Add narrow local helper contracts for advisor fields first, then update `parseAdvisorResponse(...)` to use those helpers. Do not redesign the AI commander, prompt format, or command model.

**Tech Stack:** TypeScript strict mode, Vitest parser tests, `tools/diagnostics/strict_null_inventory.cjs`, strict-null phase ledger.

---

## Current Facts

- Target file: `src/sim/ai_commander/response_parser.ts`.
- Current counted sites:
  - `as_factionid_casts`: 1 at `parseAdvisorResponse(...)` `data.faction as FactionId`.
  - `non_null_assertions_dot`: 1 in `parseArmyResponse(...)` on `d!.stance`.
- Adjacent schema-boundary casts remain in the same file:
  - `data.operation_plan as CorpsDecision['operation_plan']`
  - `data.brigade_movements as CorpsDecision['brigade_movements']`
  - `data.context_type as AdvisorResponse['context_type']`
- Existing parser tests: `tests/ai_commander_parser.test.ts`.
- Post-Batch-48 repo-wide inventory floor before this lane: `as_factionid_casts = 3`, with two retained UI literal-union adapter casts and one AI commander parser cast.

## Scope

In scope:
- `parseAdvisorResponse(...)` faction validation and fallback semantics.
- A small local helper for canonical faction validation.
- A small local helper for advisor context type validation.
- Parser tests for valid, missing, invalid, non-string, and malformed advisor payloads.
- Strict-null progress assertion and docs/ledger updates if counts change.
- Optional removal of the nearby `d!.stance` non-null assertion only if it is obviously behavior-preserving and covered by parser tests.

Out of scope:
- Prompt format redesign.
- AI commander behavior tuning.
- `parseArmyResponse(...)` and `parseCorpsResponse(...)` operation-plan schema redesign beyond the optional local `d!.stance` cleanup.
- `GameStateAdapter.ts`, combat files, generated saves, and scenario fixtures.

## Task 1: Lock Current Parser Semantics With Tests

**Files:**
- Modify: `tests/ai_commander_parser.test.ts`

**Steps:**
1. Add a test for a valid advisor response with `faction: 'RS'` and `context_type: 'situation_analysis'`.
2. Add a test for missing `faction`; expected result is fallback faction `'RBiH'`.
3. Add a test for invalid string faction, for example `'NATO'`; expected result is fallback faction `'RBiH'`.
4. Add a test for non-string truthy faction, for example `{ id: 'RS' }`; expected result is fallback faction `'RBiH'`.
5. Add a test for missing or invalid `context_type`; expected result is fallback `'situation_analysis'`.
6. Run:

```powershell
npx.cmd vitest run tests/ai_commander_parser.test.ts --reporter=dot
```

**Expected:** The new tests should fail before implementation where current cast behavior lets non-string truthy `faction` through or preserves invalid `context_type`.

## Task 2: Add Local Parser Helper Contracts

**Files:**
- Modify: `src/sim/ai_commander/response_parser.ts`

**Implementation pattern:**

```ts
const VALID_FACTIONS = new Set<FactionId>(['RBiH', 'RS', 'HRHB']);
const VALID_ADVISOR_CONTEXT_TYPES = new Set<AdvisorResponse['context_type']>([
    'situation_analysis',
    'operation_review',
    'strategic_guidance',
]);

function parseFactionId(value: unknown, fallback: FactionId): FactionId {
    return typeof value === 'string' && VALID_FACTIONS.has(value) ? value : fallback;
}

function parseAdvisorContextType(value: unknown): AdvisorResponse['context_type'] {
    return typeof value === 'string' && VALID_ADVISOR_CONTEXT_TYPES.has(value as AdvisorResponse['context_type'])
        ? value as AdvisorResponse['context_type']
        : 'situation_analysis';
}
```

**Steps:**
1. Confirm the actual `AdvisorResponse['context_type']` literal set in `src/sim/ai_commander/ai_types.ts` before coding. If the literal names differ, use that file as source of truth.
2. Add helpers near the existing `VALID_STANCES` sets.
3. Use `parseFactionId(data.faction, 'RBiH')` in `parseAdvisorResponse(...)`.
4. Use `parseAdvisorContextType(data.context_type)` in `parseAdvisorResponse(...)`.
5. Avoid adding new `as FactionId`, `as any`, or non-null assertions.

**Acceptance:** `response_parser.ts` has zero counted `as_factionid_casts` after the change unless a helper requires a different contract and is explicitly documented.

## Task 3: Optional Non-Null Assertion Cleanup

**Files:**
- Modify: `src/sim/ai_commander/response_parser.ts`
- Modify: `tests/ai_commander_parser.test.ts`

**Steps:**
1. Inspect the `d!.stance` site inside `parseArmyResponse(...)`.
2. If the current branch already narrows `d` safely enough, replace with a local variable:

```ts
const stance = typeof d?.stance === 'string' && VALID_STANCES.has(d.stance)
    ? d.stance as 'offensive' | 'balanced' | 'defensive'
    : 'balanced';
```

3. Preserve current fallback to `'balanced'` for invalid stance.
4. Add or keep a test that invalid stance clamps to `'balanced'`.
5. If removing the assertion forces broader schema work, leave it in place and document why.

**Acceptance:** Either the file loses its one counted `non_null_assertions_dot` site with parser tests passing, or the retained site has a clear reason in the handoff.

## Task 4: Strict-Null Inventory And Ledger

**Files:**
- Modify: `tests/strict_null_inventory_progress.test.ts`
- Modify: `docs/plans/2026-05-17-strict-null-checks-migration-phases.md`
- Modify: `docs/PROJECT_LEDGER.md`
- Optional: `docs/PROJECT_LEDGER_KNOWLEDGE.md` only if a reusable process rule is discovered.

**Steps:**
1. Run:

```powershell
node tools\diagnostics\strict_null_inventory.cjs
```

2. Add a focused progress assertion for `src/sim/ai_commander/response_parser.ts`.
3. Record exact deltas:
   - repo-wide `as_factionid_casts`
   - file-local `as_factionid_casts`
   - file-local non-null assertions if touched
4. In the phase ledger, classify the result as an LLM-response schema boundary, not a trivial alias cleanup.
5. In `docs/PROJECT_LEDGER.md`, state fallback semantics for invalid and missing advisor fields.

**Acceptance:** The test names the file and the cap is future-friendly, for example `toBeLessThanOrEqual(0)` for the parser's `as_factionid_casts` only.

## Required Verification

Run before handoff:

```powershell
npm.cmd run typecheck
npx.cmd vitest run tests/ai_commander_parser.test.ts --reporter=dot
npx.cmd vitest run tests/strict_null_inventory_progress.test.ts --reporter=dot
git diff --check
```

Run additional AI commander tests if touched or discovered. Do not run `npm.cmd run test:baselines` unless this lane changes sim-facing behavior; if skipped, state that this is parser-boundary validation only and no scenario runner or sim state contract changed.

## Stop Gates

- Stop if preserving fallback semantics requires changing the `AdvisorResponse` public contract.
- Stop if advisor schema validation would require prompt redesign.
- Stop if a helper would need to accept non-canonical faction aliases.
- Stop if tests reveal current callers depend on invalid non-string `faction` passing through.
- Stop if changes spill into unrelated AI commander modules.

## Handoff Requirements

- List commits.
- List exact strict-null inventory deltas.
- State fallback semantics for missing, invalid string, and non-string advisor `faction`.
- State whether the `d!.stance` assertion was removed or retained.
- State baseline decision and why.
