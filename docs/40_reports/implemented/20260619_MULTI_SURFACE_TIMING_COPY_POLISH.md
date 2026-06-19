# Multi-Surface Timing and Provenance Copy Polish

Date: 2026-06-19

## Summary

Closed the next Pyrrhic UI/raw-copy wave across the player-facing timing and provenance surfaces reported by the specialist sweep.

- President's Desk consequence rows now render decision receipt timing as calendar dates instead of `Turn {n}` copy.
- Decision Room hard-turn source labels and latest-turn report fallback headlines now use calendar dates instead of raw turn labels, and opportunity review evidence remains calendar-bound in both EN and BCS.
- Army HQ operation execution, completed AAR banners, command-friction rows, stabilization cooldown copy, and opportunity-dossier review deadlines now render dates instead of raw `W`, `Wk`, `S`, or `turn` strings.
- Chronicle Wrapped and Spine now render bloodiest-week, divergence, causal-depth, and scrubber labels as calendar/casual-chain copy instead of raw `Week`, `Turn`, or `T` timing.
- Settlement timelines now map control mechanisms and battle outcomes through authored labels and use neutral fallback copy for missing historical event text rather than deriving player copy from ids.

Srebrenica/Zepa lifecycle ownership is unchanged: `srebrenica_falls_1995` and `zepa_falls_1995` remain event-owned `control_change` receipts. This wave only guards settlement timeline display fallback when a historical row lacks authored text.

## Verification

- `node .\node_modules\vitest\vitest.mjs run tests\ui\presidential_decision_room.test.ts tests\ui\army_hq_timing_copy.test.ts tests\ui\command_relationship_campaign_drag_proof.test.ts tests\ui\directive_card_stop_op_action.test.ts tests\wrapped_slides.test.ts tests\ui\chronicle_causality_slides.test.ts tests\ui\chronicle_spine_scrubber.test.ts tests\settlement_timeline_provenance.test.ts tests\ui\settlement_timeline_i18n.test.ts tests\ui\president_desk_shell.test.ts --reporter=dot` passed 129/129 after the independent review found and the branch fixed the adjacent Decision Room report-loop `T{turn}` fallback.
- `npm.cmd run typecheck -- --pretty false` passed.
- `npm.cmd run qa:player-journeys` passed 107/107.
- `npm.cmd run qa:live-surface:browser` passed and verified live first-hour major-surface reachability, shell exclusivity, raw-token absence, console health, and strict-port cleanup.
- `npm.cmd run test:baselines` passed with `Baseline regression: all scenarios match.`

## Determinism / Scope

UI/read-model copy, i18n templates, tests, and docs only. No simulation logic, scenario data, Srebrenica/Zepa event ownership, save schema, generated artifacts, calibration floor, structural fingerprint, golden manifests, packaged installer artifact, randomness, timestamps, or persisted output ordering changed.
