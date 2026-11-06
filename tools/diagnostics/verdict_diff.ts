/**
 * verdict_diff — grade two final saves with the game's own verdict function and print the diff.
 *
 *   npx tsx tools/diagnostics/verdict_diff.ts <run_dir_A> <run_dir_B>
 *
 * Prints, per faction: Pyrrhic score, letter grade, outcome class, condemnation flags, and the
 * effective value of every strategic dimension; then the camps-response flags. Read-only; the
 * saves are loaded as-is through the state loader. Deterministic: no clock, no RNG.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { computeFactionVerdict } from '../../src/sim/negotiation/scoring.js';
import type { GameState } from '../../src/state/game_state.js';

const [dirA, dirB] = process.argv.slice(2);
if (!dirA || !dirB) { console.error('usage: verdict_diff <run_dir_A> <run_dir_B>'); process.exit(2); }

function loadFinal(dir: string): GameState {
  const raw = JSON.parse(readFileSync(join(dir, 'final_save.json'), 'utf8'));
  return (raw.state ?? raw.gameState ?? raw) as GameState;
}
const factions = ['RBiH', 'RS', 'HRHB'];
const a = loadFinal(dirA), b = loadFinal(dirB);
console.log(`A: ${dirA}\nB: ${dirB}\n`);
for (const f of factions) {
  const va = computeFactionVerdict(a, f), vb = computeFactionVerdict(b, f);
  const mark = (x: unknown, y: unknown) => (JSON.stringify(x) === JSON.stringify(y) ? '' : '   <-- DIFF');
  console.log(`== ${f}`);
  console.log(`  pyrrhic_score  A=${va.pyrrhic_score}  B=${vb.pyrrhic_score}${mark(va.pyrrhic_score, vb.pyrrhic_score)}`);
  console.log(`  grade          A=${va.grade}  B=${vb.grade}${mark(va.grade, vb.grade)}`);
  console.log(`  outcome_class  A=${va.outcome_class}  B=${vb.outcome_class}${mark(va.outcome_class, vb.outcome_class)}`);
  console.log(`  condemnation   A=${JSON.stringify(va.condemnation_flags)}  B=${JSON.stringify(vb.condemnation_flags)}${mark(va.condemnation_flags, vb.condemnation_flags)}`);
  for (const da of va.dimension_grades) {
    const db = vb.dimension_grades.find((d) => d.dimension === da.dimension);
    if (!db || da.score !== db.score || da.grade !== db.grade) {
      console.log(`  ${da.dimension.padEnd(24)} A=${da.score} (${da.grade})  B=${db?.score} (${db?.grade})   <-- DIFF`);
    }
  }
}
const flagsA = (a as unknown as { event_flags?: Record<string, unknown> }).event_flags ?? {};
const flagsB = (b as unknown as { event_flags?: Record<string, unknown> }).event_flags ?? {};
for (const k of ['camps_response', 'hrhb_camps_response', 'rs_paramilitary_policy']) {
  console.log(`flag ${k}: A=${JSON.stringify(flagsA[k])}  B=${JSON.stringify(flagsB[k])}`);
}
