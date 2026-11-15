# Entry-chunk headroom: lazy-loaded on-demand views

`tactical_map-*.js` (the entry chunk) was 3,000.38 kB against `chunkSizeWarningLimit: 3000`, so the player-experience gate failed on main (since fb883c06b: #643 and #639 were each under the limit alone and together over it).

## Chunk sizes (desktop:map:build)

| | before (main b51ab3e58, CI log) | after |
| --- | --- | --- |
| `tactical_map-*.js` | 3,000.38 kB | 2,863.53 kB (136.85 kB under the limit) |
| `CodexPanel` | in entry | 32.50 kB, own chunk |
| `ChronicleOverlay` | in entry | 49.56 kB, own chunk |
| `WrappedOverlay` | in entry | 20.32 kB, own chunk |
| `SettingsScreen` | in entry | 12.38 kB, own chunk |
| `DiplomacyPanel` | in entry | 12.02 kB, own chunk |
| `PeacePlanModal` | in entry | 7.00 kB, own chunk |
| `AiSettingsPanel` / `AiAdvisorPanel` | in entry | 3.66 kB / 3.42 kB, own chunks |

The limit and the gate are unchanged.

## Rendered proof the lazy views still open (real desktop app, 1280x720)

- `codex_1280x720_open.webp`: War Map, Codex nav -> the Codex dialog opens ("147 essays available").
- `chronicle_1280x720_open.webp`: President's Desk, Chronicle nav -> the War Chronicle opens.

Settings, Diplomacy, the Peace plan and the two AI panels are covered by their existing component tests (87 UI test files, 861 tests, all passing).

## After merging main (#635 landed)

`tactical_map-*.js` is 2,743.03 kB (257 kB under the limit; no chunk-size warning). 103 UI test files that reference App or these views pass (1090 tests); `tsc --noEmit` clean.
