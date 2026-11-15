## 2026-11-15 — RF-corridor-breach: the dead corridor-breach pass is retired (inert)

Follow-up (c) to F1g: the corridor-breach pass had the same S-id/OSID mismatch.

**Premise, measured on main's 188w.** Control was replayed per turn, and `detectCorridorBreachOpportunities` was run with today's inputs and with OSID-correct inputs (OSID edges; OSID → municipality via `operationalToCanonical`).
- **Today:** 0 targets for every faction on every turn. `political_controllers` is OSID-keyed, and `sidToMun` maps `S…` ids.
- **OSID-correct:**
  - RS 0 and RBiH 0: their corridor lists hold 17-36 enemy cells, above the detector's 8-cell "strip" test.
  - HRHB has targets on 174 of 188 turns. At t15 its "breach" was Livno Gubin, five Mostar cells including Mostar istok, and Stolac Hatelji: scattered, and several held by ALLIED ARBiH.

**Ruling: retire (option c).** operations-expert and corps-army-commander were consulted separately before code, and both reached it.
- Even with the keys fixed, `attemptCorridorBreach` builds a hollow `sector_attack` with `objectives: []`, which completes and goes to recovery with nothing attacked.
- It took the first corps by id and its four strongest brigades, ignoring garrison, sector and queue-head guards.
- It forced `cmd.stance = 'offensive'` over the faction rules. That would have flipped the Herzegovina HVO corps that rule E3 holds defensive into "breaching" allied ARBiH Mostar from mid-1992, with no alliance or Graz gate.
- `corridor_municipalities` is defended territory, not a breach list.
- Option (b), repairing it, would have built a second launcher beside the authored Corridor 92 and the commander loop.

**Change.**
- Deleted:
  - `bot_corps_corridor.ts`;
  - the step-4 call and re-exports in `bot_corps_ai.ts`;
  - `CORRIDOR_BREACH_MAX_STRIP_WIDTH`;
  - the `isCorridorBreachOp` donor branch (`bot_corps_operations.ts`);
  - `corpsHoldForbidsNewOffensive`, whose only caller was the deleted pass;
  - `tests/bot_corps_corridor.test.ts`.
- Kept: `corridor_municipalities` (rule E3, posture) and clamp point 2, which still re-clamps after the bilateral-war reassignment.
- Stale comments fixed: `stance_matters.ts`, `enclave_resilience.ts`, two tests.
- Canon: Systems Manual (three mentions removed, plus a "do not revive" retirement note in §6), `AI_STRATEGY_SPECIFICATION.md`, `REPO_MAP.md`.

**Tests.** New `tests/sim/corridor_breach_retired.test.ts`:
- the module and its exports are gone;
- a faction pass creates no "Corridor Breach" operation;
- an HRHB Herzegovina corps beside allied ARBiH Mostar stays defensive through the whole `generateAllCorpsOrders`.

**Proof.**
- Headless 188w against main `c62d39975`: all 8 artifacts byte-identical (final_save `e44c77f5b41052f8`, weekly_report, control_delta, formation_delta, activity_summary, watched_operations, end_report, run_summary).
- `tsc` 0; `test:baselines` all scenarios match; full `npm run test:vitest` exit 0. No re-bless.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/rf-corridor-breach-20261115/`.
