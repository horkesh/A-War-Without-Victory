'use strict';

const PLAYER_FACTIONS = new Set(['RBiH', 'RS', 'HRHB']);
const PUBLIC_EVENT_FLAGS = new Set(['jna_withdrawn']);

function strictCompare(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (!isRecord(value)) return value;
  const out = {};
  for (const key of Object.keys(value).sort(strictCompare)) {
    const sorted = sortDeep(value[key]);
    if (sorted !== undefined) out[key] = sorted;
  }
  return out;
}

function copyKeys(source, keys) {
  const out = {};
  if (!isRecord(source)) return out;
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = cloneJson(source[key]);
  }
  return out;
}

function sortedRecordFromEntries(entries) {
  const out = {};
  for (const [key, value] of entries.sort(([a], [b]) => strictCompare(a, b))) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function scopeRecordToKey(value, key) {
  if (!isRecord(value) || value[key] === undefined) return {};
  return { [key]: cloneJson(value[key]) };
}

function scopeFactionValue(value, faction) {
  if (Array.isArray(value)) {
    return value
      .filter((row) => isRecord(row) && row.faction === faction)
      .map(cloneJson);
  }
  return scopeRecordToKey(value, faction);
}

function rowsForFaction(value, faction) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((row) => isRecord(row) && (
      row.faction === faction
      || row.player_faction === faction
      || row.target_faction === faction
      || row.targetFaction === faction
    ))
    .map(cloneJson);
}

function resolvePlayerFaction(state, fallbackFaction) {
  const direct = state?.meta?.player_faction;
  if (PLAYER_FACTIONS.has(direct)) return direct;
  return PLAYER_FACTIONS.has(fallbackFaction) ? fallbackFaction : null;
}

function projectMeta(meta, playerFaction) {
  const projected = copyKeys(meta, [
    'turn',
    'phase',
    'date',
    'name',
    'scenario_start_date',
    'decision_mode',
    'recruitment_mode',
    'rbih_hrhb_war_earliest_turn',
    'war_force_transition_after_turns',
    'war_start_turn',
    'peace_scheduled_referendum_turn',
    'peace_scheduled_war_start_turn',
    'peace_war_start_control_path',
    'referendum_deadline_turn',
    'referendum_eligible_turn',
    'referendum_held',
    'referendum_turn',
    'autonomy_level',
    'autonomy_level_pending',
    'tutorial_state',
    'game_over',
    'outcome',
    'endgame_snapshot',
  ]);
  projected.player_faction = playerFaction;
  projected.player_visible_projection = 1;
  projected.pending_proposal_reviews = playerFaction
    ? rowsForFaction(meta?.pending_proposal_reviews, playerFaction)
    : [];
  projected.proposal_decision_history = playerFaction
    ? rowsForFaction(meta?.proposal_decision_history, playerFaction)
    : [];
  if (isRecord(meta?.autonomy_overrides) && playerFaction) {
    projected.autonomy_overrides = sortedRecordFromEntries(
      Object.entries(meta.autonomy_overrides)
        .filter(([, row]) => !isRecord(row) || row.faction === undefined || row.faction === playerFaction)
        .map(([key, row]) => [key, cloneJson(row)]),
    );
  }
  return projected;
}

function projectFactions(factions, playerFaction) {
  if (!playerFaction || !Array.isArray(factions)) return [];
  return factions
    .filter((faction) => isRecord(faction) && faction.id === playerFaction)
    .map(cloneJson);
}

function collectFormationSets(formations, playerFaction) {
  const ownFormationIds = new Set();
  const foreignFormationIds = new Set();
  const foreignCorpsIds = new Set();
  for (const id of Object.keys(formations).sort(strictCompare)) {
    const formation = formations[id];
    if (!isRecord(formation)) continue;
    if (formation.faction === playerFaction) {
      ownFormationIds.add(id);
    } else {
      foreignFormationIds.add(id);
      if (formation.kind === 'corps' || formation.kind === 'corps_asset' || formation.kind === 'army_hq') {
        foreignCorpsIds.add(id);
      }
    }
  }
  return { ownFormationIds, foreignFormationIds, foreignCorpsIds };
}

function isFieldedEnemyFormation(formation, playerFaction) {
  if (!isRecord(formation) || formation.faction === playerFaction) return false;
  if (!PLAYER_FACTIONS.has(formation.faction)) return false;
  if (formation.kind !== 'brigade' && formation.kind !== 'operational_group' && formation.kind !== 'og') return false;
  if (formation.status !== 'active') return false;
  return formation.readiness !== 'forming' && formation.readiness !== 'destroyed';
}

