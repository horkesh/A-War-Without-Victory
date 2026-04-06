# v0.8.3 Phase 4 — Order Interpretation UI Panels

**Date:** 2026-04-06
**Commits:** [pending]
**Status:** ACCEPTED
**Baseline:** 2729/2729 vitest, tsc clean (Phase 3 / v0.8.3)
**Verification:** tsc clean, 2740/2740 vitest (190 files, 11 new tests)

---

## Purpose

v0.8.3 Phase 4 closes the final UI seam left open by Phases 1–3: the engine now produces live officer events and compliance outcomes, but the player had no surface through which to observe them. Phase 4 exposes engine truth through bounded, read-only UI surfaces. No new engine logic is introduced. The adapter translates existing `pending_officer_events` fields into typed view objects; components consume those objects and render. The chain is strictly one-directional: engine state flows to adapter to component. No UI action changes simulation outcomes except through the existing `ipc.acknowledgeOfficerEvent` IPC handler, which was already wired in Phase 2.

---

## Files Changed

| File | Change | Lines |
|---|---|---|
| `src/ui/map/data/types.ts` | `NamedOfficerView`: `is_cowed?`, `cowed_until_turn?`; `pendingOfficerEvents` item type extended with `order_modified \| order_pushback \| order_refused \| officer_relieved`; `reason?`, `overridable?`, `override_action?` | +~15 |
| `src/ui/map/data/GameStateAdapter.ts` | Officer construction: `is_cowed` (true when `cowed_until_turn >= state.meta.turn`), `cowed_until_turn` passthrough; `derivePendingOfficerEvents`: Phase 3 event types mapped with `reason`, `overridable`, `override_action` | +~30 |
| `src/ui/map/utils/officerCharacter.ts` | `getReliabilityLabel()` (1=Defiant…5=Steadfast); `getComplianceModifierText()` (formatted ±X.XX) | +~20 |
| `src/ui/map/components/army_hq/OrderInterpretationPanel.tsx` | New component: pure display, silence=healthy; shows `order_modified/pushback/refused` events per faction; amber/orange/red compliance badges; ACCEPT + OVERRIDE buttons both call `ipc.acknowledgeOfficerEvent` | new file |
| `src/ui/map/components/army_hq/CommanderSection.tsx` | `[✓] DEFERRED COMPLIANCE` badge when `commander.is_cowed`; `[!] LOW LOYALTY` warning when `political_reliability <= 2` (not acting, not cowed) | +~25 |
| `src/ui/map/components/OfficerProfile.tsx` | `Loyalty` stat row (getReliabilityLabel) in non-compact mode, below Defense | +~10 |
| `src/sim/briefing/collect_briefing.ts` | Interpretation events (`order_modified/pushback/refused`) → `cmd-order-interpretations` item (critical if refusal); personnel events → `cmd-officer-events` item (label unchanged) | +~25 |
| `tests/sim/command/phase4_ui_data_layer.test.ts` | 11 new tests across UI data layer | new file |

---

## Key Surfaces

### OrderInterpretationPanel

The primary new component. Silence is healthy: the panel only renders when `pending_officer_events` contains at least one `order_modified`, `order_pushback`, or `order_refused` event. Each visible event carries a colored compliance badge:

| Badge color | Event type |
|---|---|
| Amber | `order_modified` |
| Orange | `order_pushback` |
| Red | `order_refused` |

Both the ACCEPT and OVERRIDE buttons call `ipc.acknowledgeOfficerEvent`. The IPC handler was wired in Phase 2; Phase 4 surfaces the player-facing call path. No UI branch decides differently based on which button was pressed at the component level — the distinction is carried in the event's `override_action` field, which Phase 2 established.

### Compliance Badges in CommanderSection

Two inline status badges added to the existing commander display:

- `[✓] DEFERRED COMPLIANCE` — rendered when `commander.is_cowed` is true. Signals the officer is operating under a temporary override the player already forced; the cowed state will expire via the Phase 3 decay step.
- `[!] LOW LOYALTY` — rendered when `political_reliability <= 2`, officer is not acting, and is not currently cowed. Signals underlying friction risk without a current active event.

