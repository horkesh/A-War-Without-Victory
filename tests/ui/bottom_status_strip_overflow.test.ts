import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('bottom status strip contains wide faction telemetry without shifting controls offscreen', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'BottomStatusStrip.tsx'),
    'utf8',
  );

  expect(source).toMatch(/data-awwv-counter-occluder="true"[\s\S]{0,220}justify-start[\s\S]{0,120}overflow-hidden/);
  expect(source).toMatch(/hidden lg:flex min-w-0 flex-1[\s\S]{0,100}overflow-hidden/);
  expect(source).not.toMatch(/hidden lg:flex min-w-0 flex-1[\s\S]{0,100}overflow-x-auto/);
  expect(source).toMatch(/Active operations count[\s\S]{0,260}shrink-0 whitespace-nowrap[\s\S]{0,180}text-xs/);
});

test('branch-tag badges remain a bounded non-scrolling telemetry row', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'ActiveBranchPathRow.tsx'),
    'utf8',
  );

  expect(source).toMatch(/active-branch-path-row flex min-w-0 flex-1/);
  expect(source).toMatch(/shrink-0 whitespace-nowrap rounded-sm/);
  expect(source).not.toMatch(/data-testid="branch-tag-chip"[\s\S]{0,180}(?:truncate|max-w-40)/);
  expect(source).toMatch(/TWO_CHIP_MIN_VIEWPORT_PX = 1600/);
  expect(source).toMatch(/data-testid="branch-tag-compact"/);
  expect(source).not.toMatch(/branch-tag-badge-row flex shrink-0 flex-nowrap/);
});

test('Situation prose owns a wrapping width contract instead of relying on clipping', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'SituationTab.tsx'),
    'utf8',
  );

  expect(source).toMatch(/data-testid="situation-tab-content"[\s\S]{0,140}min-w-0 max-w-full[\s\S]{0,80}\[overflow-wrap:anywhere\]/);
  expect(source.match(/data-oob-wrapping-prose="true"/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
});

test('Command OOB scroll region permits only vertical scrolling', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'OOBSidebar.tsx'),
    'utf8',
  );

  expect(source).toMatch(/data-testid="oob-sidebar-scroll-region"[\s\S]{0,120}overflow-y-auto[\s\S]{0,80}overflow-x-hidden/);
  expect(source).not.toMatch(/className="flex-1 overflow-auto min-h-0 min-w-0"/);
});
