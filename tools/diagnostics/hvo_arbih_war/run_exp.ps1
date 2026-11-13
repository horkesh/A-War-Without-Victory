param([string]$Tag)
$ErrorActionPreference = 'Continue'
$env:PATH = "C:\Program Files\Git\bin;" + $env:PATH
$s = "C:\Users\User\AppData\Local\Temp\claude\2402ff4cc665cee9\cccf4b51-80f9-419b-9e8c-e42900737843\scratchpad"
$out = "runs_exp_$Tag"
if (Test-Path $out) { Remove-Item -Recurse -Force $out }
npx tsx tools/scenario_runner/run_scenario_with_preflight.ts --scenario data/scenarios/apr1992_definitive_188w.json --out $out *> "$s\exp_$Tag.log"
"run exit $LASTEXITCODE"
$d = (Get-ChildItem $out -Directory)[0].FullName
Select-String -Path "$s\exp_$Tag.log" -Pattern 'final_state_hash'
node tools/verify_checkpoints.cjs $d *> "$s\exp_${Tag}_checkpoints.txt"
"checkpoints exit $LASTEXITCODE"
node tools/engine_health_gate.cjs $d --horizon 188w --strict *> "$s\exp_${Tag}_health.txt"
"health exit $LASTEXITCODE"
node "$s\hvo_arbih_metrics.cjs" $d (Get-Location).Path *> "$s\exp_${Tag}_metrics.txt"
Get-Content "$s\exp_${Tag}_checkpoints.txt" | Select -First 6
Get-Content "$s\exp_${Tag}_checkpoints.txt" | Select-String -Pattern 'FAIL|BROKEN|LOST|MISSING' | Select -First 10
Get-Content "$s\exp_${Tag}_health.txt" | Select -Last 6
Get-Content "$s\exp_${Tag}_metrics.txt" | Select -First 22
