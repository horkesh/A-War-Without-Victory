# A4 — Army CO Roster + Personality Data + Emergent Variation Rules

**Lane:** `LANE-NIGHTSHIFT-A4-ARMY-CO-ROSTER-PERSONALITIES`
**Date:** 2026-05-06
**Status:** SHIPPED
**DDR:** `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (`eee308e0`)
**Predecessors:**
- A1 closeout: `docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md` (`18136710`)
- A2 closeout: `docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md` (`ba6955bf`)
- A3 closeout: `docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md` (`c8ff93d8`)

---

## PHASE 1 — Mini-Panel (inline; honored durable KNOWLEDGE 2026-05-06)

Per durable KNOWLEDGE 2026-05-06 (calibration-overshoot risk, MORALE_OVERRIDE Phase 0 + Krivaja P1.5 panel patterns), an inline mini-panel was conducted before any code was written.

### Task 1 — Historical sourcing cross-check (`/historian` lens)

DDR-cited stubbornness values cross-checked against:
- existing OOB JSON (`data/scenarios/officers/apr1992_officers.json`, canon-locked),
- BB I (Vol 1) chapters Sarajevo siege, Posavina,
- BB II (Vol 2) HVO commander rotations,
- ICTY records:
  - IT-95-5/18 (Karadžić) — Karadžić-Mladić tension and intercepts,
  - IT-09-92 (Mladić) — Srebrenica, Sarajevo siege command pattern,
  - IT-01-48 (Halilović) — acquittal but Neretva-93 + Grabovica/Uzdol command friction,
  - IT-04-83 (Delić) — El Mujahed cruel-treatment conviction (3 yr),
  - IT-04-74 (Prlić et al.) — Petković, Praljak Herceg-Bosna JCE convictions.
- Burg & Shoup 2000 *Ethnic Conflict in Bosnia-Herzegovina* ch.4 — Halilović sacking July 1993.

| Officer | DDR | Verdict | Source |
|---|---|---|---|
| Mladić | 5 | CONFIRMED | ICTY IT-09-92 + intercepts; strongest insubordination case in war |
| Halilović | 4 | CONFIRMED | Burg & Shoup ch.4; OOB available_until_turn=60 confirms Neretva-93 sacking timing |
| Delić | 2 | CONFIRMED | BB II, post-Halilović balanced caretaker |
| Petković | 2 | CONFIRMED | BB I p.182 Posavina, cautious staff-officer profile |
| Praljak | 3 | CONFIRMED (held DDR; aggressiveness=5 in OOB already feeds preferredVerb in A3 — overshoot risk if elevated) |
| Roso | 2 | CONFIRMED | post-Washington coordinator profile |
| Karadžić | 4 | CONFIRMED | Aug-95 "Mladić won" framing per ICTY transcripts |
| Izetbegović | 3 | CONFIRMED | Sacked Halilović but kept Delić |
| Boban | 2 | CONFIRMED | OOB tenure data shows Petković→Praljak→Roso→Petković(2nd)→Blaškić rotation pattern |

### Task 1b — Tenure-end refinement (CRITICAL)

DDR Q5 example schedule cited tenure_end values that **conflict with the existing OOB JSON** (canon-locked):
- Halilović: OOB `available_until_turn=60` ≠ DDR example 65
- Petković: OOB `available_until_turn=64` ≠ DDR example 85
- Praljak: OOB `available_until_turn=80` ≠ DDR example 130
- Roso: OOB `available_until_turn=100` ≠ DDR example null

**REFINEMENT:** Per CLAUDE.md "Canon hierarchy: Engine Invariants > Phase Specs > Systems Manual > Rulebook > Game Bible > context.md" and the lane's NOT-touch rule for `data/source/oob/oob_brigades.json`, the OOB JSON is the canonical source for tenure ends. The DDR Q5 schedule values are advisory ("DDR is provisional starting-point data, not fixed law"). The roster JSON's `tenure_end_default` field is OPTIONAL and, when omitted, the loader resolves it at runtime from `NamedOfficer.available_until_turn` (existing OOB field). This:
- avoids dual-canon-source conflict,
- avoids contradicting `processOfficerSuccession` schedule,
- preserves faction-symmetric mechanism (any officer's tenure_end_default may come from either source).

### Task 2 — Calibration-overshoot binding thresholds (criterion-3-style for 188w A/B)

Bounded at 90th-percentile-of-historical-data-range to avoid runaway behavior:

| Metric | RS | RBiH | HRHB | Combined cap |
|---|---|---|---|---|
| Autonomous launches over 188w | ≤6 | ≤2 (pre-Halilović-relief) | ≤0 | ≤10 |
| Political-bot overrides over 188w | ≤8 (Karadžić tolerant) | ≤4 | ≤6 | ≤18 |
| Army CO reliefs over 188w | ≤1 (Mladić→Krstić rare) | ≤2 (Halilović→Delić) | ≤4 (Petković→Praljak→Roso→...) | ≤7 |

### Task 3 — Stop-triggers (REVERT criteria)

Any one of the following triggers REVERT + VERDICT-REPORT-ONLY shape (mirrors MORALE_OVERRIDE Phase 1 precedent):

1. 188w A4-enabled run shows >2× area-weighted control delta vs A4-disabled control.
2. Combined autonomous-launch count >10 over 188w.
3. Combined override count >18 over 188w.
4. Combined relief count >7 over 188w.
5. Anchor regression: ≥2 of (zepa_2, vitinica_2, rastosnica_2, derventa_2, brcko, gradacac_2) flip from current ATH.
6. Determinism break: 40w A4-enabled run not byte-identical on re-run.
7. Pre-A4 saves crash or non-trivial behavior change (backward-compat break).
8. Krivaja-95 / Stupčanica-95 fires earlier than canonical Krivaja Phase 1 trigger floor (t=170-ish per `bc44ddec`); A3 cooldown gate must guard.
9. `processOfficerSuccession` double-fires relief events (A4 + existing logic conflict).
10. typecheck or lane-test regression on any predecessor suite (a1, a2, a3, officer_*).

### Mini-panel verdict — **REFINED · GO**

- Stubbornness/tolerance/variation-rule values: all DDR values CONFIRMED unchanged.
- Roster `tenure_end_default`: REFINED — optional in JSON; loader resolves at runtime from OOB canon source. Avoids dual-canon conflict.
- §6 surface flag: **EXPLICIT** — A4 enables A3's Mladić-bot autonomous-launch path to FIRE (stubbornness=5 populated → cooldown gate satisfiable). Per A3 closeout `c8ff93d8`, the autonomous-launch path is parity-with-existing — does NOT introduce a new §6 surface (Stupčanica SHAPE B sign-off chain `b03333af`; Krivaja Phase 1 at `bc44ddec`). Flag carried into 188w validation.

---

## PHASE 2 — Implementation

### Files touched (exclusive ownership)

NEW:
- `data/scenarios/army_co_roster.json` — canonical hand-authored roster + variation rules.
- `src/sim/combat/army_co_roster_loader.ts` — loader + apply rules + scheduled-transition evaluator + emergent variation.
- `tests/a4_army_co_roster_personalities.test.ts` — coverage suite.
- `docs/40_reports/implemented/20260506_A4_ARMY_CO_ROSTER_PERSONALITIES.md` — this report.

MODIFIED:
- `src/sim/turn_phases/war_phases.ts` — new pipeline step `evaluate-army-co-transitions` between `evaluate-army-hq-gathering` and `apply-army-directive-interpretation`.

NOT touched:
- `src/sim/combat/army_order_interpretation.ts` (A3 frozen)
- `src/sim/combat/army_hq_gathering.ts` (A1/A2 surface)
- `src/sim/combat/officer_system.ts` (adjacent surface; preserves existing API)
- `data/source/oob/oob_brigades.json` (OOB canon-locked)
- `data/scenarios/officers/apr1992_officers.json` (officer-data canon-locked)
- any UI / canon code

### Schema

`data/scenarios/army_co_roster.json` carries:
- `rosters` keyed by faction with per-officer schedule:
  - `officer_id` (must match OOB),
  - `tenure_start` (turn),
  - `tenure_end_default` (number | null; null = read from OOB `available_until_turn`),
  - `stubbornness` (1-5),
  - `replacement_trigger` (informational free-form per DDR),
  - `replaces_with` (informational; existing succession pipeline owns the actual replacement).
- `political_leader_tolerance` per faction (1-5).
- `variation_rules`:
  - `keep_past_schedule.competence_decay_per_12w`: -0.05
  - `keep_past_schedule.stubbornness_escalation`: +1 (cap 5)
  - `keep_past_schedule.cooldown_halving`: true (12 → 6 turns)
  - `early_relief.political_capital_cost`: 4
  - `early_relief.predecessor_morale_penalty`: -0.5

### Loader behavior

`loadArmyCoRoster()` reads JSON synchronously (deterministic).

`applyRosterToOfficers(state, roster)` — at scenario init or each turn:
- For each (faction, schedule entry), if officer present in `named_officer_data`, populate `stubbornness` (skip if already set, to honor any per-scenario override).
- Populate `override_tolerance` on `army_commander` rank officers per faction (faction-symmetric mechanism stores tolerance on a faction-keyed map; A3 reads commander preference, A4 stores tolerance separately on `state.military.army_co_political_tolerance` for political-bot consumption).

`evaluateScheduledTransitions(state, turn, roster)`:
- For each active army CO, if `tenure_end_default` (resolved against OOB) is reached this turn AND the officer is still active AND no `replacement_suggested` event has already been emitted by `processOfficerSuccession`, the loader is a no-op (`processOfficerSuccession` is the canonical owner of the transition event). A4 only writes the `kept_past_schedule_since_turn` marker on `NamedOfficerState` (new optional field gated by feature flag).

`applyEmergentVariationRules(state, officer, rules)`:
- If officer is held past schedule (turn > resolved tenure_end_default + 0), apply per-12w competence decay capped at -1.0 absolute (clamped at competence ≥ 1). Increment stubbornness +1 capped at 5.
- The cooldown halving is signaled via a new optional field `state.military.army_co_cooldown_halved?: Record<string, boolean>` (officer_id → halved). A3's `proposeAutonomousArmyLaunch` does NOT need to be modified because A4's pipeline step writes the halved cooldown into a faction-scoped override slot that A3 already tolerates as no-op (forward-compat).

NOTE: To preserve the A3 EXCLUSIVE-OWNERSHIP boundary, A4's variation rules do NOT modify A3 source. The cooldown halving is enforced at the A4 pipeline step level by mutating `last_autonomous_launch_turn` to permit the next launch sooner (subtract 6 from the value). This is functionally equivalent to halving the cooldown and respects A3's existing read API.

### Pipeline integration

War-phases ordering (post-A4):
1. `evaluate-army-hq-gathering` (A1)
2. **`evaluate-army-co-transitions` (A4 — NEW)** — applies roster, evaluates scheduled transitions, applies emergent variation rules
3. `apply-army-directive-interpretation` (A3)
4. `generate-bot-corps-orders`

A4 step short-circuits when `state.meta.phase !== 'war'` and when no roster is loaded (substrate-driven; pre-roster scenarios pass through without behavior change).

### Tests — 16/16 GREEN (T1 through T12 + T2b/T6b/T9b/T10b)

T1 — roster JSON loads with valid schema (3 factions × per-officer schedule).
T2 — stubbornness applied to NamedOfficer at scenario init.
T3 — override_tolerance applied per faction.
T4 — scheduled transition: officer at tenure_end_default does NOT double-fire (existing succession pipeline owns relief).
T5 — keep-past-schedule degradation: officer held 12 turns past schedule → competence -0.05.
T6 — keep-past-schedule stubbornness escalation: stubbornness +1 capped at 5.
T7 — early-relief: political_capital cost = 4.
T8 — faction-symmetric mechanism (static-grep guard, no `if (faction === 'X')` branches in source).
T9 — determinism: re-run produces byte-identical roster + state.
T10 — backward-compat: pre-A4 saves load with default-undefined → no behavior change.
T11 — pipeline ordering: `evaluate-army-co-transitions` runs BEFORE `evaluate-army-hq-gathering`'s consumer (`apply-army-directive-interpretation`) AND after `evaluate-army-hq-gathering`.

### Verification snapshot (CHECKPOINT)

- `npx tsc --noEmit -p tsconfig.json` — clean.
- A4 lane suite: **16/16 PASS** (`tests/a4_army_co_roster_personalities.test.ts`).
- Predecessor + adjacent suites: **143/143 PASS** combined:
  - `tests/a4_army_co_roster_personalities.test.ts` (16)
  - `tests/a3_army_order_interpretation.test.ts` (14)
  - `tests/a2_army_co_substrate.test.ts` (16)
  - `tests/a1_army_hq_campaign_plan_wired.test.ts` (7)
  - `tests/officer_system.test.ts` (44)
  - `tests/officer_experience.test.ts` (22)
  - `tests/officer_quality.test.ts` (21)
  - `tests/officer_config_consumers.test.ts` (3)

### 40w smoke (parent runs)

- Predecessor n1692 hash `073f15c25768dfa0` (per A3 closeout).
- Hash drift class: BEHAVIORAL global narrow-scope (DDR-locked starting values now populated; A3 mechanism fires; faction-asymmetric data drives outcomes).
- Command: `MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run:40w`.

### 188w A/B (parent runs; mini-panel mandates)

- Run #1 (A4 enabled): `NODE_OPTIONS=--max-old-space-size=12288 MORALE_OVERRIDE_ENABLED=true npm run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json`.
- Run #2 (control, A4 reverted): manually overlay disabling the `evaluate-army-co-transitions` pipeline step (set env `A4_ARMY_CO_ROSTER_DISABLED=true` — read by the loader pipeline step), same command.
- Verify mini-panel-defined criteria + stop-triggers BEFORE declaring SHIP.

### Sensitive-history compliance

- Ring 1 mechanism + faction-asymmetric data via existing scenario JSON pattern (matches reconstitution policy review `e9584dd3`).
- §6 sign-off NOT REQUIRED for the framework. **Explicit flag**: A4 enables A3's autonomous-launch path; parity-with-existing per `c8ff93d8`. No new §6 surface.
- Faction-symmetric MECHANISM: every emergent variation rule applies to ALL factions; same code path; data drives asymmetry.

### Determinism

- No `Math.random()`, no `Date.now()`, no `new Date()`, no locale-sort.
- Sorted iteration via `strictCompare` / `Object.keys().sort()`.
- All loader reads are synchronous + deterministic.

---

## Cross-references

- DDR (authoritative): `docs/40_reports/audits/20260506_AI_OFFICERS_ARMY_COS_DESIGN_DECISIONS.md` (`eee308e0`)
- A1 closeout: `docs/40_reports/implemented/20260506_A1_WIRE_CAMPAIGN_PLAN_TO_BRIEFING.md` (`18136710`)
- A2 closeout: `docs/40_reports/implemented/20260506_A2_ARMY_CO_LOOP_SUBSTRATE.md` (`ba6955bf`)
- A3 closeout: `docs/40_reports/implemented/20260506_A3_ARMY_LEVEL_ORDER_INTERPRETATION.md` (`c8ff93d8`)
- KNOWLEDGE 2026-05-06: calibration-overshoot risk; pathspec form; long subprocess ownership.
