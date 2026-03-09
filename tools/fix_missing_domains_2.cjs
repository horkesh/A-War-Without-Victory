const fs = require('fs');

const files = [
  'tests/brigade_aor.test.ts',
  'tests/brigade_corps_front_assign.test.ts',
  'tests/settlement_control.test.ts',
  'tests/proto_brigade_spawn.test.ts',
  'tests/supply_reserves.test.ts',
  'tests/enclave_resilience_phase_c.test.ts',
  'tests/supply_reserves_phase_b.test.ts',
  'tests/ui_map_officers_phase_e.test.ts',
  'tests/supply_airdrop.test.ts',
  'tests/scenario_operation_diagnostics.test.ts',
  'tests/phase_e_municipality_support.test.ts',
  'tests/h_phase_intelligence_warfare.test.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Insert political if missing
  if (!content.includes('political: {')) {
    content = content.replace(/(\n\s*military: \{[\s\S]*?\}\s*as\s*any,?)/, '$1\n  political: {} as any,');
  }
  
  // Insert displacement if missing
  if (!content.includes('displacement: {')) {
    // try to insert after political
    if (content.includes('political: {')) {
      content = content.replace(/(\n\s*political: \{[\s\S]*?\}\s*as\s*any,?)/, '$1\n  displacement: {} as any,');
    } else {
      // insert before closing brace of GameState
      content = content.replace(/(\n)(\} as (unknown as )?GameState)/, ',\n  displacement: {} as any$1$2');
    }
  }

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed missing domains');
