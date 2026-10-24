# Retained update qualifier command

Run once from the repository root. The command is read-only outside its fresh evidence directory and has a three-minute cap. It does not invoke the scenario producer.

```powershell
$node = (Get-Command node).Source
$head = (git rev-parse HEAD).Trim().ToLower()
$packet = 'tmp/baseline-rebless-20261024'
$attempt = "$packet/update-qualification-01"
$allowed = @(
  'QUALIFICATION.json',
  'DIAGNOSIS.md',
  'protected-vs-n91.json',
  'protected-vs-n92.json'
)
$tasks = @('checkpoints','consistency','health','protected-vs-n91','protected-vs-n92')
foreach ($task in $tasks) {
  $allowed += "$task.stdout.log","$task.stderr.log","$task.execution.json"
}
$packetArgs = @(
  'tools/diagnostics/run_preserved_preflight.cjs',
  '--attempt-dir',$attempt,
  '--entry-script',"$packet/qualify_retained_update.cjs",
  '--timeout-ms','180000'
)
foreach ($file in $allowed) { $packetArgs += '--allow-artifact',$file }
$packetArgs += @(
  '--',$node,"$packet/qualify_retained_update.cjs",'{evidenceDir}',
  '--expected-head',$head,
  '--old-manifest-sha','67774c275f206633a931d1d1aa3990336d1dd0e0877ebaaf924feb6f75378888',
  '--preservation-inventory','logs/baseline-reblessing/20261024/PRESERVATION_BEFORE.json',
  '--source-snapshot',"$packet/campaign-01/source-after.json",
  '--n94-inventory',"$packet/n94-before-update.json",
  '--update-attempt',"$packet/update-01",
  '--owner-authorized-once'
)
& $node @packetArgs
```

Pass requires process exit 0, preserved-preflight `wrapper_exit: 0`, `QUALIFICATION.json` `pass: true`, and no listed failure categories. Preserve the original `update-01` RED receipt unchanged.
