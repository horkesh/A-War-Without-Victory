# Determinism Test Matrix (AWWV)

## Rules → Gates
### No timestamps / wall-clock values
- Gate: `tests/determinism_static_scan_r1_5.test.ts`
- Gate: `tests/scenario_harness_contracts.test.ts` (`H1.1 scenario determinism`)
- Gate: `tests/scenario_harness_contracts.test.ts` (`H2.4 scenario bots determinism`)
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Perf sidecars: `tests/scenario_timing_instrumentation.test.ts`, `tests/wall_clock_target_report.test.ts`, and `tests/profile_hotspot_report.test.ts` cover opt-in wall-clock/profile reports that stay outside deterministic saves and scenario truth artifacts.

### Stable ordering (collections, records, outputs)
- Gate: `tests/turn_pipeline_order.test.ts`
- Gate: `tests/phase_e_pressure_determinism.test.ts`
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Gate: `tests/sandbox_slice_determinism.test.ts` (slice settlements/edges/controllers canonical ordering)
- Gate: `tests/front_edges_strict_order.test.ts` (SID/OSID front-edge output uses `strictCompare`, not locale collation)

### Derived state not serialized as source of truth
- Code invariant: `src/state/serializeGameState.ts` (denylist + key ordering + wrapper rejection)
- Gate: `tests/scenario_harness_contracts.test.ts` (`H1.1 scenario determinism`)

### Byte-identical reruns from identical inputs
- Gate: `tools/scenario_runner/run_baseline_regression.ts`
- Gate: `tests/scenario_harness_contracts.test.ts` (`H1.1 scenario determinism`)
- Desktop/player comparison gate: `tools/ai_play/desktop_calibration_compare.ts` binds the actual desktop replay with `--electron-log` and `--electron-autosave`, validates scenario/faction/requested-turn provenance and the full per-turn control timeline, and compares Electron against controlled-player and headless branches from one fingerprinted startup snapshot. Its report includes per-turn and final control deltas. Electron-only recruitment, Command Authority actions, and proposals are categorized as explicit input divergence; they must not be reported as nondeterminism. Player paramilitary policy records unrestricted municipality scope separately from its mandatory undefended-only generation rule. `tests/desktop_calibration_compare.test.ts` pins the binding/provenance validation, delta reporting, action attribution, explicit non-player event mode, standing-vs-between-turn paramilitary timing, truthful target-scope metadata, and byte-identical zero-turn output. Exact determinism claims still require identical state and phase inputs.
- Opening-operation equivalence gate: `tests/desktop_start_campaign_authorization.test.ts` compares a preserved turn-0 operation with the real remove-review-accept-reinject desktop path and requires identical eligible attackers, brigade orders, battle targets, and first-turn control totals.
- Paramilitary truth gate: `tests/paramilitary_sweep.test.ts` proves offensive detection emits neither an automatic deployment nor a player request against an exactly defended OSID, any organized defender present at arrival forces dissolution without capture or defender casualties, week-21 formations dissolve before acting, every dissolution clears active readiness, and civilian killings update both casualty/event ledgers and municipality `lost_population`. Candidate and formation iteration remain explicitly sorted. `tests/control_change_attribution.test.ts` keeps paramilitary control changes in their own deterministic reporting bucket instead of combat or legacy-other attribution, and `tests/control_event_consistency.test.ts` keeps that mechanism inside the accepted control-event contract.

### Platform-stable structural fingerprint (CI determinism authority, C1 2026-06-09; v2 2026-06-16)
- **Why:** the byte-hash baselines CI job was removed 2026-05-04 because
  `final_save.json` SHA256 diverges between the Windows dev box and the Linux CI runner
  (platform float serialization). That left determinism regression with no machine signal
  on CI (`LANE-NIGHTSHIFT-PLATFORM-STABLE-MANIFEST`).
- **Replacement:** `tools/diagnostics/structural_fingerprint.cjs` fingerprints only
  MEANINGFUL, platform-stable fields of a scenario run: per-faction OSID control counts,
  sorted OSID control flips, anchor pass/fail map, and bot-benchmark tallies
  (all integers/strings/booleans). Schema v2 explicitly catches equal-count OSID control
  swaps that would leave faction totals unchanged. It DELIBERATELY excludes
  `final_save.json` byte-hash and per-faction brigade/formation counts (the latter vary
  run-to-run even at identical territory, so they are a run-snapshot artifact, not
  territory truth).
- **Gate:** CI job `structural-fingerprint` in `.github/workflows/full-suite-and-fingerprint.yml`
  runs a fresh 40w and compares against committed `data/calibration/structural_fingerprint_40w.json`
  via `npm run ci:structural-fingerprint:check`. A structural move without a deliberate
  `npm run ci:structural-fingerprint:update` fails the gate.
- **Tool self-test:** `tests/structural_fingerprint.test.ts` (determinism, order-independence,
  formation-exclusion, and positive sensitivity to control-count/OSID-flip/anchor/benchmark
  changes).
- **Reference platform = Linux/Node 22 (DoD C2):** Windows==Linux byte-hashes are NOT
  promised; the structural fingerprint IS the cross-platform determinism authority.

### Full vitest suite required on code-path PRs (stale-pin false-green closure, C1)
- Gate: CI job `full-suite` in `.github/workflows/full-suite-and-fingerprint.yml` runs
  `npm run test:vitest` (the COMPLETE suite via `vitest.config.ts`, not a slice). The
  Baseline Regression `test`/`scenarios` jobs run only the fast/scenario SLICES, so a test
  the `tools/test/discover_test_files.mjs` heuristics mis-bucket can drop from both with no
  signal. The full-suite job runs everything the config discovers, so full-suite-only pins
   (`strict_null_inventory_progress`, `war_phase_step_order`, consequence/substrate
   inventory) can no longer reach main green.
