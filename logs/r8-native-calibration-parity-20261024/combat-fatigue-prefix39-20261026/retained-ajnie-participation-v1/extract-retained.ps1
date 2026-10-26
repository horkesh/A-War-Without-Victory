param(
  [Parameter(Mandatory=$true)][string]$RepoRoot,
  [Parameter(Mandatory=$true)][string]$OutputPath
)
$ErrorActionPreference = 'Stop'

function Read-Json([string]$Path) {
  return (Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json)
}

function Get-NamedProperty($Object, [string]$Name) {
  if ($null -eq $Object) { return $null }
  $property = $Object.PSObject.Properties[$Name]
  if ($null -eq $property) { return $null }
  return $property.Value
}

function Select-FormationState($Save) {
  $formation = Get-NamedProperty $Save.military.formations 'rs_ajnie_brigade'
  $movementOrder = Get-NamedProperty $Save.military.brigade_movement_orders 'rs_ajnie_brigade'
  $movementState = Get-NamedProperty $Save.military.brigade_movement_state 'rs_ajnie_brigade'
  $corps = Get-NamedProperty $Save.military.corps_command 'vrs_herzegovina'
  $foca = @($corps.active_operations | Where-Object { $_.name -eq 'Operation Foca' }) | Select-Object -First 1
  [ordered]@{
    turn = $Save.meta.turn
    formation = if ($null -eq $formation) { 'UNREPORTED' } else { [ordered]@{
      id = $formation.id; status = $formation.status; readiness = $formation.readiness
      personnel = $formation.personnel; cohesion = $formation.cohesion; morale = $formation.morale
      fatigue = $formation.ops.fatigue; location_osid = $formation.location_osid
      posture = $formation.posture; home_defense_active = $formation.home_defense_active
      last_repulsed_from = $formation.last_repulsed_from
      brigade_history = $formation.brigade_history
      battle_outcome_count = $formation.battle_outcome_count
    }}
    movement_order = if ($null -eq $movementOrder) { 'UNREPORTED' } else { $movementOrder }
    movement_state = if ($null -eq $movementState) { 'UNREPORTED' } else { $movementState }
    operation = if ($null -eq $foca) { 'UNREPORTED' } else { [ordered]@{
      name=$foca.name; phase=$foca.phase; phase_started_turn=$foca.phase_started_turn
      participating_brigades=$foca.participating_brigades; axes=$foca.axes
      current_objective_index=$foca.current_objective_index
      failure_count=$foca.failure_count; consecutive_failures_on_current=$foca.consecutive_failures_on_current
      recovery_reason=$foca.recovery_reason; weekly_log=$foca.weekly_log
    }}
  }
}

function Extract-Run([string]$Label, [string]$RunPath) {
  $temporal = [System.Collections.Generic.List[object]]::new()
  foreach ($line in [System.IO.File]::ReadLines((Join-Path $RunPath 'brigade_temporal_log.jsonl'))) {
    if ($line -notmatch 'rs_ajnie_brigade') { continue }
    $row = $line | ConvertFrom-Json
    if ($row.brigade_id -eq 'rs_ajnie_brigade' -and $row.turn -ge 8 -and $row.turn -le 16) {
      $temporal.Add([ordered]@{
        turn=$row.turn; week_index=$row.week_index; lifecycle_status=$row.lifecycle_status; status=$row.status
        active_op_id=$row.active_op_id; current_op_phase=$row.current_op_phase
        personnel=$row.personnel; cohesion=$row.cohesion; morale=$row.morale; fatigue=$row.fatigue
        location_osid=$row.location_osid; mv_state=$row.mv_state; mv_destinations=$row.mv_destinations
        assigned_sub_segment_id=$row.assigned_sub_segment_id
      })
    }
  }

  $weekly = [System.Collections.Generic.List[object]]::new()
  foreach ($line in [System.IO.File]::ReadLines((Join-Path $RunPath 'weekly_report.jsonl'))) {
    $row = $line | ConvertFrom-Json
    if ($row.week_index -lt 8 -or $row.week_index -gt 16) { continue }
    $battles = @($row.battles | Where-Object {
      $_.target_osid -eq 'op:gorazde:kolovarice' -or
      [string]$_.attacker_brigades -match 'rs_ajnie_brigade' -or
      [string]$_.attacker_brigade -eq 'rs_ajnie_brigade'
    })
    $focaDiag = @($row.operation_diagnostics | Where-Object { $_.operation_name -eq 'Operation Foca' })
    $movementMentions = @()
    foreach ($candidate in @($row.movement_phase_diagnostics, $row.movement_report, $row.column_movement)) {
      if ($null -ne $candidate -and (($candidate | ConvertTo-Json -Depth 15 -Compress) -match 'rs_ajnie_brigade')) {
        $movementMentions += $candidate
      }
    }
    if ($battles.Count -gt 0 -or $focaDiag.Count -gt 0 -or $movementMentions.Count -gt 0) {
      $weekly.Add([ordered]@{
        turn=$row.week_index; battles=$battles; foca_operation_diagnostics=$focaDiag
        ajnie_movement_mentions=if($movementMentions.Count -eq 0){'UNREPORTED'}else{$movementMentions}
      })
    }
  }

  $aars = Read-Json (Join-Path $RunPath 'operation_aars.json')
  $focaAar = @($aars | Where-Object { $_.operation_name -eq 'Operation Foca' }) | Select-Object -First 1
  $watched = Read-Json (Join-Path $RunPath 'watched_operations.json')
  $watchedFoca = @($watched | Where-Object { ($_ | ConvertTo-Json -Depth 10 -Compress) -match 'Operation Foca|rs_ajnie_brigade' })
  [ordered]@{
    label=$Label; run_path=$RunPath
    temporal_turns_8_16=$temporal
    weekly_turns_8_16=$weekly
    foca_aar=if($null -eq $focaAar){'UNREPORTED'}else{$focaAar}
    watched_foca=if($watchedFoca.Count -eq 0){'UNREPORTED'}else{$watchedFoca}
    save_w15=Select-FormationState (Read-Json (Join-Path $RunPath 'save_w15.json'))
    save_w16=Select-FormationState (Read-Json (Join-Path $RunPath 'save_w16.json'))
  }
}

