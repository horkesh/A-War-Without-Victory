const fs = require('fs');

const files = [
  'tests/brigade_aor.test.ts',
  'tests/brigade_corps_front_assign.test.ts',
  'tests/settlement_control.test.ts',
  'tests/ongoing_mobilization.test.ts',
  'tests/displacement_reporting_fix.test.ts',
  'tests/proto_brigade_spawn.test.ts',
  'tests/supply_reserves.test.ts',
  'tests/supply_reserves_phase_b.test.ts',
  'tests/ui_map_officers_phase_e.test.ts',
  'tests/supply_airdrop.test.ts',
  'tests/scenario_operation_diagnostics.test.ts',
  'tests/phase_e_municipality_support.test.ts',
  'tests/h_phase_intelligence_warfare.test.ts',
  'tests/paramilitary_sweep.test.ts',
  'tests/enclave_resilience_phase_c.test.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Fix missing comma before `...(overrides?.domain || {}),`
  // Replace anything that is not whitespace, not a comma, and not `{` immediately preceding the new line
  content = content.replace(/([^\s,\{])(\s*\n\s*\.\.\.\(overrides\?\.(military|political|displacement) \|\| \{\}\),)/g, '$1,$2');

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed missing commas');
