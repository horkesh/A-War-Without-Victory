import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('bottom status strip contains wide faction telemetry without shifting controls offscreen', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'BottomStatusStrip.tsx'),
    'utf8',
  );

  expect(source).toMatch(/data-awwv-counter-occluder="true"[\s\S]{0,220}justify-start[\s\S]{0,120}overflow-hidden/);
  expect(source).toMatch(/hidden lg:flex min-w-0 flex-1[\s\S]{0,100}overflow-x-auto/);
  expect(source).toMatch(/Active operations count[\s\S]{0,260}shrink-0 whitespace-nowrap[\s\S]{0,180}text-xs/);
});

test('branch-tag badges remain a single scrollable telemetry row', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'BranchTagBadgeRow.tsx'),
    'utf8',
  );

  expect(source).toMatch(/branch-tag-badge-row flex shrink-0 flex-nowrap/);
});
