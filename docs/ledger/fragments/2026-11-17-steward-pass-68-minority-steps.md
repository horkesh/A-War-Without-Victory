## 2026-11-17 — Pass 68: the dead minority and early-war steps registered for retirement; DISPLACEMENT_MASTER corrected

Docs only; no `src/` or `data/` change, no hash change.

- Orchestrator ruling, 2026-11-17 (Part 4, RETIRE, S4): `minority-erosion`, `early-war-bot-posture` and `minority-militia-decay` have been dead since de5ff94cb (2026-03-01); they are registered only in `earlyWarPhases`, which runs only under recruitment_mode "bottom_up", which no scenario uses; no recorded decision dropped them. Owner: the batch-b-lane, with the peace-phase family, plus anything reachable only via bottom_up. Canon note on Phase I §4.8: cut-off minority formations are carried by the stranded-brigade lifecycle (EH-3) and by displacement.
- `docs/20_engineering/DISPLACEMENT_MASTER.md` lines 88, 160 and 700 said minority flight was active, then disabled with code retained; the module was deleted on 2026-06-09 (#360); the three passages now say so. `PLAYER_TURN_GUIDE.md` lines 41 and 52 (canon folder) and the `game_state.ts` line 610 comment are left to the batch-b-lane's PR (canon edits with the peace phase; a src comment).
