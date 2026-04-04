# Order Interpretation System Wave 2 - Implementation Report

**Date:** 2026-04-04
**Lane:** Order Interpretation System Wave 2
**Status:** COMPLETE
**Roadmap context:** v0.8.x - command legibility lane (no new engine systems)

---

## Summary

Extended the order interpretation surface from category-level classification (Wave 1) to structured drag-factor decomposition. The player can now see not just the type of institutional resistance but the specific forces producing it — including their intensity, whether they are primary or secondary drivers, and how they compose.

Three bounded changes:

1. **DragFactor model** (`command_strain.ts`) — `DragSource` type and `DragFactor` interface added. `OrderInterpretation` gains `dragFactors: DragFactor[]`. `deriveOrderInterpretation` extended with optional `postponementCount?` fifth parameter for caution modulation.
2. **Bullet list UI** (`OrderInterpretationSection.tsx`) — the section now renders `dragFactors` as a structured bullet list (● primary, ○ secondary) instead of prose. Falls back to `cautionNotice` when `dragFactors` is empty for backward compatibility.
3. **Call site wiring** (`OperationBriefingModal.tsx`) — `postponementCount={postponements}` passed to the section.

---

## What Was Added

### Derivation Changes (`command_strain.ts`)

- **`DragSource` type** — new exported union: `command_strain | professional_caution | hard_constraint | timing_gap`
- **`DragFactor` interface** — four fields: `source: DragSource`, `intensity: string`, `isPrimary: boolean`, `label: string`
- **`OrderInterpretation` extended** — `dragFactors: DragFactor[]` added to the return shape
- **`deriveOrderInterpretation` signature extended** — new optional fifth parameter `postponementCount?` (number)

`dragFactors` derivation follows the interpretation category established in Wave 1:

| Category | Primary Factor | Secondary Factor |
|---|---|---|
| `strain_shaped` | `command_strain` (primary) | `professional_caution` (optional secondary, when present) |
| `caution_driven` | `professional_caution` (primary, with postponement count modulation in label) | — |
| `feasibility_constrained` | `hard_constraint` (primary) | — |
| `tempo_resistant` | `timing_gap` (primary) | — |
| `normal` | — (empty array) | — |

`postponementCount` modulates the `caution_driven` label: "Professional judgment (N prior delays)" when N ≥ 1, "Professional judgment (no prior delays)" when 0.

### UI Changes (`OrderInterpretationSection.tsx`)

- **New `postponementCount` prop** — passed down into `deriveOrderInterpretation`
- **Bullet list rendering** — `dragFactors` renders as a structured list:
  - `●` prefix for `isPrimary: true` factors
  - `○` prefix for `isPrimary: false` (secondary) factors
  - Intensity label displayed inline: e.g. "Command strain — moderate (prior interventions)"
- **`cautionNotice` fallback** — when `dragFactors` is empty, the existing prose `cautionNotice` renders as before. This preserves backward compatibility for any path that does not yet produce drag factors.

The player-visible truth: instead of "Command strain is shaping this assessment", the player reads:
- "● Command strain — moderate (prior interventions)"
- "○ Commander also recommends waiting"

Or for caution-driven cases: "● Professional judgment (2 prior delays)"

### Wiring (`OperationBriefingModal.tsx`)

- `postponementCount={postponements}` passed to `OrderInterpretationSection`
- No new state fetched, no new persistence added

---

## What Was NOT Added

- No engine changes
- No new persisted fields
- No commander-personality fiction (DragSource classifies system phenomena, not personality traits)
- `cautionNotice` kept as backward-compatible fallback (not removed)
- No new rendering path for the `normal` / healthy case — silence = healthy remains intact

The `cautionNotice` field on `OrderInterpretation` remains. It is now a fallback safety net for callers that do not supply the full parameter set, not the primary rendering path.

---

## Orchestrator Report

### Subagents Used

| Workstream | Agent Type | What It Owned |
|---|---|---|
| A: Derivation | gameplay-programmer | `DragSource`, `DragFactor`, `dragFactors` field, `postponementCount` param, factor derivation per category |
| B: UI | ui-ux-developer | Section `postponementCount` prop, bullet list rendering, fallback to `cautionNotice` |
| C: Tests + Verification | qa-engineer | Wave 21 drag-factor test plan (14 new tests), regression surface, full-suite verification |
| D: Documentation | documentation-specialist | Report, ledger, knowledge, architect notes |

---

## Decision-Time Hierarchy (Updated)

For planning-phase operations, the player now sees:

1. Header (operation name, corps, faction)
2. Commander Info
3. Readiness Gauges
4. Assessment Badge
5. Delegation Path Indicator
6. Readiness Trend Indicator
7. Recommendation Driver
8. Corps Constraint Context
9. **Order Interpretation with category badge + structured drag factor bullets**
10. Direct Intervention Section
11. Action Buttons

The prose `cautionNotice` is demoted to fallback. The structured `dragFactors` bullet list is the primary rendering path when factors are present.

---

## Canonical Owner

**UI:** `OrderInterpretationSection` in `OperationBriefingModal` (planning phase only)

**Derivation:** `deriveOrderInterpretation` in `command_strain.ts`

**Demoted path:** Prose `cautionNotice` sentence. Remains as fallback for backward compatibility but is no longer the default rendering path when drag factors are present.

---

## Verification

- `npx.cmd vitest run tests/ui/command_strain_interpretation.test.ts tests/command_authority.test.ts`: **337/337**
- `npx.cmd vitest run`: **2291/2291**
- `npx.cmd tsc --noEmit -p tsconfig.json`: clean
- `npm.cmd run build`: clean
- Governance: OK

---

## Completion Block

**Done means:** DragFactor model landed. Bullet list renders primary and secondary drag sources with intensity labels. cautionNotice preserved as fallback. No engine changes, no persistence changes, full suite green.
