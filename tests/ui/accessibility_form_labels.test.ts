import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../..');
const componentsRoot = resolve(repoRoot, 'src/ui/map/components');

const FORM_FILES = [
  'AiSettingsPanel.tsx',
  'CorpsCard.tsx',
  'EnclaveDashboard.tsx',
  'PresidentialToolbar.tsx',
  'RecruitmentModal.tsx',
  'SettingsScreen.tsx',
  'SidePickerOverlay.tsx',
  'army_hq/ArmyHQCorpsCard.tsx',
  'army_hq/ArmyHQModal.tsx',
  'army_hq/SectorsSection.tsx',
  'ops_modal/PlanParameters.tsx',
  'plan_ui/CommandTopBar.tsx',
  'replay/ReplayScrubber.tsx',
] as const;

function readComponent(path: string): string {
  return readFileSync(resolve(componentsRoot, path), 'utf8');
}

function formControls(source: string): string[] {
  const controls: string[] = [];
  const pattern = /<(input|select|textarea)\b/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    let i = match.index + match[0].length;
    while (i < source.length) {
      if (source[i] === '>' && source[i - 1] !== '=') {
        controls.push(source.slice(match.index, i + 1));
        break;
      }
      i += 1;
    }
  }
  return controls;
}

function controlHasProgrammaticName(source: string, control: string): boolean {
  if (/\baria-label=|\baria-labelledby=/.test(control)) return true;

  const idMatch = control.match(/\bid=(?:"([^"]+)"|{`([^`]+)`})/);
  if (idMatch) {
    const id = idMatch[1] ?? idMatch[2];
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp('htmlFor=(?:"' + escaped + '"|{`' + escaped + '`})').test(source)) return true;
  }

  const index = source.indexOf(control);
  if (index >= 0) {
    const before = source.slice(Math.max(0, index - 240), index);
    const after = source.slice(index, Math.min(source.length, index + 240));
    if (/<label\b[\s\S]*$/.test(before) && /^[\s\S]*<\/label>/.test(after)) return true;
  }

  return false;
}

describe('accessibility P0 form labels', () => {
  it('every input/select/textarea has an aria label, labelledby, htmlFor binding, or wrapping label', () => {
    const offenders: string[] = [];
    for (const file of FORM_FILES) {
      const source = readComponent(file);
      for (const control of formControls(source)) {
        if (!controlHasProgrammaticName(source, control)) {
          offenders.push(`${file}: ${control.replace(/\s+/g, ' ').slice(0, 180)}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
