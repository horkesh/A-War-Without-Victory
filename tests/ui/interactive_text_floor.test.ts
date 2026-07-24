import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('interactive text floor', () => {
  function productionFiles(root: string): string[] {
    return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return entry.name === 'node_modules' ? [] : productionFiles(path);
      return /\.(?:css|html|ts|tsx)$/.test(entry.name) ? [path] : [];
    });
  }

  it('does not encode sub-12px game text in production UI sources', () => {
    const offenders = [
      ...productionFiles('src/ui/map'),
      ...productionFiles('src/ui/warroom'),
    ].flatMap((path) => {
      const source = readFileSync(path, 'utf8');
      const matches = source.match(/(?:text-\[(?:8|9|10|11)px\]|font-size\s*:\s*(?:8|9|10|11)px|fontSize\s*:\s*['"](?:8|9|10|11)px['"])/g);
      return matches ? [`${path}: ${matches.length}`] : [];
    });

    expect(offenders).toEqual([]);
  });

  it('keeps Warroom and tactical route labels at 12px or larger', () => {
    const warroom = readFileSync('src/ui/warroom/index.html', 'utf8');
    const toolbar = readFileSync('src/ui/map/components/PresidentialToolbar.tsx', 'utf8');
    const app = readFileSync('src/ui/map/App.tsx', 'utf8');

    expect(warroom).toMatch(/\.wr-toolbar-btn[\s\S]{0,500}font-size:\s*12px/);
    expect(toolbar).not.toMatch(/data-testid="toolbar-route-[^"]+"[\s\S]{0,220}text-\[(?:8|9|10|11)px\]/);
    expect(app).toContain('data-testid={`warroom-overlay-${surface}-close`}');
    expect(app).toContain('data-testid={`warroom-overlay-${surface}-drill-in`}');
    expect(app).not.toMatch(/data-testid=\{`warroom-overlay-\$\{surface\}-(?:close|drill-in)`\}[\s\S]{0,220}text-\[(?:8|9|10|11)px\]/);
  });

  it('keeps OOB action labels at 12px or larger', () => {
    const sidebar = readFileSync('src/ui/map/components/OOBSidebar.tsx', 'utf8');
    const corps = readFileSync('src/ui/map/components/CorpsCard.tsx', 'utf8');

    expect(sidebar).not.toMatch(/data-testid="oob-(?:ungrouped|hq-reserve)-brigade"[\s\S]{0,260}text-\[(?:8|9|10|11)px\]/);
    expect(corps).not.toMatch(/<(?:button|select)[\s\S]{0,260}text-\[(?:8|9|10|11)px\]/);
  });
});
