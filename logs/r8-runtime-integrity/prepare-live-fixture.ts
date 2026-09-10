import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { serializeState } from '../../src/state/serialize.js';
import { CURRENT_SCHEMA_VERSION } from '../../src/state/game_state.js';

const root = process.cwd();
const out = resolve(root, 'logs/r8-runtime-integrity/live-fixture');
const required = [
    'data/derived/municipality_population_1991.json',
    'data/derived/census_rolled_up_wgs84.json',
    'data/derived/settlement_ethnicity_data.json',
    'data/derived/municipality_hq_settlement.json',
    'data/source/oob_brigades.json',
    'data/source/municipalities_1990_registry_110.json',
];
const paths = [...required,
    'data/source/settlements_initial_master.json',
    'data/source/municipalities_1990_initial_political_controllers.json',
    'data/source/municipalities_1990_initial_political_controllers_apr1992.json',
    'data/derived/settlement_edges.json',
    'data/derived/operational/operational_settlements.geojson',
    'data/derived/operational/operational_contact_graph.json',
    'data/derived/operational/canonical_to_operational_map.json',
    'data/derived/operational/operational_initial_master.json',
    'data/derived/terrain/settlements_terrain_scalars.json',
    ...readdirSync(join(root, 'data/scenarios/events')).filter(name => name.endsWith('.json')).sort()
        .map(name => `data/scenarios/events/${name}`),
];
for (const file of paths) {
    const target = join(out, file); mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, file), target);
}
// Minimal synthetic war state based on tests/turn_pipeline.test.ts. No campaign
// initialization or scenario execution. Real production loader inputs retain bytes.
const state = {
    schema_version: CURRENT_SCHEMA_VERSION,
    meta: { turn: 0, seed: 'bc09-local-ipc', phase: 'war', referendum_held: true,
        referendum_turn: 0, war_start_turn: 0 },
    factions: [],
    military: { formations: {}, front_segments: {}, front_posture: {},
        front_posture_regions: {}, front_pressure: {}, militia_pools: {} },
    political: { political_controllers: {} }, displacement: {},
};
writeFileSync(join(out, 'state.json'), serializeState(state as any));
writeFileSync(join(out, 'required-files.json'), JSON.stringify(required, null, 2));
writeFileSync(join(out, 'fixture-notes.json'), JSON.stringify({
    kind: 'minimal synthetic war state with unchanged production loader inputs',
    source: 'tests/turn_pipeline.test.ts baseState shape; canonicalized by serializeState',
    files: paths, eventDirectory: 'unchanged production catalog supplied for existing desktop requirement',
    noCampaign: true, schema: JSON.parse(readFileSync(join(out,'state.json'),'utf8')).schema_version,
}, null, 2));
console.log(out);
