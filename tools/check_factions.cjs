const fs = require('fs');
const d = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));

// Check what field contains political control
console.log('Has political_controllers:', 'political_controllers' in d);
console.log('Has osid_political_controllers:', 'osid_political_controllers' in d);

// Check nested in state
if (d.political_controllers) {
  const vals = new Set(Object.values(d.political_controllers));
  console.log('Factions in political_controllers:', [...vals].sort());
  console.log('  Count:', Object.keys(d.political_controllers).length);
}

// Check under different paths
for (const key of Object.keys(d).sort()) {
  const v = d[key];
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    if ('political_controllers' in v) {
      console.log('Found political_controllers under:', key);
      const vals = new Set(Object.values(v.political_controllers));
      console.log('  Factions:', [...vals].sort());
      console.log('  Count:', Object.keys(v.political_controllers).length);
      // Show a sample Srebrenica OSID
      const sreb = Object.entries(v.political_controllers).find(([k]) => k.includes('srebrenica'));
      if (sreb) console.log('  Sample:', sreb[0], '->', sreb[1]);
    }
  }
}
