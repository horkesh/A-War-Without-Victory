# Command palette and scalable interface

**Date:** 2026-11-06–07. **Delivery:** verified local branch, not merged. **Branch:** codex/command-palette-ui-scale. **Worktree:** F:/AWWV-worktrees/command-palette-ui-scale. **Production source:** c51125157699a851ca14df69fae0b22e49dd1435. **Qualification commit:** 931949742c79801d0a13d7ee7caf2d2de8ba96b2.

The campaign now has a visible Find control and Ctrl/Cmd+K palette for own active brigades/corps, public named geography and existing sections. Friendly-name/diacritic matching and deterministic bounded results use projected data; hidden enemy formations and raw IDs are excluded. Existing shell/inspection handlers remain the only navigation owners. Required decisions, other modals, context menus and busy mutation surfaces block the palette; stale targets fail closed. Search submits no orders or turn advances.

Settings offers 100/125/150% interface sizing and a reset. Browser storage remains guarded; native uses the existing generic settings bridge to survive changing localhost origins while preserving unknown settings. A logical UI viewport enlarges text/chrome; retained main and nested OpsMap canvases stay in physical coordinates. Tutorial masks, portal pointers, controls and active panel bounds compensate once. The nested map also now avoids missing-terrain initialization and its pre-existing zero-height CSS collision; no map assets, camera or simulation behavior changed.

## Implementation surfaces

| Files | Responsibility |
|---|---|
| src/ui/map/command_palette/ | Pure safe search, accessible dialog and guarded launcher |
| src/ui/map/preferences/ | Local store, logical chrome viewport, physical renderer island and native persistence |
| App.tsx / SettingsScreen.tsx / EN+BCS messages | Canonical routing, preference controls and labels |
| globals.css / active panels and portal consumers | Logical bounds, physical-to-logical pointer and tutorial placement, once-only controls |
| ops_modal/OpsMap.tsx / opsTerrain.ts | Physical nested canvas, CSS container startup and conditional existing terrain |
| tests/ui/command_palette, interface_scale, interface_coordinate_ownership, ops_map_terrain_availability | Focused regressions, native races and coordinate ownership |
| Three existing UI contract tests | Preserve semantic bounds/selection/action prohibitions across the accepted architecture |

## Evidence and limits

| Check | Result |
|---|---|
| Independent source review | GO after one consolidated correction and targeted verification; R1–R3 resolved; later three-test semantic correction independently GO |
| Natural browser matrix | 9/9 preset/viewport combinations (1366×768,1920×1080,3840×2160); 9/9 real founding-decision guards; 0 page errors |
| Native actual campaign | 100/125/150 navigation; strict post-tutorial state/save preservation; 150% portal geometry/keyboard guard |
| Native preference | 150% survives same-origin reload and changed-port relaunch 49220→60091; unknown settings preserved; native zoom 1 |
| Own desktop build | Exit 0; 18 renderer chunks, no cycles; own sim/warroom built |
| Rejecting player journeys | 44 files / 795 tests pass |
| Adjacent governance contracts | 4 files / 73 tests pass after source provenance freeze |
| Balanced full suite | Exit 0; 1509 unique files selected; 1509 unique completed file receipts |
| Player-experience gate | Exit 0, including required build/runtime/journey/browser steps |

[Machine receipt](20261106_COMMAND_PALETTE_UI_SCALE_RECEIPT.json) binds local evidence by SHA-256. Raw evidence stays in the preserved local task directory, not in this checkout's committed artifacts. The exact runtime build executable files are retained before the required qualifier rebuild. Source hashes stayed unchanged throughout the actual browser/native proofs.

Full suite 01 remains FAILED: nine unchanged shell/CI guard files resolved bash to WSL instead of the required Git Bash/MSYS+jq; three UI contracts pinned old physical viewport classes or blanket-blocked a readonly attack-confirmation blocker. Task-local shell selection and semantic test corrections were proved cheaply before qualifying full suite 02. No production change was needed. Original failed receipts remain failed. Browser harness corrections distinguished historical decision titles from active decisions and chose unobstructed physical canvas points. Reuse includes completed source-identical cases from failed matrix01; matrix02 records all 9 complete cases. Earlier palette captures caught entry animation; the settled native 150% image verifies the same production component's readable final appearance.

Native01 failed an iframe attachment race, corrected and boot-proved before retry. Native02 took its baseline before legitimate first tutorial dismissal. The sole added meta.tutorial_state reconstructs both prior save/projection hashes exactly; subsequent strict proofs strip no fields and reuse the same own turn-zero save. Native04's zero-size radial positioning wrapper caused a visibility false negative;05 measures visible children and reuses completed 100/125 rows. All own processes/port reservations closed; profiles, before/after JSON, autosaves, logs and failed captures remain retained.

## Ownership and remaining boundaries

Changes are confined to renderer UI and UI tests. No engine, AI, IPC channel, GameState/save schema, scenario/control/catalog/art/calibration/pin edit. No 188-week calibration run, baseline refresh, public package or release acceptance is claimed. Claude's worktrees/processes were not modified; presentation-only EventModal/EventDecisionModal sizing overlaps were announced in the cooperation file.

The reviewer retains advisory N1 about proactively noticing unsupported pre-mounted modal visibility changes; action-time guards still block activation. Push, PR, conflict resolution and merge remain a later authorized integration step. No global R7/R8/calibration gate is closed.
