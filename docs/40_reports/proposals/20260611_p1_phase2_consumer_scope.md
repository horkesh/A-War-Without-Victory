# P1 Phase-2 Consumer Scope — Organic Territory Lane

**Date:** 2026-06-11
**Author:** Technical Architect + Gameplay Programmer (scoping pass)
**Status:** READ-ONLY SCOPE — no code changes; deliver build plan or verdict

---

## 1. Question Framing

Phase-1 wired supply and `recent_territory_change` into the corps briefing (BRIEF-GAP-1,
BRIEF-GAP-6). The attribution matrix (commit `02a076120`) measured both flags ΔOSID 0 at
188w. Phase-2 is supposed to make the *consumer* read those signals to alter attack/defend
decisions, breaking the w40-w140 freeze. This document answers the make-or-break question
before any code is written.

---

## 2. Op-Launch Decision Site

The corps commander's decision to launch an offensive op lives in two chained functions in
`src/sim/combat/commander/plan.ts`.

### 2a. Primary gate — `selectWinningIntent` (plan.ts:233)

Every turn with no active plan, the corps runs a candidate-intent competition. Candidates
are scored and the winner routes execution. The two offensive intents are:

- `stage_operation` (pre-planned op from queue) — plan.ts:448–468
- `launch_opportunity` (emergent zone attack) — plan.ts:470–492

Score inputs for both offensive intents (plan.ts:244–290):

| Signal | Source | Weight in `launch_opportunity` |
|--------|--------|-------------------------------|
| `supplyReadiness` | `belief_state.supply_continuity_confidence` (belief.ts:100) | 0.25 |
| `threatRatio` | `previous_state.threat_assessment.overall_pressure` | 0.20 (inverted) |
| `surplusRatio` | `forces.total_surplus / (total_brigades * 0.3)` | 0.30 |
| `exhaustionPenalty` | `corps_exhaustion` × `faction_war_exhaustion` | 0.15 |
| `fatigueReadiness` | `briefing.avg_fatigue_pct` | 0.10 |
| `isCriticalSupply` penalty | `supplyReadiness < 0.2` → −0.50 | additive |

`recent_territory_change` (BRIEF-GAP-6) is NOT read here. It only feeds
`assessThreats()` (assess.ts) which elevates `overall_pressure` to 'heavy' when net loss
≥ 2 OSIDs — that propagates back into `threatRatio` on the *next* turn via
`previous_state.threat_assessment`. So the signal path exists but is one-turn-lagged and
only affects threat-posture, not a direct score term.

### 2b. Hard-block wall — `managePlan` (plan.ts:811)

Before the competition runs, `managePlan` checks hard-blocks in sequence (plan.ts:825–930):

1. `corps_stance === 'defensive' || 'reorganize'` → no plan
2. `corps_exhaustion > MAX_EXHAUSTION_FOR_OPERATION` → no plan
3. `avg_fatigue_pct >= 65%` → no plan
4. `campaign_role === 'economy' || 'contain'` → no plan
5. `campaign_sync_role === 'feint' || 'fixing'` → no plan
6. `hasLiveMajorOp` (non-probe op in active_operations) → no plan

These are binary hard-exits that precede `selectWinningIntent`. The competition never
runs when any hard-block fires.

---

## 3. Make-or-Break Finding: Does Mid-War Territory Flow Through the Scorer?

### 3a. Direct evidence: Design-B memory (SHELVED 2026-06-10)

The Design-B investigation (`design_b_exhaustion_drag_dead_end.md`, closed PR branch
`feat/lane3-b-lever-a-zvornik-pin`, docs `20260610_DESIGN_B_SHELVED.md`) ran four
188w OFF-vs-ON pairs modifying the exact same `selectWinningIntent` scorer. All four
were territory byte-identical. The file documents three independent structural reasons:

> "At t188, **0/18 corps select any offensive intent** — existing hard-blocks
> (corps_exhaustion/fatigue/stance/campaign_role) already killed the opportunistic
> offensive lane before the haircut is consulted. The haircut operates on an empty room."
>
> "The territory-moving late-war ops (Storm/Sana/Mistral, Drina enclave advances,
> Srebrenica/Žepa falls) are delivered by the **injection pipeline**
> (`pre_planned_operations.ts` / `triggered_operations.ts` via `injectQueuedOperation` /
> `checkTriggeredOperations` / `injectArmyHqOperations`, wired at war_phases.ts:154,162)
> — which **never consults the corps-commander intent scorer**."

### 3b. Phase-1 attribution matrix confirmation

Commit `02a076120` (bundle attribution panel, 2026-06-11): gap1 and gap6 flags both
measured ΔOSID 0 at 188w. The panel verdict: "briefing wired but assessCorps/op-launch
scorer doesn't consume it (consumer-side fix needed)." This is the SAME wall Design-B
hit — the consumer fix still doesn't matter if the scorer is bypassed.

### 3c. Mid-war injection catalog (w40–w140)

Tracing the injection pipeline against the w40-w140 window:

