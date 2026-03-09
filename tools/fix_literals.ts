import { Project, SyntaxKind, Type, PropertyAssignment } from 'ts-morph';
import * as fs from 'fs';

const military_keys = new Set([
    'formations', 'theatres', 'army_theatre_assignment', 'front_segments', 'front_posture', 'front_posture_regions', 'front_edges', 'war_front_edges_osid', 'assignable_front_segments', 'front_pressure', 'militia_pools', 'strategic_reserves', 'militia_garrison', 'brigade_movement_state', 'brigade_movement_orders', 'brigade_reposition_orders', 'brigade_deploy_orders', 'brigade_encircled', 'battle_damage', 'formation_spawn_directive', 'logistics_priority', 'sector_stance_orders', 'war_militia_strength', 'war_jna', 'general_supply_reserve', 'heavy_munitions_reserve', 'siege_turn_counters', 'brigade_front_assignment', 'corps_front_edges', 'corps_fallback_front_edges', 'brigade_desired_aor_cap', 'brigade_posture_orders', 'brigade_attack_orders', 'corps_attack_axis_orders', 'corps_command', 'corps_equipment_reserve', 'triggered_operations_accepted', 'declined_operations', 'army_stance', 'og_orders', 'og_subfront_edges', 'settlement_holdouts', 'recruitment_state', 'casualty_ledger', 'local_fronts', 'corps_front_sectors', 'sector_intel', 'home_distance_cache', 'war_timeline', 'named_officer_data', 'named_officers', 'used_operation_names', 'production_facilities', 'airdrop_allocation', 'smuggling_allocation', 'pending_convoy_decisions', 'municipality_support_orders', 'sarajevo_tunnel_operational', 'opsec_sectors', 'paramilitary_sweep_run_turn', 'paramilitary_targets'
]);

const political_keys = new Set([
    'political_controllers', 'contested_control', 'municipalities', 'settlements', 'international_visibility_pressure', 'ivp_consequences_active', 'enclaves', 'sarajevo_state', 'negotiation_status', 'ceasefire', 'negotiation_ledger', 'control_overrides', 'control_recognition', 'supply_rights', 'end_state', 'collapse_eligibility', 'collapse_eligibility_tier1', 'local_strain', 'collapse_damage', 'capacity_modifiers', 'effective_posture_exposure', 'loss_of_control_trends', 'war_consolidation_until', 'war_control_strain', 'war_alliance_rbih_hrhb', 'rbih_hrhb_state', 'coercion_pressure_by_municipality', 'war_supply_pressure', 'war_exhaustion', 'war_exhaustion_local', 'enclave_resilience', 'phase0_events_log', 'phase0_relationships', 'vienna_declaration_turn', 'truce_broken_turn', 'vienna_accepted', 'vienna_kiseljak_broken', 'vienna_herzegovina_broken_by', 'control_events'
]);

const displacement_keys = new Set([
    'displacement_state', 'hostile_takeover_timers', 'displacement_camp_state', 'minority_flight_state', 'displacement_event_log', 'sustainability_state', 'civilian_casualties', 'war_displacement_initiated', 'settlement_displacement', 'settlement_displacement_started_turn', 'municipality_displacement'
]);

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

let changes = 0;

for (const file of project.getSourceFiles()) {
    if (file.getFilePath().includes('game_state.ts') || 
        file.getFilePath().includes('serializeGameState.ts') || 
        file.getFilePath().includes('serialize.ts') || 
        file.getFilePath().includes('validateGameState.ts') ||
        file.getFilePath().includes('_archived')) {
        continue;
    }

    const replacements: { start: number, end: number, text: string }[] = [];

    // Process object literals
    file.getDescendantsOfKind(SyntaxKind.ObjectLiteralExpression).forEach(node => {
        const type = node.getType();
        const contextualType = node.getContextualType();
        const typeText = type.getText();
        const contextualTypeText = contextualType ? contextualType.getText() : '';
        
        let isGameStateLiteral = false;
        
        // Strategy 1: Contextual Type
        if (contextualTypeText.includes('GameState') || contextualTypeText.includes('Partial<GameState>')) {
            isGameStateLiteral = true;
        } 
        // Strategy 2: Type Assertion
        else if (node.getParentIfKind(SyntaxKind.AsExpression)?.getTypeNode()?.getText().includes('GameState')) {
            isGameStateLiteral = true;
        }
        // Strategy 3: Heuristics - does it define factions and some old domain keys?
        else {
            const hasFactions = node.getProperty('factions') !== undefined;
            const hasMeta = node.getProperty('meta') !== undefined;
            if (hasFactions || hasMeta) {
                // Check if it has any of the old keys
                const hasOldKeys = node.getProperties().some(p => {
                    if (PropertyAssignment.isPropertyAssignment(p)) {
                        const name = p.getName();
                        return military_keys.has(name) || political_keys.has(name) || displacement_keys.has(name);
                    }
                    return false;
                });
                if (hasOldKeys) isGameStateLiteral = true;
            }
        }

        if (isGameStateLiteral) {
            const milProps: string[] = [];
            const polProps: string[] = [];
            const dispProps: string[] = [];
            
            node.getProperties().forEach(p => {
                if (PropertyAssignment.isPropertyAssignment(p)) {
                    const name = p.getName();
                    if (military_keys.has(name)) {
                        milProps.push(p.getText());
                    } else if (political_keys.has(name)) {
                        polProps.push(p.getText());
                    } else if (displacement_keys.has(name)) {
                        dispProps.push(p.getText());
                    }
                }
            });

            if (milProps.length > 0 || polProps.length > 0 || dispProps.length > 0) {
                // If we don't already have military/political/displacement properties
                const hasMil = node.getProperty('military') !== undefined;
                const hasPol = node.getProperty('political') !== undefined;
                const hasDisp = node.getProperty('displacement') !== undefined;

                if (!hasMil && !hasPol && !hasDisp) {
                    let newText = '{\n';
                    node.getProperties().forEach(p => {
                        if (PropertyAssignment.isPropertyAssignment(p)) {
                            const name = p.getName();
                            if (!military_keys.has(name) && !political_keys.has(name) && !displacement_keys.has(name)) {
                                newText += `  ${p.getText()},\n`;
                            }
                        } else {
                            newText += `  ${p.getText()},\n`;
                        }
                    });

                    if (milProps.length > 0) newText += `  military: {\n    ${milProps.join(',\n    ')}\n  } as any,\n`;
                    if (polProps.length > 0) newText += `  political: {\n    ${polProps.join(',\n    ')}\n  } as any,\n`;
                    if (dispProps.length > 0) newText += `  displacement: {\n    ${dispProps.join(',\n    ')}\n  } as any,\n`;
                    newText += '}';

                    replacements.push({
                        start: node.getStart(),
                        end: node.getEnd(),
                        text: newText
                    });
                }
            }
        }
    });

    if (replacements.length > 0) {
        replacements.sort((a, b) => b.end - a.end);
        let fullText = file.getFullText();
        for (const rep of replacements) {
            fullText = fullText.substring(0, rep.start) + rep.text + fullText.substring(rep.end);
        }
        fs.writeFileSync(file.getFilePath(), fullText);
        console.log("Saved " + file.getFilePath());
        changes++;
    }
}

console.log('Modified ' + changes + ' files.');
