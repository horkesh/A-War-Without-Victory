# Owner playtest UI round 2 — rendered evidence

Real desktop app (Electron, War Map, RBiH save), captured with the production build from this branch ("after") and from main ("before").

## PK3 — enemy-contact chip and legend rows

| File | Size | Shows |
| --- | --- | --- |
| `pk3_before_1280x720_map.webp` | 1280x720 | main: legend has the counter key only; unidentified enemy chips print "EN" |
| `pk3_after_1280x720_map.webp` | 1280x720 | chips print "?"; legend adds "Spotted enemy unit, unidentified", scouted ground, fogged ground, enclave outline |
| `pk3_before_1920x1080_map.webp` | 1920x1080 | same as above, wide |
| `pk3_after_1920x1080_map.webp` | 1920x1080 | same as above, wide |

## F1e — collapsed-municipality list

Not rendered. The live desktop app only receives the player-visible projection (`src/desktop/player_visible_state.cjs`), which does not carry `displacement.sustainability_state`, so the sitrep sustainment counts are always 0 there and the removed list never appears in the live app, before or after. The change is covered by tests (`operational_sitrep_views`, `turn_event_collapse_attribution`, `war_summary_campaign_cost_i18n`, `r7_english_readability_phase1`). The missing projection is recorded as an out-of-scope finding.
