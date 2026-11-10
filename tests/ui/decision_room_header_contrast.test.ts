import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';

const source = () => readFileSync(
  join(process.cwd(), 'src', 'ui', 'map', 'components', 'command_surface', 'CommandSurface.tsx'),
  'utf8',
);

// The surface chrome lives in the shared surface parts (owner redesign 2026-11-10).
const shared = () => readFileSync(
  join(process.cwd(), 'src', 'ui', 'map', 'components', 'surface', 'Surface.tsx'),
  'utf8',
);

test('Command Surface header uses a stable high-contrast surface', () => {
  expect(source()).toContain('<SurfaceHeader');
  expect(shared()).toMatch(/<header className="[^"]*bg-\[#141821\]/);
  expect(shared()).toContain('text-[#f1e6c8]');
});

test('Command Surface explanations wrap and the detail scrolls back to the top for a new matter', () => {
  const surface = source();
  expect(shared()).toContain('line-clamp-2 text-[16px] leading-relaxed');
  expect(shared()).toContain('m-0 text-[18px] leading-relaxed text-[#ddd1b3]">{explanation}');
  expect(surface).toContain('explanation={dossier.explanation}');
  expect(surface).toMatch(/data-testid="decision-room-dossier-scroll"/);
  expect(surface).toMatch(/data-testid="decision-room-active-dossier"/);
  expect(surface).toContain('data-card-id={dossier.cardId}');
  expect(surface).toMatch(/detailScrollRef\.current\.scrollTop = 0/);
});
