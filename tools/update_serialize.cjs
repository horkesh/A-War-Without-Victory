const fs = require('fs');
const path = require('path');

let serialize_path = path.join(__dirname, '../src/state/serializeGameState.ts');
let ser_content = fs.readFileSync(serialize_path, 'utf8');

const regex = /const GAMESTATE_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set\(\[[\s\S]*?\]\);/m;
const newSet = `const GAMESTATE_TOP_LEVEL_KEYS: ReadonlySet<string> = new Set([
    'schema_version',
    'meta',
    'factions',
    'turn_summaries',
    'operation_history',
    'pending_paramilitary_requests',
    'paramilitary_policy',
    'paramilitary_deployment_count',
    'military',
    'political',
    'displacement'
]);`;

ser_content = ser_content.replace(regex, newSet);
fs.writeFileSync(serialize_path, ser_content);
console.log('Updated serializeGameState.ts');
