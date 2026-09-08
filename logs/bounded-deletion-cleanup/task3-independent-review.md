Task 3 independent Sol/medium review — 2026-09-08

Verdict: NO-GO for closeout; GO on the App.tsx delegation itself.

The five branches are equivalent and reviewPreAdvanceTarget is declared before the wrapper. openDecisionRoomTarget remains distinct in return values, shell closing, Army HQ handling, and Warroom transitions. No strings, router, state ownership, simulation, or player-visible content changed.

Blockers: named UI suite exit 1 (34 passed, 5 failed in unchanged projection expectations); release build exit 1 at the existing stale startup-snapshot gate after a source-read timeout; packaged Electron interaction was not run. No files edited by reviewer.
