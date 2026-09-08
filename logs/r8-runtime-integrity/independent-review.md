# BC09 Phase 1 independent Systems/QA review

**Reviewer:** independent Sol/medium Systems/QA seat
**Review state:** NEEDS CORRECTION (initial pass, 2026-09-08)
**Scope:** current BC09 Phase 1 diff only; read-only review except this receipt. No campaign, structural-fingerprint check, source-data change, production edit, or repeated validation run.

## Blocking findings

1. **P1 — the explicit minimal-fixture contract is not selectable at an actual entrypoint.**
   `EXPLICIT_MINIMAL_FIXTURE_TURN_INPUT_REQUIREMENTS` is declared at
   `src/scenario/turn_inputs.ts:64-70`, but its only caller is the direct helper test at
   `tests/shared_turn_inputs_contract.test.ts:124-133`. `buildScenarioStartupState`
   always selects `scenarioProductionTurnInputRequirements` at
   `src/scenario/scenario_runner.ts:1562-1568`, and the scenario entrypoint exposes no
   explicit fixture profile. The helper-only assertion therefore does not prove the
   requested production-versus-fixture boundary or preserve intentionally incomplete
   scenario fixtures through their real entrypoint.

2. **P1 — required-input row validation is incomplete.**
   The contract promises rejection for an invalid required row, but mixed valid and
   invalid files can pass:
   - numeric municipality rows without `mun1990_id` are silently skipped at
     `src/scenario/turn_inputs.ts:168-171`;
   - malformed census rows are silently skipped when at least one positive row remains
     at `src/scenario/turn_inputs.ts:198-204`;
   - malformed ethnicity entries can become SID rows without ethnicity at
     `src/scenario/turn_inputs.ts:221-235`;
   - invalid HQ entries are filtered while valid siblings survive at
     `src/scenario/oob_loader.ts:373-378`.
   The current structural suite replaces a whole file with `[]`
   (`tests/shared_turn_inputs_contract.test.ts:152-166`), so it cannot detect these
   mixed-row cases. Census zero-population rows are valid existing data and may remain
   filtered from the positive-population output; structural validation must distinguish
   a finite non-negative zero from a malformed row.

## Required targeted correction evidence

- Bind the named explicit-minimal profile to the scenario startup entrypoint through a
  test-only/fixture construction option that defaults to production; do not make it a
  gameplay or data-authored escape hatch.
- Compare the real `buildScenarioStartupState(...)` prepared values with
  `loadSharedTurnInputs(...)` for the same valid source set, including both municipality
  key schemes, stable ASCII SID order, historical name/corps/OOB-ID lookups, HQ mapping,
  and unchanged supplied OOB/HQ objects.
- Add mixed-valid-plus-invalid row cases for municipality, census, ethnicity, OOB,
  registry, and HQ required files. Require file-specific errors. Preserve valid census
  zero rows and existing source values.
- Retain the actual desktop IPC negative controls: failure before turn mutation,
  canonical save write, and broadcast, plus the valid +1-turn positive control and exact
  canonical bytes versus untouched `03d039df2`.
- Update the stale module comment at `src/scenario/turn_inputs.ts:18-22`, which still
  describes swallow-to-`undefined` pure extraction after this fail-closed change.

## Evidence reviewed

- `logs/r8-runtime-integrity/bc09-focused-tests.log`: 4 files / 28 tests passed,
  exit 0. This receipt does not cover the entrypoint fixture or mixed-row gaps above.
- `logs/r8-runtime-integrity/live-ipc-03.log`: 19/19 boundary controls passed, tool exit
  0; valid advance emitted state/report/replay and the canonical output matched the
  untouched one-turn baseline SHA-256
  `dfd6a3da3a5c03e5eaa3b0a5960ae7279604b3cddcd0498f1249d07ac8752547`.
  Earlier live01/live02 receipts are superseded and were not used for acceptance.
- `logs/r8-runtime-integrity/bc09-desktop-sim-build-registry-fix.log`:
  `desktop:sim:build` passed.
- `logs/r8-runtime-integrity/bc09-typecheck-final.log`: failed with TS2322 in the new
  test fixture at the time of this review. A clean replacement receipt is required;
  this log is not a pass.
- `logs/r8-runtime-integrity/pre-fingerprint.json`: pre-edit inventory exists (1,299
  sources / 15 inputs). No structural-fingerprint campaign was run.

## Canon, determinism, and scope mapping

