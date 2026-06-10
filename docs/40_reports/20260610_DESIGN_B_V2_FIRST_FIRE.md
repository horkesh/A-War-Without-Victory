# Design B v2 — Casualty-Load Op-Launch Drag: 188w First-Fire Measurement (territory-INERT, HELD)

**Date:** 2026-06-10
**Branch:** `feat/exhaustion-drag-designB-v2` (v2 commit `51885dcf8`)
**Lever:** `AWWV_EXHAUSTION_DRAG_V2` — per-faction casualty-load drag on offensive op-launch willingness (Collapse repurpose, Design B v2)
**Author:** scenario-creator-runner-tester
**Status:** HELD for panel. **Recommendation: NO re-floor** (came back inert) — next-lever rec below.

---

## 1. Raw data (188w `apr1992_definitive`, n0)

| Run | `final_state_hash` | Anchors | Notes |
|-----|--------------------|---------|-------|
| OFF (flag default) | `345e044b7642aeab` | 30/30 | == current 188w floor → flag-off inert (expected) |
| ON (`AWWV_EXHAUSTION_DRAG_V2=true`) | `e4aeeae4870d1d46` | 30/30 | hash MOVED; differs from v1's `90cfbfc4` |

### Artifact byte-comparison OFF vs ON (sha256/16)

| Artifact | OFF | ON | Result |
|----------|-----|----|--------|
| `control_delta.json` | `c5d76b0cc514b91b` | `c5d76b0cc514b91b` | **IDENTICAL** |
| `formation_delta.json` | `068673982c962095` | `068673982c962095` | **IDENTICAL** |
| `destroyed_brigades.json` | `dd4feb8a7a5bc77e` | `dd4feb8a7a5bc77e` | **IDENTICAL** |
| `activity_summary.json` | `7a23e144c7bd07d1` | `7a23e144c7bd07d1` | **IDENTICAL** |
| `watched_operations.json` | `0599edda49097f83` | `0599edda49097f83` | **IDENTICAL** |
| `operation_aars.json` | `1d6623411066475b` | `1d6623411066475b` | **IDENTICAL** |
| `weekly_report.jsonl` | `70515fc3…` | `70515fc3…` | **IDENTICAL** |
| `brigade_temporal_log.jsonl` | `7b23fec7…` | `7b23fec7…` | **IDENTICAL** |
| `displacement_event_log.jsonl` | `f8e31619…` | `f8e31619…` | **IDENTICAL** |
| `end_report.md` | `a8b2a4e4…` | `a8b2a4e4…` | **IDENTICAL** |
| `replay_save_manifest.json` | `48cb2b83…` | `48cb2b83…` | **IDENTICAL** |
| `final_save.json` | `345e044b…` | `e4aeeae4…` | **DIFF** (3 fields) |
| `run_summary.json` | `0961114c…` | `8126b505…` | DIFF (embeds the hash only) |

**Every behavioral artifact is byte-identical.** Only `final_save.json` differs, and the diff is exactly **3 fields** (below).

---

## 2. Did op-LAUNCHES drop ON vs OFF? — **NO.**

`watched_operations.json`, `operation_aars.json`, `activity_summary.json`, `formation_delta.json`,
`destroyed_brigades.json`, and `control_delta.json` are all **byte-identical**. The SAME operations launched,
in the same weeks, with the same brigades, producing the same casualties and the same territory. **Zero launch
decisions flipped** — including late-war (w120–188), per faction. The drag lowered the candidate *score* but
never below the threshold that would change which intent won, and never below the threshold that would prevent
a launch.

---

## 3. What moved the ON hash if everything behavioral is identical?

Deep-diff of the two `final_save.json` trees → **exactly 3 leaf differences**, all inside ONE corps's
last-turn persisted `decision_trace` snapshot (`military.corps_command.hvo_central_bosnia`):

