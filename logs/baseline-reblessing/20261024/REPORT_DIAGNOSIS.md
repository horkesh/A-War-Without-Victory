# Weekly-report baseline diagnosis — 2026-10-24

## Verdict

The retained n93 and Linux CI weekly-report hashes differ because n93 was deliberately run with weekly-report diagnostics enabled. This is neither simulation nondeterminism nor a Windows/Linux serialization difference.

- retained n93: `weekly_report.jsonl`, 33,185,387 bytes, SHA-256 `08b8e8cc74f7945ac4066edbce6cddfce74c40180c6fa013a6cb6c9997637669`
- CI run `40089869017`: SHA-256 `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`
- byte projection of n93 with only the enabled diagnostic fields omitted: 2,008,722 bytes, SHA-256 `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`

The projection equals the CI hash exactly. The other seven baseline artifacts already match CI byte for byte, including `final_save.json`; no gameplay, calibration, state, ordering, or platform-dependent difference remains to explain.

## Root cause and proof

The preserved n93 launch receipt is `tmp/r8-operation-release-regression-20261024/campaign-01/launch.json`. It set:

```text
AWWV_DEBUG_REASON_CODES=movement_phase,commander_creation,battle_stack,operation_capture_ownership,mistral_tg_activation
AWWV_DEBUG_MOVEMENT_FORMATIONS=hvo_1st_guard_abb
AWWV_DEBUG_AXIS_READINESS=Mistral
AWWV_MISTRAL_PREP_TRACE=1
```

Two requested reason-code topics alter only the diagnostic projection written to `weekly_report.jsonl`:

- `movement_phase` attaches top-level `movement_phase_diagnostics` (`src/scenario/scenario_runner.ts:3371`; attachment at `src/scenario/scenario_reporting.ts:137-141`). It is present in all 188 n93 rows.
- `battle_stack` adds `attacker_brigades` and, when available, `defender_contributions` to each battle (`src/scenario/scenario_runner.ts:3322-3333`). `attacker_brigades` is present in all 517 battle rows; `defender_contributions` is present in 281.

The other preserved debug gates emit stdout-only evidence or do not add another weekly field in this run. Removing exactly those three optional fields from parsed n93 rows, preserving the existing object order and `\n` JSONL framing, removes 31,176,665 bytes and produces the exact CI hash. Removing only movement diagnostics yields `309af1b8...`; removing only battle-stack fields yields `02e38675...`; both are required to reach `b7024560...`.

Reproduction command used (read-only; it writes no file):

```powershell
node -e "const fs=require('fs'),c=require('crypto');const p='runs/apr1992_definitive_188w__6deb5845c150c196__w188_n93/weekly_report.jsonl';const raw=fs.readFileSync(p,'utf8'),rows=raw.trimEnd().split('\\n').map(JSON.parse);for(const r of rows){delete r.movement_phase_diagnostics;for(const b of r.battles||[]){delete b.attacker_brigades;delete b.defender_contributions}}const out=Buffer.from(rows.map(JSON.stringify).join('\\n')+'\\n');console.log(out.length,c.createHash('sha256').update(out).digest('hex'))"
```

Observed output:

```text
2008722 b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f
```

GitHub reports no retained artifacts for run `40089869017` (`total_count: 0`), so the raw CI file cannot be downloaded. The exact hash reconstruction is the available byte-level proof; it does not guess or normalize the comparison.

The local fixed output directory `data/derived/scenario/_baseline_tmp/apr1992_188w` exists but was empty when inspected; there is no local baseline-temp `weekly_report.jsonl` to hash or preserve. The retained n93 file remains the only available raw weekly artifact for this diagnosis.

## Production baseline invocation

Workflow `.github/workflows/baseline-pins.yml:43-55` uses Ubuntu, Node 22, `npm ci --legacy-peer-deps`, then:

