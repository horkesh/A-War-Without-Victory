# B2 — Political Leader Data Integration (LANE-NIGHTSHIFT-B2-POLITICAL-LEADER-DATA-INTEGRATION)

**Date:** 2026-05-06
**Status:** SHIPPED (calibration-active half of B-lane SPLIT)
**Predecessors:**
- A1 (CampaignPlan wiring): `18136710`
- A2 (Army CO substrate): `ba6955bf`
- A3 (Army order interpretation, consumer): `c8ff93d8`
- A4 (Army CO roster personalities): `93c75b1d`
- A-lane DDR umbrella: `eee308e0`
- B-lane DDR: `941bd68e` + `168d65c2`
- B1 (Political directive producer infra): `44053a32`
- Krivaja-95 sibling drift: `d622b762` + backfill `39e6b7b6`

## Summary

B1 wired the producer infrastructure (`producePoliticalDirective` + `applyPoliticalDirectiveProducer` + pipeline-step at `produce-political-directive`), but the producer remained byte-stable always-null because `state.military.political_leader_data` and `state.military.political_leaders` were never populated. B2 ships the canonical Ring 2 DATA (Izetbegović, Karadžić, Boban) and the scenario-init wire-up that populates B1's substrate slots. Once B2 lands, B1 transitions from always-null to actively emitting `PoliticalDirectiveVerb`s consumed by A3, enabling A4 personality differentiation observable at 188w via autonomous-launch / override / relief telemetry.

## Files

- **NEW:** `data/scenarios/political_leader_data.json` — canonical hand-authored political-leader data (3 factions × 5 numeric fields each, 1-5 scale matching officer-system convention).
- **NEW:** `src/sim/political/political_leader_data_loader.ts` — `loadPoliticalLeaderData`, `applyPoliticalLeaderData`, `applyPoliticalLeaderDataInit`, `isValidLeaderProfile`, `_resetPoliticalLeaderDataCache`. Faction-symmetric loader; idempotent population; env-flag short-circuit.
- **EXTENDED:** `src/scenario/scenario_runner.ts` — adds B2 init call AFTER officer initialization, BEFORE first `runTurn`. Single insertion point (singular ownership).
- **NEW:** `tests/b2_political_leader_data.test.ts` — 20 tests across schema validity, substrate population, B1 producer activation, env-flag short-circuit, determinism, faction-symmetry, backward-compat, A3-receipt, static-grep guard, DDR provenance, synthetic-data path.

## Mini-Panel Verdict (Phase 1)

**REFINED.** All DDR-provisional values fit the proposed historical ranges; refined to single-decimal final values and converted to the canonical 1-5 scale used by `political_leader_types.ts` and B1's thresholds.

| Faction | Leader | hawkishness | flexibility | international_sensitivity | patron_deference | impunity_tolerance |
|---|---|---|---|---|---|---|
| RBiH | Izetbegović | 3.0 | 3.4 | **4.2** | 2.4 | 2.5 |
| RS | Karadžić | **4.2** | 2.0 | 2.4 | 3.4 | 4.5 |
| HRHB | Boban | 3.6 | 3.2 | 3.0 | **4.2** | 3.5 |

**Source citations** (attached as `_sources` arrays per leader in JSON):
- **Izetbegović**: BB Vol I ch.4-5 (pragmatic survival, reluctant escalation); BB Vol II ch.10-11 (arms-embargo politics + IC observation primary lever); ICTY case record (Krajisnik TJ — multiple negotiation rounds, Vance-Owen, Owen-Stoltenberg); BiH-first orientation rejected mujahideen integration.
- **Karadžić**: ICTY Karadžić TJ §§3447-3464 (Six Strategic Goals 12 May 1992, explicit territorial maximalism); Vance-Owen Aug 1993 RS Assembly rejection; Owen-Stoltenberg 1993 rejection; Dayton signed only under Milošević coercion via Belgrade; defied sanctions / NATO no-fly Apr 1993 / Srebrenica execution despite UN observation; well-documented friction with Milošević post-1993.
- **Boban**: Graz Accord with Karadžić Apr 1992 (Greater Croatia ambitions); BB Vol I (Mostar campaign May 1993, central Bosnia push); Petković/Praljak/Roso commander rotations; Washington Agreement Mar 1994 signed under direct Tudjman directive; Boban replaced Mar 1994 when Tudjman pivoted — strongest patron deference of three leaders; ICTY Prlić et al. (Tudjman-Zagreb directive primary).

