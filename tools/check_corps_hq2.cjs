const fs = require('fs');
const save = JSON.parse(fs.readFileSync('data/derived/latest_run_final_save.json', 'utf8'));
const formations = save.military.formations;

// Find all unique kinds
const kinds = new Set();
for (const f of Object.values(formations)) kinds.add(f.kind);
console.log('Kinds:', [...kinds].sort());

// Find corps-like formations by ID
console.log('\n=== Corps-like formations (by ID) ===\n');
for (const [id, f] of Object.entries(formations).sort()) {
  if (id.includes('corps') || id.includes('staff') || id.includes('_oz') || id.includes('1st_krajina') || id.includes('2nd_krajina') || id.includes('drina') || id.includes('east_bosnian') || id.includes('sarajevo_romanija') || id.includes('herzegovina')) {
    console.log(id + '  kind=' + f.kind + '  faction=' + f.faction + '  loc=' + f.location_osid + '  hq_osid=' + f.hq_osid + '  type=' + f.type + '  corps_id=' + f.corps_id);
  }
}
