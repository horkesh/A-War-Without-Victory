const fs = require('fs');
const oob = JSON.parse(fs.readFileSync('data/source/oob_brigades.json', 'utf8'));

// Check which 2nd corps brigades have mandatory_recruit
const corps2 = oob.filter(b => b.corps === 'arbih_2nd_corps');
const mandatory = corps2.filter(b => b.mandatory_recruit);
const notMandatory = corps2.filter(b => b.mandatory_recruit !== true);
console.log('2nd Corps: ' + mandatory.length + ' mandatory, ' + notMandatory.length + ' elective');
console.log('Mandatory:');
for (const b of mandatory) {
  console.log('  ', b.id, 'home:', b.home_osid, 'pers:', b.initial_personnel);
}
console.log('\nElective (not mandatory):');
for (const b of notMandatory) {
  console.log('  ', b.id, 'home:', b.home_osid, 'pers:', b.initial_personnel, 'mandatory_recruit:', b.mandatory_recruit);
}

// For comparison, check RS in same area
console.log('\n--- RS brigades in East Bosnia/Posavina ---');
const rsEB = oob.filter(b => b.faction === 'RS' &&
  (b.corps === 'rs_east_bosnia_corps' || b.id.includes('posavina') || b.id.includes('semberija') || b.id.includes('bijeljina') || b.id.includes('majevica')));
for (const b of rsEB) {
  console.log('  ', b.id, 'corps:', b.corps, 'mandatory:', b.mandatory_recruit, 'pers:', b.initial_personnel);
}
