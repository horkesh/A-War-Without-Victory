# Baseline rebless execution packet — bounded delta

## Frozen scope

This packet performs two separately stopped stages after the root plan/helper freeze commit:

1. one clean Node-22 188-week qualification run using the exact n93 debug profile and save-week inventory, followed by the existing n91/n92, checkpoint, health, consistency, protected-history, native-producer, movement, and dynamic candidate readers under one 35-minute deadline;
2. only after stage 1 is GO, one direct `UPDATE_BASELINES=1` invocation with all optional diagnostics forced off, also capped at 35 minutes.

No gameplay/calibration tuning, production harness repair, comparator normalization, native/package work, automatic retry, or second unchanged run is included. The fixed `data/derived/scenario/_baseline_tmp/apr1992_188w` directory exists but is empty; both launchers recursively reject any existing file there while allowing empty directories. The earlier optional output-root proposal in `REPORT_DIAGNOSIS.md` is superseded for this packet.

The root freeze commit supplies `--expected-head` at runtime. Nothing hardcodes the pre-freeze commit. Both stages require a completely clean Git status and `--owner-authorized-once`.

## Cheap gates before stage 1

Question: do the evidence-local scripts parse and reject unsafe inputs without starting a scenario?

Commands:

```powershell
$packet = 'tmp/baseline-rebless-20261024'
Get-ChildItem $packet -Filter '*.cjs' | Sort-Object Name | ForEach-Object { node --check $_.FullName; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
node "$packet/packet_selftest.cjs"
git status --short
```

Pass: every syntax check exits 0, self-test exits 0, and the post-freeze status is empty. Cost: seconds. Stop on any failure. The self-test retains its fixture attempt under `selftest-fixtures/`.

Before the long run, refresh `logs/baseline-reblessing/20261024/PRESERVATION_BEFORE.json` after these helpers are final. It must retain the original 3,210 authoritative rows verbatim and add the 16 exact ignored-helper rows (3,226 bindings total). Both telemetry rows are append-only in both stages, so their old prefixes must remain exact; all other listed files are exact except the manifest after the authorized update.

Freeze a separate `logs/baseline-reblessing/20261024/PACKET_DEPENDENCIES.json` containing byte counts and raw SHA-256 values for exactly these five runtime scripts: `campaign_entry.cjs`, `baseline_update_entry.cjs`, `packet_common.cjs`, `postrun_entry.cjs`, and `evaluate_candidate.cjs`. The preserved-preflight snapshot binds the invoked entry script, while each entry verifies its imported packet dependencies and writes `dependency-verification.json` before any child launch. Archive the five scripts and this dependency inventory together under the same logs packet.

## Stage 1 — qualification campaign plus readers

Question: does the clean frozen commit reproduce the accepted n93 gameplay and full retained evidence, and does removal of only the three diagnostic projections reconstruct CI weekly bytes?

Pass criteria enforced by the wrappers:

- HEAD equals the runtime `--expected-head`; Git is clean; Node major is 22; no provenance override.
- `AWWV_S6_GRADE_RUN=true`; exact n93 debug topics/selectors and save weeks; one invocation and exactly one new unique run.
- child exit 0 within the shared 35-minute campaign/reader deadline.
- candidate `run_meta`: `git_dirty === false`, exact commit, exactly 32 consumed inputs, exact recomputed digest, and all current normalized hashes exact.
- checkpoint scores at least 707/707/706/706, zero formerly-correct losses against both n91 and n92, only the accepted Toljenak delta against n91 at the accepted turns, and zero shared deltas against n92.
- native 40-file inventory/save bindings, Toljenak t135 battle/event/diagnostic/AAR, retained Toljenak control, 16 protected anchors, retained Prisoje/Donji Vrbljani HVO battle/event outcomes.
- the seven non-weekly candidate artifacts match their accepted CI SHA-256 values byte-for-byte; the weekly artifact matches the accepted CI hash only through the separately recorded diagnostic projection.
- existing checkpoint, consistency, health, n91/n92 protected-campaign gates, native producer proof, control timelines, and 188-turn movement coverage all exit 0.
- diagnostic weekly has 188 movement blocks, 517 `attacker_brigades`, and 281 `defender_contributions`; removing exactly those fields yields SHA-256 `b7024560561a2e8eceae114c77b6003d939163d81971e9f610842f2e90de296f` without mutating the candidate file or comparator.
- tracked source remains byte-identical, old preservation bindings remain exact, both telemetry old prefixes remain exact with append sizes recorded, and the fixed baseline target stays empty.

Preserved-preflight invocation pattern (PowerShell; use a fresh attempt and the frozen inventory path):

