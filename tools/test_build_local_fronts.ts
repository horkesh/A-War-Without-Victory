import { readFileSync } from 'fs';
import { buildLocalFronts } from '../src/sim/phase_ii/local_front_defense.js';
import type { GameState } from '../src/state/game_state.js';

const data = JSON.parse(readFileSync('runs/apr1992_definitive_40w__205b3676c8fe3ce4__w40_n297/final_save.json', 'utf8'));
const state: GameState = data.state || data.gameState || data;

console.log('segments type:', typeof state.assignable_front_segments, Array.isArray(state.assignable_front_segments));
console.log('segments length:', (state.assignable_front_segments ?? []).length);
console.log('bfa keys:', Object.keys(state.brigade_front_assignment ?? {}).length);
console.log('formations keys:', Object.keys(state.formations ?? {}).length);

const result = buildLocalFronts(state);
console.log('\nbuildLocalFronts result:', Object.keys(result).length, 'fronts');
for (const [k, v] of Object.entries(result)) {
    console.log(`  ${k.substring(0, 60)}: ${v.assigned_brigade_ids.length} brigades, ${v.coverage_length} edges`);
}
