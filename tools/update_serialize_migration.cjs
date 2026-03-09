const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '../src/state/serialize.ts');
let content = fs.readFileSync(targetFile, 'utf8');

const military_keys = [
    'formations', 'theatres', 'army_theatre_assignment', 'front_segments', 'front_posture', 'front_posture_regions', 'front_edges', 'war_front_edges_osid', 'assignable_front_segments', 'front_pressure', 'militia_pools', 'strategic_reserves', 'militia_garrison', 'brigade_movement_state', 'brigade_movement_orders', 'brigade_reposition_orders', 'brigade_deploy_orders', 'brigade_encircled', 'battle_damage', 'formation_spawn_directive', 'logistics_priority', 'sector_stance_orders', 'war_militia_strength', 'war_jna', 'general_supply_reserve', 'heavy_munitions_reserve', 'siege_turn_counters', 'brigade_front_assignment', 'corps_front_edges', 'corps_fallback_front_edges', 'brigade_desired_aor_cap', 'brigade_posture_orders', 'brigade_attack_orders', 'corps_attack_axis_orders', 'corps_command', 'corps_equipment_reserve', 'triggered_operations_accepted', 'declined_operations', 'army_stance', 'og_orders', 'og_subfront_edges', 'settlement_holdouts', 'recruitment_state', 'casualty_ledger', 'local_fronts', 'corps_front_sectors', 'sector_intel', 'home_distance_cache', 'war_timeline', 'named_officer_data', 'named_officers', 'used_operation_names', 'production_facilities', 'airdrop_allocation', 'smuggling_allocation', 'pending_convoy_decisions', 'municipality_support_orders', 'sarajevo_tunnel_operational', 'opsec_sectors', 'paramilitary_sweep_run_turn', 'paramilitary_targets'
];

const political_keys = [
    'political_controllers', 'contested_control', 'municipalities', 'settlements', 'international_visibility_pressure', 'ivp_consequences_active', 'enclaves', 'sarajevo_state', 'negotiation_status', 'ceasefire', 'negotiation_ledger', 'control_overrides', 'control_recognition', 'supply_rights', 'end_state', 'collapse_eligibility', 'collapse_eligibility_tier1', 'local_strain', 'collapse_damage', 'capacity_modifiers', 'effective_posture_exposure', 'loss_of_control_trends', 'war_consolidation_until', 'war_control_strain', 'war_alliance_rbih_hrhb', 'rbih_hrhb_state', 'coercion_pressure_by_municipality', 'war_supply_pressure', 'war_exhaustion', 'war_exhaustion_local', 'enclave_resilience', 'phase0_events_log', 'phase0_relationships', 'vienna_declaration_turn', 'truce_broken_turn', 'vienna_accepted', 'vienna_kiseljak_broken', 'vienna_herzegovina_broken_by', 'control_events'
];

const displacement_keys = [
    'displacement_state', 'hostile_takeover_timers', 'displacement_camp_state', 'minority_flight_state', 'displacement_event_log', 'sustainability_state', 'civilian_casualties', 'war_displacement_initiated', 'settlement_displacement', 'settlement_displacement_started_turn', 'municipality_displacement'
];

const anchor = `if (!candidate.meta || typeof candidate.meta !== 'object') {`;

let injection = `
    // --- Auto-injected migration to nested domains ---
    candidate.military = candidate.military || {};
    candidate.political = candidate.political || {};
    candidate.displacement = candidate.displacement || {};
`;

for (const k of military_keys) {
    injection += `    if (candidate.${k} !== undefined) { candidate.military.${k} = candidate.${k}; delete candidate.${k}; }\n`;
}
for (const k of political_keys) {
    injection += `    if (candidate.${k} !== undefined) { candidate.political.${k} = candidate.${k}; delete candidate.${k}; }\n`;
}
for (const k of displacement_keys) {
    injection += `    if (candidate.${k} !== undefined) { candidate.displacement.${k} = candidate.${k}; delete candidate.${k}; }\n`;
}

injection += `    // -------------------------------------------------\n\n    `;

content = content.replace(anchor, injection + anchor);

fs.writeFileSync(targetFile, content);
console.log('Updated serialize.ts');
