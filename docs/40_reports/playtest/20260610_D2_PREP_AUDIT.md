# D2-Prep Instrumented Campaign Audit — 188w Start→Dayton (current main)

**Date:** 2026-06-10
**Author role:** instrumented-campaign auditor (READ-ONLY validation pass)
**Purpose:** Machine-doable proxy that confirms the engine is **playtest-READY** for D2 (the owner's actual start→Dayton playthrough — the TRUE 1.0 go/no-go). This audit cannot replace the human playthrough; it confirms the campaign closes cleanly end-to-end with no crashes, a legible terminal verdict, and the §6 record intact.
**Prior audit:** `docs/40_reports/playtest/20260609_INSTRUMENTED_CAMPAIGN_AUDIT.md` (#70) — produced the A2/A3/A4 punch-list. This run re-validates on current main.

**Repo state:** branch `main`, HEAD `661715918` (#390), version `0.9.9-beta.1`.
**Run:** `apr1992_definitive_188w_dayton_close` · 188 weeks · `decision_mode: emergent` · `dayton_close_out: true`.
**Run dir:** `runs/apr1992_definitive_188w_dayton_close__61ea3ee0de195084__w188_n1/`
**Final state hash:** `2cad30d26518b1d8`. Exit code 0. All 188 weeks logged, all 8 artifacts written.
**Posture:** READ-ONLY. No code/data/scenario/baseline change. Calibration numbers below are integrity-sanity reads only (this is the `emergent` close-out scenario, NOT the byte-identical calibration path) — pass/fail on calibration is the scenario-tester's domain, not this audit's.

---

## VERDICT: GO for D2-readiness

The engine closes a full start→Dayton campaign cleanly, terminates in a coherent **Pyrrhic Dayton verdict + `game_over`**, records the §6 Srebrenica rupture, and produces no crash/serialize error. A2 and A4 are **CLOSED**; A3 is **SUBSTANTIALLY CLOSED** (the codex/ghost bridges that #70 found dead are now live) with **one residual gap that is a known, owner-gated HOLD**, not a regression. The owner can sit down and play this through; D2 is unblocked on integrity grounds.

---

## A-punch-list status

### A2 — Dayton-as-ending (the climax must CLOSE) — **CLOSED**

#70's core finding was that the menu opened at t188 and nothing resolved it: `game_over=false`, an open `pending_dayton` freeze-frame, no verdict. On current main:

| field (final_save.json) | #70 | now |
|---|---|---|
| `meta.game_over` | false | **true** |
| `meta.outcome` | undefined | **`dayton`** |
| `negotiation.dayton_result` | absent | **present + signed** |
| `negotiation.pending_dayton` | open menu | **consumed (absent)** |
| `meta.endgame_snapshot` | absent | **present** (cost_ledger, verdict, peace_dysfunction, historical_comparison) |

- Mechanism: scenario flag `dayton_close_out: true` pulls the Dayton trigger to w180 (`DAYTON_TRIGGER_WEEK_CLOSE_OUT = 180`) and arms `resolvePendingDaytonCloseOut(state)` in the post-loop of `scenario_runner.ts:2749`, which resolves the menu via a deterministic historical-default proposal. Calibration scenarios never set the flag → byte-identical (verified by the dedicated `tests/dayton_headless_close_out.test.ts` + `tests/scenario_loader_dayton_close_out.test.ts`).
- The terminal verdict is **coherent and legibly Pyrrhic**: all three factions land grade **C**, `outcome_class: "failure"`, each `grade_description` ending "— capped by war cost (index 1.00)". `peace_dysfunction_index = 98.1` with all 7 dysfunction flags set (`ratified_cleansing`, `frozen_partition`, `refugees_not_returned`, `gridlock_by_design`, `ohr_dependency`, `brcko_unresolved`, `sejdic_finci_fault`). Final split RBiH 40.2% / RS 45.4% / HRHB 14.3%. RS carries `genocide_condemnation`. `historical_comparison` generates divergence notes ("Srebrenica genocide occurred", "War lasted 6 weeks longer than historical 182").
- **This directly closes #70's "top gap: there is no proof the close-out produces a coherent Pyrrhic verdict."** It now does, end-to-end, headless, deterministically.

### A3 — Codex coverage / authorship loop — **SUBSTANTIALLY CLOSED (one owner-gated HOLD)**

The two concrete wiring breaks #70 named are FIXED:
- **Peace-plan → codex flag bridge (the named dead bridge):** `vance_owen_plan_1993 → accept` now `sets_flags: { vance_owen_accepted: true }` (war_1993.json:333) and `owen_stoltenberg_plan_1993 → accept` sets `owen_stoltenberg_accepted: true` (:3426). In this run **both flags are `true`** in the terminal state — so `predEarlyPeaceAccepted` and `predNegotiationCapitalExhausted` can finally fire. The decision layer and codex layer are now bridged.
- **`buildDynamicSections()` is no longer a `[]` Phase-0 stub.** It now emits a load-bearing decision registry (Vance-Owen, Owen-Stoltenberg, OS tactical acceptance, London Conference) joining to authored essay_index `dynamic_sections`, plus a §6 rupture-receipt builder for `srebrenica_genocide_1995`.
- Authorship substrate live: 67 decisions logged, 174 event_fire_counts entries, 23 cost-ledger findings, observer flags (`clean_record`, `corridor_blocked_through_turn`, `winter_held_through_turn`) all set.

**Residual A3 gap (NOT a regression — a known HOLD):** the **w140-160 Srebrenica decision void persists.** 85/188 weeks fire zero events (identical to #70's 85); the longest contiguous dead stretch is **10 weeks from w146**; 17 of the 21 weeks in w140-160 fire zero events. The Srebrenica rupture **records correctly at turn 162** (`rupture_consequences` carries `srebrenica_genocide_1995`, perpetrator RS, condemnation flag set) and the codex-receipt builder exists — but the receipt surface (#78, commit `0ba12216a`) is **calibration-inert and explicitly HELD for owner review**, so at the moment the enclave falls there is still **no player-facing decision/receipt event**. The genocide is mechanically locked and verdict-propagated but narratively silent in-flight. This is the single most consequential week of the war passing with no decision in the player's chair.

### A4 — Onboarding / thesis — **CLOSED**

`src/ui/map/components/onboarding/onboardingSteps.ts` is an 8-step deck that teaches every misread #70 flagged:
- **"negative-sum, not conquest"** — step 01 ("A War You Cannot Win", "no victory screen", "negative-sum") + step 02 ("The Map Is Not the Score", "front can barely move while the country empties out").
- **president / propose-approve / no brigade control** — step 06 ("You command through your generals... every assault flows through a corps operation... approve, decline, or force-launch over their judgment at the cost of command authority").
- **war-cost-cap scoreboard + atrocity taints** — step 08 ("Seizing territory can lower your final grade... atrocity taints the verdict permanently — it is never rewarded").
- **Dayton-climax signpost** — step 08 ("The war climaxes at the Dayton table, where you spend hard-won leverage... That settlement is where you are judged").

Auto-mount edge cases hardened (#369), tutorial-deck art resolver wired (#380). The deck is deterministic (lexicographic id sort) and faction-agnostic.

---

## Campaign-integrity audit (D2-readiness)

| check | result |
|---|---|
| Campaign closes? | **YES** — `game_over=true`, `outcome=dayton`, snapshot frozen at turn 188 |
| Crash / serialize error (#358-class)? | **NONE** — exit 0, final_save + all artifacts written, hash `2cad30d26518b1d8` |
| Reaches Dayton + resolves? | **YES** — trigger fired w180, `dayton_result` signed, menu consumed |
| §6 rupture records? | **Srebrenica YES** (turn 162, genocide_condemnation on RS). Žepa: see gap #2 |
| Negative-sum spine legible? | **YES** — 1,259,707 displaced; net control nearly flat (RBiH 319→284, RS 289→327, HRHB 104→101) despite 181 settlements changing hands |
| Casualty/territory plausible at end? | **YES** — 104,309 mil killed / 43,635 civ killed over 188w; final split 40/45/14 vs historical ~51/49; anchors 30/30 in this run |
| Dead stretches a player would hit? | **YES** — w140-160 void (see A3 residual / punch-list #1) |

---

## Fresh D2 punch-list (what a real start→Dayton playthrough would still hit)

1. **The w140-160 Srebrenica decision void (highest player-impact).** ~45% of weeks fire zero events and the worst 10-week dead stretch sits exactly on the Srebrenica/Žepa climax. A player advancing turns through mid-1995 gets a long silent run, then the genocide flips as an invisible state-flag. The #78 codex-receipt is built but HELD for owner §6 sign-off — **un-holding it (owner-gated) is the single biggest legibility win for D2.** Mechanically locked, narratively absent.
2. **Žepa rupture is partial.** Srebrenica ruptures cleanly; this run's enclave/rupture model surfaced only `srebrenica_genocide_1995`. #70 noted Žepa's OSID was undefined/uncontrolled. Confirm whether Žepa is meant to rupture as a distinct §6 record or fold under the Drina enclave fall — a D2 player who knows the history will look for it.
3. **Headless verdict ≠ felt verdict (the irreducible caveat).** This proxy resolves Dayton via the bot historical-default proposal; it proves the close-out *path* produces a coherent verdict, but the **UI verdict/cost-ledger/cinematic surfaces** (`VerdictScreen.tsx`, `CinematicVerdict.tsx`, `WarCostSummary.tsx`) are exercised only in the app. D2 is the first time a human drives the 5-D capital-spend menu and reads the verdict screen — confirm the UI renders the frozen `endgame_snapshot` (now present in sim state) faithfully. Non-blocking for integrity, but it is exactly what D2 exists to validate.

**Lower-severity / cosmetic:** pre-existing `[brigade_assignment] [PROVISIONAL] UNASSIGNED hrhb_*` log noise around `op:bugojno:medini` (no reachable same-component sector) and `[pool_exhausted]` unmanned-front sub-segments late-war — log-only, non-fatal, not a crash; worth a glance but does not block D2.

---

## Bottom line

**GO for D2-readiness.** The engine plays a full April-1992 → Dayton campaign to a clean, legible, Pyrrhic close with no crash and the §6 record intact. A2 (Dayton closes) and A4 (onboarding) are closed; A3's dead bridges are repaired and the only residual is the owner-gated Srebrenica-window receipt HOLD, which degrades legibility but not integrity. The owner can sit down and play start→Dayton; D2's job is to validate *feel* and the UI verdict render — which this headless proxy cannot, by construction.

---

## Evidence appendix
- Terminal state: `final_save.json → meta.{game_over,outcome,endgame_snapshot}` + `military.negotiation.{dayton_result,rupture_consequences}`.
- Cadence/void: `weekly_report.jsonl` — 85/188 zero-event weeks; 10-week contiguous void from w146; w140-160 17/21 zero.
- A2 wiring: `src/scenario/scenario_runner.ts:1489,2749`; `src/sim/negotiation/dayton_negotiation.ts:66,216,450` (`DAYTON_TRIGGER_WEEK_CLOSE_OUT=180`, `resolvePendingDaytonCloseOut`, sets `game_over`/`outcome`).
- A3 flag bridge: `data/scenarios/events/war_1993.json:333` (`vance_owen_accepted`), `:3426` (`owen_stoltenberg_accepted`); `src/sim/codex/dynamic_section_builder.ts:807` (load-bearing registry), `:901` (rupture receipt).
- A3 HOLD: `0ba12216a` (Srebrenica codex-receipt #78, calibration-inert, HELD for owner review).
- A4: `src/ui/map/components/onboarding/onboardingSteps.ts` (8 steps); `#369` auto-mount, `#380` art resolver.
- Verdict: `final_save.json → meta.endgame_snapshot.verdict` — 3× grade C / outcome_class failure / peace_dysfunction_index 98.1.
- Negative-sum spine: `end_report.md` (displacement 0→1,259,707; net control flat; casualties).
