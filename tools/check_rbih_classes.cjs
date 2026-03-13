const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));
const rbih = oob.filter(b => b.faction === 'RBiH');
const classes = {};
rbih.forEach(b => { classes[b.default_equipment_class || 'unknown'] = (classes[b.default_equipment_class || 'unknown'] || 0) + 1; });
console.log('RBiH equipment classes:', JSON.stringify(classes, null, 2));
console.log('\nRBiH non-light_infantry:');
rbih.filter(b => b.default_equipment_class !== 'light_infantry').forEach(b => {
    console.log(`  ${b.id} (${b.default_equipment_class}) — ${b.name}`);
});
