# Command Authority Economy — Repair Plan

**Date:** 2026-07-06
**Status:** CA-2 / CA-3 IMPLEMENTED 2026-07-09 on `codex/ca2-political-income`; local branch verification is green and PR checks own merge readiness. WP-9 owner diaries remain the release-path blocker.
**Origin:** 2026-07-06 release review finding: the flagship Presidential Command Model's resource economy was never computed, felt, or decided over campaign length. This plan fixes it. Companion findings from the same review are owned elsewhere: Decision Room 4-card cap + deep-link trap → GUI plan WP-1 commit 0; audio un-mute → GUI plan WP-8 commit 1; turn ceremony + play discipline → GUI plan WP-2/WP-9 (`docs/plans/2026-07-06-presidential-gui-decision-access-overhaul-plan.md`). This document owns ONLY the CA economy.

---

## 1. The verified problem (receipts, current `main`, 2026-07-06)

| Fact | Where |
|---|---|
| Init `{current: 100, max: 100}` | `src/scenario/scenario_runner.ts:288` |
| The ONLY income site in the engine: `+recovery` capped at `max` | `src/sim/turn_phases/war_phases.ts:2530` (`recover-command-authority` step) |
| Recovery = `max(0, 2 − 0.5×(recent force-launches within 3t + unresolved friction within 2t))` | `war_phases.ts:2508-2529` |
| Costs: 25 override levers (author/request/stop/elite/replace/proactive force-launch), 15 proposal force-launch, 10 gestures | `src/ui/map/utils/commandAuthority.ts:1-91` |
| No refunds anywhere | grep `refund` in `src/desktop` → 0 hits |
| Debit sites duplicate constants and say "MUST match `autonomy_ipc_contract.cjs`" | `commandAuthority.ts` comments; handlers `op_directive_staging.cjs`, `op_halt.cjs`, `co_replacement.cjs`, `author_op_staging.cjs`, `desktop_sim.ts:890-896`, `electron-main.cjs` |
| `command_authority` is player-only and ABSENT in headless/calibration | `commandAuthority.ts:43-45`; `war_phases.ts:2504` early-returns when absent |
| Validator constraints: current finite ≥0, ≤ max | `src/state/validateGameState.ts:2412-2424` |

**The campaign integral nobody took:** lifetime income = 100 + ≤2×188 = **≤476 CA ≈ 19 override acts across 3.5 years** — only if the player never idles at cap. Recovery **evaporates at 100/100**, so a hoarding player's effective budget is ≈ **4 acts per campaign**. Force-launch and the friction it creates *reduce* recovery — a negative feedback spiral on the game's namesake system. Design intent ("issue at most a few weighty directives; scarcity hard-caps micromanagement") is an order of magnitude away from shipped steady state (~0.1 acts/turn). No gate can see this: headless runs don't carry the field, unit tests check debits, browser gates check rendering, and no full campaign has been played.

**Not the problem:** per-crisis scarcity itself. Constrained agency is the thesis. The defects are (a) the cadence was never *chosen*, (b) income wasted at cap punishes patience, (c) the spiral punishes using the system at all, (d) the player is never told what the budget sustains.

## 2. Design target (the thing CA-1 must decide)

A **cadence specification**, stated in player experience terms, e.g. (strawman for the panel):

> Steady state: the President can afford roughly **one override-class act every 2–3 quiet weeks**. Crisis: a full pool sustains **3–4 override acts inside a 4-week window**, then a real drought. Patience is never punished: income is never silently destroyed. Using the system must not lock the player out of the system (spiral bounded). Gestures (10 CA) should feel affordable near-monthly.

Whatever numbers the panel lands on, the acceptance form is fixed: **a campaign-integral table** (income, max acts, hoard-case acts, drought length after a 3-act crisis) computed in a contract test, not in someone's head — that is the instrument that was missing.

## 3. Work packets

### CA-0 — Characterization + instrumentation (no behavior change; dispatch now)

