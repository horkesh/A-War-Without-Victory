# LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE — Army CO loop substrate (schema additions only)

**Date:** 2026-05-06
**Lane:** LANE-NIGHTSHIFT-A2-ARMY-CO-LOOP-SUBSTRATE
**Scope:** SUBSTRATE only — schema fields A3–A5 will consume. **NO behavior change.**
**Sensitive-history Ring:** Ring 1 — schema additions only; faction-symmetric mechanism (every field exists for all factions; data populates per faction in A4). No FORAWWV / paint anchor / `political_controllers` / OOB / rupture-wiring / `enclave_resilience.ts` touch.

---

## Background

A1 audit (`docs/40_reports/audits/20260330_REPO_HEALTH_CONSOLIDATED.md`) flagged P0 ARMY-GAP-1: "CampaignPlan from `army_hq_gathering.ts` is never read by corps CO briefings — strategic layer is structurally disconnected." That finding was **STALE**. A1 lane closeout (`docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md`, commit `18136710`) confirmed the wiring is in fact PRESENT and shipped a 7-test regression net.

**A2's revised job** (per parent orchestrator and DDR, `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md`, commit `eee308e0`): add the data-shape SUBSTRATE that A3–A5 will consume. No new functions. No behavior change. Schema additions only, all backward-compatible.

---

## What was added (additive, all optional)

### 1. `src/state/officer_types.ts` — `NamedOfficer` static traits

| Field | Type | DDR clause | Purpose |
|---|---|---|---|
| `stubbornness?` | `number` (1–5) | Q3 | Willingness to autonomously launch ops political leader did not order. ≥4 unlocks autonomous-launch path in A3. |
| `override_tolerance?` | `number` (1–5) | Q4 | Political-leader bot tolerance of subordinate insubordination. Stored on the general officer schema; only meaningful on POLITICAL leaders. |

**Canonical defaults from DDR (data, not code; A4 populates):**
- Stubbornness: Mladić=5, Halilović=4, Praljak=3, Delić=2, Petković=2, Roso=2.
- Override tolerance: Karadžić=4, Izetbegović=3, Boban=2.

### 2. `src/state/officer_types.ts` — `NamedOfficerState` mutable state

| Field | Type | DDR clause | Purpose |
|---|---|---|---|
| `last_autonomous_launch_turn?` | `number` (≥0) | Q3 | Cooldown tracking; A3 enforces max 1 autonomous launch per army CO per 12-turn rolling window. |
| `recent_overrides?` | `Array<{turn; resolution: 'accept'\|'override'\|'relieve'}>` | Q4 | Append-only ring for political-bot auto-relief threshold (≥3 overrides in 12 turns triggers relief). |

### 3. `src/state/game_state.ts` — `MilitaryState`

| Field | Type | DDR clause | Purpose |
|---|---|---|---|
| `army_co_decision_traces?` | `Record<FactionId, Array<{turn; campaign_role; rationale; raw_directive_id?}>>` | Q1 | Per-faction append-only "why" log for army-level decisions. Writer: A3. Reader: A5 UI. |

### 4. `src/state/validateGameState.ts` — validators

Validators added for all four new fields:
- `army_co_decision_traces` — per-faction map; turn integers; campaign_role non-empty string.
- `named_officer_data[].stubbornness` / `.override_tolerance` — bounded `1..5` integers when present.
- `named_officers[id].last_autonomous_launch_turn` — non-negative integer.
- `named_officers[id].recent_overrides[]` — turn integers; resolution ∈ {`accept`,`override`,`relieve`}.

All checks run only when the field is present. Pre-A2 saves remain valid.

---

## Singular ownership / no overlap

- **Schema location:** Single canonical owner per field (officer_types.ts for officer fields; game_state.ts for MilitaryState field). No parallel tensors.
- **Writers/readers declared in field comments:** A3 writes `army_co_decision_traces`, `last_autonomous_launch_turn`, `recent_overrides`; A5 reads traces.
- **Trim/GC owner:** A3 owns `recent_overrides` ring trim (12-turn window) and `army_co_decision_traces` bound policy.
- **A2 makes no behavioral consumption** — fields are unread until A3 ships.

---

## Tests — `tests/a2_army_co_substrate.test.ts` (16 tests, all GREEN)

