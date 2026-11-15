# Sustainment counts now reach the live app

`displacement.sustainability_state` was not part of the player-visible projection, so the live sitrep read an empty map and always showed "0 critical, 0 strained" (F1e could only be proven by tests). It is now projected, scoped to the municipalities the player holds.

## Rendered proof (real desktop app, 1280x720, Situation tab)

Save: a 40-week headless run of the 188-week scenario (turn 40), opened as RS. Raw numbers from that save, municipalities held by RS (majority of OSIDs), by the same rule the sitrep uses: 37 adequate, 4 strained, 4 critical, 10 collapsed (the collapsed list is no longer shown on player screens, F1e).

| File | Sitrep line |
| --- | --- |
| `before_1280x720_sit.webp` (main) | "Sustainment: 0 critical, 0 strained" |
| `after_1280x720_sit.webp` | "Sustainment: 4 critical, 4 strained" (matches the raw counts) |

## What is projected

Only the player's own municipalities. The opponents' municipal supply strain stays out of the payload, the same scope as `war_supply_condition`. Control itself is public, so the holder is read from the raw `political_controllers`. The firewall test checks the other sides' municipalities are absent from the serialized projection.