```text
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

`run_baseline_regression.ts:91-104` calls `runScenario` directly with only `scenarioPath`, `outDirBase`, and `outDirOverride`. It does not enable diagnostics, save-week options, timing, video, or bot diagnostics. The manifest selects `data/scenarios/apr1992_definitive_188w.json`, whose declared duration is 188 weeks. Output is written to `data/derived/scenario/_baseline_tmp/apr1992_188w` and hashed as raw bytes.

The gated `npm.cmd run sim:scenario:run:188w` path can safely provide a comparable weekly report on Node 22 from a clean tree if all diagnostic gates are absent. Its `--unique` and `--map` options do not change weekly-row construction, although `--map` also copies the final save. It is qualification evidence, not the exact manifest writer. Gate 5 still must use `UPDATE_BASELINES=1` because `updateBaselines()` reruns the exact production producer.

This worktree is currently dirty with retained untracked evidence, so an `AWWV_S6_GRADE_RUN=true` launch here would correctly refuse before simulation. Use a clean checkout/worktree for the gated run.

## Smallest safe resolution

No source, comparison, serializer, or baseline-schema change is warranted. Rebless `weekly_report.jsonl` to the clean default-observer hash `b7024560...` together with the other seven already accepted current hashes. Do not bless n93's `08b8e8cc...`; it is a diagnostic-run artifact.

In a clean Node-22 checkout at the accepted commit, clear observer variables and disable the existing side-channel telemetry before the one authorized gated run:

```powershell
Remove-Item Env:AWWV_DEBUG_REASON_CODES,Env:AWWV_DEBUG_MOVEMENT_FORMATIONS,Env:AWWV_DEBUG_AXIS_READINESS,Env:AWWV_MISTRAL_PREP_TRACE,Env:AWWV_PLAYTEST_TELEMETRY -ErrorAction SilentlyContinue
$env:C_LANE_CORPS_DIRECTIVE_TELEMETRY_DISABLED='true'
$env:AWWV_S6_GRADE_RUN='true'
npm.cmd run sim:scenario:run:188w
```

Pass criteria: child exit 0; clean/no-override provenance; 188 weekly rows; checkpoint, protected-anchor, health, and required acceptance gates remain satisfied; weekly SHA-256 is `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f`; the seven other hashes equal run `40089869017`. Stop on any different hash or gate failure.

Then perform the owner-authorized manifest refresh with the same clean default environment:

```powershell
$env:UPDATE_BASELINES='1'
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
Remove-Item Env:UPDATE_BASELINES
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
```

The refresh invocation itself performs another exact 188-week baseline run. Expected manifest result: all eight accepted current CI hashes are written, with `weekly_report.jsonl=b7024560...`; the final ordinary invocation exits 0. Preserve the pre/post manifest diff, run output, hashes, provenance, and independent review required by the reblessing authority.

No campaign, native/package run, source edit, baseline update, normalization, or weakened comparison was performed in this diagnosis.

## Preservation-safe output isolation proposal (not implemented)

If the fixed `_baseline_tmp/apr1992_188w` path must remain untouched as an evidence binding, the smallest harness-only change is an optional `AWWV_BASELINE_TMP_ROOT` override in `run_baseline_regression.ts`:

- unset or blank: retain the current `data/derived/scenario/_baseline_tmp` path exactly;
- set: resolve the supplied root and place each scenario at `<override>/<scenario-id>`;
- on the override path only, require the scenario directory not to exist, so an evidence run cannot overwrite a prior attempt;
- use the same resolved root in both `compareAgainstBaselines()` and `updateBaselines()`; do not change artifact content, hashing, manifest shape, scenario selection, or the default CI path.

This is preferable to copying/moving the fixed directory because it makes the no-overwrite condition enforceable before the expensive run. It also avoids a separate worktree and dependency install. The override root should be a fresh attempt directory such as `tmp/baseline-rebless-20261024/baseline-refresh-01`, with a second fresh root for the post-refresh verification run.

Precise cheap tests before any campaign:

1. Resolver unit: unset and whitespace-only override return the legacy root byte-for-byte; a relative override resolves under the supplied repository root; an absolute override remains absolute.
2. Freshness unit: an override scenario directory that already exists is rejected before the injected hasher is called; a fresh override calls the hasher once with `<override>/apr1992_188w`.
3. Preservation unit: place a sentinel under the legacy `_baseline_tmp/apr1992_188w`, run `compareAgainstBaselines()` with an injected fake hasher and a fresh override, then prove the sentinel hash is unchanged and output was directed only to the override.
4. Update unit: call `updateBaselines()` with an injected fake hasher and override; prove the returned manifest hashes come from the override run and the legacy sentinel remains unchanged.
5. Existing focused regression tests: `baseline_regression_collects_all_failures.test.ts` and `baseline_regression_ci_guardrails.test.ts` stay green, including the default production invocation and `UPDATE_BASELINES=1` guardrails.
6. Static/type check for the touched harness file. No 188-week run until all six cheap gates pass.

Proposed isolated invocations after that bounded change is accepted:

```powershell
$env:AWWV_BASELINE_TMP_ROOT='tmp/baseline-rebless-20261024/baseline-refresh-01'
$env:UPDATE_BASELINES='1'
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
Remove-Item Env:UPDATE_BASELINES
Remove-Item Env:AWWV_BASELINE_TMP_ROOT
```

Then verify with a different fresh root:

```powershell
$env:AWWV_BASELINE_TMP_ROOT='tmp/baseline-rebless-20261024/baseline-verify-01'
node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts
Remove-Item Env:AWWV_BASELINE_TMP_ROOT
```

Pass criteria remain exact raw-byte hashes and a zero exit; stop before a long run if either fresh scenario directory already exists, the legacy sentinel changes, or default-path tests move.
