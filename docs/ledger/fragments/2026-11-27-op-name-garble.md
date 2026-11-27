## 2026-11-27 — OP-NAME-GARBLE: a used-up name pool recycles with a generation suffix

Authority: ruling §43 (Fable consult 12 register, item 3); lane B s31.

**Change.**
- `pickOperationName` (`src/sim/combat/operation_names.ts`): after a faction has used every pool name twice, it went to a last-resort fallback, `Operacija <turn>-<last 4 characters of the corps id>`. That named a player-visible ARBiH 2nd Corps operation "Operacija 177-orps" (Fable consult 12, pair 2 emergent, week 177). The pool now recycles generation after generation (" 2", " 3", ...) until a free name is found; the loop is bounded by the number of used names, so it always ends. No GameState field changes shape; `used_operation_names` stores the new names as before.
- Canon: Systems Manual, the named-operations implementation note, one clause.
- Tests: `tests/op_name_pool_exhaustion.test.ts` (3; 2 red on main).

**Measured.** See the PR: 188w pair on main dae338dfb.
