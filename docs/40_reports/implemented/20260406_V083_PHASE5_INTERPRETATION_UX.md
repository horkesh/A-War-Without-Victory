# v0.8.3 Phase 5 — Interpretation UX Completion

**Date:** 2026-04-06
**Commits:** ebb18660 (impl), d4a2263c (docs)
**Status:** ACCEPTED
**Baseline:** 2740/2740 vitest, tsc clean (Phase 4 / v0.8.3)
**Verification:** tsc clean, 2765/2765 vitest (191 files, 25 new tests), build pass (6.41s)

---

## Purpose

v0.8.3 Phase 5 closes the four items explicitly deferred from Phase 4: warlord narrative events, override cost display, corps name enrichment, and OOB tooltip compliance preview. Taken together, they complete the minimum viable interpretation UX surface — the player can now see *why* friction occurred (narrative reason), *what it costs* to override (morale penalty), and *what the effective modifier is* for each officer in the OOB (signed decimal with color coding).

No new engine behavior is introduced. Corps name enrichment was already complete in Phase 4 (adapter line 2283, panel lines 88–91); no work was required. All four items remain strictly read-only over engine truth, consistent with the three-layer principle (engine → adapter → component) established in Phase 4.

---

## Files Changed

| File | Change | Delta |
|---|---|---|
| `src/sim/combat/order_interpretation.ts` | `buildInterpretationReason()` extended with `isWarlordModifierActive` (5th param) and `officerId?` (6th param); warlord/Halilović-specific string branches; `computeInterpretation()` derives and passes the flag | +40 lines |
| `src/ui/map/components/army_hq/OrderInterpretationPanel.tsx` | Import `RELIEF_MORALE_PENALTY`; add "Officer morale −10 if relieved" cost label (text-[9px] italic) below action buttons for `order_refused` overridable events | +5 lines |
| `src/ui/map/data/types.ts` | `NamedOfficerView` gains `effective_compliance_modifier?: number` | +2 lines |
| `src/ui/map/utils/officerCharacter.ts` | `getComplianceModifierTextFromValue()` and `getComplianceModifierColor()` exported | +18 lines |
| `src/ui/map/data/GameStateAdapter.ts` | Officer construction block computes `effective_compliance_modifier` (base ± warlord term when RBiH + pol_rel≤2 + inside warlord window) | +10 lines |
| `src/ui/map/components/OfficerProfile.tsx` | Import two new helpers; Modifier stat row after Loyalty in non-compact mode | +12 lines |
| `tests/sim/command/phase5_interpretation_ux.test.ts` | New test file — 25 tests covering warlord narrative strings, override cost label, modifier computation, and helper functions | +390 lines |

---

## Key Surfaces

### Warlord Narrative in OrderInterpretationPanel

`buildInterpretationReason()` in `order_interpretation.ts` now accepts two new parameters: `isWarlordModifierActive` (boolean) and `officerId?` (string). When the warlord modifier is active, compliance tier strings are replaced with ICTY-sourced warlord-specific narrative.

Two officer classes receive distinct treatment:

**Generic warlord** (any warlord-active RBiH officer — currently `arbih_knez`):

| Tier | String |
|---|---|
| `order_modified` | "[Name] acknowledges the order but routes it through his own staff before passing it to subordinates." |
| `order_pushback` | "[Name] considers the order incompatible with local conditions and will advance to [effectiveStance]." |
| `order_refused` | "[Name] has not transmitted the order. His formation continues under independent command." |

**Halilović-specific** (`officerId === 'arbih_halilovic'`):

| Tier | String |
|---|---|
| `order_modified` | "Halilović acknowledges the order but has amended the operational guidance before passing it to corps commanders." |
| `order_pushback` | "Halilović considers [orderedStance] a political directive, not a military one, and will advance to [effectiveStance]." |
| `order_refused` | "Halilović has not forwarded the order. The Supreme Command Staff's authority over operational matters remains contested." |

Strings are historically sourced from ICTY IT-01-48-T (Halilović), ICTY IT-96-21 (Čelebići), Silber & Little, and Burg & Shoup. Only two officers carry `pol_rel≤2` in RBiH: `arbih_halilovic` (turns 0–60) and `arbih_knez` (turns 0–44). The warlord modifier path is unreachable for RS and HRHB officers.

`computeInterpretation()` derives `isWarlordModifierActive` as `reliabilityModifier !== baseReliabilityModifier` and passes it alongside `data.id` to `buildInterpretationReason()`. No new engine state is created; the derivation is pure at the point of call.

### Override Cost Display in OrderInterpretationPanel

For `order_refused` events where `event.overridable` is true, a cost label is now rendered below the action buttons:

```
Officer morale −10 if relieved
```

The value is imported as `RELIEF_MORALE_PENALTY` from `order_interpretation.ts` — not hardcoded in the component. This surfaces the real consequence of pressing OVERRIDE in the case where no political capital resource yet exists. The label is styled `text-[9px] italic` to signal it is informational rather than an action trigger.