function collectVisibleEnemyOsids(military, formations, playerFaction) {
  const visible = new Set();
  const frontEdges = Array.isArray(military?.war_front_edges_osid) ? military.war_front_edges_osid : [];
  for (const edge of frontEdges) {
    if (!isRecord(edge)) continue;
    if (edge.side_a === playerFaction && typeof edge.b === 'string') visible.add(edge.b);
    if (edge.side_b === playerFaction && typeof edge.a === 'string') visible.add(edge.a);
  }

  const sectors = isRecord(military?.corps_front_sectors) ? military.corps_front_sectors : {};
  const intel = isRecord(military?.sector_intel) ? military.sector_intel : {};
  for (const friendlySectorId of Object.keys(intel).sort(strictCompare)) {
    const friendlySector = sectors[friendlySectorId];
    if (!isRecord(friendlySector) || friendlySector.faction !== playerFaction) continue;
    const records = Array.isArray(intel[friendlySectorId]) ? intel[friendlySectorId] : [];
    for (const record of records) {
      if (!isRecord(record)) continue;
      for (const brigadeId of Array.isArray(record.visible_brigade_ids) ? record.visible_brigade_ids : []) {
        const formation = formations[brigadeId];
        if (isFieldedEnemyFormation(formation, playerFaction) && typeof formation.location_osid === 'string') {
          visible.add(formation.location_osid);
        }
      }
      const enemySector = sectors[record.enemy_sector_id];
      if (!isRecord(enemySector)) continue;
      for (const segment of Array.isArray(enemySector.sub_segments) ? enemySector.sub_segments : []) {
        if (!isRecord(segment)) continue;
        for (const osid of Array.isArray(segment.friendly_osids) ? segment.friendly_osids : []) {
          if (typeof osid === 'string') visible.add(osid);
        }
      }
    }
  }
  return visible;
}

function contactId(faction, osid) {
  return `contact:${faction}:${osid}`;
}

function projectFormations(military, playerFaction, turn) {
  const formations = isRecord(military?.formations) ? military.formations : {};
  const { ownFormationIds, foreignFormationIds, foreignCorpsIds } = collectFormationSets(formations, playerFaction);
  const visibleEnemyOsids = collectVisibleEnemyOsids(military, formations, playerFaction);
  const projectedEntries = [];
  const rawFormationToContact = new Map();

  for (const id of [...ownFormationIds].sort(strictCompare)) {
    projectedEntries.push([id, cloneJson(formations[id])]);
  }

  const contactKeys = new Set();
  for (const id of [...foreignFormationIds].sort(strictCompare)) {
    const formation = formations[id];
    if (!isFieldedEnemyFormation(formation, playerFaction)) continue;
    const osid = typeof formation.location_osid === 'string' ? formation.location_osid : null;
    if (!osid || !visibleEnemyOsids.has(osid)) continue;
    const idForContact = contactId(formation.faction, osid);
    rawFormationToContact.set(id, idForContact);
    if (contactKeys.has(idForContact)) continue;
    contactKeys.add(idForContact);
    projectedEntries.push([idForContact, {
      id: idForContact,
      faction: formation.faction,
      name: 'Enemy contact',
      kind: 'brigade',
      status: 'active',
      readiness: 'active',
      created_turn: Number.isFinite(turn) ? turn : 0,
      location_osid: osid,
      tags: ['player_visible_contact'],
    }]);
  }

  return {
    formations,
    projectedFormations: sortedRecordFromEntries(projectedEntries),
    ownFormationIds,
    foreignFormationIds,
    foreignCorpsIds,
    visibleEnemyOsids,
    rawFormationToContact,
  };
}

function filterRecordByAllowedKeys(record, allowedKeys) {
  if (!isRecord(record)) return {};
  return sortedRecordFromEntries(
    Object.keys(record)
      .filter((key) => allowedKeys.has(key))
      .map((key) => [key, cloneJson(record[key])]),
  );
}

function filterArrayByAllowedIds(rows, allowedIds, idKeys) {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((row) => isRecord(row) && idKeys.some((key) => allowedIds.has(row[key])))
    .map(cloneJson);
}

function scrubForbiddenIds(value, forbiddenIds) {
  if (Array.isArray(value)) {
    return value
      .filter((entry) => typeof entry !== 'string' || !forbiddenIds.has(entry))
      .map((entry) => scrubForbiddenIds(entry, forbiddenIds))
      .filter((entry) => entry !== undefined);
  }
  if (isRecord(value)) {
    const out = {};
    for (const key of Object.keys(value).sort(strictCompare)) {
      const scrubbed = scrubForbiddenIds(value[key], forbiddenIds);
      if (scrubbed !== undefined) out[key] = scrubbed;
    }
    return out;
  }
  if (typeof value === 'string' && forbiddenIds.has(value)) return undefined;
  return cloneJson(value);
}

