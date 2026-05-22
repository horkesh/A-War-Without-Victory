# COHA Expiry Operation Delivery

Date: 2026-05-22

## Scope

This closes the accepted-operation delivery blocker found after the Donji Vakuf target-trace lane. The change is narrow:

- `coha_expires_1995` now sets `coha_active: false` while preserving `coha_expired: true`.
- OSID attack resolution reports the attack-order map it actually saw through `orders_seen_by_brigade`.
- Operation combat diagnostics now distinguish pre-resolution participant attack orders from resolver-seen attack orders, resolver skip rows, and live axis current objectives.

No combat odds, OOB rows, painted targets, operation catalog predicates, or force-trajectory tuning changed.

## Root Cause

The Donji Vakuf trace showed operation participant attack orders in the bot snapshot but zero resolver battles and no resolver skip rows. A fresh diagnostic run (`n1948`, hash `150d112d2ae6958a`) proved both Donji participant rows had `resolver_seen_target_osid: null`.

The resolver boundary then exposed the real blocker: `resolveAttackOrdersOsid(...)` returns before reading attack orders when `state.military.event_flags.coha_active === true`. The final save held both `coha_active: true` and `coha_expired: true`, so the January 1995 Cessation of Hostilities Agreement never stopped suppressing combat after its expiry event.

The March event-flag plan already specified the intended lifecycle: COHA suppresses combat while active, and expiry re-enables combat. The event data set `coha_expired` but did not clear `coha_active`.

## Evidence

Fresh 188w `n1949`:

- Final hash: `8e701775661f0995`
- Final flags: `coha_active: false`, `coha_expired: true`
- Oct 1995 painted comparison: 77.0% count match, 72.4% area-weighted match

Donji Vakuf delivery changed from no resolver contact to resolved battles:

- Week 178: 4 total attack orders, 3 battles; Donji records 1 battle and 1 capture.
- Week 179: 1 total attack order, 1 battle; Donji records second capture.
- Week 180: 2 total attack orders, 2 battles; Donji records third capture.
- Week 181: 1 total attack order, 1 battle; Donji records fourth capture.
- Week 182: 2 total attack orders, 2 battles; Donji records fifth capture.

This does not complete late-war calibration. Donji still stalls before all painted target OSIDs, and Oct 1995 remains diagnostic-only. The next roadmap lanes remain Jajce/Mrkonjic/Krajina catalog delivery and force-trajectory wiring, not painted-target promotion.

## Verification

- `npx.cmd vitest run tests\event_timeline_integrity.test.ts tests\scenario_operation_diagnostics.test.ts --reporter=dot` PASS, 41/41
- `npm.cmd run typecheck` PASS
- `npm.cmd run sim:scenario:run -- --scenario data/scenarios/apr1992_definitive_188w.json --unique --map --out runs` PASS, `n1949`, hash `8e701775661f0995`
- `node tools\compare_painted_vs_sim.cjs runs\apr1992_definitive_188w__210e69404d054959__w188_n1949 --target oct1995` PASS, 72.4% area-weighted match
- `UPDATE_BASELINES=1 npm.cmd run test:baselines` refreshed the expected diagnostic weekly-report hash.
- Follow-up `npm.cmd run test:baselines` PASS

## Residuals

- Donji participant targets often reflect the just-captured objective while the post-turn operation current objective has already advanced. The new diagnostic fields make that timing visible but do not retune operation sequencing.
- Krajina collapse, Jajce arm, Juzni Potez/Mrkonjic, and force-trajectory wiring remain separate roadmap lanes.
- Oct 1995 painted RS remains diagnostic-only until those lanes close.