**Triggered ops** (`triggered_operations.ts`):
- `turn >= 10` — condition-gated Sarajevo siege ops (fires before w40 window)
- `turn >= 40` — one triggered op fires at this floor (line 281)
- `turn >= 160` / `turn >= 170` / `turn >= 172` / `turn >= 175` — all late-war (Fall 1995)

**Pre-planned/queued ops** (`pre_planned_operations.ts`):
- `available_from: 41` — Operation Pracha River (Drina Corps queued sequence)
- `available_from: 69` — Operation Trnovo (SRK queue, historical Lukavac-93, ~w69)
- `available_from: 100` — Operation Zvezda 94 (Drina Corps, ~w100)
- No `available_from` — fires immediately when queue slot opens (Corridor/Jajce/Donji Vakuf/Bosanski Novi/Foca/Prsten all fire w1-w40)

The mid-war w41-w139 window is served exclusively by:
1. Pre-planned queued ops that inject when a corps finishes the previous op in its queue
   (`injectQueuedOperation`, war_phases.ts:1793) — these bypass the scorer entirely,
   bypassing `selectWinningIntent` and `managePlan`.
2. Any emergent commander opportunity ops that might form — BUT these are blocked by
   hard-block #6: `hasLiveMajorOp`. While a pre-planned op runs (often 8-20+ turns),
   the commander cannot plan a new op. Mid-war corps are almost continuously in
   pre-planned-op coverage (Drina: Drina → Podrinje Sweep → Pracha River → Zvezda 94).

**The freeze w40-w140 is the CORRECT historical behavior for 1993-94** — the war was
genuinely positional during this period. The pre-planned queued sequence covers the VRS
Drina Corps through w100 (Zvezda 94). Between queue-op recoveries, corps exhaustion and
fatigue from those ops typically triggers the hard-blocks, suppressing opportunistic
plan formation.

### 3d. Verdict

**The commander scorer is effectively bypassed for mid-war territory movement.** Any
territory that changes hands w40-w140 flows through injected/queued pre-planned ops, not
through `selectWinningIntent`. Making the scorer supply-aware (Phase-2 as originally
conceived) would be inert at the territorial level — the same wall Design-B hit three
times and the gap1/gap6 attribution matrix hit a fourth.

The scorer DOES run for corps that finish their pre-planned queue and have no more ops to
inject (some RBiH and HRHB corps mid-war). But those corps are also the ones with
insufficient surplus, terrain obstacles, or high fatigue — the other hard-blocks win.

---

## 4. Is There ANY Scorer-Driven Mid-War Territory?

There is one scenario where the scorer could drive territory: a corps with no pre-planned
queue, surplus brigades, `projecting` posture, and all hard-blocks clear. Looking at the
actual mid-war state:

- VRS corps: all have pre-planned queues → blocked by `hasLiveMajorOp`
- ARBiH corps: 1st Corps (Sarajevo besieged), 2nd Corps (Tuzla active ops), 3rd Corps
  (Central Bosnia active), 7th Corps (Travnik active) — all have fatigue/exhaustion
  constraints from continuous pre-planned coverage
- HRHB corps: HVO Central Bosnia mid-war — partially uncovered by pre-planned ops, but
  high fatigue from 1993 CB war, and terrain + supply constraints

**There is no clean empirical proof that ANY mid-war OSID flip (w40-w140) comes from a
commander opportunity plan rather than an injected/queued op.** The Design-B measurement
(v3: RS corps `launch_opportunity` score MOVED from 0.654 → 0.4448 below `reinforce_zone`
0.545, yet zero territory moved) is the cleanest evidence.

---

## 5. What Phase-2 as Originally Conceived Would Do

Making `selectWinningIntent` supply-aware (wiring BRIEF-GAP-1 supply modal data directly
into `supplyReadiness` instead of through `belief_state.supply_continuity_confidence`) and
adding a `recent_territory_change` score term would:

1. Change the scored winner between `launch_opportunity` and `hold_line` / `reinforce_zone`
   in more cases.
2. Have ZERO territory effect when all corps are blocked by hard-blocks or pre-planned
   `hasLiveMajorOp`.
3. Potentially have a small effect for the subset of mid-war turns where a corps has
   finished its queue AND clears all hard-blocks AND has surplus — which empirically
   moves zero territory (Design-B v3 proved this directly).

**Conclusion: Phase-2 as "make the scorer supply-aware" would be INERT. Same wall,
fifth time.**

---

## 6. The Real Lever (What Phase-2 Should Actually Be)

The only path to organic mid-war territory movement is the injection pipeline itself.
Two distinct sub-options:

### Option A — Expand the injected-op catalog mid-war (calibration-moving)

Add more pre-planned ops in the w40-w140 window for corps that currently have gaps in
coverage (primarily ARBiH and HRHB corps). This is already the roadmap for corps like
arbih_2nd (Tuzla), arbih_3rd (Central Bosnia), etc. This is calibration-moving and
§6-sensitive for anything near the enclaves.