### Loyalty Stat Row in OfficerProfile

A `Loyalty` row is appended below Defense in non-compact mode. It calls `getReliabilityLabel(political_reliability)`, which maps the five integer reliability values to plain-language labels (1=Defiant, 2=Unreliable, 3=Compliant, 4=Reliable, 5=Steadfast). This is read-only display — the label is derived from GameState data that exists independently of the UI.

### Briefing Separation

`collect_briefing.ts` previously treated all officer events under a single `cmd-officer-events` briefing item. Phase 4 introduces a second item:

- `cmd-order-interpretations`: collects `order_modified`, `order_pushback`, `order_refused` events. Severity is critical when any refusal is present.
- `cmd-officer-events`: retains personnel events (unchanged).

This separation keeps the briefing signal legible: compliance friction from the order interpretation engine is surfaced as a distinct intelligence line, not buried in personnel rotation noise.

---

## Data Flow

```
GameState.military.pending_officer_events
  → GameStateAdapter.derivePendingOfficerEvents()
      → maps to typed view objects with reason/overridable/override_action
  → OrderInterpretationPanel (render only)
  → CommanderSection (is_cowed badge, LOW LOYALTY badge)

GameState.military.corps_command[*].cowed_until_turn
  → GameStateAdapter (officer construction block)
      → NamedOfficerView.is_cowed = cowed_until_turn >= state.meta.turn
  → CommanderSection ([✓] DEFERRED COMPLIANCE badge)

GameState.military.corps_command[*].political_reliability
  → OfficerProfile (Loyalty stat row via getReliabilityLabel)
  → CommanderSection ([!] LOW LOYALTY gate: pol_rel <= 2, not acting, not cowed)
```

No component introduces logic that alters engine behavior. The adapter is the sole read boundary. All IPC calls use the Phase 2 handler. The three-layer chain (engine → adapter → component) holds without exception.

---

## Deferred

### Phase 5 — Polish, Warlord Narrative, Override Cost

- Warlord narrative events: dedicated event surface with ICTY-sourced friction text for Halilović and warlord-class refusals. Not present in Phase 4 — the display infrastructure exists; the content curation is deferred.
- Override cost display: when a player presses OVERRIDE, the political capital cost will eventually be shown in the panel before confirmation. The IPC contract is already established; the cost surface requires the CA resource display to be resolved first.
- Corps name enrichment: `OrderInterpretationPanel` currently identifies events by officer ID. Phase 5 should resolve the display name from the corps/officer name field in the adapter rather than propagating raw IDs.
- OOB tooltip: compliance preview on hover showing effective reliability modifier per officer. Deferred until override cost display is resolved.

---

## Canon Compliance

| Check | Result | Note |
|---|---|---|
| Determinism | PASS | No `Math.random()`, no `Date.now()` added. All new functions are pure label derivations from integer inputs. Adapter reads state without mutation. |
| GameState as single source of truth | PASS | All reads from `state.military.pending_officer_events` and `state.military.corps_command`. No shadow state, no local cache. |
| No UI logic changes outcomes | PASS | ACCEPT and OVERRIDE both dispatch to the Phase 2 IPC handler. Components carry no branching logic that affects simulation state. |
| Canonical faction IDs | PASS | `RBiH`, `RS`, `HRHB` only. No new faction references introduced. |
| No auto-edit of FORAWWV.md | PASS | Not touched. |
| Backward compatibility | PASS | `is_cowed` and `cowed_until_turn` are optional on `NamedOfficerView`. Components degrade gracefully when no pending events are present (silence=healthy pattern). |

**Status: GO.** All checks pass. No blockers.

---

## Verification

- `npx tsc --noEmit`: clean
- `npm run test:vitest`: 2740/2740 (190 files, 11 new tests)
- 11 new tests in `tests/sim/command/phase4_ui_data_layer.test.ts`
