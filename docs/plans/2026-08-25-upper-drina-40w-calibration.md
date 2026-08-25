# Upper Drina 40-Week Calibration Implementation Plan

**Goal:** Improve the April 1992 definitive 40-week run against the authoritative January 1993 painter, concentrating on Goražde, Foča, Rudo, Čajniče, Višegrad, Pale, Trnovo, Rogatica, and Kalinovik.

**Baseline:** Run n295/n296, final hash `ad0763075a1a2562`, overall 676/712, theatre 66/77.

**Constraints:** One lever per run; no initial-control overrides; all gains through regular combat or authored defender posture; retain no candidate that regresses any previously correct January cell; painter control is truth; later-war fallout is out of scope.

### Task 1: Čajniče / Batotići slice

- Add failing behavioral tests for a neutral `cajnice_local` / `Cajnice Local Axis` on post-Foča `Operation Herzegovina Consolidation`.
- Prove the axis cannot launch before `Operation Foca` completes and then builds with `rs_ajnie_brigade` assigned.
- Stage at `op:cajnice:cajnice_2` and target only `op:cajnice:batotici`. BB1 pp.175 and 187 support the local-force/theatre structure; the exact Batotići OSID comes solely from the authoritative January painter.
- Run the focused unit tests, then one 40-week candidate. Retain only a positive net January result; repeat retained candidates for the same hash.

### Task 2: Remaining independent theatre levers

- Test `miljeno_2` as the follow-on on the proven Čajniče axis.
- Test local Foča `brusna_2`, Kalinovik `vlaholje -> varos_2`, Rogatica/Pale `varosiste_2 -> praca`, early limited Trnovo `kijevo_2`, an ARBiH Višegrad/Trnovo counteroperation for `drinsko`, `medjedja_2`, and `tosici`, and an authored RS defense at `podkozara_donja_2`.
- For each lever: write the failing test first, make the minimal change, run focused tests, run 40 weeks, compare exact fixed/regressed sets, and revert if the net score does not improve or any previously correct cell regresses.

### Task 3: Final verification and review

- Run typecheck, relevant Vitest suites, and two clean 40-week repeats without `--map`.
- Compare against the current January painter and report overall/theatre scores, exact fixed and regressed sets, final hash, commit, and dirty provenance.
- Obtain independent historian, engine/determinism, scenario-calibration, canon, and process-QA review.
- Append the behavioral/output change and evidence to `docs/PROJECT_LEDGER.md`; do not edit canon unless review identifies a genuine canon change.

### Final outcome (2026-08-25)

- Accepted eight exact theatre fixes with no January regression: `op:cajnice:batotici`, `op:cajnice:miljeno_2`, `op:foca:brusna_2`, `op:kalinovik:varos_2`, `op:trnovo:kijevo_2`, `op:rogatica:varosiste_2`, `op:pale:praca`, and `op:gorazde:podkozara_donja_2`.
- Final exact score: 684/712 overall and 74/77 across the nine-municipality upper-Drina/Sarajevo theatre, versus 676/712 and 66/77 at baseline.
- Final repeated state hash: `e8dc3750e880278b`. Clean-provenance runs n32/n33 at `096fcc100` are byte-identical final acceptance artifacts.
- Rejected experiments included brigade restoration at Podkožara, Rogatica–Prača joint axes, Prsten axis extension, multiple Višegrad/Međeđa ripostes, and multiple Trnovo/Tošići counterstrokes. Each either failed to execute, produced no January change, or displaced a correct January cell and was reverted.
- Historian review required and received explicit painter/OOB/graph provenance boundaries plus bounded 1992 scenario-cadence windows: turn 12 for Varošište/Prača and turns 17–20 for Podkožara; none is asserted as a source-dated operation.
