import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile('data/derived/municipality_population_1991.json', 'utf8'));
const byMun = data.by_mun1990_id;

// Simulate pool population with population weighting
const POOL_SCALE_FACTOR = 30;
const ELIGIBLE_POP_NORMALIZER = 50000;
const FACTION_POOL_SCALE = { RBiH: 1.18, RS: 0.98, HRHB: 0.58 };

// Assume average militia strength of 50 per municipality per faction
const AVG_STRENGTH = 50;

const totals = { RBiH: 0, RS: 0, HRHB: 0 };

for (const [munId, pop] of Object.entries(byMun)) {
  const rbihPop = pop.breakdown.bosniak;
  const rsPop = pop.breakdown.serb;
  const hrhbPop = pop.breakdown.croat;

  const rbihWeight = rbihPop / ELIGIBLE_POP_NORMALIZER;
  const rsWeight = rsPop / ELIGIBLE_POP_NORMALIZER;
  const hrhbWeight = hrhbPop / ELIGIBLE_POP_NORMALIZER;

  totals.RBiH += Math.floor(AVG_STRENGTH * POOL_SCALE_FACTOR * rbihWeight * FACTION_POOL_SCALE.RBiH);
  totals.RS += Math.floor(AVG_STRENGTH * POOL_SCALE_FACTOR * rsWeight * FACTION_POOL_SCALE.RS);
  totals.HRHB += Math.floor(AVG_STRENGTH * POOL_SCALE_FACTOR * hrhbWeight * FACTION_POOL_SCALE.HRHB);
}

console.log('=== Theoretical manpower with population weighting (strength=50) ===');
console.log('RBiH:', totals.RBiH, '(', Math.floor(totals.RBiH / 800), 'brigades @800)');
console.log('RS:', totals.RS, '(', Math.floor(totals.RS / 800), 'brigades @800)');
console.log('HRHB:', totals.HRHB, '(', Math.floor(totals.HRHB / 800), 'brigades @800)');

// Without population weighting (the current broken state)
const noWeight = { RBiH: 0, RS: 0, HRHB: 0 };
const numMunicipalities = 110;
noWeight.RBiH = numMunicipalities * Math.floor(AVG_STRENGTH * POOL_SCALE_FACTOR * 1.0 * FACTION_POOL_SCALE.RBiH);
noWeight.RS = numMunicipalities * Math.floor(AVG_STRENGTH * POOL_SCALE_FACTOR * 1.0 * FACTION_POOL_SCALE.RS);
noWeight.HRHB = numMunicipalities * Math.floor(AVG_STRENGTH * POOL_SCALE_FACTOR * 1.0 * FACTION_POOL_SCALE.HRHB);

console.log('\n=== Theoretical manpower WITHOUT population weighting (strength=50) ===');
console.log('RBiH:', noWeight.RBiH, '(', Math.floor(noWeight.RBiH / 800), 'brigades @800)');
console.log('RS:', noWeight.RS, '(', Math.floor(noWeight.RS / 800), 'brigades @800)');
console.log('HRHB:', noWeight.HRHB, '(', Math.floor(noWeight.HRHB / 800), 'brigades @800)');

// What actual militia strength values would we see?
// The scenario uses ethnic_1991 control which doesn't seed organizational_penetration
// So militia_emergence would produce near-zero values
console.log('\n=== NOTE: If militia_emergence produces 0 strength, all pools are empty ===');
console.log('The real issue may be organizational_penetration not being seeded for ethnic_1991 init');
