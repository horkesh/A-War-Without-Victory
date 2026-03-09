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

  // Let's use a regex to capture the domain block
  for (const domain of ['military', 'political', 'displacement']) {
      // Find where we added `...(overrides?.domain || {}),` inside the domain block.
      // This regex matches the line containing the spread, capturing everything before and after it.
      const spreadRegex = new RegExp(`^\\s*\\.\\.\\.\\(overrides\\?\\.${domain} \\|\\| \\{\\}\\),\\r?\\n`, 'gm');
      
      if (content.match(spreadRegex)) {
          // Remove the spread from its current location
          content = content.replace(spreadRegex, '');
          
          // Now we need to insert it back right before the closing brace of that domain.
          // We can find the domain block like: `domain: { ... } as any,`
          // Since the block might be multiline, we find the start `domain: {` and the matching `} as any,`
          
          // A simple hack is to replace `} as any,` with `    ...(overrides?.${domain} || {}),\n  } as any,`
          // But only for the specific domain's block.
          
          // Better: just find `domain: {` and use regex to find the closing brace.
          const blockStartRegex = new RegExp(`(${domain}: \\{[\\s\\S]*?)(\\n\\s*\\}\\s*as\\s*any)`, 'g');
          content = content.replace(blockStartRegex, `$1\n    ...(overrides?.${domain} || {}),$2`);
      }
  }
  
  fs.writeFileSync(file, content, 'utf8');
}
console.log('Fixed ordering');