function projectCorpsSectors(military, playerFaction, forbiddenIds) {
  const sectors = isRecord(military?.corps_front_sectors) ? military.corps_front_sectors : {};
  const entries = [];
  for (const sectorId of Object.keys(sectors).sort(strictCompare)) {
    const sector = sectors[sectorId];
    if (!isRecord(sector) || sector.faction !== playerFaction) continue;
    entries.push([sectorId, scrubForbiddenIds(sector, forbiddenIds)]);
  }
  return sortedRecordFromEntries(entries);
}

function quantizeConfidence(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  const bounded = Math.max(0, Math.min(1, value));
  return Math.floor((bounded + Number.EPSILON) * 4) / 4;
}

function projectSectorIntel(military, playerFaction, sectors, rawFormationToContact) {
  const rawIntel = isRecord(military?.sector_intel) ? military.sector_intel : {};
  const entries = [];
  let contactSectorIndex = 0;
  for (const sectorId of Object.keys(rawIntel).sort(strictCompare)) {
    if (!isRecord(sectors[sectorId]) || sectors[sectorId].faction !== playerFaction) continue;
    const records = [];
    for (const raw of Array.isArray(rawIntel[sectorId]) ? rawIntel[sectorId] : []) {
      if (!isRecord(raw)) continue;
      const visibleContactIds = [...new Set(
        (Array.isArray(raw.visible_brigade_ids) ? raw.visible_brigade_ids : [])
          .map((id) => rawFormationToContact.get(id))
          .filter((id) => typeof id === 'string'),
      )].sort(strictCompare);
      records.push({
        enemy_sector_id: `contact-sector:${contactSectorIndex}`,
        front_edge_count: typeof raw.front_edge_count === 'number' ? raw.front_edge_count : 0,
        strength_category: ['unknown', 'thin', 'moderate', 'dense', 'fortress'].includes(raw.strength_category)
          ? raw.strength_category
          : 'unknown',
        posture_observed: ['unknown', 'defensive', 'entrenched', 'offensive_prep'].includes(raw.posture_observed)
          ? raw.posture_observed
          : 'unknown',
        offensive_signs: raw.offensive_signs === true,
        confidence: quantizeConfidence(raw.confidence),
        turns_in_contact: typeof raw.turns_in_contact === 'number' ? raw.turns_in_contact : 0,
        visible_brigade_ids: visibleContactIds,
      });
      contactSectorIndex += 1;
    }
    entries.push([sectorId, records]);
  }
  return sortedRecordFromEntries(entries);
}

function projectRecruitmentState(state, playerFaction, ownFormationIds) {
  if (!isRecord(state)) return undefined;
  const projected = copyKeys(state, [
    'max_recruits_per_faction_per_turn',
    'recruitment_capital_trickle',
    'equipment_points_trickle',
  ]);
  projected.recruitment_capital = scopeRecordToKey(state.recruitment_capital, playerFaction);
  projected.equipment_pools = scopeRecordToKey(state.equipment_pools, playerFaction);
  projected.recruited_brigade_ids = (Array.isArray(state.recruited_brigade_ids) ? state.recruited_brigade_ids : [])
    .filter((id) => ownFormationIds.has(id))
    .sort(strictCompare);
  return projected;
}

function projectNegotiation(negotiation, playerFaction) {
  if (!isRecord(negotiation)) return undefined;
  const projected = copyKeys(negotiation, [
    'active_peace_plan',
    'pending_peace_plan',
    'pending_dayton',
    'dayton_history',
  ]);
  if (isRecord(projected.pending_peace_plan)) {
    projected.pending_peace_plan.bot_responses = {};
  }
  for (const key of ['capital', 'patron_relationships', 'strategic_dimensions']) {
    projected[key] = scopeRecordToKey(negotiation[key], playerFaction);
  }
  projected.peace_plan_history = rowsForFaction(negotiation.peace_plan_history, playerFaction);
  projected.pending_counter_offers = (Array.isArray(negotiation.pending_counter_offers)
    ? negotiation.pending_counter_offers
    : [])
    .filter((row) => isRecord(row) && (
      row.targetFaction === playerFaction
      || row.target_faction === playerFaction
      || row.author === playerFaction
      || row.author === 'PLAYER'
    ))
    .map(cloneJson);
  return projected;
}

function projectWarTimeline(warTimeline, playerFaction) {
  if (!isRecord(warTimeline)) return undefined;
  const projected = copyKeys(warTimeline, ['start_turn', 'current_week', 'current_year']);
  if (isRecord(warTimeline.officer_config)) {
    projected.officer_config = scopeRecordToKey(warTimeline.officer_config, playerFaction);
  }
  return projected;
}

