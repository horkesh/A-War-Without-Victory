# Baseline Re-blessing Packet — apr1992_188w six-pin reconciliation

**Date:** 2026-09-10
**Status:** SCOPED — NOT AUTHORIZED TO RUN. Entry condition unmet (§3).
**Authority:** [CALIBRATION_MASTER.md](../40_reports/CALIBRATION_MASTER.md) is the calibration
authority; this packet is the adoption run it repeatedly defers as "separate work". It is not a new
lane and creates no second active plan for any R-workstream.
**Gate:** `R7-BASELINE-SIX-PIN` in [open_gates.yml](../open_gates.yml).
**Blocks:** the merge of PR #503, and R8.

---

## 1. What is actually wrong

Nothing. The engine has not regressed. The **pins are stale by nine accepted commits.**

`data/derived/scenario/baselines/manifest.json` pins one scenario, `apr1992_188w`, over eight
artifacts. Six now mismatch:

| artifact | state |
|---|---|
| `activity_summary.json` | moved |
| `control_delta.json` | moved |
| `end_report.md` | moved |
| `final_save.json` | moved |
| `run_summary.json` | moved |
| `weekly_report.jsonl` | moved |
| `formation_delta.json` | **unchanged** |
| `watched_operations.json` | **unchanged** |

That is the identical signature `CALIBRATION_MASTER.md` records for the `n392` blessing: *"6 of 8
pins moved, `formation_delta.json` and `watched_operations.json` unchanged."* Same six, same two.
It is the known shape of an accepted consumed-input change.

Health on clean POST-A (`88996a23d`) passes every hard check:

| checkpoint | n392 (pinned) | current | floor |
|---|---:|---:|---:|
| jan1993 | 702 | 702 | 694 |
| apr1994 | 678 | 678 | 674 |
| apr1995 | 672 | 672 | 668 |
| oct1995 | 665 | **667** | 641 |

`matched_osids` 667 ≥ 644, `dead_ops` 1, `stranded_brigades` 13, `consistency_failures` 0,
`kw_ratio` 3.759 in band, all ten hard checks ok, `pass: true`.

## 2. Why the pins moved

Nine commits in `c2f6592ec..16389f6c9` changed four consumed inputs — `war_1993.json`,
`war_1994.json`, `war_1995.json`, `oob_brigades.json`. Every one is deliberate and reviewed:
BC05 (`0690a47ea` NATO timing, `4c419c464` duplicate Lukavac removal), BC06 (`d7fb72035`),
the ARBiH honorific correction (`878cbb34b`), event PR #502 (`2c2aa72a8`), plus `f117fe475`
(Ahmici/Vitez basing), `c95e25241` (Dayton gating) and `558f253a2` (same-week chronology).

**The drift is two different things bundled, and the re-blessing must say so.**

- **Cosmetic.** `878cbb34b` renamed 33 ARBiH brigades. `formation.name` is read *only* into
  description and label fields — `compile_turn_summary.ts:252,264` writes it as `formation_name`;
  `battle_resolution.ts:563/575/587/1062` and the dissolution/reconstitution paths use it in prose.
  It changes bytes in four artifacts and changes **no decision**. All four
  `strictCompare(a.name, b.name)` sort sites are on `CorpsOperation`/collapse-flag accessors, not
  formations — a name-driven tie-break was hypothesised and **falsified**. `formation_delta.json`
  staying byte-identical is consistent: it keys on ids.
- **Behavioural.** The event-catalog commits are the real movement. First divergence by field:
  `events_fired` **w54**, `battles` w77, `corps_summary` w131, `column_movement` w134,
  `behavioral_health` and `combat_causality` w136, `activity` / `control_change_attribution` /
  `control_counts` **w162**. At w162 control goes {HRHB 85, RBiH 255, RS 372} →
  {HRHB 85, RBiH 268, RS 359}: RBiH +13, RS −13, HRHB unchanged.

## 3. Entry condition — why this packet must NOT run yet

The roadmap's §4.1 acceptance boundary is explicit: *"settle every row before final calibration
acceptance."* Five BC rows are outstanding:

**Four of the five are code-complete and independently reviewed GO. They are open for one shared
reason: none has had a campaign or packaged-Electron acceptance run.** Only BC10 is unstarted.

| row | code state | what it is actually waiting on |
|---|---|---|
| BC04 chronology P1/P2 | implemented, reviewed | separate P1 and P2 **controlled campaign runs** with full anchors/health/§6 and displacement/operation diffs |
| BC05 NATO/Lukavac | implemented, reviewed GO, verified across 12 focused files / 289 tests | an **authorized campaign** — *"focused checks do not establish campaign/downstream acceptance"* |
| BC06 posture/gestures | implemented, reviewed GO, design disposed | **packaged-Electron acceptance** — *"headless neutrality is insufficient"* for player-action behaviour |
| BC09 shared production inputs | implemented, reviewed GO, IPC 25/25, one-turn bytes match | **campaign and final packaged gates** |
| BC10 optional AI ownership/replay | **not implemented** | sequenced after BC01/BC06/BC09; needs its Phase 0 review before code |

The batching is deliberate, not neglect. The freeze rule states: *"Group final acceptance after the
last accepted behavior change; do not skip causal intermediate measurements to save runs."*

### 3.1 The dependency chain this sits in

`§4.1/4.2 owns remaining behavior, cleanup and build-preparation dependencies` **for R8**, so BC
acceptance runs are pre-R8 dependency work, not R8's own final campaigns. The order is:

1. BC04 / BC05 / BC06 / BC09 acceptance campaigns (§4.1 pre-R8 dependency)
2. BC10 Phase 0 review, implementation, acceptance
3. **This packet** — baseline re-blessing
4. R7 closes (its three audio gates plus this one)
5. R8 final three-faction campaigns and the two 5/5 diaries
6. R9

