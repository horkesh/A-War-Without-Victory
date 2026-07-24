import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';

test('Personnel reserve-officer details scroll instead of clipping the available names', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'army_hq', 'PersonnelContent.tsx'),
    'utf8',
  );

  expect(source).not.toMatch(/line-clamp-2 text-xs leading-snug text-text-secondary/);
  expect(source).toMatch(/max-h-24 overflow-y-auto text-xs leading-snug text-text-secondary/);
});

test('force, mobilization, and casualty labels state their non-comparable scopes', () => {
  expect(enMessages['personnel.totalPersonnel']).toBe('Fielded personnel now');
  expect(enMessages['personnel.mobilization']).toBe('CUMULATIVE MOBILIZATION THROUGHPUT');
  expect(enMessages['personnel.mobilization.committed']).toBe('Committed over campaign');
  expect(enMessages['situation.casualties']).toBe('Campaign military casualties');

  expect(bcsMessages['personnel.totalPersonnel']).toBe('Trenutno ljudstvo na terenu');
  expect(bcsMessages['personnel.mobilization']).toBe('KUMULATIVNI TOK MOBILIZACIJE');
  expect(bcsMessages['personnel.mobilization.committed']).toBe('Angažovano tokom kampanje');
  expect(bcsMessages['situation.casualties']).toBe('Vojni gubici tokom kampanje');
});
