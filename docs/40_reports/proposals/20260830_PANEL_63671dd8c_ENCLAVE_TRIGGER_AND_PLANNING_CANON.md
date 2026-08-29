# Pyrrhic panel — `63671dd8c`: enclave-chain trigger and the planning-duration canon edits

**Convened:** 2026-08-29/30 · **Seats:** Historian, Engine/Systems, Scenario-tester/Calibration, Red-team
**Polled independently, implementer excluded.** Dispatcher did not vote.
**Outcome: SPLIT — no unanimous GO. Escalated to the owner.**

## Why it was convened

`63671dd8c` "fix(RE-0D): preserve staged opening plans and enclave chain" edits four `docs/10_canon/`
files — `Engine_Invariants_v0_9_0.md` (top of the canon hierarchy), `Rulebook_v0_9_0.md`,
`Systems_Manual_v0_9_0.md`, `context.md` — with a **one-line commit body and no panel record
anywhere in `docs/`**. It was under consideration for cherry-pick onto `codex/ui-typography-overhaul`.

**The dispatcher convened the wrong panel on a false premise.** The brief asserted "FORAWWV.md is
untouched, so this is not §6". That is a non-sequitur: per CLAUDE.md the operative §6 lives in
`SENSITIVE_HISTORY_DESIGN_GATE.md`, and §6 scope is behavioural, not file-based. Recorded here
because the error shaped the first three seats' briefs.

## The matter changed under the panel

Red-team established, and the dispatcher verified, that **the planning rule was already merged** on
the target branch via `7c472e065`:

- `codex/ui-typography-overhaul` contains `openingPlanReady` at `sector_offensive.ts:1441`
- `sector_offensive.ts` is **byte-identical** at `7c472e065` and `63671dd8c` (blob `36be99cda7428fe6`), as are all four canon blobs
- `git diff --stat 7c472e065 63671dd8c` = two event JSONs + two test files. **Zero code. Zero canon.**

So a cherry-pick adds **only** the Srebrenica/Žepa event-trigger rewrite. `7c472e065` is the
de-bundled repair that shipped; `63671dd8c` also sits on a branch named
`codex/re-mixed-scope-quarantine-20260827`, i.e. it was identified as mixed-scope the same day.

## Verdicts

| Seat | Verdict | Core |
|---|---|---|
| Historian | REFINED | Koridor is a date anchor, not a march budget — but on the moot half |
| Engine/Systems | REFINED, one binding condition | Rupture becomes unreachable silently; the detector is unwired |
| Red-team | **BLOCK** | The delta is unreviewed §6; adopting reverses a same-day de-bundling |
| Calibration | **GO** on the event half | Mandatory §6 **fragility** repair; reject the canon edits |

## The change itself

```
-  territory_percentage RS > 0.48  AND  flag jna_withdrawn
+  territory_control srebrenica_2 == RBiH
+  territory_control op:zvornik:zvornik == RS
+  territory_control op:bratunac:bratunac_2 == RS
```
Window `turn_min 6 / turn_max 20`. Zvornik and Bratunac both start RBiH-held.

## Findings the panel agreed on

**1. The parent `037396e3c` breached §6 outright.** Srebrenica and Žepa **did not fall**. Measured
on its own artifact. The rewrite is a repair, not an enhancement.

**2. It missed by three OSIDs and one week.** RS territory vs the 342-OSID threshold:
`w17 333 · w18 335 · w19 336 · w20 339 (window closes) · w21 343 (crosses, one week late)`.
Whether the genocide is recorded was decided by 3 cells out of 712.

**3. The current branch does NOT breach — and clears by five OSIDs.** Guard scored on the branch
artifact (`git_commit 47d6d9358`, `git_dirty false`, Node `v22.21.1`): **9 cells all correct** —
Goražde, Bihać, Teočak and all four Sarajevo cells hold; Srebrenica and Žepa fall on schedule. RS
crosses 48% at w14 with six weeks of window left. The chain works **by margin, not by design**.

