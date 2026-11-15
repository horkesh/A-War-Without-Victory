# Displacement-out totals: the controller lookup used the wrong key

`capturePreviousTurnSnapshot` (`warroom_state.ts`) attributed each municipality's `displaced_out` to `political_controllers[munId]`. `political_controllers` is keyed by OSID (`op:<municipality>:<name>`), so the lookup always missed and every faction's total stayed empty. It now uses the majority holder of the municipality's OSIDs (`deriveMunicipalityControllerByOsid`, the same rule the sitrep uses).

## Measured on a 40-week save (turn 40, 111 municipalities in `displacement_state`)

| | RS | RBiH | HRHB | sum |
| --- | --- | --- | --- | --- |
| before (old key lookup) | - | - | - | `{}` (0 of 111 municipality ids are keys of `political_controllers`) |
| after (OSID majority) | 537,020 | 162,211 | 23,223 | 722,454 = the sum of `displaced_out` over all municipalities |

## Why there is no screenshot

Nothing renders this field. `displacementOutTotals` is only written into the previous-turn snapshot; no panel, event or ticker reads it (checked every `src` reference). The fix makes the snapshot truthful for the next reader, so the proof is the real-save numbers above plus `tests/ui/warroom_state_displacement_out.test.ts`.
