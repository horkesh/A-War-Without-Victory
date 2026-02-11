/**
 * Print Context CLI: Display project context summary
 *
 * Prints:
 *   - Project ledger summary (current phase, top non-negotiables, top next tasks)
 *
 * Usage:
 *   tsx tools/assistant/print_context.ts
 *   npm run context
 */

import { getLedgerSummary } from './project_ledger_guard';

function main(): void {
  console.log('='.repeat(80));
  console.log('AWWV Project Context Summary');
  console.log('='.repeat(80));
  console.log();
  console.log('PROJECT LEDGER SUMMARY');
  console.log('-'.repeat(80));
  try {
    const summary = getLedgerSummary();
    console.log(summary);
  } catch (err) {
    console.error('Error loading project ledger:', err instanceof Error ? err.message : String(err));
  }
  console.log();
  console.log('-'.repeat(80));
  console.log();
  console.log('For full details, see: docs/PROJECT_LEDGER.md');
  console.log();
}

main();