function projectEventState(military, playerFaction) {
  const decisionRows = Array.isArray(military?.event_decision_log) ? military.event_decision_log : [];
  const playerDecisionRows = decisionRows
    .filter((row) => isRecord(row) && row.faction === playerFaction)
    .map(cloneJson);
  const opponentDecisionIds = new Set(
    decisionRows
      .filter((row) => isRecord(row) && PLAYER_FACTIONS.has(row.faction) && row.faction !== playerFaction)
      .map((row) => row.event_id)
      .filter((id) => typeof id === 'string'),
  );
  const playerDecisionIds = new Set(
    playerDecisionRows.map((row) => row.event_id).filter((id) => typeof id === 'string'),
  );

  const causalityRows = Array.isArray(military?.event_causality_log) ? military.event_causality_log : [];
  const opponentCausedEventIds = new Set();
  for (const row of causalityRows) {
    if (!isRecord(row) || !opponentDecisionIds.has(row.from_event)) continue;
    if (typeof row.to_event === 'string') opponentCausedEventIds.add(row.to_event);
  }

  const firedEventIds = (Array.isArray(military?.fired_event_ids) ? military.fired_event_ids : [])
    .filter((id) => typeof id === 'string' && !opponentDecisionIds.has(id) && !opponentCausedEventIds.has(id));
  const visibleEventIds = new Set([...firedEventIds, ...playerDecisionIds]);
  const visibleCausality = [];
  const causedEventIds = new Set();
  const causedFlags = new Set();
  for (const row of causalityRows) {
    if (!isRecord(row) || !visibleEventIds.has(row.from_event)) continue;
    visibleCausality.push(cloneJson(row));
    if (typeof row.to_event === 'string') causedEventIds.add(row.to_event);
    if (typeof row.to_flag === 'string') causedFlags.add(row.to_flag);
  }

  const allowedEventIds = new Set([...visibleEventIds, ...causedEventIds]);
  const eventFlags = {};
  if (isRecord(military?.event_flags)) {
    for (const key of Object.keys(military.event_flags).sort(strictCompare)) {
      if (PUBLIC_EVENT_FLAGS.has(key) || causedFlags.has(key)) eventFlags[key] = cloneJson(military.event_flags[key]);
    }
  }

  return {
    event_decision_log: playerDecisionRows,
    fired_event_ids: [...new Set(firedEventIds)].sort(strictCompare),
    enabled_event_ids: (Array.isArray(military?.enabled_event_ids) ? military.enabled_event_ids : [])
      .filter((id) => causedEventIds.has(id))
      .sort(strictCompare),
    closed_event_ids: (Array.isArray(military?.closed_event_ids) ? military.closed_event_ids : [])
      .filter((id) => allowedEventIds.has(id))
      .sort(strictCompare),
    event_causality_log: visibleCausality,
    event_flags: eventFlags,
    event_last_fired_turn: filterRecordByAllowedKeys(military?.event_last_fired_turn, allowedEventIds),
    event_fire_counts: filterRecordByAllowedKeys(military?.event_fire_counts, allowedEventIds),
    allowedEventIds,
  };
}

function projectArmyHqOperations(value, playerFaction, ownCorpsIds) {
  if (!isRecord(value)) return {};
  return sortedRecordFromEntries(
    Object.entries(value)
      .filter(([, operation]) => isRecord(operation) && (
        operation.faction === playerFaction
        || ownCorpsIds.has(operation.corps_id)
        || (Array.isArray(operation.donor_corps_ids) && operation.donor_corps_ids.some((id) => ownCorpsIds.has(id)))
      ))
      .map(([id, operation]) => [id, cloneJson(operation)]),
  );
}

function projectSmugglingRoutes(value, playerFaction) {
  if (Array.isArray(value)) {
    return value.filter((row) => isRecord(row) && row.faction === playerFaction).map(cloneJson);
  }
  if (!isRecord(value)) return undefined;
  return sortedRecordFromEntries(
    Object.entries(value)
      .filter(([, row]) => isRecord(row) && row.faction === playerFaction)
      .map(([id, row]) => [id, cloneJson(row)]),
  );
}