| Path (under `…/decision_trace/candidates/1/`) | OFF | ON |
|-----------------------------------------------|-----|----|
| `score_breakdown/faction_exhaustion_drag` | `0.3` | `1.0` |
| `score_breakdown/exhaustion_penalty` (e-term) | `0.045` | `0.15` |
| `score` (the candidate's total) | `0.1986` | `0.3036` |

Candidate 1 is a `launch_opportunity` candidate at **turn 188** that is **`winner=false`** (it did NOT win the
intent competition). `hvo_central_bosnia` is the only corps whose final-turn `decision_trace` (a persisted
read-model audit snapshot) happens to carry the exhaustion-drag term. So the ON hash moved purely because a
**non-winning candidate's audit score changed in a serialized trace** — an observer-flag-style hash move, NOT a
behavioral one. (Mirror of the prior `vance_owen_accepted` codex re-floor precedent: hash moves via a persisted
read-model flag, control byte-identical.)

---

## 4. WHY no territory — **Case (a): the additive term's weight is too small to flip a launch.**

The signal is healthy and sign-correct. Final-save per-faction casualty-load (computed exactly as
`briefing.ts:723` does — cumulative `casualty_ledger` ÷ active fielded personnel):

| Faction | cumCasualties | fielded | **load** | **drag (ON)** | drag (OFF legacy, saturated) |
|---------|---------------|---------|----------|---------------|------------------------------|
| RS | 191,101 | 73,179 | **2.611** | **0.200 (floor)** | 0.300 |
| RBiH | 307,217 | 214,362 | **1.433** | **0.769** | 0.300 |
| HRHB | 41,472 | 69,834 | **0.594** | **1.000 (no drag)** | 0.300 |

The signal **did** reach the ramp band and behaves exactly as designed: **RS** — the faction that over-advances
late-war and the lever's intended target — is fully spent (load 2.61) and gets the **deepest drag, 0.20, BELOW
the legacy 0.30** → a genuine net reduction. RBiH mid-ramp; HRHB below the ramp start (matching the 1.0 persisted
in the only captured trace).

**But the drag scales only ONE of five weighted terms in the launch score.** For `launch_opportunity`:

```
score = 0.30·surplusRatio + 0.25·supplyReadiness + 0.20·(1−threatRatio) + 0.15·exhaustionPenalty + 0.10·fatigueReadiness
        where exhaustionPenalty = corpsExhaustionCapacity · factionExhaustionDrag
```

- The exhaustion term `e = 0.15 · corpsCap · drag` has a **ceiling of 0.15** (1/5 of the score). The other
  **0.85 of the score is drag-independent.**
- For **RS** (the over-advancing target), ON drag 0.20 vs legacy 0.30 changes `e` by at most
  **0.15 · (0.20−0.30) = −0.015** (≈ **3.7%** of a typical winning score ≈ 0.30–0.55). A 3.7% nudge on a
  non-decisive term cannot move a launch across the winner margin or the eligibility gate.
- (For RBiH/HRHB the lever actually *raises* `e` vs the legacy floor — +0.070 and +0.105 respectively — because
  their load sits below where saturated-0.30 sat. Still flipped nothing: those candidates were non-winning or
  hard-blocked by the separate `corps_exhaustion`/fatigue/stance/campaign-role gates.)

**This is unambiguously case (a):** the late-war drag-band IS reached, the sign IS correct, RS DOES get the
deepest drag — but the additive term's weight (max 3.7% delta for the target faction) is far too small relative
to the rest of the launch score to flip any launch decision. It is NOT case (b) (the over-advancing ops were not
must-launch/high-priority that resisted the drag — they simply never saw a decisive score change) and NOT case
(c) (no launches dropped at all, so it is not "dropped the wrong ones").

---

## 5. §6 — OK (identical OFF == ON)

| Anchor | OFF | ON |
|--------|-----|----|
| `op:srebrenica:srebrenica_2` | RS (pass) | RS (pass) |
| `op:rogatica:zepa_2` | RS (pass) | RS (pass) |
| `op:gorazde:{bacci,citluk_2,gorazde_2}` | RBiH (pass) | RBiH (pass) |

Srebrenica and Žepa fall identically; Goražde holds. `control_delta.json` + `displacement_event_log.jsonl` are
byte-identical → rupture timing is unchanged. The §6 enclave ops are TRIGGERED operations that never route
through `launch_opportunity`/`stage_operation` intent scoring, so this lever is structurally exempt — confirmed
empirically, not just by construction.

---

## 6. Re-floor question for the panel

**This is the 3rd consecutive INERT result on this exhaustion-drag lane (v1 territory-inert; v2 OFF inert;
v2 ON territory-inert — control byte-identical).** The ON hash moved ONLY via a persisted non-winning
`decision_trace` audit score, an observer-flag-class move with zero behavioral effect.

**Recommendation: NO re-floor.** The 188w territory floor stays **649 / `5f57d172`** and the 188w
`final_state_hash` floor stays **`345e044b7642aeab`** (== flag-OFF). The lever as built is **feel-only / inert**
and remains default-OFF; nothing about the floor changed.

### Recommended next lever (one change, for a follow-up run)

The diagnosis points cleanly at the **weight**, not the signal. The signal is correct and reaches the band; the
problem is the 0.15 term is too weak. In priority order:

1. **(Preferred) Increase the exhaustion-term WEIGHT in the launch score** — e.g. raise the `0.15·exhaustionPenalty`
   coefficient (and the matching `stage_operation` `0.15`) so a spent faction's drag can actually cross the
   winner/eligibility margin. To make the RS-target delta meaningful (it is currently −0.015), the term needs
   roughly a 3–5× weight bump, with the other coefficients renormalized so the score stays in [0,1]. This is a
   *single* coefficient change → clean one-change calibration run. **Risk:** it also amplifies the *upward* RBiH/HRHB
   nudge (loads below the legacy floor), so pair the weight bump with lowering `EXHAUSTION_DRAG_V2_LOAD_START`
   toward the RBiH/HRHB load so those factions also sit on the drag side, OR raise the legacy-equivalent baseline
   so sub-1.0 loads don't *gain* willingness.

2. **(Alternative) Attach the drag to a more decisive component** — instead of (or in addition to) the additive
   `e`-term, apply the drag as a *multiplier* on the whole offensive candidate score for `stage_operation` /
   `launch_opportunity` (e.g. `score *= (0.5 + 0.5·drag)`), so a fully-spent faction (drag 0.20) takes a real
   ~40% haircut on its launch appetite rather than a 3.7% nudge on one term. Bigger blast radius → measure 188w
   carefully; keep §6 exempt (it already is).

3. **(Floor option) Accept feel-only** — keep the lever default-OFF as a read-model/feel surface (it already
   feeds `decision_trace`) and do NOT pursue territory movement from exhaustion-drag. If the panel wants
   late-war over-advance suppression to move *territory*, it likely belongs in a different mechanism (op-launch
   *gating* / a hard late-war launch cap for spent factions, à la E-A5's `us_halts`), not in the soft additive
   willingness term.

**Bundled in this PR (separate from the lever):** the #407 Codex P2 **gate stale-ON fix** — the scenario_runner
now resets `AWWV_EXHAUSTION_DRAG_V2` when the env is not exactly `'true'`, so an ON run can no longer contaminate
a subsequent flag-off run in a long-lived process. Flag-off remains byte-identical (the legacy
`max(0.3, 1−raw/600)` path is untouched).
