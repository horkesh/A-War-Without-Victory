# Command Authority Economy — Repair Plan

**Date:** 2026-07-06
**Status:** READY FOR EXECUTION — CA-0 dispatchable now; CA-1 is a Pyrrhic panel convening; CA-2/CA-3 follow the panel verdict.
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

### CA-2 — Implementation (after CA-1 verdict; one PR)

1. Implement the chosen model in `war_phases.ts` `recover-command-authority` (keep the `!auth` early-return — headless stays untouched) + `scenario_runner.ts:288` init if the pool/cap changes + `commandAuthority.ts` mirrored constants + every MUST-match site (`autonomy_ipc_contract.cjs`, the four `.cjs` handlers, `electron-main.cjs`) — the CA-0 parity guard is the net.
2. If a new persisted subfield is added (e.g. `reserve`): update `validateGameState.ts` constraints, save-migration default for older saves (schema bump), and the resumed-save cross-flag test discipline (pre-seed an old-shape save, load, advance).
3. Retune the CA-0 characterization pins to the chosen targets — the campaign-integral test now ENFORCES the cadence spec (this is the permanent regression net: any future constant drift fails the integral, not a reviewer's arithmetic).
4. Determinism: formula reads only persisted state, sorted iteration (the existing step already sorts corps keys — keep it); no floats where integers do (recovery may stay fractional-step ×0.5 as today — it is player-only, off the calibration path, but keep it deterministic).
5. **Calibration proof, not assumption:** the field is absent headless and the step early-returns — expect byte-identical baselines, but PROVE it: `npm run test:baselines` + structural fingerprint check in the PR (sim-file-touching change ⇒ the CI sim gates run regardless; a red there means the early-return assumption broke — STOP).
6. i18n: desk legend copy for any changed costs/recovery, EN+BCS.

### CA-3 — Budget legibility (UI-only; can ship with CA-2 or after)

1. `DeskAuthorityHeader.tsx`: replace the raw "Recovers up to +2/turn" line with the cadence sentence derived from live values ("At current standing you can sustain about one directive every N weeks"), and — if Option B — one line naming the top income source ("Authority is flowing from: patron confidence").
2. At-cap state (Option A) or reserve display (bank): the header must show when income is banking vs. flowing, never silently losing.
3. Diary check: WP-9 sessions after CA-2 must answer "did you ever want to act and couldn't afford it / did you ever forget the levers existed" — the two failure modes this plan exists to balance.

## 4. Sequencing & verification

| Order | Packet | Mode | Gate |
|---|---|---|---|
| 1 | CA-0 | direct or worktree builder | typecheck + new tests + full grep-derived suites (`commandAuthority`, `command_authority`) |
| 2 | CA-1 | panel convening | GO recorded in this doc §6 + ledger |
| 3 | CA-2 | worktree builder | full gate incl. `test:baselines` + structural fingerprint + resumed-save test |
| 4 | CA-3 | direct | UI gate (`qa:player-experience`) |

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
- Panel verdict + chosen option + cadence spec: _pending_
- §6 income-source audit result: _pending_