- **JNA lifecycle/presentation:** `tests/early_war_jna_transition.test.ts` pins event-backed
  `war_jna` completion and War-pipeline ownership; `tests/jna_phantom_brigades.test.ts` pins
  deterministic synthetic-command retirement after the final spawned subordinate; and
  `tests/ui/jna_synthetic_command_presentation.test.ts` pins live-command suppression without
  removing completed AAR history.

### Electron replay and player-surface hard gates
- **Exact turn:** the desktop run must finish on the requested turn with no overrun; unresolved required blockers, failed IPC calls, or active combat formations without physical `location_osid` fail the run.
- **Full surface:** the scripted tour must exercise the major command/map surfaces and finish with Records and Chronicle evidence, not only a headless final save.
- **Current map state:** map proof requires `data-map-ready="true"` for the loaded turn and save fingerprint after the required control source and formation counters render. If the player owns physically located formations, the visible counter count must be nonzero. A prior same-turn render is not proof for a replacement save. Gates: `tests/ui/map_loading_state.test.ts`, `tests/ui/map_context_lifecycle.test.ts`, and `tests/paradox_local_qa_harness.test.ts`.
- **Exact counter identity:** a QA click on a visible named DOM counter must hit-test above live occluders and open the same formation id, including on stacked OSIDs. Record at least 12 exact selections in both opening and final tours; generic map/Deck selection is not equivalent proof. Gates: `tests/ui_map_deck_counter_visibility.test.ts`, `tests/ui/formation_counter_viewport_sync.test.ts`, and the Electron replay harness.
- **Truthful stack geometry:** never relocate an off-screen/occluded formation to a viewport edge. Deterministic co-location offsets expose at most 12 visible member badges, while the complete stable member list remains reachable through the stack picker. The final Electron tour must open a named exact member from a real multi-member stack. Gates: `tests/ui/formation_counter_dom_overlay.test.ts`, `tests/ui/formation_counter_viewport_sync.test.ts`, `tests/ui/stack_expansion_overlay_viewport.test.ts`, and the Electron replay harness.
- **Decision filter/handoff identity:** category filters expose their active state and exact empty result without falling back to All; dossier Review routes from the selected card's source handoff, including grouped same-corps cards. Gates: `tests/ui/decision_room_flat_contract.test.ts`, `tests/ui/presidential_decision_room.test.ts`, and the Electron replay harness.
- **Replay startup capture:** the harness waits for the embedded tactical frame to reach network idle before dismissing the intro. Local startup navigation/chunk cancellations are failures, not teardown allowances. Gate: `tests/paradox_local_qa_harness.test.ts`.
- **Readability:** essential text must compute to at least 12px and remain unclipped without horizontal overflow at the tested viewport. Contact sheets and final screenshots are required evidence, not substitutes for runtime assertions.
- **Scrollable completion actions:** a blocking or dismissible modal's only completion action must remain outside its narrative scroll region. `tests/ui/event_modal_dismissal.test.ts` pins this for long informational events; Electron screenshot review remains required for real viewport proof.
- **Runtime:** console warnings/errors, page errors, request failures, and HTTP responses at or above 400 fail unless a narrowly named deliberate teardown/noise exception applies.
- **Replay binding:** comparator provenance must match scenario, faction, requested/final turn, initial controls, every per-turn control snapshot, and final controls before deltas are interpreted.
- **Direct harness precondition:** direct Playwright/Electron runs require the tactical Vite host to be started and HTTP-verified on port 3002. Missing-host startup timeouts are harness precondition failures, not simulation or product-runtime results.
- **Visible-surface ownership:** Electron QA must choose only visible route parents, tabs, and controls. React/Warroom may keep hidden mounted copies in the DOM; locator existence or attached state is not evidence that a player can see or activate that surface. Parent visibility, post-click destination visibility, and screenshot/state change must all be asserted.

## System-specific determinism (B1, authority, B4)
- **events_fired (B1):** Same state + seed + turn → same `report.events_fired`; RNG used only for random-event probability; registry iteration order fixed. **Test:** `tests/events_evaluate.test.ts` (trigger matching, phase/turn bounds, determinism, registry order). Baseline regression implicitly covers event path via scenario outputs.
- **Authority derivation:** `deriveMunicipalityAuthorityMap` iterates municipality IDs in sorted order; no randomness. See MILITIA_BRIGADE_FORMATION_DESIGN.md §8.1.1.
- **Coercion pressure (B4):** Read-only per turn from state; no randomness in flip threshold. Same state → same flip outcomes.

## Gaps (Explicit)
- Static scan for `Date.now` / `new Date` / `Math.random`: enforced in `tests/determinism_static_scan_r1_5.test.ts` (src/ and tools/scenario_runner/ scope).
- Explicit “no Map/Set in GameState” runtime test: covered in serializer, not a dedicated test.

## Sandbox Slice Determinism
- `src/ui/map/sandbox/sandbox_slice.ts` canonicalizes slice outputs after filtering:
  - settlements sorted by SID
  - edges canonicalized (`a <= b`) then sorted by `a:b`
  - political controller keys emitted in sorted SID order
- Gate: `tests/sandbox_slice_determinism.test.ts` (ordering + idempotence)
