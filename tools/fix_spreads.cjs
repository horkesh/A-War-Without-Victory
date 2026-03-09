const fs = require('fs');

const files = [
  'tests/brigade_aor.test.ts',
  'tests/brigade_corps_front_assign.test.ts',
  'tests/settlement_control.test.ts',
  'tests/ongoing_mobilization.test.ts',
  'tests/displacement_reporting_fix.test.ts',
  'tests/supply_reserves.test.ts',
  'tests/supply_reserves_phase_b.test.ts',
  'tests/supply_airdrop.test.ts',
  'tests/phase_c_supply_agency.test.ts',
  'tests/phase_e_municipality_support.test.ts',
  'tests/paramilitary_sweep.test.ts',
  'tests/enclave_resilience_phase_c.test.ts'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Let's find the overrides parameter name
  let paramName = 'overrides';
  const match = content.match(/function make[A-Za-z]*State\((.*?)(?:\:| \=)/);
  if (match) {
      const p = match[1].trim();
      if (p === 'extra') paramName = 'extra';
  }

  for (const domain of ['military', 'political', 'displacement']) {
      // Find the end of the domain block: `domain: { ... } as any,`
      // We will match the domain block by matching from `domain: {` to the matching closing brace.
      // But a simple regex `(domain: \\{[\\s\\S]*?)(\\n\\s*\\}\\s*as\\s*(?:any|unknown))` might match too far if there are nested `} as any`.
      // Luckily, our test mock states don't usually have nested `} as any` inside military/political!
      // Let's check this assumption. If they do, this regex will be greedy if we don't use *?.
      // `[\\s\\S]*?` is non-greedy, so it matches the FIRST `} as any`.
      
      const blockStartRegex = new RegExp(`(${domain}: \\{[\\s\\S]*?)(\\n\\s*\\}\\s*as\\s*(?:any|unknown))`, 'g');
      
      // Before replacing, let's remove any existing `...(paramName?.domain || {}),` to avoid duplicates
      const removeRegex = new RegExp(`\\s*\\.\\.\\.\\(${paramName}\\?\\.${domain} \\|\\| \\{\\}\\),?\\n`, 'g');
      content = content.replace(removeRegex, '\n');
      
      content = content.replace(blockStartRegex, `$1\n    ...(${paramName}?.${domain} || {}),$2`);
  }

  fs.writeFileSync(file, content, 'utf8');
}
console.log('Added spreads to end of domains');