```powershell
$node = (Get-Command node).Source
$head = (git rev-parse HEAD).Trim().ToLower()
$packet = 'tmp/baseline-rebless-20261024'
$attempt = "$packet/campaign-01"
$inventory = 'logs/baseline-reblessing/20261024/PRESERVATION_BEFORE.json'
$dependencies = 'logs/baseline-reblessing/20261024/PACKET_DEPENDENCIES.json'
$allowed = @(
  'dependency-verification.json',
  'baseline-target-before.json','baseline-target-after.json',
  'preservation-before.json','preservation-after.json',
  'source-before.json','source-after.json',
  'campaign-launch.json','campaign-execution.json','packet-summary.json',
  'postrun/evaluation.json',
  'postrun/timeline-vs-n91.json','postrun/timeline-vs-n92.json',
  'postrun/protected-vs-n91.json','postrun/protected-vs-n92.json',
  'postrun/summary.json'
)
$tasks = @('evaluation','timeline-vs-n91','timeline-vs-n92','checkpoints','consistency','health','protected-vs-n91','protected-vs-n92','producer','movement')
foreach ($task in $tasks) {
  $allowed += "postrun/$task.stdout.log","postrun/$task.stderr.log","postrun/$task.execution.json"
}
$args = @(
  'tools/diagnostics/run_preserved_preflight.cjs',
  '--attempt-dir',$attempt,
  '--entry-script',"$packet/campaign_entry.cjs",
  '--timeout-ms','2100000'
)
foreach ($file in $allowed) { $args += '--allow-artifact',$file }
$args += '--',$node,"$packet/campaign_entry.cjs",'{evidenceDir}',
  '--expected-head',$head,
  '--preservation-inventory',$inventory,
  '--dependency-inventory',$dependencies,
  '--owner-authorized-once'
& $node @args
```

Expected cost: at most 35 minutes, enforced by both the packet and the outer preserved preflight. Stopping rule: any nonzero child/wrapper/category, timeout, second/new extra run, preservation mismatch, source movement, provenance mismatch, acceptance loss, or projection mismatch ends the packet. Do not retry unchanged.

## Stage 2 — default-observer baseline update

Entry condition: stage 1 `packet-summary.json` and `postrun/summary.json` both say `pass: true`, the projection hash is exact, independent review accepts the packet, and Git is again clean at the frozen HEAD. Capture/freeze the old manifest SHA-256 before invocation.

Question: does the exact production baseline producer write only the eight accepted CI hashes while all simulation/source/provenance and preserved bindings remain exact?

The update wrapper enforces:

- exact HEAD, exact old manifest prehash, clean Git, Node 22, one authorized invocation;
- recursively empty fixed baseline target before launch;
- optional debug/playtest diagnostics absent, normal C/D telemetry retained, `AWWV_S6_GRADE_RUN=true`, and no provenance override;
- exact production command `node node_modules/tsx/dist/cli.mjs tools/scenario_runner/run_baseline_regression.ts` with `UPDATE_BASELINES=1`;
- all eight hashes changed and equal the accepted CI values; no manifest field other than those eight values changes;
- target artifact hashes equal the manifest; run provenance records the expected commit, `git_dirty === false`, 32 exact inputs, and an exact digest;
- tracked files outside the manifest stay byte-identical; both telemetry streams retain their exact old prefixes and record append sizes; all other old inventory bindings outside the manifest stay byte-identical; final tracked status is exactly the modified manifest.

Invocation pattern:

```powershell
$node = (Get-Command node).Source
$head = (git rev-parse HEAD).Trim().ToLower()
$packet = 'tmp/baseline-rebless-20261024'
$attempt = "$packet/update-01"
$inventory = 'logs/baseline-reblessing/20261024/PRESERVATION_BEFORE.json'
$dependencies = 'logs/baseline-reblessing/20261024/PACKET_DEPENDENCIES.json'
$manifestSha = '<FROZEN_PRE_UPDATE_MANIFEST_SHA256>'
$allowed = @(
  'dependency-verification.json',
  'baseline-target-before.json','preservation-before.json','preservation-after.json',
  'update-launch.json','update-execution.json','update-result.json'
)
$args = @(
  'tools/diagnostics/run_preserved_preflight.cjs',
  '--attempt-dir',$attempt,
  '--entry-script',"$packet/baseline_update_entry.cjs",
  '--timeout-ms','2100000'
)
foreach ($file in $allowed) { $args += '--allow-artifact',$file }
$args += '--',$node,"$packet/baseline_update_entry.cjs",'{evidenceDir}',
  '--expected-head',$head,
  '--expected-manifest-sha',$manifestSha,
  '--preservation-inventory',$inventory,
  '--dependency-inventory',$dependencies,
  '--owner-authorized-once'
& $node @args
```

Expected cost: at most 35 minutes, enforced by both wrappers. Stop on any mismatch or nonzero exit. Do not launch the update before stage 1 review and the recorded GO.

## Plan delta suggestions

- Replace the proposed diagnostics-off qualification campaign with the n93-profile campaign because the strongest existing Toljenak/HVO/native-producer readers require those receipts. The default-observer claim is proven by the exact non-mutating projection audit before pinning.
- Retain default-observer conditions for the actual baseline writer. Its output is the CI profile being blessed.
- Remove the proposed production `AWWV_BASELINE_TMP_ROOT` repair. The fixed target is empty, and packet-local wrappers now enforce recursive freshness plus before/after preservation.
- Treat the campaign and update as separate stop points. A GO campaign authorizes review of the update stage; it does not make an update failure retryable.
- Keep report/board/roadmap/ledger closeout after the update evidence settles. This packet produces evidence only.
