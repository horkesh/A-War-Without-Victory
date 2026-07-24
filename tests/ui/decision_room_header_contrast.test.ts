import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

test('Decision Room heading uses a stable high-contrast surface', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'army_hq', 'PresidentialDecisionRoomPanel.tsx'),
    'utf8',
  );

  expect(source).toMatch(/data-testid="decision-room-heading"/);
  expect(source).toMatch(/decision-room-heading[\s\S]{0,220}bg-\[#10151d\]\/95/);
});

test('Decision Room explanations wrap while the host remains the only vertical scroll owner', () => {
  const source = readFileSync(
    join(process.cwd(), 'src', 'ui', 'map', 'components', 'army_hq', 'PresidentialDecisionRoomPanel.tsx'),
    'utf8',
  );

  expect(source).not.toMatch(/max-h-12 overflow-hidden text-\[12px\]/);
  expect(source).toMatch(/mt-0\.5 text-\[12px\] leading-snug text-text-secondary/);
  expect(source).toMatch(/data-testid="decision-room-dossier-scroll"/);
  expect(source).toMatch(/data-testid="decision-room-active-dossier"/);
  expect(source).toContain('data-card-id={dossier.cardId}');
  expect(source).toMatch(/lg:sticky lg:top-0/);
  expect(source).not.toContain('lg:overflow-y-auto');
  expect(source).not.toContain('lg:max-h-[calc(76vh-9rem)]');
  expect(source).toMatch(/dossierScrollRef\.current\.scrollTop = 0/);
});
