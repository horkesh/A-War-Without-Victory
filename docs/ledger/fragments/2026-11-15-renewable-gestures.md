## 2026-11-15 — Renewable presidential gestures (Fable consult 1 appendix D; ratified in L7 #670)

- **What.** The twelve gesture events in `data/scenarios/events/war_1993.json` (front visit, address to the nation, decoration and strategic posture review, one each per faction) lose their lifetime cap and keep a cooldown only: front visit every 26 weeks, address every 52, decoration every 52, posture review every 26. They were 5 per war at 10-week cooldowns (posture review 8 at 8 weeks). Over a war this gives about the same total (about 14 uses against 15, and 7 reviews against 8), so the effect on the army does not grow; the gestures just stop running out. The price stays 10.
- **Why.** Ratified design: Authority is the price of overruling the army, and the gestures are its routine spend. A capped gesture ran out by about week 50 for an engaged President.
- **Code** (player path only):
  - `action_cadence.max_fires` is now optional. The loader requires a positive `cooldown_turns` when it is absent. `ActionCadenceConfig` is its own type, separate from `RecurrenceConfig`.
  - The five desktop contracts report an uncapped gesture as `firesLeft: null, maxFires: null`. Before, they reported `undefined`, and the Desk read that as 0, meaning "exhausted".
  - The Desk front-visit section hides the "visits left" line when there is no cap.
  - The `useIPC` types now allow null.
  - Stale "max_fires 5 / cooldown 10t" comments are updated.
- **Engine.** `evaluate_events.ts` never reads `action_cadence`; only the desktop contracts do. The bot faction's own firing of these events (at week 84) uses `once` and `event_fire_counts`, which are unchanged.
- **Tests.**
  - `tests/renewable_gestures.test.ts`: the data pin, never exhausted, cooldown still applies, a capped cadence still runs out, and front visit reports null rather than 0.
  - `tests/ui/front_visit_renewable.test.ts`: the Desk shows the cooldown and never "exhausted" for a renewable visit, and still shows it for a capped one.
  - The existing gesture and event tests pass unchanged.
- **Proof** (evidence under `C:/Pyrrhic/AWWV-worktrees/_logs/cl-appd-gestures-20261115/final/`):
  - 40-week headless run against main `3912a7ec`: 14/14 simulation artifacts byte-identical, `final_state_hash` `c5d49a21a9db379f` on both. `run_meta.json` differs only in provenance (output folder, the changed event file's input digest, commit).
  - `npm run test:baselines`: the 188-week master, 8 artifacts against the committed baselines. "Baseline regression: all scenarios match." This covers the bots' own week-84 firing of these events.
