param(
  [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = 'Stop'
function Read-Json([string]$Relative) {
  $path = [IO.Path]::Combine($RepoRoot, $Relative.Replace('/', [IO.Path]::DirectorySeparatorChar))
  return Get-Content -LiteralPath $path -Raw | ConvertFrom-Json
}
function Relative-Path([string]$Relative) {
  return [IO.Path]::Combine($RepoRoot, $Relative.Replace('/', [IO.Path]::DirectorySeparatorChar))
}
function Sha256-Text([string]$Text) {
  $bytes = [Text.Encoding]::UTF8.GetBytes($Text)
  $hash = [Security.Cryptography.SHA256]::HashData($bytes)
  return [Convert]::ToHexString($hash).ToLowerInvariant()
}
function Get-Controller($Map, [string]$Id) {
  $prop = $Map.psobject.Properties[$Id]
  if ($null -eq $prop) { return $null }
  return $prop.Value
}
function Get-Stranded($Save) {
  $active = [Collections.Generic.HashSet[string]]::new()
  foreach ($corp in $Save.military.corps_command.psobject.Properties.Value) {
    foreach ($op in @($corp.active_operations)) {
      foreach ($id in @($op.participating_brigades)) { [void]$active.Add([string]$id) }
      foreach ($axis in @($op.axes)) {
        foreach ($id in @($axis.assigned_brigades)) { [void]$active.Add([string]$id) }
      }
    }
  }
  $ids = foreach ($formation in $Save.military.formations.psobject.Properties.Value) {
    if (($formation.stranded_status -eq 'holding' -or $formation.stranded_status -eq 'reconnected') -and
        $formation.lifecycle_status -ne 'destroyed' -and
        $formation.status -ne 'inactive' -and
        -not $active.Contains([string]$formation.id)) {
      [string]$formation.id
    }
  }
  return @($ids | Sort-Object)
}
function Read-WeeklyBattles([string]$Relative, [string]$Target) {
  $rows = [Collections.Generic.List[object]]::new()
  foreach ($line in Get-Content -LiteralPath (Relative-Path $Relative)) {
    $week = $line | ConvertFrom-Json
    foreach ($battle in @($week.battles)) {
      if ($battle.target_osid -eq $Target) {
        $rows.Add([ordered]@{ week = $week.week_index; battle = $battle })
      }
    }
  }
  return @($rows)
}
function Get-CombatBoundary($Save) {
  $malformed = [Collections.Generic.List[object]]::new()
  $actorMismatches = [Collections.Generic.List[object]]::new()
  $combatCount = 0
  foreach ($event in @($Save.political.control_events)) {
    $missing = @()
    foreach ($field in @('settlement_id','from','to','turn','mechanism')) {
      if ($null -eq $event.$field -or ($event.$field -is [string] -and $event.$field.Length -eq 0)) { $missing += $field }
    }
    if ($missing.Count -gt 0) {
      $malformed.Add([ordered]@{ settlement_id=$event.settlement_id; turn=$event.turn; missing=$missing })
    }
    if ($event.mechanism -eq 'combat') {
      $combatCount++
      $actorId = [string]$event.attacker_brigade
      $formationProp = $Save.military.formations.psobject.Properties[$actorId]
      $actorFaction = if ($null -ne $formationProp) { $formationProp.Value.faction } else { $null }
      if ([string]::IsNullOrEmpty($actorId) -or $null -eq $formationProp -or $actorFaction -ne $event.to) {
        $actorMismatches.Add([ordered]@{ settlement_id=$event.settlement_id; turn=$event.turn; to=$event.to; attacker_brigade=$actorId; actor_faction=$actorFaction })
      }
    }
  }
  return [ordered]@{
    event_count = @($Save.political.control_events).Count
    combat_event_count = $combatCount
    malformed_required_field_events = @($malformed)
    combat_actor_faction_mismatches = @($actorMismatches)
  }
}
function Read-BattlePowerTrace([string]$RelativeStdout, [string]$RelativeStderr) {
  $stdoutPath = Relative-Path $RelativeStdout
  $stderrPath = Relative-Path $RelativeStderr
  $markerCount = 0
  $koreniciT34 = [Collections.Generic.List[object]]::new()
  foreach ($line in Get-Content -LiteralPath $stdoutPath) {
    if ($line.StartsWith('[battle_power] ')) {
      $markerCount++
      try { $row = $line.Substring($line.IndexOf('{')) | ConvertFrom-Json } catch { continue }
      if ($row.turn -eq 34 -and $row.target_osid -eq 'op:donji_vakuf:korenici') { $koreniciT34.Add($row) }
    }
  }
  return [ordered]@{
    requested_reason_code = 'battle_power'
    stderr_bytes = (Get-Item -LiteralPath $stderrPath).Length
    stdout_battle_power_marker_count = $markerCount
    korenici_turn34_battle_power_records = @($koreniciT34)
    conclusion = if ((Get-Item -LiteralPath $stderrPath).Length -eq 0 -and $markerCount -eq 0) { 'ABSENT_FROM_RETAINED_STREAMS__NO_POWERS_RATIO_OR_ACTOR_CLAIMED' } else { 'RECORDED' }
  }
}
$paths = [ordered]@{
  reference = 'data/source/calibration/painted_control_jan1993.json'
  new_final = 'runs/player-parity-fatigue-owner-39-20261026-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0/final_save.json'
  new_weekly = 'runs/player-parity-fatigue-owner-39-20261026-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0/weekly_report.jsonl'
  parent_final = 'runs/player-parity-postturn-39-20261025-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0/final_save.json'
  parent_weekly = 'runs/player-parity-postturn-39-20261025-01/apr1992_definitive_188w__2272e1011ba35428__w39_n0/weekly_report.jsonl'
  n101_w39 = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n101/save_w39.json'
  n102_w39 = 'runs/apr1992_definitive_188w__6deb5845c150c196__w188_n102/save_w39.json'
  result = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/actual-attempt-01/result.json'
  scoring = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/actual-attempt-01/postrun/scoring.json'
  health_stdout = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/actual-attempt-01/postrun/health.stdout.log'
  campaign_stdout = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/actual-attempt-01/campaign.stdout.log'
  campaign_stderr = 'tmp/player-bot-capability-parity-20261024/combat-fatigue-prefix39-20261026-v1/actual-attempt-01/campaign.stderr.log'
}
$reference = Read-Json $paths.reference
$newSave = Read-Json $paths.new_final
$parentSave = Read-Json $paths.parent_final
$n101Save = Read-Json $paths.n101_w39
$n102Save = Read-Json $paths.n102_w39
$result = Read-Json $paths.result
$scoring = Read-Json $paths.scoring
$ids = @($reference.by_settlement_id.psobject.Properties.Name | Sort-Object)
$newMap = $newSave.political.political_controllers
$parentMap = $parentSave.political.political_controllers
$newMismatch = [Collections.Generic.List[object]]::new()
$parentMismatch = [Collections.Generic.List[object]]::new()
$mapDelta = [Collections.Generic.List[object]]::new()
$newCanonical = [ordered]@{}
$parentCanonical = [ordered]@{}
foreach ($id in $ids) {
  $expected = Get-Controller $reference.by_settlement_id $id
  $newValue = Get-Controller $newMap $id
  $parentValue = Get-Controller $parentMap $id
  $newCanonical[$id] = $newValue
  $parentCanonical[$id] = $parentValue
  if ($newValue -ne $expected) { $newMismatch.Add([ordered]@{ id=$id; actual=$newValue; expected=$expected }) }
  if ($parentValue -ne $expected) { $parentMismatch.Add([ordered]@{ id=$id; actual=$parentValue; expected=$expected }) }
  if ($newValue -ne $parentValue) { $mapDelta.Add([ordered]@{ id=$id; parent=$parentValue; new=$newValue; expected=$expected }) }
}
$kolovarice = 'op:gorazde:kolovarice'
$newKolEvents = @($newSave.political.control_events | Where-Object { $_.settlement_id -eq $kolovarice })
$parentKolEvents = @($parentSave.political.control_events | Where-Object { $_.settlement_id -eq $kolovarice })
$sets = [ordered]@{}
foreach ($entry in @(
  [ordered]@{name='new'; save=$newSave},
  [ordered]@{name='parent'; save=$parentSave},
  [ordered]@{name='n101'; save=$n101Save},
  [ordered]@{name='n102'; save=$n102Save}
)) {
  $set = Get-Stranded $entry.save
  $sets[$entry.name] = [ordered]@{ count=$set.Count; ids=$set }
}
$evidence = [ordered]@{
  schema = 'awwv.combat-fatigue-prefix39.retained-failure-classification.v1'
  scope = [ordered]@{ retained_only=$true; new_run=$false; api_or_query=$false; source_edit=$false; broad_supply_investigation=$false }
  inputs = $paths
  attempt = [ordered]@{
    source_commit = $newSave.meta.provenance.git_commit
    candidate = $result.candidate
    result_status = $result.status
    required = $result.required
    preservation_equal = $result.preservation_equal
    score = $scoring.candidate.score
    denominator = $scoring.candidate.denominator
  }
  control_map_comparison = [ordered]@{
    reference_id_count = $ids.Count
    new_score = $ids.Count - $newMismatch.Count
    parent_score = $ids.Count - $parentMismatch.Count
    new_mismatches = @($newMismatch)
    parent_mismatches = @($parentMismatch)
    exact_new_vs_parent_deltas = @($mapDelta)
    new_map_sha256 = Sha256-Text ($newCanonical | ConvertTo-Json -Compress)
    parent_map_sha256 = Sha256-Text ($parentCanonical | ConvertTo-Json -Compress)
  }
  kolovarice_trace = [ordered]@{
    new_initial_controller = Get-Controller $newSave.political.initial_political_controllers $kolovarice
    new_final_controller = Get-Controller $newMap $kolovarice
    new_control_events = $newKolEvents
    new_battles = Read-WeeklyBattles $paths.new_weekly $kolovarice
    parent_initial_controller = Get-Controller $parentSave.political.initial_political_controllers $kolovarice
    parent_final_controller = Get-Controller $parentMap $kolovarice
    parent_control_events = $parentKolEvents
    parent_battles = Read-WeeklyBattles $paths.parent_weekly $kolovarice
  }
  stranded_sets = $sets
  stranded_baseline_interpretation = 'IDENTICAL_EXACT_SET_ACROSS_NEW_PARENT_N101_N102; owner task states existing canon/supply review declared this baseline lawful; no fresh supply review performed.'
  control_event_boundary = [ordered]@{
    new = Get-CombatBoundary $newSave
    parent = Get-CombatBoundary $parentSave
  }
  battle_power_trace = Read-BattlePowerTrace $paths.campaign_stdout $paths.campaign_stderr
  conclusion = [ordered]@{
    new_vs_parent_only_control_delta_is_kolovarice = ($mapDelta.Count -eq 1 -and $mapDelta[0].id -eq $kolovarice)
    kolovarice_is_missing_parent_rs_capture_not_new_rbih_capture = ($newKolEvents.Count -eq 0 -and $parentKolEvents.Count -eq 1 -and $parentKolEvents[0].from -eq 'RBiH' -and $parentKolEvents[0].to -eq 'RS')
    exact_stranded_set_unchanged = (($sets.new.ids -join "`n") -eq ($sets.parent.ids -join "`n") -and ($sets.new.ids -join "`n") -eq ($sets.n101.ids -join "`n") -and ($sets.new.ids -join "`n") -eq ($sets.n102.ids -join "`n"))
    new_malformed_or_illegal_combat_actor_evidenced = (@($evidence.control_event_boundary.new.malformed_required_field_events).Count -gt 0 -or @($evidence.control_event_boundary.new.combat_actor_faction_mismatches).Count -gt 0)
  }
}
# Build the final conclusion after the evidence object exists.
$evidence.conclusion.new_malformed_or_illegal_combat_actor_evidenced = (@($evidence.control_event_boundary.new.malformed_required_field_events).Count -gt 0 -or @($evidence.control_event_boundary.new.combat_actor_faction_mismatches).Count -gt 0)
$evidence | ConvertTo-Json -Depth 50
