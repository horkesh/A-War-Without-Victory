## 2026-11-16 — B5 political gate: a player's political departure opens the divergence gate for the bots whose history it rules out (historical byte-identical; hands-off emergent unchanged)

- **Why.** #727's gate opens only when the map leaves history's territory band. A player who diverged politically without moving the map 3 pp would face bots replaying a history the player's choices had made impossible: an RBiH President who keeps the alliance with HRHB, or who rejects Vance-Owen. That weakened the "agency if played" half of the owner rule. In four played harness runs no player lever moved the map 3 pp, so the territory gate never opened there.
- **Rulings** (game designer + historian, 2026-11-16).
  - Use fixed markers, not a curve: the alliance has no painted reference, and a curve baked from our own run would be fitted to itself.
  - **Choice markers** are the player's own pick of a listed departure response. **State marker:** no 1993 Croat-Bosniak war by turn 80.
  - Each marker opens only the factions whose history it rules out. The threshold is unchanged once open.
  - **§6 carve-out:** the political opening never applies to §6-sensitive decisions.
  - Historian's markers and bases are in the table in `political_departure_markers.ts` (BB1 pp.44, 59, 218, 219; BB2 p.470; Prlić IT-04-74-T). Too weak to count: week-0 identity picks, the London conference, "reluctant" Washington answers, the Owen-Stoltenberg Presidency stage, "with modifications/reservations" answers, and RS Washington counter-proposals.
- **Change.**
  - New `src/sim/political/political_departure_markers.ts`: `POLITICAL_DEPARTURE_MARKERS`, the state marker, `POLITICAL_GATE_EXCLUDED_EVENT_IDS`, `isPoliticalGateEligible`, `isPoliticsOffHistoryFor`.
  - `evaluate_events.ts`: the gate is the territory band OR (not §6) a political departure for the responding faction.
  - `peace_plans.ts`: the same, for the scored plan step.
  - Systems Manual §7.10.7 gains the paragraph.
  - Harness: opt-in `--event-override <event>=<response>` on `tools/ai_play/desktop_calibration_compare.ts`, inert without the flag.
- **Proof** (main `4866a4279` + #727; logs `C:/Pyrrhic/AWWV-worktrees/_logs/b5-scorer-20261116/pb_*`).
  - Stop condition checked: left alone, `croat_bosniak_war_begins_1993` fires at **t49**, in both historical and emergent.
  - Historical 188w byte-identical: `83b8e8cd36023899`.
  - Hands-off emergent unchanged from #727: `25176ce62fdcca94`.
  - **Played** (RBiH President, `staff_recommended`, autonomy as in production, 188 turns). The control and the run that rejects Vance-Owen at t39 differ in exactly three decisions:
    - the player's own rejection;
    - t76 RS `accept_belgrade_directive` (history: `defy_belgrade_directive`);
    - t89 HRHB `sue_for_peace_hrhb` (history: `press_croat_objectives`).
    These are the opened factions' picks whose margins (4.42, 3.84) beat their thresholds (3.0, 1.33). No §6 decision moves. The control run matches history.
  - Tests: new `tests/sim/political/political_departure_markers.test.ts` pins the table to the event data, the state-marker turn to the event window, left alone closed, the faction scope, softer variants, and the §6 carve-out. Political, events and peace-plan slices: 23 files, 321 tests pass. tsc clean.
- **§6:** with the carve-out no §6 decision can move on the political opening. The §6 seats ratify the carve-out.
