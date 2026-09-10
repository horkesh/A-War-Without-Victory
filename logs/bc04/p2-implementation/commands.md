# BC04 P2 implementation commands

All commands ran from `F:\A-War-Without-Victory` on Node 22.23.2.

| Purpose | Literal command | Exit | Evidence |
|---|---|---:|---|
| Pre-change RED wave | `npx.cmd vitest run tests/events_evaluate.test.ts tests/event_loader.test.ts tests/pressure_system.test.ts tests/event_timeline_integrity.test.ts tests/ui/chronicle_spine_scrubber.test.ts tests/ui/chronicle_focus_routing.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui/decision_consequence_records_panel.test.ts` | 1 (expected) | `prechange-regressions.log` |
| Final focused affected set | `npx.cmd vitest run tests/event_timeline_integrity.test.ts tests/event_loader.test.ts tests/events_evaluate.test.ts tests/pressure_system.test.ts tests/enclave_formation_displacement.test.ts tests/turn_pipeline.test.ts tests/event_conditions.test.ts tests/integration_event_system.test.ts tests/ui/settlement_timeline_i18n.test.ts tests/ui/chronicle_spine_scrubber.test.ts tests/ui/chronicle_focus_routing.test.ts tests/ui/decision_consequence_records_panel.test.ts` | 0 (187/187) | `focused-tests-final.log` |
| Missing-parent reviewer regression | `npx.cmd vitest run tests/events_evaluate.test.ts` | 0 (45/45) | `missing-parent-regression.log` |
| Final Chronicle correction | `npx.cmd vitest run tests/ui/chronicle_focus_routing.test.ts` | 0 (3/3) | `chronicle-final3.log` |
| Typecheck after final correction | `npm.cmd run typecheck` | 0 | `typecheck-final3.log` |
| Tactical map build after final correction | `npm.cmd run desktop:map:build` | 0 (1,378 modules) | `desktop-map-build-final.log` |
| Desktop simulation/startup snapshot build | `npm.cmd run desktop:sim:build` | 0 | `desktop-sim-build.log` |
| Warroom build | `npm.cmd run warroom:build` | 0 (664 modules) | `warroom-build.log` |
| Scope/catalog/HEAD/lock preservation | `node logs/bc04/p2-implementation/verify-preservation.cjs` | 0 | `preservation-final.log` |
| Whitespace/error check | `git diff --check -- <scoped production and test files>` | 0 | `diff-check.exitcode` |

Intermediate failing logs record the targeted correction path and are not final gate results. No scenario or campaign command ran.
