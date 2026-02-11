/**
 * Phase H6.10.10 — Demo script (stub).
 *
 * The mistake-logging mechanism was discontinued. This script is kept for
 * reference; it no-op runs and exits 0.
 *
 * Usage: npx tsx scripts/map/phase_h6_10_10_mistake_logging_demo.ts
 */

async function main(): Promise<void> {
  if (process.env.DEMO_RAISE === '1') {
    throw new Error('Demo raise (mistake log discontinued)');
  }
  console.log('Demo OK (no raise).');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
