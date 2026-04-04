# Consolidated Lane Summary: Presidential Command / Friction / Review

**Date:** 2026-04-04
**Lane status:** Core loop CLOSED. Extension points documented for v0.8.3.
**Waves:** 13 micro-reports across 2026-04-03 and 2026-04-04

---

## Problem Statement

The player — as unnamed political leader — had no coherent view of command interpretation, institutional friction, or relationship standing with corps commanders. Command decisions were scattered across multiple surfaces with no provenance trail. Force-launching an operation left no institutional record of what the commander recommended. Friction events accumulated in GameState but were completely invisible to the UI. The player could repeatedly override the command chain with zero feedback about cumulative institutional damage.

---

## What Landed (grouped by sub-lane)

### Command Authority (2026-04-03)

Vertical slice establishing the CA resource system: `command_authority` on GameState (`current`, `max`, `spent_this_turn`, `lifetime_spent`). Force-launch costs CA. Per-turn recovery (+2 base). `CommandAuthorityPanel` in Army HQ shows current/max, lifetime spent, and recovery rate. `CommandRecord` component shows the four-part command story (recommendation, decision, CA cost, outcome) on every operation.

### Command Friction (Waves 1-5, 2026-04-04)

| Wave | What it delivered |
|------|-------------------|
| 1 | Friction audit: confirmed `friction_events[]` written but never read by UI. Built `computeCorpsCommandStrain()` derivation. Strain badge on `ArmyHQCorpsCard`. |
| 2 | Strain propagated to decision-adjacent surfaces: CoS briefing paragraphs (6 tone/severity combos), OperationsSection command-risk notice, DirectInterventionSection compound warning. |
| 3 | Friction Resolution Loop: player acknowledges individual friction events (`resolved: true`), closing the loop through existing `computeCorpsCommandStrain` filter. No new fields or mechanics. |
| 4 | Stabilize Command Relationship action (batch resolve, costs 10-15 CA, 3-turn cooldown). Compromised stance gate (offensive disabled at strain >= 6). |
| 5 | Strain decay projection (`projectStrainDecay` + `deriveRecoveryForecast`). Command Relationship Standing section on corps card back-face. CA recovery rate reduction as sim-level consequence (base +2, penalty up to -2 from force-launches and unresolved friction). |

### Order Interpretation Preview (Waves 5-7, 2026-04-04)

| Wave | What it delivered |
|------|-------------------|
| 5 (OIP) | `deriveOrderInterpretation()` — pre-launch strain context (normal/caution/alarm). `OrderInterpretationSection` component in OperationBriefingModal. Player sees institutional friction before clicking Launch, even on clean approval paths. |
| 6 (Stance) | `deriveStanceInterpretation()` — two-step stance flow: compromised+offensive blocked with explanation; strained+offensive requires explicit confirmation. |
| 7 (Outcome) | `deriveOperationOutcomeCategory()` — three tiers: ordinary_compliance, reluctant_compliance, direct_intervention. Reluctant compliance (commander said postpone, president approved without CA) was previously invisible. |

### Command Review Consolidation (Waves 8-9, 2026-04-04)

| Wave | What it delivered |
|------|-------------------|
| 8 | `OutcomeCategoryBadge` on executing/recovery op-cards in OperationsSection. `[ REVIEW COMMAND DECISION ]` button opens briefing modal from list context. Force-launch button label corrected to "DIRECT INTERVENTION". |
| 9 | `OutcomeCategoryBadge` on completed ops in OperationHistoryPanel. `buildOperationTrendSummary()` — amber trend notice above history list. Three-tier Command Record narrative in history expanded view. |

### Player Knowledge Integrity (2026-04-03)

Raw Intel tab demoted to debug-only (exposed exact engine values violating Presidential Command Doctrine). `generateThreatAssessment` strength language softened to qualified ranges. Adapter defense-in-depth pass for player-scoped data.

### Between-Ops Events (2026-04-03)

Six recurring presidential decision events (pure JSON content, zero engine changes): Strategic Posture Review (3 factions) and Visit to the Front (3 factions). Faction-voiced options with escalation paths unlocking on 3rd+ recurrence.

