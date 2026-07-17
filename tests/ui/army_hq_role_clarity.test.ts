import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync('src/ui/map/components/army_hq/ArmyHQModal.tsx', 'utf8');
const corpsCardSource = readFileSync('src/ui/map/components/army_hq/ArmyHQCorpsCard.tsx', 'utf8');
const corpsSituationSource = readFileSync('src/ui/map/components/army_hq/CorpsSituationSection.tsx', 'utf8');
const sectorsSource = readFileSync('src/ui/map/components/army_hq/SectorsSection.tsx', 'utf8');
const situationBriefingSource = readFileSync('src/ui/map/components/army_hq/SituationBriefing.tsx', 'utf8');
const strategicPositionSource = readFileSync('src/ui/map/components/army_hq/StrategicPosition.tsx', 'utf8');
const aftermathSource = readFileSync('src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx', 'utf8');
const frontVisitSource = readFileSync('src/ui/map/components/army_hq/FrontVisitSection.tsx', 'utf8');
const themeSource = readFileSync('src/ui/map/utils/theme.ts', 'utf8');
const en = readFileSync('src/ui/map/i18n/messages.en.ts', 'utf8');
const bcs = readFileSync('src/ui/map/i18n/messages.bcs.ts', 'utf8');

describe('Army HQ role clarity and contrast', () => {
  it('distinguishes the Army commander, Chief of Staff briefing, and presidential intent', () => {
    expect(source).toContain("t('armyHq.armyCommander')");
    expect(source).toContain("t('armyHq.armyCommander.role')");
    expect(en).toContain("'armyHq.armyCommander': 'Army commander'");
    expect(en).toContain('turns presidential intent into army-level direction');
    expect(en).toContain('Chief of Staff briefing is staff advice');
    expect(bcs).toContain("'armyHq.armyCommander': 'Komandant armije'");
  });

  it('does not mute essential 12px Army HQ text with opacity modifiers', () => {
    expect(source).not.toMatch(/text-(?:text-secondary|amber-\d+|emerald-\d+|red-\d+)\/(?:60|70|80)/);
    expect(source).not.toContain('text-red-500');
  });

  it('keeps command access names complete and gives each corps enough width', () => {
    expect(source).toContain('minmax(21rem,1fr)');
    expect(source).not.toContain('flex-1 truncate text-xs font-bold uppercase text-text-primary');
  });

  it('keeps overview corps cards wide enough and wraps long commander metadata', () => {
    expect(source).toContain('minmax(18rem,1fr)');
    expect(corpsCardSource).toContain('flex flex-wrap items-start');
    expect(corpsCardSource).toContain('min-w-0 basis-full break-words');
  });

  it('keeps briefing, strategic, corps, and sector text at readable contrast', () => {
    expect(situationBriefingSource).not.toMatch(/text-(?:text-secondary|amber-\d+)\/(?:40|50|60|70|80)/);
    expect(strategicPositionSource).not.toMatch(/text-text-secondary\/(?:40|50|60|70|80)/);
    expect(corpsCardSource).not.toMatch(/text-(?:text-secondary|red-\d+)\/(?:40|50|60|70|80)/);
    expect(corpsCardSource).not.toContain('text-red-500');
    expect(corpsSituationSource).not.toMatch(/text-(?:text-secondary|neutral-\d+)\/(?:40|50|60|70|80)/);
    expect(corpsSituationSource).not.toContain('text-neutral-500');
    expect(sectorsSource).not.toMatch(/text-(?:text-secondary|red-\d+)\/(?:40|50|60|70|80)/);
    expect(sectorsSource).not.toContain('text-red-500');
  });

  it('wraps aftermath signal evidence instead of clipping it', () => {
    expect(aftermathSource).not.toContain('truncate text-xs uppercase tracking-[0.1em] opacity-75');
    expect(aftermathSource).toContain('break-words text-xs uppercase tracking-[0.1em]');
  });

  it('keeps visit availability and battle outcomes readable', () => {
    expect(frontVisitSource).not.toContain('text-xs text-text-secondary/70 font-mono');
    expect(themeSource).toContain("stalemate: '#c7b88e'");
    expect(themeSource).not.toContain("stalemate: '#8a7a60'");
  });
});