**Consequence to weigh explicitly:** PR #503's merge is currently held at step 3, which means 68
commits of finished work sit behind the whole BC settlement chain — several campaigns and an
unstarted BC10. That is a materially longer hold than "reconcile some pins", and it is worth an
owner decision on its own rather than being inherited by default.

BC05 and BC06 are two of the commits that moved these very pins. Blessing a baseline now would
adopt it mid-settlement, and BC04's campaign acceptance, BC09's final acceptance and BC10 would each
move the numbers again — forcing a second re-bless and burning another authorized campaign.

**Therefore the red gate is currently telling the truth and should stay red.** It is not noise to be
silenced; it is the correct signal that the baseline is mid-flight. This packet runs **once**, after
BC settlement.

## 4. Gate sequence

Run in order. Any gate failing stops the packet.

### Gate 0 — Enclave guard (BLOCKING, §6 territory)

`war_1995.json` is one of the changed inputs and contains `srebrenica_falls_1995` and
`zepa_falls_1995`. The control swing lands at **w162**, which the repo's records associate with the
Srebrenica fall writes. Before anything else:

- `node tools/verify_checkpoints.cjs <run-dir>` — **read the verdict line, not a grep of the
  details.** It exits red on the carved-out Farz P-A discriminator on *every* run in this repo,
  including the canonical baseline; per `CALIBRATION_MASTER.md:104-110` that is **not** a §6 breach.
- Confirm 9/9 enclave cells; Srebrenica and Žepa fall on schedule; eastern capture provenance CLEAN.

**If the guard moved, STOP.** This is no longer a re-pin — it is a §6 panel matter, and the panel
rules on it, not this packet.

### Gate 1 — Merge order settled

`CALIBRATION_MASTER.md` flags that `codex/apr1994-operational-corrections` moves these same
checkpoints in the opposite direction (its n1: +9 apr1995, −7 jan1993, −7 oct1995) and that
*"whichever lands second must re-measure rather than carry its own run forward."* Settle which lane
lands first before spending a campaign. If that lane lands after this packet, it re-measures.

### Gate 2 — One clean owner-authorized 188-week run at HEAD

`updateBaselines()` calls `runScenarioAndHash`, so a re-pin **re-runs the scenario**; the existing
POST-A directory cannot simply be pinned. Requirements, all of which `CALIBRATION_MASTER` already
imposes:

- launched through the gated `sim:scenario:run:188w` entrypoint, no provenance override
- `git_dirty: false`, Node 22 major (the preflight refuses a Node-major mismatch outright)
- commit is an ancestor of HEAD — check `git merge-base --is-ancestor` **before** the first
  measurement, not after

### Gate 3 — Reproduction

`n392` was trusted *despite* an unattributed delta because it reproduced four times — the rejected
`n391`, `n392`, the GitHub Actions Linux runner, and the `UPDATE_BASELINES=1` refresh — all
byte-identical on `control_delta.json`, `final_save.json`, `run_summary.json`. Minimum here: local
plus CI, byte-identical on those three.

### Gate 4 — Decomposition recorded

Record, in the re-blessing itself, which part of the six-artifact drift is cosmetic text (the ARBiH
rename) and which is behavioural (the event catalog), with the first-divergence week per field.
Blessing a bundle without saying what moved is exactly how the n388→n392 delta became unattributed,
and `CALIBRATION_MASTER` still carries that as a known weakness.

### Gate 5 — Re-bless the manifest

`UPDATE_BASELINES=1` via `tools/scenario_runner/run_baseline_regression.ts`. Expect six pins to move
and `formation_delta.json` / `watched_operations.json` to hold. **If a different set moves, stop** —
the signature no longer matches the accepted shape.

### Gate 6 — Independent review

Implementer ≠ reviewer. Seats: calibration/scenario-tester, Historian (the event-catalog changes are
historical claims), Engine/systems, and §6 review if Gate 0 raised anything at all.

## 5. Prohibitions

- **Floors are NOT raised.** They stay 694 / 674 / 668 / 641. *"Per the S0 rule, a measurement is not
  a floor. 665 in particular must not become one."* The same applies to 667.
- **No pin refresh outside this packet**, and none before Gate 0 passes.
- **No calibration tuning** rides along. This packet adopts an already-accepted behavioural state; it
  does not change behaviour. One change per run.
- **Do not re-reconcile the manifest to hide a red gate.** If the numbers are wrong, the gate is
  doing its job.
- **Do not carry a prior run forward** in place of Gate 2.

## 6. Abort conditions

| condition | action |
|---|---|
| Enclave guard moved (Gate 0) | STOP — §6 panel matter, not a re-pin |
| A checkpoint falls below floor | STOP — this is a regression, not stale pins; bisect the nine commits |
| A different artifact set moves at Gate 5 | STOP — signature mismatch, investigate before blessing |
| Local and CI disagree (Gate 3) | STOP — determinism problem outranks the baseline |
| BC settlement reopens any changed input | STOP — entry condition invalidated, restart at §3 |

## 7. Receipts required

Under `logs/baseline-reblessing/`: the Gate 0 verdict line in full; the Gate 2 run log with its own
exit code (never a wrapper's) and the provenance JSON; the Gate 3 local-vs-CI hash comparison for the
three artifacts; the Gate 4 decomposition; the pre- and post- manifest diff; the Gate 6 review record.

## 8. Cost

One clean 188-week campaign plus a CI reproduction. It does **not** touch R7's consumed
one-PRE/two-POST budget — this is separate work under calibration authority, which is precisely why
it needs its own authorization.
