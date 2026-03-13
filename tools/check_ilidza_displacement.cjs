const j = JSON.parse(require('fs').readFileSync('runs/apr1992_definitive_40w__4ab31bb498ec8005__w40_n656/final_save.json', 'utf8'));
const log = j.displacement.displacement_event_log || [];
const ilidza = log.filter(e => e.origin_mun === 'ilidza' && e.ethnicity === 'RBiH' && e.dest_mun !== 'ilidza');
ilidza.sort((a, b) => a.turn - b.turn);
console.log('Total non-self Ilidza RBiH events:', ilidza.length);
ilidza.slice(0, 15).forEach(e => {
    console.log(`  turn ${e.turn} → ${e.dest_mun}  settled:${e.settled}  displaced:${e.displaced}`);
});

// Check what reconstitution would see at turn 9
console.log('\n--- Events available at turn 9 (reconstitution eligibility) ---');
const byT9 = ilidza.filter(e => e.turn < 9);
console.log('Events before turn 9:', byT9.length);
byT9.forEach(e => console.log(`  turn ${e.turn} → ${e.dest_mun}  settled:${e.settled}`));
const atT9 = ilidza.filter(e => e.turn === 9);
console.log('Events at turn 9:', atT9.length);
atT9.forEach(e => console.log(`  turn ${e.turn} → ${e.dest_mun}  settled:${e.settled}`));