**Verb derivation when fully wired** (per B1 thresholds — `B1_HAWKISH_THRESHOLD = 4`, `B1_HIGH_SENSITIVITY_THRESHOLD = 4`):
- **RS** (Karadžić, hawkishness 4.2 ≥ 4, sensitivity 2.4 < 4): default → `PRESS_OFFENSIVE`. High exhaustion (≥500) without high sensitivity → `PREPARE_RESERVE`.
- **RBiH** (Izetbegović, hawkishness 3.0, sensitivity 4.2 ≥ 4): default → `BALANCE_FRONTS`. High IVP (≥0.6) → `HONOR_TRUCE`. Alliance ≤ 0 → `MAINTAIN_CORRIDOR`.
- **HRHB** (Boban, hawkishness 3.6, sensitivity 3.0 < 4): default → `BALANCE_FRONTS`. Alliance ≤ 0 → `MAINTAIN_CORRIDOR`.

## Pipeline ordering (unchanged from B1)

```
evaluate-army-hq-gathering              (A1 — produces CampaignPlan)
produce-political-directive             (B1 — reads B2 substrate, emits directive)
evaluate-army-co-transitions            (A4 — populates stubbornness from roster)
apply-army-directive-interpretation     (A3 — consumes the directive we wrote)
generate-bot-corps-orders
```

B2 does not change pipeline ordering; the substrate is populated at scenario init (before turn 0), and persists through `runTurn` invocations.

## Scenario-init insertion point

In `scenario_runner.ts`, the B2 init is invoked AFTER `init_officers` substrate is loaded (so subsequent A4-pipeline reads see both substrates), and BEFORE the first `runTurn`:

```ts
if (scenario.init_officers) { /* officer loader */ }

// B2: applyPoliticalLeaderDataInit(state, leaderDataPath)
```

The init is unconditional on scenario flags (data is faction-canonical, applies to every scenario that runs through the runner). The env flag `B2_POLITICAL_LEADER_DATA_DISABLED=true` short-circuits the load for the 188w A/B control run.

## Test verification

| Suite | Tests | Status |
|---|---|---|
| `tests/b2_political_leader_data.test.ts` | 20 | PASS |
| `tests/b1_political_directive_producer.test.ts` | 21 | PASS |
| `tests/a4_army_co_roster_personalities.test.ts` | 16 | PASS |
| `tests/a3_army_order_interpretation.test.ts` | 14 | PASS |
| `tests/a2_army_co_substrate.test.ts` | 16 | PASS |
| `tests/a1_army_hq_campaign_plan_wired.test.ts` | 7 | PASS |
| `npx tsc --noEmit -p tsconfig.json` | — | CLEAN |

## Per-test verdict (B2 suite)

| ID | Description | Verdict |
|---|---|---|
| T1 | JSON loads with valid schema (3 factions, all numeric in [1,5]) | PASS |
| T1b | Canonical leader_id values match historical conventions | PASS |
| T2 | applyPoliticalLeaderDataInit populates state.military.political_leader_data | PASS |
| T3 | applyPoliticalLeaderDataInit populates state.military.political_leaders | PASS |
| T4 | producePoliticalDirective returns non-null after B2 init for all factions | PASS |
| T4b | RS (Karadžić, hawkishness 4.2) emits PRESS_OFFENSIVE by default | PASS |
| T5 | B_LANE_POLITICAL_DIRECTIVE_PRODUCER_DISABLED forces null even with B2 substrate | PASS |
| T6 | applyPoliticalLeaderDataInit byte-identical across runs | PASS |
| T6b | applyPoliticalLeaderDataInit idempotent within a single state | PASS |
| T7 | Loader source has no per-faction string-equality branches (static-grep) | PASS |
| T7b | All three factions populate via same code path | PASS |
| T8 | applyPoliticalLeaderDataInit with bogus path is a no-op | PASS |
| T8b | Pre-B2 save survives applyPoliticalDirectiveProducer | PASS |
| T9 | applyPoliticalDirectiveProducer writes directives_by_faction for non-player factions | PASS |
| T9b | player_faction directive is NOT written | PASS |
| T10 | B2_POLITICAL_LEADER_DATA_DISABLED short-circuits the init | PASS |
| T11 | Loader source contains no Math.random / Date.now / new Date / setTimeout | PASS |
| T12 | DDR + B1 commits cited in source + JSON | PASS |
| T13 | applyPoliticalLeaderData populates state from in-memory data | PASS |
| T13b | Invalid profiles are filtered out (hawkishness > 5) | PASS |

## Sensitive-history compliance