$newRun = Join-Path $RepoRoot 'runs/player-parity-fatigue-owner-39-20261026-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0'
$parentRun = Join-Path $RepoRoot 'runs/player-parity-postturn-39-20261025-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0'
$reasonSource = Join-Path $RepoRoot 'src/sim/combat/reason_code_debug.ts'
$attackSource = Join-Path $RepoRoot 'src/sim/combat/attack_resolution_osid.ts'
$configPath = Join-Path $RepoRoot 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/CONFIG.bound.v2.json'
$reasonLines = Get-Content -LiteralPath $reasonSource
$attackLines = Get-Content -LiteralPath $attackSource
$reasonHits = for($i=0;$i -lt $reasonLines.Count;$i++){if($reasonLines[$i] -match 'battle_power|console\.|stdout'){[ordered]@{line=$i+1;text=$reasonLines[$i]}}}
$attackHits = for($i=0;$i -lt $attackLines.Count;$i++){if($attackLines[$i] -match "whenReasonCodeTopic\('battle_power'|power_breakdown"){[ordered]@{line=$i+1;text=$attackLines[$i]}}}
$config = Read-Json $configPath
$streamPaths = @(
  (Join-Path (Split-Path $configPath -Parent) 'actual-attempt-01/stdout.log'),
  (Join-Path (Split-Path $configPath -Parent) 'actual-attempt-01/stderr.log')
)
$markerCount = 0
foreach($stream in $streamPaths){if(Test-Path -LiteralPath $stream){$markerCount += @((Select-String -LiteralPath $stream -SimpleMatch '[battle_power]' -ErrorAction SilentlyContinue)).Count}}

$evidence = [ordered]@{
  schema='retained-ajnie-participation-v1'
  generated_utc=(Get-Date).ToUniversalTime().ToString('o')
  scope='retained artifacts and source inspection only; no simulation, API, or source edit'
  runs=@(
    (Extract-Run 'candidate_0278c956' $newRun),
    (Extract-Run 'parent_33f39' $parentRun)
  )
  battle_power_observability=[ordered]@{
    configured_reason_codes=$config.diagnostic_environment.AWWV_DEBUG_REASON_CODES
    retained_stream_marker='[battle_power]'
    retained_stream_marker_count=$markerCount
    reason_code_source=[ordered]@{path=$reasonSource;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $reasonSource).Hash.ToLower();hits=$reasonHits}
    attack_resolution_source=[ordered]@{path=$attackSource;sha256=(Get-FileHash -Algorithm SHA256 -LiteralPath $attackSource).Hash.ToLower();hits=$attackHits}
    finding='battle_power gates power_breakdown fields on retained battle records; inspected source defines no battle_power stdout emitter'
  }
  missing_records=@(
    'No retained pre-resolution T14 per-axis eligibility/rejection decision names rs_ajnie_brigade.',
    'No retained save between T10 and T14; save_w15/save_w16 are post-T14.',
    'Absent movement_order/movement_state properties are recorded as UNREPORTED, not inferred as rejected.'
  )
}
$json = $evidence | ConvertTo-Json -Depth 30
[System.IO.File]::WriteAllText($OutputPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Output ('WROTE ' + $OutputPath)
