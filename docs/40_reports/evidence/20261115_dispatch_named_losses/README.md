# The weekly dispatch names our lost formations

The proposal says the weekly dispatch reports our losses by name; `TurnAftermathView` carried only counts. The view now lists the player's own formations lost or destroyed that week, with their corps (`formations.ownDestroyedList`), and the dispatch cost line names up to three of them ("+N more" beyond that).

## Rendered proof (real desktop app, a turn-40 RBiH save, a real Advance)

Three RBiH brigades were weakened in the save (personnel 100, cohesion 8, morale 10) so the Advance's own brigade-dissolution step destroyed them. Nothing in the dispatch is staged: the week's summary came from the engine.

| File | Cost line |
| --- | --- |
| `main_1280x720_dispatch.webp` (main) | "6352 people displaced, most around Mrkonjic Grad · 3 formations lost" |
| `named_1280x720_dispatch.webp` | "... · 3 formations lost: 241st Spreca Muslim Light "Gazije" (2nd Corps), 101st Mountain (1st Corps), 120th Liberation "Black Swans" (General Staff ARBiH)" |
| `named_1920x1080_dispatch.webp` | the same at 1920x1080 |

## Fog firewall

Only the player's own formations are named. The player-visible projection already drops every other faction's `formation_destructions`, and the builder keeps the player's faction regardless; an enemy loss stays a count (`formations.destroyed`). `tests/desktop_player_visible_losses.test.ts` pins the projection (own destructions only, the destroyed own formation kept with its corps link, no enemy name anywhere in the payload) and `tests/ui/turn_aftermath_named_losses.test.ts` pins the builder and the dispatch line (EN and BCS).
