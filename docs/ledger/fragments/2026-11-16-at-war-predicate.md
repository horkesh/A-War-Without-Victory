## 2026-11-16 — One shared RBiH-HRHB "at war" predicate (control-identical; re-pinned)

- **Why** (red-team finding on the lock-conflict panel; the orchestrator folded it in and ruled that it is measured separately). Readers of the RBiH-HRHB alliance disagreed exactly at 0.0:
  - `isRbihHrhbAtWar` and minority erosion use ≤ 0;
  - `bot_corps_stance` (RBiH and HRHB branches), `bot_corps_ai`'s bilateral diversion and `bot_early_war` used < 0;
  - `bot/bot_strategy`'s RBiH appeasement penalty used > 0.
  So for a turn with the alliance at exactly 0.0 (t93 in the baseline) some systems saw war and others did not.
- **Change.** The five divergent readers call `isRbihHrhbAtWar` (alliance ≤ `HOSTILE_THRESHOLD`): `src/sim/combat/bot_corps_stance.ts` (two branches), `src/sim/combat/bot_corps_ai.ts`, `src/sim/early_war/bot_early_war.ts`, `src/sim/bot/bot_strategy.ts`.
- **Proof** (on main `69c566349`; logs `C:/Pyrrhic/AWWV-worktrees/_logs/b5-scorer-20261116/aw_*`).
  - Historical 188w: hash `044a3f85f003e7c7`. Checkpoints 709/709/708/681, guard intact.
  - Control-identical to main: `control_delta`, activity, formations, operation AARs and the end report are all byte-identical.
  - State does change, from the one turn at exactly 0.0 (t93) onward: HRHB cohesion is 1-2 lower from t93 to t188 (`brigade_temporal_log`), and `weekly_report` differs at t136-140 (Kupres power ratios). No control cell changes.
  - Emergent `f98539c388ffb459`: 709/709/708/680, intact.
  - Baselines re-pinned; a second run matches.
  - **Re-measured on main after #753 and #758** (main pins historical `0b86d3d742fcbf1c`, emergent `84595a73932f3ac4`, 709/709/708/682; logs `aw2_*`): historical `743bc115ea3a41fe`, emergent `b098c193e64d5d88`, both 709/709/708/682 (equal to main), guard intact (cascade 31). Re-pinned on this head; a second run matches.
  - **Re-measured on main after #729** (`9bdefb158`; main historical `3b4685bc356210d5`, 709/709/708/682; logs `aw3_*`):
    - historical `623c46fd2e2e39fc`, emergent `3d18b7935f417681`, both 709/709/708/682 (equal to main);
    - guard intact (cascade 31);
    - re-pinned on this head; a second run matches.
  - **Re-measured on main after #766** (`7acbb1ad6`; main historical `0b63e8102bddf6be`, emergent `73b481f79ac28e46`, 709/709/708/682; logs `aw5_*`):
    - historical `d983d7bc665fdeb6`, emergent `9454c52e328dd647`, both 709/709/708/682;
    - guard intact (cascade 31);
    - control-identical to main: the pinned `control_delta`, `activity_summary`, `formation_delta` and `end_report` hashes equal main's; only `final_save` and `weekly_report` differ (HRHB cohesion from t93);
    - re-pinned on this head; a second run matches.
  - The 43 test files that touch these readers pass (716 tests). tsc clean.
- The lock-conflict fix (the back-channel floor and the contradiction rule) is **held** on `claude/b5-alliance-lock-conflict` until package P2 and the RF-ROSTER precedence fix make the Farz chain robust. Measured alone it breaks the guard through Farz (an "all objectives already owned" skip at t179).
