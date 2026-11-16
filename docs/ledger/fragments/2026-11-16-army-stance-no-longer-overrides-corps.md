## 2026-11-16 — The army standing order no longer overrides corps stances, and no longer hides stance matters from the President

Batch B, Fable consult 5 ruling 3 (items 1 and 2), scope approved by the orchestrator.

**Finding (corps-army-commander trace).** `military.army_stance` (the standing order: RS general_offensive weeks 0-25; RBiH general_defensive weeks 0-11 and general_offensive from week 80) had three readers:
- `corps_command.getEffectiveCorpsStance`: its only live caller is `applyCorpsEffects`, which acts only on `reorganize` (force defend, +2 cohesion). So the override could only change a corps that was in `reorganize`, and could only hide that recovery.
- `battle_resolution.getCorpsStance`: the SID fallback, skipped whenever operational data is loaded. It is dead in headless and live play, and it would have bypassed a presidential hold.
- `stance_matters` 448-454: while the army stance was non-balanced, every corps stance change was recorded `not_put: army_stance` and never put to the President. A human at autonomy 1+ lost his stance matters from week 80.

Canonical combat (`combat_math.ts`) and the planner (`plan.ts`) read only the corps's own stance. Fable measured the week-80 order as inert.

**Change.**
- `uncappedEffectiveCorpsStance` returns the corps stance; holds and the Oct 1995 ceasefire still cap it.
- `battle_resolution.getCorpsStance` reads the corps stance only.
- `stance_matters`: the army-stance not-put branch is removed. `not_put_reason: 'army_stance'` stays in the type and copy for receipts in older saves.
- `setArmyStandingOrder` still writes `army_stance` each turn as the General Staff's proposal and display value. Removing the write would move the serialized hash.
- Systems Manual §6.4: the "Army override" sentence is replaced with an "Amended" note.

**Tests.**
- `corps_command`: an army stance no longer overrides the corps stance (reorganize is kept under general_defensive).
- `stance_matters`: a change under an army general offensive is put to the President.
- New: an army general offensive cannot bypass a presidential hold at defensive, and the battle path does not read `army_stance`.
- `stance_matters_integration` updated.
- 5 files, 74 tests; tsc 0.

**Proof: hash-neutral.** Seven runs on the change against seven fresh runs of main 3e84d653c:
- 188w historical `03159b9ee1e5877f`, 188w emergent `dde641b2c74838f0`, 40w `bbea69f02ed778a9`, apr1993 and apr1994 `914c6aaa7ed5cbe1`, apr1995 `9dcf926fafac00bc`: identical final hashes.
- sep1991_to_dayton: every control and report artifact is byte-identical. The final hash differs only in `meta.peace_war_start_control_path`, which stores the checkout's absolute path (registered separately). Main's own re-run reproduces its hash.

Nothing moves headless because no corps was in `reorganize` under a non-balanced army stance in these runs. Where that does happen, in a played or divergent game, the corps now gets its reorganize recovery, which is the intended fix. Holds exist only for a live President, so the player path changes: stance matters now reach him in weeks 0-11 (RBiH) and from week 80.

Evidence: `C:/Pyrrhic/AWWV-worktrees/_logs/batch-b-20261116/` (stance_*).