function projectMilitary(state, playerFaction) {
  const military = isRecord(state?.military) ? state.military : {};
  if (!playerFaction) {
    return { formations: {}, corps_command: {}, corps_front_sectors: {} };
  }

  const formationProjection = projectFormations(military, playerFaction, state?.meta?.turn);
  const {
    formations,
    projectedFormations,
    ownFormationIds,
    foreignFormationIds,
    foreignCorpsIds,
    rawFormationToContact,
  } = formationProjection;
  const ownCorpsIds = new Set(
    [...ownFormationIds].filter((id) => {
      const formation = formations[id];
      return isRecord(formation)
        && (formation.kind === 'corps' || formation.kind === 'corps_asset' || formation.kind === 'army_hq');
    }),
  );
  const sectors = isRecord(military.corps_front_sectors) ? military.corps_front_sectors : {};
  const ownSectorIds = new Set(
    Object.keys(sectors).filter((id) => isRecord(sectors[id]) && sectors[id].faction === playerFaction),
  );
  const foreignSectorIds = new Set(
    Object.keys(sectors).filter((id) => isRecord(sectors[id]) && sectors[id].faction !== playerFaction),
  );
  const officerData = Array.isArray(military.named_officer_data) ? military.named_officer_data : [];
  const ownOfficerIds = new Set(
    officerData
      .filter((officer) => isRecord(officer) && officer.faction === playerFaction)
      .map((officer) => officer.id)
      .filter((id) => typeof id === 'string'),
  );
  const foreignOfficerIds = new Set(
    officerData
      .filter((officer) => isRecord(officer) && officer.faction !== playerFaction)
      .map((officer) => officer.id)
      .filter((id) => typeof id === 'string'),
  );
  const forbiddenIds = new Set([
    ...foreignFormationIds,
    ...foreignCorpsIds,
    ...foreignSectorIds,
    ...foreignOfficerIds,
  ]);
  const eventState = projectEventState(military, playerFaction);

  const projected = {
    formations: projectedFormations,
    corps_command: filterRecordByAllowedKeys(military.corps_command, ownCorpsIds),
    corps_front_sectors: projectCorpsSectors(military, playerFaction, forbiddenIds),
    sector_intel: projectSectorIntel(military, playerFaction, sectors, rawFormationToContact),
    named_officer_data: officerData
      .filter((officer) => isRecord(officer) && officer.faction === playerFaction)
      .map(cloneJson),
    named_officers: filterRecordByAllowedKeys(military.named_officers, ownOfficerIds),
    militia_pools: sortedRecordFromEntries(
      Object.entries(isRecord(military.militia_pools) ? military.militia_pools : {})
        .filter(([, pool]) => isRecord(pool) && pool.faction === playerFaction)
        .map(([id, pool]) => [id, cloneJson(pool)]),
    ),
    recruitment_state: projectRecruitmentState(military.recruitment_state, playerFaction, ownFormationIds),
    negotiation: projectNegotiation(military.negotiation, playerFaction),
    war_timeline: projectWarTimeline(military.war_timeline, playerFaction),
    army_hq_operations: projectArmyHqOperations(military.army_hq_operations, playerFaction, ownCorpsIds),
    smuggling_routes: projectSmugglingRoutes(military.smuggling_routes, playerFaction),
    ...copyKeys(military, [
      'front_edges',
      'war_front_edges_osid',
      'production_facilities',
      'sarajevo_tunnel_operational',
      'command_authority',
      'airdrop_allocation',
      'smuggling_allocation',
    ]),
    ...copyKeys(eventState, [
      'event_decision_log',
      'fired_event_ids',
      'enabled_event_ids',
      'closed_event_ids',
      'event_causality_log',
      'event_flags',
      'event_last_fired_turn',
      'event_fire_counts',
    ]),
  };
  if (isRecord(military.last_briefing) && military.last_briefing.faction === playerFaction) {
    projected.last_briefing = cloneJson(military.last_briefing);
  }

  for (const key of [
    'brigade_movement_state',
    'brigade_movement_orders',
    'brigade_reposition_orders',
    'brigade_deploy_orders',
    'brigade_encircled',
    'brigade_attack_orders',
    'brigade_sector_override',
    'home_distance_cache',
    'elite_brigade_tracker',
  ]) {
    projected[key] = filterRecordByAllowedKeys(military[key], ownFormationIds);
  }
  projected.brigade_posture_orders = filterArrayByAllowedIds(
    military.brigade_posture_orders,
    ownFormationIds,
    ['brigade_id', 'formation_id'],
  );
  projected.sector_stance_orders = filterArrayByAllowedIds(
    military.sector_stance_orders,
    ownSectorIds,
    ['sector_id'],
  );
  projected.unresolved_sector_brigades = (Array.isArray(military.unresolved_sector_brigades)
    ? military.unresolved_sector_brigades
    : [])
    .filter((id) => ownFormationIds.has(id))
    .sort(strictCompare);

  for (const key of [
    'front_posture',
    'front_posture_regions',
    'strategic_reserves',
    'general_supply_reserve',
    'heavy_munitions_reserve',
    'army_stance',
    'logistics_priority',
    'equipment_quality_modifiers',
    'recruitment_modifiers',
    'army_hq_last_op_turn',
    'army_hq_op_count_by_year',
    'army_corps_directives_by_faction',
    'campaign_plans',
    'faction_officer_maturity',
  ]) {
    projected[key] = scopeFactionValue(military[key], playerFaction);
  }

  projected.casualty_ledger = scopeRecordToKey(military.casualty_ledger, playerFaction);
  if (isRecord(projected.casualty_ledger[playerFaction])) {
    projected.casualty_ledger[playerFaction].per_formation = filterRecordByAllowedKeys(
      projected.casualty_ledger[playerFaction].per_formation,
      ownFormationIds,
    );
  }
  projected.corps_equipment_reserve = filterRecordByAllowedKeys(military.corps_equipment_reserve, ownCorpsIds);
  projected.must_hold_osids_by_corps = filterRecordByAllowedKeys(military.must_hold_osids_by_corps, ownCorpsIds);
  projected.comms_override_by_corps = filterRecordByAllowedKeys(military.comms_override_by_corps, ownCorpsIds);
  projected.sector_combat_ratings = filterRecordByAllowedKeys(military.sector_combat_ratings, ownSectorIds);
  projected.front_pressure = filterRecordByAllowedKeys(
    military.front_pressure,
    new Set((Array.isArray(military.war_front_edges_osid) ? military.war_front_edges_osid : [])
      .filter((edge) => isRecord(edge) && (edge.side_a === playerFaction || edge.side_b === playerFaction))
      .map((edge) => edge.edge_id)
      .filter((id) => typeof id === 'string')),
  );
  projected.opsec_sectors = (Array.isArray(military.opsec_sectors) ? military.opsec_sectors : [])
    .filter((id) => ownSectorIds.has(id))
    .sort(strictCompare);
  projected.municipality_support_orders = scopeRecordToKey(military.municipality_support_orders, playerFaction);

  projected.pending_reserve_requests = rowsForFaction(military.pending_reserve_requests, playerFaction);
  projected.reserve_request_history = rowsForFaction(military.reserve_request_history, playerFaction);
  projected.pending_officer_events = rowsForFaction(military.pending_officer_events, playerFaction);
  projected.officer_decision_history = rowsForFaction(military.officer_decision_history, playerFaction);
  projected.operation_opportunities = rowsForFaction(military.operation_opportunities, playerFaction);
  projected.operation_opportunity_resolutions = rowsForFaction(military.operation_opportunity_resolutions, playerFaction);
  projected.operation_opportunity_diagnostics = rowsForFaction(military.operation_opportunity_diagnostics, playerFaction);
  projected.operation_opportunity_traces = rowsForFaction(military.operation_opportunity_traces, playerFaction);
  projected.army_co_decision_traces = rowsForFaction(military.army_co_decision_traces, playerFaction);
  projected.pending_event_decisions = rowsForFaction(military.pending_event_decisions, playerFaction);
  projected.pending_event_notifications = (Array.isArray(military.pending_event_notifications)
    ? military.pending_event_notifications
    : [])
    .filter((row) => isRecord(row) && row.target_faction === playerFaction)
    .map(cloneJson);
  projected.pending_convoy_decisions = (Array.isArray(military.pending_convoy_decisions)
    ? military.pending_convoy_decisions
    : [])
    .filter((row) => isRecord(row) && row.route_faction === playerFaction)
    .map(cloneJson);
  projected.convoy_decision_history = (Array.isArray(military.convoy_decision_history)
    ? military.convoy_decision_history
    : [])
    .filter((row) => isRecord(row) && (row.route_faction === playerFaction || row.target_faction === playerFaction))
    .map(cloneJson);
  projected.friction_events = (Array.isArray(military.friction_events) ? military.friction_events : [])
    .filter((row) => isRecord(row) && ownOfficerIds.has(row.officer_id))
    .map(cloneJson);
  projected.tactical_groups = sortedRecordFromEntries(
    Object.entries(isRecord(military.tactical_groups) ? military.tactical_groups : {})
      .filter(([, group]) => isRecord(group) && (
        group.faction === playerFaction
        || ownFormationIds.has(group.formation_id)
        || ownFormationIds.has(group.tg_id)
      ))
      .map(([id, group]) => [id, scrubForbiddenIds(group, forbiddenIds)]),
  );

  return scrubForbiddenIds(projected, forbiddenIds);
}