---

## Canonical Owners Table

| Surface | Owner file | What it shows |
|---------|-----------|---------------|
| Strain badge | `ArmyHQCorpsCard.tsx` | Per-corps strain level + label |
| Command Relationship Standing | `CommandRelationshipSection.tsx` | Strain, recovery forecast, friction count, stance constraint |
| CoS briefing strain paragraph | `ChiefOfStaffBriefing.tsx` | Tone-appropriate strain warning (silence=healthy) |
| Order Interpretation Preview | `OrderInterpretationSection.tsx` | Pre-launch institutional context |
| Stance Interpretation | `ArmyHQCorpsCard.tsx` (inline) | Two-step confirm for strained+offensive |
| Outcome Category Badge | `OperationsSection.tsx` + `OperationHistoryPanel.tsx` | Three-tier badge on live and completed ops |
| Command Record | `OperationBriefingModal.tsx` | Four-part story: recommendation, decision, CA cost, outcome |
| Trend Summary | `OperationHistoryPanel.tsx` | Aggregate intervention/compliance pattern |
| CA resource | `CommandAuthorityPanel.tsx` | Current/max, lifetime spent, recovery rate |
| Strain derivation | `command_strain.ts` | All pure derivation functions |

---

## End-to-End Flow

1. **Pre-decision:** Player sees strain badge, CoS briefing, standing section, recovery forecast
2. **Decision:** Order Interpretation Preview shows institutional context; stance gate blocks compromised+offensive
3. **Live ops:** Outcome Category Badge on executing ops; Review Command Decision button
4. **History:** Badge on completed ops; trend summary; expanded Command Record
5. **Standing:** Relationship Standing section with strain, forecast, friction count
6. **Recovery:** Acknowledge individual events (slow path) or Stabilize (fast path, costs CA)
7. **Consequence:** CA recovery rate reduced; offensive stance blocked when compromised

---

## Test Coverage

179 tests in `command_authority.test.ts` covering all waves (1-9).

---

## What Remains Open

- Full order interpretation system with commander personality (v0.8.3 candidate)
- Delegation visibility — player seeing what they delegated and what happened
- Strain sources expansion beyond warlord friction (e.g., casualty-driven strain)
- Between-ops event balancing after playtesting

---

## Underlying Micro-Reports

| Date | Report |
|------|--------|
| 2026-04-03 | `20260403_COMMAND_AUTHORITY_VERTICAL_SLICE.md` |
| 2026-04-03 | `20260403_COMMAND_AUTHORITY_PROVENANCE.md` |
| 2026-04-03 | `20260403_COMMAND_AUTHORITY_REVIEW_LAYER.md` |
| 2026-04-03 | `20260403_COMMAND_AUTHORITY_HISTORY_PANEL.md` |
| 2026-04-03 | `20260403_PRESIDENTIAL_COMMAND_REVIEW_LOOP.md` |
| 2026-04-03 | `20260403_PLAYER_KNOWLEDGE_INTEGRITY_WAVE2.md` |
| 2026-04-03 | `20260403_PRESIDENTIAL_BETWEEN_OPS_EVENTS.md` |
| 2026-04-04 | `20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE1.md` |
| 2026-04-04 | `20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE2.md` |
| 2026-04-04 | `20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE3.md` |
| 2026-04-04 | `20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE4.md` |
| 2026-04-04 | `20260404_PRESIDENTIAL_COMMAND_FRICTION_WAVE5.md` |
| 2026-04-04 | `20260404_ORDER_INTERPRETATION_PREVIEW_LOOP.md` |
| 2026-04-04 | `20260404_STANCE_INTERPRETATION_PREVIEW_WAVE2.md` |
| 2026-04-04 | `20260404_OPERATION_OUTCOME_CATEGORY_WAVE3.md` |
| 2026-04-04 | `20260404_COMMAND_REVIEW_CONSOLIDATION_WAVE8.md` |
| 2026-04-04 | `20260404_COMMAND_REVIEW_CONSOLIDATION_WAVE2.md` |