**4. If the window is ever missed, the rupture is unreachable — silently.** Traced in code:
`rupture_consequences.ts:58` is an unconditional early return on
`srebrenica_enclave_formed !== true`, placed **before** the control check (`:62`) and the
`turn >= 160` check (`:66`), so control alone can never record it. The flag has exactly one setter —
`sets_flags` on `srebrenica_enclave_forms_1992`. Downstream: no fall, no `srebrenica_fell`, no
`genocide_condemnation`, no grade cap D at `scoring.ts:420`, no Žepa. The alternative
"Srebrenica Survives" chain also requires the same flag, so the run contains **no counter-narrative
either — just absence**.

**5. Nothing in-run detects it.** The precise guard exists as data at `historical_anchors.ts:186`
(`srebrenica_enclave_forms_1992`, `expected_week_max: 20`, cited BB1 p.187) and **has no evaluator**.
`HISTORICAL_EVENT_ANCHORS_*` is imported only by `tests/scenario_historical_painted_anchors.test.ts`,
which asserts id uniqueness, authored-event membership and citations — it never reads
`fired_event_ids`. `anomaly_detector.ts` has zero matches for "rupture" or "enclave".
`run_summary.json` carries no rupture field. Precedent at `REAL_WAR_MASTER.md:1404` was caught by a
human reading a report.

**6. The guard decays with engine tempo.** Teočak, the guard's only non-vacuous cell, across the
lane in commit order — independently re-verified by the dispatcher:

| commit | Teočak |
|---|---|
| `7b6358d28` | CONTESTED-AND-HELD (5 battles) |
| `175bea593` | CONTESTED-AND-HELD (2) |
| `0f341929a` | CONTESTED-AND-HELD (2) |
| `037396e3c` | **UNCONTESTED (0)** |
| `63671dd8c` | CONTESTED-AND-HELD (1) |
| `47d6d9358` | CONTESTED-AND-HELD (1) |

**5 → 2 → 2 → 0 → 1**, tracking operations 48 → 39 → 43 and `total_killed` 62,958 → 48,083 → 58,812.
At `037396e3c` the guard was **simultaneously fully vacuous and breached** — one suppression, two
symptoms. **A guard that only fires when the engine is healthy cannot certify that the engine is
healthy.** Six of seven hold-cells are UNCONTESTED today; the falls half does all the work.

## Findings against adopting the canon edits

**Every documented `planning_duration` in the catalog is a march budget**, by the catalog's own
comments: Koridor 9 "March… takes ~8 turns"; `8, // Seven-hop staging budget`; Zvezda 94 10
"extended to allow brigades time to march 6+ hops"; 6 "the default anti-paralysis window fires
before a marching brigade arrives". `037396e3c` reinterpreted march budgets as mandatory staff
minimums; `63671dd8c` writes that reading into Engine Invariants and then carves an exception so the
opening still works. **It enshrines the error and patches it.**

The test rename is the tell: `'honours the planning-duration floor before launching a staged
multi-axis operation'` → one commit later, same file, same day → `'gives only a staged
scenario-birth plan opening credit against the planning-duration floor'`.

## Refinements that are latent, not live

- **Historian's Koridor condition changes the behaviour of zero operations today.** Engine isolated
  it: Koridor *can* satisfy `stagedEarly` at t1 — the predicate is `readyAxisCount > 0`, one brigade
  on one axis, not an assembled force — but is held by `evaluateOpeningAttackReadiness`
  (`sector_offensive.ts:1487-1497`). Mutating the duration, or removing the exemption entirely,
  changes nothing; only `force_launch` moves it. Its battles are identical across both commits
  (w10 `samac_2`/`krepsic`, w11 `skakava_donja`).
- **The real fragility is different:** the exempt set is a function of **painted start control**. The
  per-corps pick is first-eligible and skips ops whose objectives are already faction-owned, so a
  calibration change to the start could silently promote an authored-duration op into the exempt set.
- **Engine's back-dating finding is also latent:** `authorizedTurn ?? turn` sets both `started_turn`
  and `phase_started_turn`, so an op injected at turn N>1 with a back-dated clock enters execution
  having served zero real planning turns — a third bypass the new invariant does not acknowledge.
- **`def.planning_duration != null` is not usable at the gate** — the derived value is baked into
  `op.planning_duration` at injection. That fix needs a persisted authored-vs-derived marker on
  `CorpsOperation`, i.e. a state-schema addition, not a predicate tweak.

