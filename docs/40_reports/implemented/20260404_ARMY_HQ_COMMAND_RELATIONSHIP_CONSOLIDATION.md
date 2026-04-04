# Army HQ Command Relationship Surface Consolidation

**Date:** 2026-04-04
**Status:** IMPLEMENTED
**Lane:** Army HQ Information Architecture (v0.8-to-v0.9)
**Orchestrator:** Yes — 3 parallel audit subagents dispatched (ownership, density, provenance)

## Summary

Consolidated 3 separate command-relationship renders on the Army HQ corps card back face into a single coherent surface. The player can now scan one section to understand: relationship condition, dominant constraint, recovery path, available actions, and unresolved friction.

## What Changed

### Before: 3 separate renders for one theme

1. **Inline friction panel** (in ArmyHQCorpsCard.tsx, above sections wrapper) — unresolved events with Acknowledge buttons
2. **CommandManagementSection** (separate CollapsibleSection "Command Management") — Stabilize button, CA cost, cooldown
3. **CommandRelationshipSection** (separate CollapsibleSection "Command Standing") — strain status, recovery forecast, friction count, stance constraint

### After: 1 consolidated surface

**`CommandRelationshipSection`** — single CollapsibleSection "Command Relationship" with internal reading order:
1. Strain status headline (score + label)
2. Recovery forecast (direction)
3. Stance constraint notice (compromised only)
4. Friction events with Acknowledge buttons (actionable)
5. Stabilize button (big action at bottom — context-first, then action)

### Files Changed

1. **`src/ui/map/components/army_hq/CommandRelationshipSection.tsx`** — rewritten: absorbs friction events + stabilize action + strain standing into single component. Owns both IPC handlers (`handleAcknowledgeFriction`, `handleStabilize`).
2. **`src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx`** — removed inline friction panel (30 lines), removed CommandManagementSection render, removed `handleAcknowledgeFriction` handler, removed unused `unresolvedFrictionCount` computation, removed `FrictionEventView` import. CommandRelationshipSection now receives `frictionEvents` and stabilization props directly.
3. **`src/ui/map/components/army_hq/CommandManagementSection.tsx`** — DELETED. Logic absorbed into CommandRelationshipSection.
4. **`tests/command_authority.test.ts`** — 11 new Wave 17 tests for consolidation visibility rules. Updated Wave 4 describe name to reflect consolidation.

### What Stayed Separate

- **CorpsSituationSection** — correctly remains its own section. It derives from `CommanderState` (zone assessments, threat, force assessment), NOT from command strain. These are disjoint derivation paths (confirmed by WS-C provenance audit). Merging them would conflate unrelated truths.

### Silence = Healthy

The consolidated section renders null when `strain === 0 AND unresolvedFrictionCount === 0`. This is a slight expansion from the old behavior (old CommandRelationshipSection only showed when strain > 0). Now friction events are visible even at strain=0, which is correct — friction can exist before it accumulates enough strain to register.

### Redundancies Removed

- **"N unresolved friction events" count line** — removed. The events themselves are now visible in the section, making the count summary redundant.
- **Footer explainer text** ("Stabilizing resolves accumulated command friction...") — removed. The button title attribute provides the same information on hover.
- **Separate "Command Management" collapsible header** — eliminated. One fewer section header the player must parse.

## Design Decisions

- **Context-first, action-last:** Strain status and recovery forecast appear before the Stabilize button. The player understands the situation before seeing the action.
- **Friction events inside the section, not above it:** Previously, friction events floated above the sections wrapper as a special inline panel. Now they're part of the Command Relationship section where they belong semantically.
- **Title includes strain label:** "Command Relationship — Strained" or "— Compromised" gives the headline answer in the section header itself.

## Orchestration

- **WS-A (Technical Architect):** Surface ownership audit — dispatched to verify merge boundaries
- **WS-B (UI/UX Developer):** Density audit — dispatched to verify consolidated layout
- **WS-C (Gameplay Programmer):** State/provenance audit — dispatched to confirm strain vs situation are disjoint derivations
- **Central integration:** All implementation done centrally — ownership was singular (one component absorbs two others + one inline block)

## Tests

11 new Wave 17 tests in `tests/command_authority.test.ts`:
- Silence = healthy (strain=0, no friction)
- Shown when strain > 0 even without friction
- Shown when friction exists even at strain=0
- Strain status visibility at various levels
- Recovery forecast conditional rendering
- Stabilize button visibility
- Stance constraint at compromised threshold

## Verification

- tsc: clean
- vitest: **2217/2217 pass (0 failures)**
- vite build: clean
- governance: OK
