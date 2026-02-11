#!/usr/bin/env node
/**
 * Phase H1.2: Data prerequisites checker (check-only, no generation).
 * Validates required data files exist for new game + scenario harness.
 * Exits non-zero with precise remediation when files are missing.
 */

import { checkDataPrereqs, formatMissingRemediation } from '../../src/data_prereq/check_data_prereqs.js';

function main(): void {
  const result = checkDataPrereqs();

  if (result.ok) {
    process.stdout.write('OK: data prerequisites satisfied.\n');
    process.exit(0);
  }

  process.stderr.write(formatMissingRemediation(result));
  process.exit(1);
}

main();
