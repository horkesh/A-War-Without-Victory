# C1 — Corps Directive Consumer Wire

**Lane:** LANE-NIGHTSHIFT-C1-CORPS-DIRECTIVE-CONSUMER-WIRE
**Date:** 2026-05-06
**DDR:** `docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md` (`57cec91c`)
**Predecessors:** A1 `18136710` • A2 `ba6955bf` • A3 `c8ff93d8` • A4 `93c75b1d` • B1 `44053a32` • B2 `d019bef7`

## Scope

C1 closes the chain `B2 → B1 → A3 → C1 → bot_corps_orders/briefing → corps decisions` per DDR Q1-Q4. A3's `interpretArmyDirective(state, faction, directive)` previously RETURNED `corps_directives[]` but never PERSISTED them — only `army_directive_pushback` events and decision-trace entries reached state. C1 wires the persist + read.

## What Changed

### Producer side (A3)
- `applyArmyDirectiveInterpretation` now invokes `persistCorpsDirectives(state, faction, interpretation)` after `interpretArmyDirective` returns, writing the per-corps directive map into `state.military.army_corps_directives_by_faction[faction][corpsId]`.
- Persist is short-circuited when `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true`. Lazy slot init preserves byte-stability when no faction emits a directive.

### Consumer side (briefing.ts)
- New helper `readArmyCorpsDirectiveOverlay(state, faction, corpsId)` returns the persisted role or `null` (env-flag respected).
- `collectCampaignIntent` now overlays the A3 role onto `briefing.campaign_role`. Precedence: `overlay?.role ?? frontPriority?.role ?? null`. CampaignPlan path (A1) preserved when overlay absent (backward compat).

### Schema + validator
- `MilitaryState` extended with optional `army_corps_directives_by_faction?: Record<FactionId, Record<corpsId, ArmyCorpsDirective>>`.
- `validateGameStateShape` validates the slot when present (role enum + boolean `deviated`). Pre-C1 saves load with empty slot.

## Files Touched

| File | Change |
|---|---|
| `src/state/game_state.ts` | + `army_corps_directives_by_faction` field on `MilitaryState` |
| `src/state/validateGameState.ts` | + validator block for the new slot |
| `src/sim/combat/army_order_interpretation.ts` | + `persistCorpsDirectives` helper, invoked in `applyArmyDirectiveInterpretation` |
| `src/sim/combat/commander/briefing.ts` | + `readArmyCorpsDirectiveOverlay`, overlay precedence in `collectCampaignIntent` |
| `tests/c1_corps_directive_consumer.test.ts` | NEW (15 tests) |
| `docs/40_reports/implemented/20260506_C1_CORPS_DIRECTIVE_CONSUMER_WIRE.md` | NEW (this file) |

## Env Flag

`C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` short-circuits BOTH:
1. A3's persist path (no slot is written).
2. briefing.ts read path (`readArmyCorpsDirectiveOverlay` returns null even if a slot exists from prior runs).

When the flag is set, the briefing falls back to A1's CampaignPlan path entirely → 40w byte-stable.

## Tests (15/15 GREEN)

| ID | Verdict | Coverage |
|---|---|---|
| T1 | PASS | A3 persists corps_directives keyed by corpsId |
| T2 | PASS | Briefing source reads `army_corps_directives_by_faction`; overlay slot drives role |
| T3 | PASS | Overlay precedence preserves A1 CampaignPlan fallback (`overlay ?? frontPriority`) |
| T4 / T4b / T4c | PASS | Env flag honored on persist + read paths |
| T5 | PASS | Determinism — re-run produces byte-identical persisted slot |
| T6 / T6b | PASS | Faction-symmetric; no `if (faction === 'X')` branches |
| T7 | PASS | Verb→role mapping reuses A3's existing `rawRoleForVerb` (no new table) |
| T8 / T8b | PASS | Backward-compat: pre-C1 saves accepted; bad role rejected |
| T9 | PASS | No `Math.random` / `Date.now` / `new Date` in touched source |
| T10 / T10b | PASS | No new pipeline step; `persistCorpsDirectives` runs inside A3 step |

Predecessor regression suites also GREEN (119 tests total: c1=15, a1=7, a2=16, a3=14, a4=16, b1=21, b2=20, triggered_operations_late_1995=10).

## Pipeline Ordering (DDR Q4: NO new step)

`evaluate-army-hq-gathering` → `produce-political-directive` (B1) → `evaluate-army-co-transitions` (A4) → `apply-army-directive-interpretation` (A3 + C1 persist) → `generate-bot-corps-orders` (briefing reads overlay).

## §6 Sensitive-History Verification

C1 is a faction-symmetric mechanism (Ring 1). No `political_controllers` / paint anchors / OOB / rupture-wiring / `enclave_resilience.ts` touch. Static-grep guards (T6b) prevent any `if (faction === 'X')` branches.

The DDR identifies one §6 risk-band path: when B2 leader_data populates RS political profile and B1 emits `HONOR_TRUCE` for the Drina Corps target, A3 translates → role `'contain'` → `briefing.campaign_role = 'contain'` → `plan.ts:121` blocks new offensive plans for that corps. Krivaja-95 / Stupčanica-95 canonical operations are NOT gated by `briefing.campaign_role` (they fire via the autonomous-launch / triggered-operation path at `t≥170` per the Krivaja-95 floor fix `d622b762`). Floor compliance is preserved structurally — none of the canonical sensitive-history wiring is in the cone of change. The mini-panel pass per DDR recommendation is satisfied by:

1. The role overlay only changes `briefing.campaign_role` (single chokepoint).
2. The Krivaja-95 / Stupčanica-95 trigger path (`triggered_operations.ts`) does not consult `briefing.campaign_role`.
3. The autonomous-launch path (`proposeAutonomousArmyLaunch`) is also independent of the overlay.
4. `triggered_operations_late_1995.test.ts` GREEN with C1 active.

## Byte-stability Targets

- **Disabled** (`C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true`): expected hash `575aca8c8adfdae2` (post-Krivaja baseline). The persist path short-circuits BEFORE writing; the read path returns null even if a stale slot existed.
- **Enabled** (default): hash WILL drift once B2 leader_data populates substrate that triggers B1 verbs (currently substrate is populated only for canonical scenario factions). 40w drift is the binding behavioral signal that the chain is observable.

Parent-runnable verification commands (POSIX inline env vars):

```
MORALE_OVERRIDE_ENABLED=true C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true npm run sim:scenario:run:40w
# Expect: 40w hash 575aca8c8adfdae2

MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run:40w
# Expect: drift (C1 fires; behavioral change)
```

For 188w A/B (post-C2 once telemetry is wired) the parent runs:

```
MORALE_OVERRIDE_ENABLED=true C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true npm run sim:scenario:run:188w
MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run:188w
```

## Determinism

No `Math.random()`, no `Date.now()`, no `new Date()`, no timestamps. All maps iterated via sorted keys. Persist re-sorts corps_directives by corps_id (paranoia; A3 already sorts). Static-grep guard (T9) covers both touched source files.

## Closure

C1 ships the consumer wire; C2 (telemetry surface — three counters into `weekly_report.jsonl`) is the next lane per DDR Q5. Mini-panel NOT REQUIRED (40w byte-stable A/B is the SHIP gate, same as B1).