No player CA resource exists at this milestone. The IPC contract from Phase 2 handles the override pathway; Phase 5 only adds the cost label to inform the player before they act.

### OOB Modifier Row in OfficerProfile

`NamedOfficerView` gains an optional `effective_compliance_modifier?: number`. The adapter's officer construction block computes this value:

- **Base:** `computeReliabilityModifier(political_reliability)` — the `(pol_rel − 3) × 0.10` formula from Phase 3.
- **Warlord adjustment:** when `faction === 'RBiH'` and `pol_rel ≤ 2` and the current turn is within the officer's `warlord_friction_end_week`, the warlord modifier (−0.15) is added.

Two new helper exports in `officerCharacter.ts`:

- `getComplianceModifierTextFromValue(modifier: number): string` — returns a signed string such as `+0.20` or `−0.25`.
- `getComplianceModifierColor(modifier: number): string` — returns green for positive, red for negative, neutral for zero.

`OfficerProfile.tsx` adds a **Modifier** stat row after Loyalty in non-compact mode. The row calls both helpers and renders the signed decimal with color coding. This is the fifth stat row in the profile and follows the same pattern as the Phase 4 Loyalty row.

### Corps Name Enrichment

Already complete in Phase 4. The adapter resolves display names from the corps/officer name field (adapter line 2283); `OrderInterpretationPanel` consumes the resolved name (panel lines 88–91). No Phase 5 work required.

---

## Data Flow

```
GameState.military.corps_command[*].political_reliability
  → GameStateAdapter (officer construction block)
      → computeReliabilityModifier(pol_rel) → base modifier
      → warlord window check → effective_compliance_modifier
  → NamedOfficerView.effective_compliance_modifier
  → OfficerProfile (Modifier stat row via getComplianceModifierTextFromValue + getComplianceModifierColor)

GameState.military.pending_officer_events[*] (order_refused, overridable=true)
  → OrderInterpretationPanel
      → RELIEF_MORALE_PENALTY imported from order_interpretation.ts
      → "Officer morale −10 if relieved" cost label rendered below OVERRIDE button

order_interpretation.ts: computeInterpretation()
  → derives isWarlordModifierActive = reliabilityModifier !== baseReliabilityModifier
  → passes isWarlordModifierActive + data.id → buildInterpretationReason()
      → warlord/Halilović-specific narrative string selected per compliance tier
  → PendingOfficerEvent.reason carries ICTY-sourced narrative to the adapter and panel
```

No component introduces logic that alters engine behavior. The adapter is the sole read boundary. The three-layer chain (engine → adapter → component) holds without exception.

---

## Deferred

### Phase 6 and Beyond

The four Phase 4 deferred items are now closed. Remaining v0.8.3 scope per `docs/plans/MASTER_ROADMAP.md` is defined by the milestone's "minimum viable command review surface" requirement:

> "before finalizing this milestone, the player can inspect what order was issued, how the corps/army chain interpreted it, what was accepted or modified, why friction occurred, and what override cost is being proposed."

All five requirements are now satisfied across Phases 1–5. v0.8.3 milestone closure is the next step. What follows is v0.8.4 (Autonomy Depth + Claude API at Political Level), gated on v0.8.3 closure.

Outstanding open P1s from the command chain (enclave-locked commander guard in `warlord_friction.ts`, vrs_east_bosnian suspend counter, stale ssid refs) are pre-existing items not introduced by Phase 5 and are tracked in the napkin.

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()` added. `buildInterpretationReason()` extension is a pure function of its parameters. Adapter derivation is pure on read. Helper exports are pure label functions. |
| GameState as single source of truth | PASS | `effective_compliance_modifier` is adapter-derived on read from `political_reliability` + warlord window fields. Not stored in GameState. Per lesson "Derive gameplay display signals on-read." |
| No UI logic changes outcomes | PASS | `RELIEF_MORALE_PENALTY` label is display only. Override button dispatches to the Phase 2 IPC handler unchanged. Modifier row is read-only display. |
| No new engine fields | PASS | `effective_compliance_modifier` lives only in `NamedOfficerView` (adapter output type). No `game_state.ts` changes. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. Warlord path gated on `faction === 'RBiH'` — RS and HRHB are unreachable. |
| RELIEF_MORALE_PENALTY imported, not hardcoded | PASS | Constant imported from `order_interpretation.ts`. Component contains no magic numbers. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| Backward compatibility | PASS | `effective_compliance_modifier` is optional on `NamedOfficerView`. Components degrade gracefully when absent. |

**Status: GO.** All checks pass. No blockers.

---

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2765/2765 (191 files, 25 new tests)
- `npm run desktop:map:build`: pass (6.41s)
- 25 new tests in `tests/sim/command/phase5_interpretation_ux.test.ts`
