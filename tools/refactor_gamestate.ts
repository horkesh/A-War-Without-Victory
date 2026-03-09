import { Project, SyntaxKind, Type } from 'ts-morph';
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

function isGameStateType(type: Type): boolean {
    const sym = type.getSymbol() || type.getAliasSymbol();
    if (!sym) return false;
    const name = sym.getName();
    return ['GameState', 'GameSave', 'LoadedGameState', 'Preload3DDataCache'].includes(name);
}

function isOrContainsGameState(type: Type): boolean {
    if (isGameStateType(type)) return true;
    if (type.isUnion()) return type.getUnionTypes().some(isGameStateType);
    if (type.isIntersection()) return type.getIntersectionTypes().some(isGameStateType);
    const baseTypes = type.getBaseTypes();
    if (baseTypes && baseTypes.some(t => isGameStateType(t))) return true;
    const aliasSym = type.getAliasSymbol();
    if (aliasSym && ['GameState', 'GameSave', 'LoadedGameState', 'Partial', 'Preload3DDataCache'].includes(aliasSym.getName())) return true;
    return false;
}

let changes = 0;

for (const file of project.getSourceFiles()) {
    if (file.getFilePath().includes('game_state.ts') || 
        file.getFilePath().includes('serializeGameState.ts') || 
        file.getFilePath().includes('serialize.ts') || 
        file.getFilePath().includes('validateGameState.ts') ||
        file.getFilePath().includes('_archived')) {
        continue;
    }

    let fileChanged = false;

    // To prevent invalidating the AST by replacing text mid-iteration, we collect replacements
    const replacements: { start: number, end: number, text: string }[] = [];

    file.getDescendantsOfKind(SyntaxKind.PropertyAccessExpression).forEach(node => {
        const name = node.getName();
        let domain = null;
        if (military_keys.has(name)) domain = 'military';
        else if (political_keys.has(name)) domain = 'political';
        else if (displacement_keys.has(name)) domain = 'displacement';
        
        if (domain) {
            const exp = node.getExpression();
            const type = exp.getType();
            const text = exp.getText();
            const isGameStateHeuristic = ['state', 'gameState', 'this.gameState', 'context.state', 'draft', 'save.state', 'candidate', 'original', 'indexData', 'censusData'].some(s => text.endsWith(s));
            
            if (isOrContainsGameState(type) || isGameStateHeuristic) {
                if (text.endsWith('.' + domain) || text.endsWith('?.' + domain)) return;
                const isOptional = node.hasQuestionDotToken();
                replacements.push({
                    start: node.getStart(),
                    end: node.getEnd(),
                    text: `${text}${isOptional ? '?.' : '.'}${domain}${isOptional ? '?.' : '.'}${name}`
                });
            }
        }
    });

    file.getDescendantsOfKind(SyntaxKind.ElementAccessExpression).forEach(node => {
        const arg = node.getArgumentExpression();
        if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
            const name = arg.getText().replace(/['"]/g, '');
            let domain = null;
            if (military_keys.has(name)) domain = 'military';
            else if (political_keys.has(name)) domain = 'political';
            else if (displacement_keys.has(name)) domain = 'displacement';

            if (domain) {
                const exp = node.getExpression();
                const type = exp.getType();
                const text = exp.getText();
                const isGameStateHeuristic = ['state', 'gameState', 'this.gameState', 'context.state', 'draft', 'save.state', 'candidate', 'original', 'indexData', 'censusData'].some(s => text.endsWith(s));

                if (isOrContainsGameState(type) || isGameStateHeuristic) {
                    if (text.endsWith('.' + domain) || text.endsWith('?.' + domain)) return;
                    replacements.push({
                        start: node.getStart(),
                        end: node.getEnd(),
                        text: `${text}.${domain}['${name}']`
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
        console.log("Saving " + file.getFilePath());
        changes++;
    }
}

console.log('Modified ' + changes + ' files.');
