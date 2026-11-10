import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'src', 'ui', 'map', 'components', 'command_surface', 'CommandSurface.tsx'),
  'utf8',
);

test('Command Surface header uses a stable high-contrast surface', () => {
  const surface = source();
  expect(surface).toMatch(/<header className="[^"]*bg-\[#141821\]/);
  expect(surface).toContain('text-[#f1e6c8]');
});

test('Command Surface explanations wrap and the detail scrolls back to the top for a new matter', () => {
  const surface = source();
  expect(surface).toContain('line-clamp-2 text-[16px] leading-relaxed');
  expect(surface).toContain('m-0 text-[18px] leading-relaxed text-[#ddd1b3]">{dossier.explanation}');
  expect(surface).toMatch(/data-testid="decision-room-dossier-scroll"/);
  expect(surface).toMatch(/data-testid="decision-room-active-dossier"/);
  expect(surface).toContain('data-card-id={dossier.cardId}');
  expect(surface).toMatch(/detailScrollRef\.current\.scrollTop = 0/);
});