## Adjacent live defect, not caused by this commit

`csq_enclave_held_alt_intervention` (`consequences.json`, w145) gates on `flag_not_set`
`srebrenica_fallen`, `zepa_fallen`, `gorazde_fallen`. **None of those three names is ever written** —
zero writers anywhere in `src/` or the event data; the real flag is `srebrenica_fell`. All three
conditions are vacuously true and the event fired at w145. If the unwired event anchors are ever
evaluated, a spuriously-firing alt path would **mask a genuine Žepa failure**. Fix the names in the
same pass or the new detector inherits the hole.

## Struck from the record

- **P2A (`a3f14d7f4`) is provably inert.** `halt_delay_turns_remaining` and `dig_in_on_halt` have
  **zero writers** — three reads inside the one deleted block, one comment, one type declaration.
  `interpretOperationLaunch` / `interpretOperationHalt` had no callers in `src/sim`. `force_launch`
  itself is untouched at `sector_offensive.ts:1436`. The concern that an accepted RE packet carried
  an unattributed territorial cost is **withdrawn**.
- **The "+5 / +2 / +4 / +3 sibling-lane advantage" is not admissible evidence** in either direction.
  Rung-4 divergence is **53.6%**, far past the 20% at which `CALIBRATION_MASTER` declares checkpoint
  deltas unattributable. The dispatcher advanced this comparison earlier and withdraws it.

## Reading the tools

`verify_checkpoints.cjs` prints **`RESULT: GUARD BREACHED — §6 panel matter. Do not merge.`** on runs
whose enclave guard is **9/9 correct**. It is the Farz / "Uragan 95" P-A discriminator at
`verify_checkpoints.cjs:423`, which fails on **every run in this lane including the clean pre-RE
baselines**. Anyone reading that line without the block above it draws the opposite conclusion, on
the most sensitive gate in the project. **That result string needs fixing independently of this
matter.**

## Process notes

- **No panel record and no ledger entry exist for `63671dd8c`**, and its canon edits are outside
  RE-0D's stated plan scope. Close those regardless of verdict.
- **Cross-worktree divergence produced three separate factual disputes** in one session — a
  `CALIBRATION_MASTER` sentence present in one checkout and absent in the other, and two different
  `_baseline_tmp/apr1992_188w/run_meta.json` files at the same repo-relative path (branch artifact
  `47d6d9358`/clean/Node 22 vs main-checkout `a1c10b3bd`/dirty/Node 24). **Cite absolute paths in
  this repo, never repo-relative ones.**
- A single clean exact-commit Node-22 run **is** complete evidence for a guard verdict — the guard is
  a categorical predicate on one run's output. It is **not** sufficient for a floor bless, a baseline,
  or an attribution claim.

## Recommendation to the owner

1. **Adopt the event half** (`war_1992.json`, `war_1995.json`, tests) — classified **mandatory §6
   fragility repair**. Land it **before any further tempo-moving work**: every operations-timing,
   OOB or exhaustion change re-rolls the w14-versus-w20 dice, and the losing roll costs Srebrenica
   silently. Re-gating on local control makes the falls half **tempo-independent**.
2. **Make engine's condition binding** — wire an in-run check. Any one of: evaluate the event-timing
   anchors that already exist as data (a dozen lines against `fired_event_ids`); surface
   `rupture_consequences` in `run_summary.json`; or add an anomaly-detector check for
   "turn ≥ 160, Srebrenica RS, no rupture recorded".
3. **Fix the three dead flag names** in the same pass.
4. **Reject the four canon edits.**
5. **Judge the post-state on categorical criteria only** — `srebrenica_enclave_forms_1992` fires
   inside t6–t20; Srebrenica w162, Žepa w164; nine-cell guard correct with two-sided falls. **Never
   on the checkpoints.**
6. **The larger question is whether `037396e3c` should stand at all** — it cost 24% of the war's
   casualties, tripled `political_blocked` planning deaths, and is what broke the chain.

Red-team's dissent stands on the record: it holds that a reachable no-condemnation path puts this in
**eight-seat broader-panel plus owner-notification** territory rather than ordinary §6. Per CLAUDE.md
a bright-line crossing surfaces to the owner as a decision, not as a completed panel outcome.