1. **Economy contract test** `tests/command_authority_economy.test.ts`: a pure model of the shipped economy (init, cap, recovery formula, costs — constants imported from their real modules, not re-typed) that COMPUTES and PINS the campaign integral: lifetime income at 188w, max override acts, hoard-case acts (never below cap), drought length after spending 100 in 4 turns with the force-launch penalty active. Assertions pin CURRENT values with a comment block stating these are characterization pins that CA-2 will retune — the test is the instrument, the pins are provisional.
2. **Cost-parity static guard**: one test asserting the constants in `commandAuthority.ts` equal the values in `autonomy_ipc_contract.cjs` and each `.cjs` handler (grep first — if such a guard already exists, extend rather than duplicate; STOP-and-report if the values already disagree anywhere, that is a live bug).
3. **Diary telemetry**: extend `docs/40_reports/playtests/TEMPLATE.md` session block with one line: "CA this session: spent / earned / turns at cap (income wasted)". (Done in this change — verify, don't redo.)
4. Deliverable: the test file + a one-page numbers memo appended to this doc (§6) for the CA-1 panel.

### CA-1 — Cadence decision (Pyrrhic panel, not a build)

Convene: game-designer + product-manager + gameplay-programmer + war-or-game (feel of command tempo vs. real presidencies) + §6 red-team (one specific question, below). Inputs: §1 receipts + CA-0 numbers memo + the cadence strawman in §2. Decide:

- **Option A — retune constants (floor option).** Keep the flat-trickle model; move numbers to hit the cadence (e.g. recovery 2→6-8, or costs 25→10-12), and fix cap-waste by banking overflow: `command_authority.reserve` accrues past-cap income up to +50, drained before `current`. Smallest change; keeps the timer feel.
- **Option B — political income (recommended).** Recovery is computed from the political simulation the game already runs: base + bounded contributions from legitimacy/internal-cohesion band, patron standing, and quiet-front dividend; large one-off CA grants on authored political events (assembly backing, patron endorsement). Authority becomes something the war GIVES and TAKES — thematically exact, and it couples the meter to systems that already move. Medium change, all inside the `recover-command-authority` step + event effect channel.
- **Option C — crisis windows.** Regen accelerates while urgent/blocking items exist ("the assembly grants emergency powers"), throttles in quiet weeks. Cheap, gamey; panel should weigh whether it inverts the fantasy (agency only when the house burns).

Hard constraints binding ALL options: **§6 — CA must never be granted by atrocity-adjacent events or outcomes** (the red-team's one question: audit the proposed income sources against the bright line; "authority dividend from ethnic consolidation" class = banned). The force-launch/friction penalty may stay but must be BOUNDED so the spiral cannot zero out income for more than N consecutive turns. Panel GO = signature (standing delegation); split/bright-line → owner.

### CA-2 — Implementation (implemented 2026-07-09; one PR)

1. Implemented the chosen model in `war_phases.ts` `recover-command-authority`, backed by `src/shared/commandAuthorityEconomy.ts`. The `!auth` early-return is preserved; old-shape `command_authority` saves normalize when recovery runs; `scenario_runner.ts` keeps the legacy init shape so untouched headless saves do not gain reserve fields before recovery.
2. Persisted subfields are optional: `reserve`, `reserve_max`, `last_recovery`, and `last_recovery_source`. `validateGameState.ts` validates finite nonnegative reserve/recovery values, reserve cap ordering, and the approved source vocabulary. No schema bump is required because old-shape saves remain valid and are covered by tests.
3. Retuned `tests/command_authority_economy.test.ts` from characterization pins to the chosen target table. The test now enforces lifetime income, max override acts, hoard-case bank behavior, post-crisis drought, gesture cadence, healthy quiet cadence, and source-code delegation to the shared helper.
4. Determinism: formula reads only persisted state, uses sorted corps iteration already present in the phase, rounds recovery to quarter-CA increments, and uses no randomness, timestamps, locale sorting, or external inputs.
5. **Calibration proof, not assumption:** local branch verification passed `npm.cmd run test:baselines` and `npm.cmd run ci:structural-fingerprint:check`; PR checks own final merge readiness.
6. i18n: Desk and toolbar recovery copy updated in EN+BCS.

### CA-3 — Budget legibility (implemented with CA-2)

1. `DeskAuthorityHeader.tsx` no longer displays a raw fixed recovery promise. It derives cadence from the live `last_recovery` value and displays approximately one directive every N turns.
2. The Desk shows the visible bank (`reserve` / `reserve_max`) and the latest top income source for Option B, using the approved source vocabulary.
3. Diary check remains binding: WP-9 sessions after CA-2 must answer "did you ever want to act and couldn't afford it / did you ever forget the levers existed" — the two failure modes this plan exists to balance.

## 4. Sequencing & verification

| Order | Packet | Mode | Gate |
|---|---|---|---|
| 1 | CA-0 | direct or worktree builder | typecheck + new tests + full grep-derived suites (`commandAuthority`, `command_authority`) |
| 2 | CA-1 | panel convening | GO recorded in this doc §6 + ledger |
| 3 | CA-2 | worktree builder | full gate incl. `test:baselines` + structural fingerprint + old-shape save test |
| 4 | CA-3 | shipped with CA-2 | UI gate (`qa:player-experience`) |

CA-0 is parallel-safe with everything in the GUI plan. CA-2 touches `war_phases.ts` — do not run concurrently with any other sim-touching lane (one-change-per-run discipline applies to the PROOF even though the field is player-only).

## 5. Explicitly out of scope

Changing what the levers DO; adding new levers; touching bot/headless behavior; any event-JSON authoring beyond CA-grant effect rows if Option B selects them (those go through the event-channel vocabulary rules — `dimension_shifts` vs `effects` — and their own §6 screen).

## 6. CA-1 inputs ledger (fill as produced)

- **CA-0 numbers memo (2026-07-06, computed + pinned in `tests/command_authority_economy.test.ts`, 10/10 green; fresh grep-derived adjacent suite 31 files / 626 tests green):**
  | Quantity | Value | Meaning |
  |---|---|---|
  | Lifetime income ceiling (188w) | **476 CA** | 100 initial + 2/turn — only if the player NEVER idles at cap |
  | Max override-class acts, whole war | **19** | at 25 CA per lever |
  | Hoard-case acts (player sits at cap) | **4** | recovery at 100/100 is destroyed; budget = initial pool |
  | Cap-waste | **confirmed** | income while full = 0; no bank, no overflow |
  | Post-crisis drought | **13 turns** | after a 4-act crisis window (incl. one force-launch), the next 25-CA act is ~3 months away |
  | Gesture cadence from empty | **5 turns** per 10-CA gesture | front visit / address / decorate |
  | Cost parity | **green** | TS constants == `autonomy_ipc_contract.cjs` exports == `electron-main.cjs` force-launch literal |
  Reading for the panel: steady-state presidential tempo is ~0.08 override acts/turn; the design doc's "at most a few weighty directives" pacing is achievable only in the opening crisis, never again. The spiral (force-launch throttles recovery for 3 turns) means the drought lengthens precisely when the player is most engaged.
- **CA-1 panel verdict (2026-07-09): GO with Option B, political income.** The panel rejected Option A as a floor-only timer repair that would not make the Command Authority economy feel politically earned, and rejected Option C as the primary model because emergency acceleration risks rewarding catastrophe. Option C may return later only as a bounded modifier after the same event and Section 6 screens.
- **Chosen income model:** deterministic political capacity recovery. CA should recover from a base weekly floor plus bounded contributions from legitimate political standing, internal cohesion / civil-military confidence, non-atrocity patron confidence, and quiet-front restraint. One-off grants are allowed only through authored political events that pass source classification and Section 6 review.
- **CA-2 cadence target:** one 25-CA override every 2-3 quiet turns; a full pool supports 3-4 override acts inside a 4-turn crisis; after that crisis, the next 25-CA act should arrive within 5 healthy quiet turns or 8 strained but non-collapsing quiet turns. A 10-CA gesture should be roughly monthly under neutral conditions.
- **Anti-spiral rule:** force-launch and friction penalties may reduce recovery, but may not zero CA income for more than 2 consecutive turns unless an explicit political-collapse or endgame constraint is active. Penalty decay must be deterministic and persisted.
- **Cap-waste rule:** CA-2 must add a bounded reserve / bank or other visible overflow-preservation path. The Desk must show what is flowing, banking, or capped.
- **Acceptance update:** retune `tests/command_authority_economy.test.ts` from characterization pins to the target table: income, max override acts, hoard-case acts, post-crisis drought, and gesture cadence.
- **Section 6 income-source audit result: GO with exclusions.** Allowed CA sources are broad legitimacy / institutional confidence, lawful international standing, non-atrocity patron confidence, internal cohesion / civil-military trust, quiet-front restraint, and authored assembly / patron endorsement events after event and Section 6 screens. Banned CA sources are ethnic consolidation, coercive territorial control, forced displacement, camp / atrocity events, safe-area fall outcomes, civilian casualties, siege starvation, and any ambiguous atrocity-adjacent reward. Any authored event CA grant must carry source classification and a Section 6 note; ambiguous sources stop for panel / owner review.
- **CA-2 / CA-3 implementation record (2026-07-09, `codex/ca2-political-income`):** Option B is implemented as deterministic political-capacity recovery. Recovery sources are limited to `international_standing`, `patron_confidence`, `internal_cohesion`, `quiet_front_restraint`, and `base_recovery`; validation rejects any other source. Base/floor recovery is 3.25 CA per turn, quiet-front restraint can add 2 CA, force-launch/friction penalties are capped at 2 CA, and reserve is capped at 15 CA. `scenario_runner.ts` keeps the old initial object shape; optional reserve/source fields are written by recovery normalization, preserving old saves without a schema bump.
- **CA-2 target table now enforced by tests:** neutral strained lifetime usable income is **726 CA** over 188 weeks; max override-class acts are **29**; hoarding preserves a visible **15 CA** reserve instead of silently destroying all overflow; post-crisis drought is **8 turns** under strained non-collapsing conditions; a 10-CA gesture is affordable in **4 turns** under neutral strained conditions; healthy quiet conditions sustain a 25-CA directive about every **3 turns**.
