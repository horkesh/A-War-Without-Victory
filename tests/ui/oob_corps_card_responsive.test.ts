import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('OOB corps cards reflow their intrinsic rows inside the sidebar owner', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'CorpsCard.tsx'),
    'utf8',
  );

  expect(source).toMatch(/data-testid="oob-corps-card"[\s\S]{0,180}min-w-0 max-w-full/);
  expect(source.match(/min-w-0 flex-col items-stretch/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  expect(source).toMatch(/px-3 py-1\.5 flex flex-wrap items-center gap-x-3 gap-y-1/);
  expect(source).toMatch(/px-3 py-1\.5 flex flex-wrap items-center gap-2/);
  expect(source).toMatch(/flex min-w-0 flex-1 flex-wrap items-center gap-2/);
  expect(source).toMatch(/aria-label=\{t\('corpsCard\.stanceAria'\)\}[\s\S]{0,160}max-w-full min-w-0/);
});

test('packaged map geometry rejects a locally overflowing OOB corps card', () => {
  const harness = readFileSync(
    join(process.cwd(), 'tools', 'ui', 'paradox_local_qa.cjs'),
    'utf8',
  );

  expect(harness).toContain("[data-testid=\"oob-corps-card\"]");
  expect(harness).toContain('oobCorpsCards');
  expect(harness).toContain('OOB corps card content exceeds its rendered owner');
});