Risk: each new op requires a full 188w re-calibration cycle. Not an "organic" lever —
it's adding scripted content.

### Option B — Gate the injection pipeline on faction supply/exhaustion (calibration-disruptive)

Add a faction-supply or faction-exhaustion check to `injectQueuedOperation` /
`checkTriggeredOperations` so that a corps in `critical` supply cannot inject the next
op in its queue. This is the only mechanically correct "organic" lever.

This is what the Design-B memory described as the post-1.0 path:
> "gate the **injection pipeline** (pre_planned/triggered ops) on faction exhaustion —
> NOT the scorer. Large, calibration-disruptive (re-opens 30/30 anchor floor AND §6
> since rupture ops are triggered/injected), needs full re-calibration + fresh §6 panel."

Risk: §6-gated (Srebrenica/Žepa fall via triggered ops — any injection gate could
suppress them), requires panel sign-off, requires full re-calibration.

### Option C — Accept the freeze as historically correct (recommended for 1.0)

The w40-w140 front stasis reflects real 1993-94 positional war. The calibration already
captures the correct territorial outcome. The "freeze" is not a bug; it is the correct
simulation of a period where neither side had the operational capacity for sustained
offensive action outside scripted major operations.

The organic-territory program's proper scope for 1.0 is: ensure the SCRIPTED ops land
correctly (already at 651/712 anchors 30/30). Post-1.0, Option B (injection pipeline
gate) is the tractable path for genuine emergent mid-war territory movement.

---

## 7. Flag-Gated Build Plan — IF Option B is Chosen (Post-1.0)

If the owner decides to pursue genuine organic territory movement via injection-pipeline
gating post-1.0, here is the flag-gated consumer-side change:

### Target file: `src/sim/combat/pre_planned_operations.ts`

**Function:** `injectQueuedOperation` (line 1142)

**Change:** Add supply gate before injection:
```
// AWWV_ORGANIC_TERRITORY_INJECTION_GATE (default OFF)
// When enabled: skip injection if corps faction is in critical supply
// (faction_supply_state === 'critical' for > 50% of corps territory OSIDs).
// This is the ONLY lever that can move mid-war territory organically.
// §6-GATED: must verify Srebrenica/Žepa still fall before merging.
```

**Also required:** Same gate in `checkTriggeredOperations` for non-§6 triggered ops,
with explicit carve-out for §6-sensitive ops (Krivaja-95, Stupčanica-95 — these must
fire regardless of supply state).

**Pre-merge gate:** 188w must show Srebrenica (t162 rupture), Žepa fall, anchors 30/30.
Full re-calibration required after any OSID change.

### Target file: `src/sim/combat/triggered_operations.ts`

**Function:** `checkTriggeredOperations` (line 977)

**Change:** Add same supply gate with §6 carve-out at line ~1000, after the
`army_hq_only` skip and before the `trigger()` call.

---

## 8. Summary Table

| Lever | Tractability | Territory effect | Calibration cost | §6 risk | Recommended |
|-------|-------------|-----------------|-----------------|---------|-------------|
| Scorer supply-aware (Phase-2 original) | Builds fine | INERT — scorer bypassed | None (inert) | None | NO |
| Recent-territory-change as score term | Builds fine | INERT — scorer bypassed | None (inert) | None | NO |
| Expand injected-op catalog (Option A) | Medium | +N OSID per op added | Per-op 188w run | Case-by-case | Already roadmapped |
| Injection pipeline supply gate (Option B) | Large | Potentially ±10-20 OSID | Full re-calibration | HIGH (§6 rupture ops) | Post-1.0 only |
| Accept freeze as historical (Option C) | Trivial | 0 | None | None | YES for 1.0 |

---

## 9. Evidence Chain

1. `design_b_exhaustion_drag_dead_end.md` — 4× 188w OFF/ON pairs, scorer-only changes,
   ΔOSID 0 each time. Reason documented: hard-blocks fire first; injection pipeline
   bypasses scorer.

2. `20260611_bundle_attribution_panel.md` (commit `02a076120`) — gap1 + gap6 flags
   (briefing-level supply + territory-trend wiring) both ΔOSID 0 at 188w. Panel verdict:
   "consumer-side fix needed." This document proves that verdict would also be inert.

3. `plan.ts:306-315` — hard-block list. `plan.ts:913-930` — `hasLiveMajorOp` blocks all
   new planning while a pre-planned op runs.

4. `pre_planned_operations.ts:1095-1131` — VRS/ARBiH queue assignments covering most
   corps w0-w100+.

5. `triggered_operations.ts:281,440,507,556,608` — triggered floors. Only one fires
   before w140 (the `turn >= 40` condition op); all others are Fall-1995 (w160+).

6. `plan.ts:246-247` — `supplyReadiness` already reads `belief_state.supply_continuity_confidence`
   which already reads `supply_by_osid` (belief.ts:356-381). BRIEF-GAP-1 was already
   flowing into the scorer via this path — and was still ΔOSID 0.
