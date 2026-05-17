import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');
const componentsRoot = resolve(repoRoot, 'src/ui/map/components');

const FILES = [
  'BottomStatusStrip.tsx',
  'CorpsCard.tsx',
  'CreditsScreen.tsx',
  'GlassPanel.tsx',
  'OOBSidebar.tsx',
  'PauseMenu.tsx',
  'SettlementDetailContent.tsx',
  'SettingsScreen.tsx',
  'StackExpansionOverlay.tsx',
  'StrategicDashboard.tsx',
  'chronicle/ChronicleSpine.tsx',
  'chronicle/WrappedOverlay.tsx',
] as const;

const NON_INTERACTIVE_TAGS = ['div', 'span', 'li', 'section', 'article', 'p'] as const;

function readComponent(path: string): string {
  return readFileSync(resolve(componentsRoot, path), 'utf8');
}

function jsxStartTags(source: string, tag: string): string[] {
  const tags: string[] = [];
  const pattern = new RegExp(`<${tag}\\b`, 'g');
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    let i = match.index + match[0].length;
    while (i < source.length) {
      if (source[i] === '>' && source[i - 1] !== '=') {
        tags.push(source.slice(match.index, i + 1));
        break;
      }
      i += 1;
    }
  }
  return tags;
}

function hasSpaceKeyHandler(tag: string): boolean {
  return /onKey(?:Down|Up|Press)=/.test(tag) && /['"](?: |Space|Spacebar)['"]|\.key\s*===\s*['"](?: |Space|Spacebar)['"]/.test(tag);
}

describe('accessibility P0 clickable controls', () => {
  it('does not use onClick on non-interactive JSX elements', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const source = readComponent(file);
      for (const tagName of NON_INTERACTIVE_TAGS) {
        for (const tag of jsxStartTags(source, tagName)) {
          if (/\bonClick=/.test(tag) && !/role=(["']button["']|\{[^}]*button)/.test(tag)) {
            offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 180)}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('role="button" fallbacks support Space key activation', () => {
    const offenders: string[] = [];
    for (const file of FILES) {
      const source = readComponent(file);
      for (const tagName of NON_INTERACTIVE_TAGS) {
        for (const tag of jsxStartTags(source, tagName)) {
          if (/role=["']button["']/.test(tag) && !hasSpaceKeyHandler(tag)) {
            offenders.push(`${file}: ${tag.replace(/\s+/g, ' ').slice(0, 180)}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
