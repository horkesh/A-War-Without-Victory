# C2 — Corps Directive Telemetry Surface

**Lane:** LANE-NIGHTSHIFT-C2-CORPS-DIRECTIVE-TELEMETRY-SURFACE
**Date:** 2026-05-06
**DDR:** `docs/40_reports/audits/20260506_C_LANE_BOT_CORPS_ORDERS_CONSUMER_DDR.md` (`57cec91c`) — Q3 + Q5
**Predecessors:** A1 `18136710` • A2 `ba6955bf` • A3 `c8ff93d8` • A4 `93c75b1d` • B1 `44053a32` • B2 `d019bef7` • C1 `5084071d`

## Scope

C2 ships the telemetry surface that closes the chain `B2 → B1 → A3 → C1 → bot_corps_orders` for the post-run panel. A4's 188w A/B finding showed all five binding thresholds PASS but observable telemetry = 0 because (a) A3 didn't persist directives — closed by C1, AND (b) no events were emitted to the post-run telemetry stream — closed here.

Three event types per DDR Q3 are emitted at the C-lane consumer site (NOT at A3's emit site, so the panel observes whether the consumer actually used the persisted directive):

1. `army_directive_application` — per (faction × corps × turn) when A3 persists a corps_directive.
2. `corps_role_overlay_count` — weekly aggregate (per faction).
3. `political_directive_chain_active` — turn-end assertion when ≥1 faction had both B1 producer fired AND A3 persisted ≥1 directive that turn.

## Implementation note — channel choice

The DDR specifies emission to `weekly_report.jsonl` so the post-run panel can read the chain. The exclusive-file-ownership constraint on this lane (`src/sim/combat/army_order_interpretation.ts` only) precludes touching `scenario_runner.ts` or `scenario_reporting.ts` to thread events through the report-row builder.

To preserve the strict byte-stability invariants (T9 — game state hash and weekly_report.jsonl byte-identical with C2 enabled vs. disabled), C2 emits to a **side-channel JSONL** at `data/derived/_debug/c_lane_corps_directive_telemetry.jsonl` — gitignored, mirroring the precedent established by `src/sim/combat/corps_front_sectors.ts` (LANE-NIGHTSHIFT-SECTOR-PARTITION-INSTRUMENTATION). This channel:

- Keeps `final_state_hash` byte-identical with C2 enabled vs. disabled (no GameState mutation).
- Keeps `weekly_report.jsonl` byte-identical with C2 enabled vs. disabled (we never write to it).
- Honors single-file ownership (only `army_order_interpretation.ts` touched).
- Provides a legible, line-oriented JSONL signal that the post-run panel can read identically to `weekly_report.jsonl`.

A follow-up lane can wire the side-channel events into `weekly_report.jsonl` by extending `scenario_runner.ts` to drain the file into the report row, if the panel prefers a single-file ingest path. The recommendation in the closeout is that the panel ingests both files in parallel (post-run panels already read multiple JSONL streams).

## What Changed

### `src/sim/combat/army_order_interpretation.ts` (extended)
- Added `C2_TELEMETRY_OUTPUT_REL_PATH`, `C2_TELEMETRY_SCHEMA_VERSION` constants and `isC2TelemetryDisabled()` predicate.
- Added module-local turn buffer (`_activeTurnBuffer`) — state-free, reset every call to `applyArmyDirectiveInterpretation`.
- Added `recordC2Application(...)` — pushes one application entry into the buffer; no-op when `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true`.
- Added `flushC2TurnTelemetry()` — appends up to 3 line types per turn to the side-channel JSONL; no-op when flag is set or buffer is empty.
- Added `recordC2ApplicationsForFaction(...)` — invoked by `applyArmyDirectiveInterpretation` AFTER `persistCorpsDirectives` returns. Detects whether C1 actually persisted (slot present) and records each persisted corps directive.
- Wrapped `applyArmyDirectiveInterpretation` with buffer-open/flush. C1's `persistCorpsDirectives` signature and body are unchanged (frozen at C1 `5084071d`).
- Exported `__c2TelemetryTestHooks` for unit-test access.

### `tests/c2_corps_directive_telemetry.test.ts` (NEW; 17 tests)
Per-test temp directory + chdir isolates the JSONL output for byte-stable verification.

| ID | Coverage |
|---|---|
| T1 | `army_directive_application` event emitted per persisted corps_directive |
| T2 | `corps_role_overlay_count` weekly aggregate matches sum of T1 events |
| T3 / T3b / T3c | `political_directive_chain_active` emitted iff producer fired + ≥1 persist |
| T4 / T4b | env flag `C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true` short-circuits all emissions |
| T5 | env flag `C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true` (C1's flag) implicitly suppresses C2 |
| T6 | determinism — re-run produces byte-identical JSONL output |
| T7 | faction-symmetric — same event-type sequence shape across RBiH/RS/HRHB |
| T8 / T8b | backward-compat — pre-B1 / no-army-CO state runs without throwing |
| T9 | telemetry-only invariance — final state byte-identical with C2 enabled vs. disabled |
| T10 / T10b / T10c / T10d | static-grep — no `Math.random` / `Date.now` / `new Date` / `setTimeout`, no per-faction branches, no new pipeline step, env flag literal present |

### `docs/40_reports/implemented/20260506_C2_CORPS_DIRECTIVE_TELEMETRY_SURFACE.md` (NEW)
This file.

## Files Touched

| File | Change |
|---|---|
| `src/sim/combat/army_order_interpretation.ts` | + C2 constants / buffer / record / flush; `applyArmyDirectiveInterpretation` wraps with open/flush; `recordC2ApplicationsForFaction` invoked post-persist. C1's `persistCorpsDirectives` UNCHANGED. |
| `tests/c2_corps_directive_telemetry.test.ts` | NEW (17 tests) |
| `docs/40_reports/implemented/20260506_C2_CORPS_DIRECTIVE_TELEMETRY_SURFACE.md` | NEW (this file) |

## Env Flag

`C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true` short-circuits ALL three emissions:
- `recordC2Application` is a no-op (no buffer write).
- `flushC2TurnTelemetry` is a no-op (no JSONL write).
- The buffer `_activeTurnBuffer` is not even opened in `applyArmyDirectiveInterpretation` when the flag is set.

When the flag is set, `data/derived/_debug/c_lane_corps_directive_telemetry.jsonl` is byte-identical to a pre-C2 baseline (i.e. absent unless other code wrote it). `weekly_report.jsonl` and `final_state_hash` are byte-identical to the C1-only path.

## Tests (17/17 GREEN)

```
✓ tests/c2_corps_directive_telemetry.test.ts (17 tests)
✓ tests/c1_corps_directive_consumer.test.ts (15 tests)
✓ tests/b2_political_leader_data.test.ts (20 tests)
✓ tests/b1_political_directive_producer.test.ts (21 tests)
✓ tests/a4_army_co_roster_personalities.test.ts (16 tests)
✓ tests/a3_army_order_interpretation.test.ts (14 tests)
✓ tests/a2_army_co_substrate.test.ts (16 tests)
✓ tests/a1_army_hq_campaign_plan_wired.test.ts (7 tests)

Total: 126/126 GREEN
```

## Pipeline Ordering (DDR Q4: NO new step)

`evaluate-army-hq-gathering` → `produce-political-directive` (B1) → `evaluate-army-co-transitions` (A4) → `apply-army-directive-interpretation` (A3 + C1 persist + **C2 record + flush**) → `generate-bot-corps-orders` (briefing reads overlay).

C2 reuses the A3 pipeline step. No new pipeline step name was introduced (T10b static-grep guard).

## §6 Sensitive-History Verification

C2 is a **pure observability surface** (no game-state mutation, no operation triggers, no paint anchors, no `political_controllers` writes). The `political_directive_chain_active` event is a turn-end ASSERTION, not a behavioral trigger. Sensitive-history surface: NONE introduced. Faction-symmetric mechanism (T7 + T10c static-grep guards prevent any `if (faction === 'X')` branches).

The DDR's §6 risk band identified at C-lane (Krivaja-95 / Stupčanica-95 chain via Drina Corps `campaign_role` overlay) is C1's concern and was closed in the C1 lane. C2 does not change that surface.

## Byte-stability Targets

| Configuration | weekly_report.jsonl | final_state_hash | side-channel JSONL |
|---|---|---|---|
| C1 disabled + C2 disabled | post-Krivaja baseline | `575aca8c8adfdae2` | absent |
| C1 enabled + C2 disabled | drift from baseline (C1 fires) | drift from baseline | absent |
| C1 enabled + C2 enabled | byte-identical to C1-only | byte-identical to C1-only | populated |

T9 verifies the third row's invariant directly (final state byte-identical with C2 enabled vs. disabled).

## Parent-runnable verification commands (POSIX inline env vars)

```bash
# 40w combined-disabled control — must match post-Krivaja baseline.
MORALE_OVERRIDE_ENABLED=true \
  C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true \
  C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true \
  npm run sim:scenario:run:40w
# Expect: final_state_hash 575aca8c8adfdae2

# 40w C1-enabled, C2-disabled — drift from baseline (persist active, no telemetry).
MORALE_OVERRIDE_ENABLED=true \
  C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true \
  npm run sim:scenario:run:40w
# Expect: drift from baseline; weekly_report.jsonl byte-identical to C1-only path;
# data/derived/_debug/c_lane_corps_directive_telemetry.jsonl absent.

# 40w C1+C2 enabled — byte-identical state, side-channel JSONL populated.
MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run:40w
# Expect: final_state_hash IDENTICAL to the C1-enabled / C2-disabled run above
#   (C2 telemetry does not mutate state).
# weekly_report.jsonl IDENTICAL to the same run.
# data/derived/_debug/c_lane_corps_directive_telemetry.jsonl GROWS with three
# event types per turn that has a B1 directive AND a C1 persist.
```

## 188w A/B (chain-observability verification)

```bash
# Run #1 — fully enabled (default).
MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run:default
# Expect: data/derived/_debug/c_lane_corps_directive_telemetry.jsonl contains
# non-zero army_directive_application events for all factions with active
# B1 directives, weekly corps_role_overlay_count aggregates, and per-turn
# political_directive_chain_active assertions.

# Run #2 — fully disabled control (pre-C2 / pre-C1 baseline).
MORALE_OVERRIDE_ENABLED=true \
  C_LANE_CORPS_DIRECTIVE_CONSUMER_DISABLED=true \
  C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED=true \
  npm run sim:scenario:run:default
# Expect: data/derived/_debug/c_lane_corps_directive_telemetry.jsonl absent.
# weekly_report.jsonl matches post-Krivaja baseline at 188w.
```

## Determinism

No `Math.random()`, no `Date.now()`, no `new Date()`, no timestamps, no `setTimeout`. All maps iterated via sorted keys; faction order is alphabetical (`['HRHB','RBiH','RS']`); per-faction corps order is alphabetical via the same sort already used by `persistCorpsDirectives`. Static-grep guard (T10) covers the touched source file.

## Closure

C2 ships the telemetry surface; C-lane is now READY for 188w A/B verification. Mini-panel NOT REQUIRED per DDR Q5 (40w byte-stable A/B is the SHIP gate). The post-run panel can read `data/derived/_debug/c_lane_corps_directive_telemetry.jsonl` directly.