- T1 (`accepts officer with stubbornness in [1,5] and override_tolerance in [1,5]`): substrate fields parse + validate within bounds, including officers without either field (backward compat).
- T2 (`accepts last_autonomous_launch_turn ... and recent_overrides ring`): mutable substrate fields parse + validate including the resolution enum.
- T3 (`accepts per-faction trace arrays`): `army_co_decision_traces` validates per-faction with optional `raw_directive_id`.
- T4 (×2: backward compatibility): pre-A2 states with no new fields validate cleanly.
- T5 (×6: validator rejects malformed entries):
  - stubbornness = 6 (above 1–5 cap)
  - stubbornness = 0 (below 1–5 floor)
  - override_tolerance = -1 (negative)
  - last_autonomous_launch_turn = -5 (negative)
  - recent_overrides resolution ∉ {accept, override, relieve}
  - decision-trace entry with non-integer turn
- T6 (`deterministic serialization`): `JSON.stringify` produces byte-identical output across two calls; resulting state validates.
- T7 (×3: static-grep guards): no `Math.random` / `Date.now` / `new Date` in touched files; A2 schema regions carry no hardcoded faction tokens; DDR commit `eee308e0` cited in source.

---

## Regression — existing officer/state suites

| Suite | Tests |
|---|---|
| `tests/validate_game_state_shape.test.ts` | 11/11 PASS |
| `tests/officer_system.test.ts` | 44/44 PASS |
| `tests/officer_experience.test.ts` | 22/22 PASS |
| `tests/officer_quality.test.ts` | 21/21 PASS |
| `tests/officer_config_consumers.test.ts` | 3/3 PASS |
| `tests/a1_army_hq_campaign_plan_wired.test.ts` | 7/7 PASS |
| `tests/a2_army_co_substrate.test.ts` (NEW) | 16/16 PASS |

`npx tsc --noEmit -p tsconfig.json` — clean.

---

## 40w smoke (parent runs)

Substrate-only / no behavior change → expected **BYTE-STABLE** to predecessor n1692 (`073f15c25768dfa0`).

---

## DDR clauses bound by this lane

- DDR Q1 (directive vocabulary list) — schema slot: `army_co_decision_traces[].campaign_role`. A3 will populate from FrontPriority['role'] vocabulary.
- DDR Q3 (Mladić-class insubordination) — schema slots: `NamedOfficer.stubbornness`, `NamedOfficerState.last_autonomous_launch_turn`. A3 will consume; A4 will populate canonical defaults.
- DDR Q4 (cross-army coordination conflict) — schema slots: `NamedOfficer.override_tolerance`, `NamedOfficerState.recent_overrides`. A3 will consume; A4 will populate canonical defaults.

---

## Stop-and-ask conditions (none triggered)

- Existing officer-state validator had no hard incompatibility with optional new fields. ✓
- 40w byte-stability not yet observed (parent runs); expected stable since no consumer reads the fields yet.
- All DDR-cited canonical defaults can be added as data in A4; no schema-side blockers.

---

## Files touched

| File | Change |
|---|---|
| `src/state/officer_types.ts` | Added `stubbornness`, `override_tolerance` to `NamedOfficer`; added `last_autonomous_launch_turn`, `recent_overrides` to `NamedOfficerState`. |
| `src/state/game_state.ts` | Added `army_co_decision_traces` to `MilitaryState`. |
| `src/state/validateGameState.ts` | Added validator clauses for all four new fields. |
| `tests/a2_army_co_substrate.test.ts` | NEW, 16 tests. |
| `docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md` | NEW (this file). |

**Files NOT touched:** `src/sim/combat/army_hq_gathering.ts`, `src/sim/combat/officer_system.ts`, `src/sim/combat/order_interpretation.ts`, any UI / scenario / canon code.

---

## Next-lane handoff

A3 may now:
- Read `state.military.named_officer_data[*].stubbornness` (default 2 if undefined).
- Read `state.military.named_officer_data[*].override_tolerance` (default 3 if undefined for political leaders).
- Read/write `state.military.named_officers[id].last_autonomous_launch_turn` for cooldown enforcement.
- Append/prune `state.military.named_officers[id].recent_overrides` for the 12-turn rolling window.
- Append entries to `state.military.army_co_decision_traces[faction]` for A5 UI surfacing.

A4 may now author canonical default values in scenario data (e.g., `data/scenarios/army_co_roster.json` per DDR Q5 hand-authored roster).

A5 may now consume `army_co_decision_traces[faction]` for Army HQ Pushback UI surface.
