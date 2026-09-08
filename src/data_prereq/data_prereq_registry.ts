/**
 * Phase H1.2: Single source of truth for data prerequisites required to start a new game
 * and run the scenario harness. Derived from actual dependency points (prepareNewGameState,
 * loadSettlementGraph). No speculative prereqs.
 */

import type { DataPrereq } from './data_prereq_types.js';

export const DATA_PREREQS: DataPrereq[] = [
    {
        id: 'municipality_controller_mapping',
        description: 'Municipality → political controller mapping (Turn 0 political control init)',
        required_paths: ['data/source/municipality_political_controllers.json'],
        remediation: {
            commands: ['npm run data:extract1990'],
            notes: [
                'Produces data/source/municipality_political_controllers.json from DOCX (1990 municipal winners).',
                'If file is authored manually, see docs/audits and PROJECT_LEDGER Phase 6B.2.'
            ]
        }
    },
    {
        id: 'settlement_graph',
        description: 'Settlement index and edges (loadSettlementGraph for new game + harness)',
        required_paths: ['data/derived/settlements_index.json', 'data/derived/settlement_edges.json'],
        remediation: {
            commands: ['npm run map:build'],
            notes: [
                'Produces data/derived/settlements_index.json and data/derived/settlement_edges.json.'
            ]
        }
    },
    {
        id: 'production_turn_inputs',
        description: 'Validated census, ethnicity, OOB and HQ inputs for production turn advance',
        required_paths: [
            'data/derived/municipality_population_1991.json',
            'data/derived/census_rolled_up_wgs84.json',
            'data/derived/settlement_ethnicity_data.json',
            'data/source/oob_brigades.json',
            'data/source/municipalities_1990_registry_110.json',
            'data/derived/municipality_hq_settlement.json'
        ],
        remediation: {
            commands: [],
            notes: [
                'Restore the named runtime resources from the canonical repository inputs; the prerequisite check does not generate or download them.'
            ]
        }
    }
];