function projectPolitical(political, playerFaction) {
  if (!isRecord(political)) return {};
  const projected = copyKeys(political, [
    'political_controllers',
    'initial_political_controllers',
    'contested_control',
    'control_events',
    'international_visibility_pressure',
    'ivp_consequences_active',
    'war_alliance_rbih_hrhb',
    'enclave_resilience',
    'phase0_events_log',
  ]);
  for (const key of [
    'war_exhaustion',
    'war_supply_condition',
    'war_supply_pressure',
    'collapse_eligibility',
  ]) {
    projected[key] = playerFaction ? scopeRecordToKey(political[key], playerFaction) : {};
  }
  if (isRecord(political.last_contained_osids_by_faction)) {
    projected.last_contained_osids_by_faction = {};
    for (const faction of ['RBiH', playerFaction]) {
      if (faction && political.last_contained_osids_by_faction[faction] !== undefined) {
        projected.last_contained_osids_by_faction[faction] = cloneJson(political.last_contained_osids_by_faction[faction]);
      }
    }
  }
  const controllers = isRecord(political.political_controllers) ? political.political_controllers : {};
  projected.last_supply_state_by_osid = sortedRecordFromEntries(
    Object.entries(isRecord(political.last_supply_state_by_osid) ? political.last_supply_state_by_osid : {})
      .filter(([osid]) => controllers[osid] === playerFaction)
      .map(([osid, value]) => [osid, cloneJson(value)]),
  );
  return projected;
}