- **Ring 1 mechanism** (loader, predicates, derivation): faction-symmetric. Static-grep T7 forbids `faction === 'RS'` / `faction === 'RBiH'` / `faction === 'HRHB'` in loader source.
- **Ring 2 data** (JSON): faction-asymmetric. Canonical historical leader personalities matched to BB / ICTY citations.
- **§6 surface flag**: NEW behavioral surface — political bot directives now actively flow through B1 → A3 → A4 telemetry. Faction-symmetric mechanism with data-driven asymmetry. Matches Engine_Invariants_v0_7_0 §6 + SENSITIVE_HISTORY_DESIGN_GATE.md (data-driven asymmetry pattern, mirrors A4 reconstitution scheme).
- **DOES NOT touch** FORAWWV / paint anchors / political_controllers / OOB / rupture wiring.
- **A4-reconstitution-pattern parity**: faction-symmetric loader code; faction-asymmetric data values; idempotent population preserves any pre-B2 scenario authorial intent.

## Calibration risk band

**MEDIUM** (per DDR Q5 — calibration-active half of B-lane SPLIT). The producer now actively emits verbs each turn for every non-player faction with substrate populated (3 factions on canonical scenarios). Effect on op generation, brigade allocation, and territorial outcomes is bounded by A3's MAX_DIRECTIVE_DEVIATION (1 step along ROLE_LADDER) but real — even one role shift on a primary corps can cascade into `generate-bot-corps-orders`.

## Parent-runs validation commands (40w byte-stability + 188w A/B)

### 40w byte-stability tests (parent runs)

**Disabled-flag path** (must match pre-B2 baseline `575aca8c8adfdae2`):
```bash
NODE_OPTIONS="--max-old-space-size=12288" \
  MORALE_OVERRIDE_ENABLED=true \
  B2_POLITICAL_LEADER_DATA_DISABLED=true \
  npm run sim:scenario:run:40w \
  > runs/b2_40w_disabled.log 2>&1
```
Expected: hash `575aca8c8adfdae2` (matches post-Krivaja baseline; verifies B2 inert when flagged off).

**Enabled-flag path** (B2 fires; behavioral hash drift expected):
```bash
NODE_OPTIONS="--max-old-space-size=12288" \
  MORALE_OVERRIDE_ENABLED=true \
  npm run sim:scenario:run:40w \
  > runs/b2_40w_enabled.log 2>&1
```
Expected: hash drift from `575aca8c8adfdae2` (B2 actively populates substrate; B1 emits directives; A3 deviates corps roles; downstream calibration-flat or near-flat anchors expected at 40w but hash WILL change).

### 188w A/B (parent runs)

**Run #1 — B2 enabled (default)**:
```bash
NODE_OPTIONS="--max-old-space-size=12288" \
  MORALE_OVERRIDE_ENABLED=true \
  npm run sim:scenario:run -- \
    --scenario data/scenarios/apr1992_definitive_188w.json \
    --unique --out runs \
  > runs/b2_188w_enabled.log 2>&1
```

**Run #2 — B2 disabled control**:
```bash
NODE_OPTIONS="--max-old-space-size=12288" \
  MORALE_OVERRIDE_ENABLED=true \
  B2_POLITICAL_LEADER_DATA_DISABLED=true \
  npm run sim:scenario:run -- \
    --scenario data/scenarios/apr1992_definitive_188w.json \
    --unique --out runs \
  > runs/b2_188w_disabled.log 2>&1
```

### 188w binding thresholds (per mini-panel + DDR Q5)

In the **enabled** run vs. **disabled** control:

- Combined autonomous-launch count (188w) ≤ **10** in enabled run
- Combined override count ≤ **340** in enabled run (DDR Q5 upper bound)
- Combined relief count ≤ **7** in enabled run
- Anchor regression vs baseline ≤ **2**
- §6 floor: Krivaja-95 / Stupčanica-95 fire at canonical t≥170 / t≥172

## STOP-AND-ASK conditions

None encountered. All four pre-flight conditions cleared:
- Mini-panel found DDR-provisional values historically defensible — values refined to single-decimal 1-5 scale and committed.
- Existing scenario-init code accepted the loader insertion point cleanly (after officer init, before runTurn).
- B1's producer signature reads the same fields B2 populates (hawkishness, flexibility, international_sensitivity, patron_deference, plus impunity_tolerance — all five fields populated).
- 40w byte-stability when flag-disabled is structurally guaranteed by `B2_POLITICAL_LEADER_DATA_DISABLED=true` short-circuit (test T10 verifies; parent run pending).

## Next lane

A3+A4 telemetry FIRES at 188w. Once parent runs validate the 188w A/B and confirm binding thresholds hold, the B-lane SPLIT closes. Future political-bot work (IVP modulation, ceasefire posture, faction war goals) can plug into the same `src/sim/political/` namespace.