Validated demographic delivery supports population-constrained recruitment rather than
bypassing it (Game Bible §§10-11; Rulebook §10.1; Systems Manual §§12-13). Stable ASCII
SID and historical-name ordering are required by Code Canon's stable-order and
byte-identical rerun contract, Engine Invariants §§11.3-11.4, and the Determinism Test
Matrix stable-order/byte-identity gates. Failures before mutation preserve the canonical
turn pipeline boundary and Engine Invariant §11.5 desktop durability. The reviewed diff
does not add randomness, timestamps, state schema, control writers, calibration data, or
new mechanics. No separate canon conflict was found; acceptance is blocked by the two
contract/coverage gaps above.

The applicable long-run and final packaged gates remain deferred, not waived. This
review does not authorize BC07 policy, BC10, a campaign, regeneration, push, or release.

## Targeted correction verification and final verdict

**Final review state: GO for the bounded BC09 Phase 1 local packet (2026-09-08).**

The single correction pass resolves both initial P1 findings:

- `buildScenarioStartupState` now accepts an explicit construction-only
  `sharedTurnInputRequirements` option while defaulting to the production scenario
  profile. It is not persisted in scenario data. Real-builder tests select the minimal
  profile with all six shared files absent, and compare the real scenario startup result
  with the desktop production loader for both municipality key schemes.
- Required numeric-municipality, settlement-census, settlement-ethnicity, historical
  OOB, registry, and municipality-HQ rows now fail on mixed valid/invalid structures with
  file-specific errors. Ethnicity composition is required and its four consumed values
  are validated. The loader reads fresh ethnicity JSON on each preparation, so a valid
  read cannot mask a later invalid file and a corrected file recovers after failure.
  Census zero-population rows remain valid and retain their established output filtering.
- Scenario startup supplies its already-loaded OOB and HQ values to the shared preparer;
  source arrays/maps remain caller-owned. Historical name/corps/OOB-ID lookup semantics
  and strict ASCII SID/name ordering are preserved. The stale extraction comment was
  corrected.

Superseding evidence reviewed:

- `bc09-final3-focused.log`: 40/40 tests passed in four files, exit 0, including 29
  shared-input cases, actual entrypoint parity, explicit fixture omission, mixed-row
  failures, fresh-read/recovery regressions, prerequisites, deterministic turn behavior,
  and production-caller mutation handling.
- `bc09-final4-typecheck.log`: TypeScript check passed, exit 0. This supersedes the
  retained earlier failed typecheck receipts.
- `bc09-final4-desktop-build.log`: desktop simulation bundle and startup snapshot check
  passed, exit 0.
- `live-ipc-06/result.json` and `live-summary.json`: 25/25 actual Electron IPC cases
  passed, tool exit 0. The 24 negative cases (six files by missing, malformed,
  structurally invalid, and mixed-invalid-row modes) preserved runtime state, canonical
  save bytes, and zero broadcasts. The valid control advanced turn 0 to 1, emitted
  state/report/replay, changed the save, and matched untouched `03d039df2` canonical
  bytes at SHA-256
  `dfd6a3da3a5c03e5eaa3b0a5960ae7279604b3cddcd0498f1249d07ac8752547`.
  The fresh bundle SHA-256 is
  `851e3a065b6ef31bbfd6930a3ec0289f49a1a87bf4105661e2e85320c81267ac`;
  all 21 copied production input hashes match their sources.
- `post-fingerprint.json`: the bounded source/input inventory remains 1,299 sources and
  15 inputs with the input digest unchanged from the pre-edit capture. This is an
  inventory receipt, not a campaign claim.
- `final-evidence-check.log`: exit 0; four permitted production sources and seven
  evidence links resolve. The five existing continuity documents are synchronized and
  correctly keep campaign/final packaged acceptance deferred rather than waived.

No determinism risks found under Code Canon's stable-order and byte-identical rerun
contract, Engine Invariants §§11.3-11.5, and the Determinism Test Matrix stable-order,
byte-identity, and Electron durability gates. No canon conflict found under Game Bible
§§10-11 and §§17-18, Rulebook §10.1, Systems Manual §§12-13, and War Specification
§§3/8: this packet validates and equalizes existing demographic/OOB/HQ inputs without
changing source data, state schema, turn ownership, mechanics, or historical policy.

This GO is intentionally bounded. BC09 is not globally closed: applicable long-run and
final packaged three-faction acceptance remain deferred, not waived. BC07 retains the
stability-data disposition; BC10 remains planned. No campaign, structural-fingerprint
check, regeneration, remote push, publication, or release is authorized by this review.