function projectDisplacement(displacement) {
  return copyKeys(displacement, [
    'civilian_casualties',
    'displacement_event_log',
    'displacement_flows_by_osid',
    'displacement_humanitarian_aggregates',
    'displacement_recent_by_turn',
    'displacement_state',
  ]);
}

function projectSupplyState(value, playerFaction) {
  if (!isRecord(value) || !playerFaction) return undefined;
  const projected = copyKeys(value, ['turn', 'phase']);
  projected.factions = (Array.isArray(value.factions) ? value.factions : [])
    .filter((row) => isRecord(row) && (row.faction_id === playerFaction || row.faction === playerFaction))
    .map(cloneJson);
  return projected;
}

function projectTurnSummaries(summaries, context, allowedEventIds) {
  if (!Array.isArray(summaries)) return [];
  const { playerFaction, ownFormationIds, visibleEnemyOsids, politicalControllers } = context;
  return summaries.map((summary) => {
    if (!isRecord(summary)) return null;
    const projected = copyKeys(summary, [
      'turn',
      'territory_net',
      'notable_flips',
      'displacement_total',
      'displacement_by_ethnicity',
      'displacement_hotspot',
      'supply_transitions',
      'territory_snapshot',
    ]);
    projected.battles = (Array.isArray(summary.battles) ? summary.battles : [])
      .filter((battle) => isRecord(battle) && (
        battle.attacker_faction === playerFaction
        || battle.defender_faction === playerFaction
        || visibleEnemyOsids.has(battle.osid)
      ))
      .map((battle) => {
        const ownIsAttacker = battle.attacker_faction === playerFaction;
        const ownIsDefender = battle.defender_faction === playerFaction;
        const row = copyKeys(battle, [
          'osid', 'mun_id', 'attacker_faction', 'defender_faction', 'outcome',
          'attacker_casualties', 'defender_casualties', 'territory_flipped',
          'was_concentrated', 'execution_friction',
        ]);
        row.primary_attacker_id = ownIsAttacker && ownFormationIds.has(battle.primary_attacker_id)
          ? battle.primary_attacker_id
          : contactId(battle.attacker_faction, battle.osid);
        row.primary_defender_id = ownIsDefender && ownFormationIds.has(battle.primary_defender_id)
          ? battle.primary_defender_id
          : null;
        row.all_attacker_ids = ownIsAttacker
          ? (Array.isArray(battle.all_attacker_ids) ? battle.all_attacker_ids : [])
            .filter((id) => ownFormationIds.has(id))
            .sort(strictCompare)
          : [contactId(battle.attacker_faction, battle.osid)];
        if (ownIsDefender && Array.isArray(battle.defender_contributions)) {
          row.defender_contributions = battle.defender_contributions
            .filter((entry) => isRecord(entry) && ownFormationIds.has(entry.brigade_id))
            .map(cloneJson);
        }
        return row;
      });
    for (const key of ['decoration_awards', 'arc_transitions', 'formation_spawns', 'formation_destructions']) {
      projected[key] = (Array.isArray(summary[key]) ? summary[key] : [])
        .filter((row) => isRecord(row) && row.faction === playerFaction)
        .map(cloneJson);
    }
    projected.movements = (Array.isArray(summary.movements) ? summary.movements : [])
      .filter((row) => isRecord(row) && ownFormationIds.has(row.formation_id))
      .map(cloneJson);
    projected.supply_deltas = scopeRecordToKey(summary.supply_deltas, playerFaction);
    projected.heavy_munitions_deltas = scopeRecordToKey(summary.heavy_munitions_deltas, playerFaction);
    projected.supply_snapshot = scopeRecordToKey(summary.supply_snapshot, playerFaction);
    projected.supply_transitions = (Array.isArray(summary.supply_transitions) ? summary.supply_transitions : [])
      .filter((row) => isRecord(row) && politicalControllers[row.osid] === playerFaction)
      .map(cloneJson);
    projected.events_fired = (Array.isArray(summary.events_fired) ? summary.events_fired : [])
      .filter((row) => isRecord(row) && allowedEventIds.has(row.id))
      .map(cloneJson);
    projected.notable_events = (Array.isArray(summary.notable_events) ? summary.notable_events : [])
      .filter((row) => isRecord(row) && (row.faction === undefined || row.faction === playerFaction))
      .map(cloneJson);
    return projected;
  }).filter(Boolean);
}

function projectOperationHistory(value, playerFaction) {
  return (Array.isArray(value) ? value : [])
    .filter((row) => isRecord(row) && row.faction === playerFaction)
    .map(cloneJson);
}

function projectPlayerVisibleState(state, fallbackFaction) {
  if (!isRecord(state)) throw new TypeError('Player-visible projection requires a GameState object');
  const playerFaction = resolvePlayerFaction(state, fallbackFaction);
  const projectedMilitary = projectMilitary(state, playerFaction);
  const projectedPolitical = projectPolitical(state.political, playerFaction);
  const projected = {
    schema_version: state.schema_version,
    meta: projectMeta(state.meta, playerFaction),
    factions: projectFactions(state.factions, playerFaction),
    military: projectedMilitary,
    political: projectedPolitical,
    displacement: projectDisplacement(state.displacement),
    operation_history: playerFaction ? projectOperationHistory(state.operation_history, playerFaction) : [],
    pending_paramilitary_requests: playerFaction ? rowsForFaction(state.pending_paramilitary_requests, playerFaction) : [],
    paramilitary_decision_history: playerFaction ? rowsForFaction(state.paramilitary_decision_history, playerFaction) : [],
    paramilitary_deployment_count: playerFaction ? scopeRecordToKey(state.paramilitary_deployment_count, playerFaction) : {},
  };

  if (state.paramilitary_policy === 'always_allow' || state.paramilitary_policy === 'always_deny' || state.paramilitary_policy === 'ask') {
    projected.paramilitary_policy = state.paramilitary_policy;
  }
  const supplyState = projectSupplyState(state.supply_state_by_osid, playerFaction);
  if (supplyState) projected.supply_state_by_osid = supplyState;
  if (Array.isArray(state.supply_corridors_osid) && playerFaction) {
    projected.supply_corridors_osid = state.supply_corridors_osid
      .filter((row) => isRecord(row) && (row.faction === playerFaction || row.faction_id === playerFaction))
      .map(cloneJson);
  }

  const projectedFormations = projectedMilitary.formations;
  const ownFormationIds = new Set(
    Object.keys(projectedFormations).filter((id) => projectedFormations[id]?.faction === playerFaction),
  );
  const visibleEnemyOsids = new Set(
    Object.values(projectedFormations)
      .filter((formation) => isRecord(formation) && formation.faction !== playerFaction)
      .map((formation) => formation.location_osid)
      .filter((osid) => typeof osid === 'string'),
  );
  const allowedEventIds = new Set([
    ...(Array.isArray(projectedMilitary.fired_event_ids) ? projectedMilitary.fired_event_ids : []),
    ...(Array.isArray(projectedMilitary.enabled_event_ids) ? projectedMilitary.enabled_event_ids : []),
  ]);
  projected.turn_summaries = projectTurnSummaries(state.turn_summaries, {
    playerFaction,
    ownFormationIds,
    visibleEnemyOsids,
    politicalControllers: isRecord(projectedPolitical.political_controllers)
      ? projectedPolitical.political_controllers
      : {},
  }, allowedEventIds);

  if (isRecord(state.brigade_aor)) {
    projected.brigade_aor = sortedRecordFromEntries(
      Object.entries(state.brigade_aor)
        .filter(([, formationId]) => ownFormationIds.has(formationId))
        .map(([settlementId, formationId]) => [settlementId, formationId]),
    );
  }
  if (isRecord(state.brigade_history)) {
    projected.brigade_history = filterRecordByAllowedKeys(state.brigade_history, ownFormationIds);
  }
  if (isRecord(state.corps_command)) {
    const ownCorpsIds = new Set(
      [...ownFormationIds].filter((id) => {
        const formation = projectedFormations[id];
        return formation?.kind === 'corps' || formation?.kind === 'corps_asset' || formation?.kind === 'army_hq';
      }),
    );
    projected.corps_command = filterRecordByAllowedKeys(state.corps_command, ownCorpsIds);
  }
  return sortDeep(projected);
}

function projectPlayerVisibleStateJson(stateJson, fallbackFaction) {
  if (typeof stateJson !== 'string') throw new TypeError('Player-visible projection requires serialized GameState JSON');
  return JSON.stringify(projectPlayerVisibleState(JSON.parse(stateJson), fallbackFaction));
}

function projectPlayerVisibleReplaySequenceJson(sequenceJson, fallbackFaction) {
  if (typeof sequenceJson !== 'string') throw new TypeError('Replay projection requires serialized replay JSON');
  const sequence = JSON.parse(sequenceJson);
  if (!Array.isArray(sequence)) throw new TypeError('Replay projection requires a GameState array');
  return JSON.stringify(sequence.map((state) => projectPlayerVisibleState(state, fallbackFaction)));
}

module.exports = {
  projectPlayerVisibleReplaySequenceJson,
  projectPlayerVisibleState,
  projectPlayerVisibleStateJson,
};
