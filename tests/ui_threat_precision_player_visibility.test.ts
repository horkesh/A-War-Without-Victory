import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('player-facing threat surfaces', () => {
  it('do not render exact threat ratios in normal player-facing shells', () => {
    const corpsFrontPanelSource = readFileSync(
      new URL('../src/ui/map/components/CorpsFrontPanel.tsx', import.meta.url),
      'utf8',
    );
    const sectorsSectionSource = readFileSync(
      new URL('../src/ui/map/components/army_hq/SectorsSection.tsx', import.meta.url),
      'utf8',
    );
    const situationTabSource = readFileSync(
      new URL('../src/ui/map/components/SituationTab.tsx', import.meta.url),
      'utf8',
    );
    const tooltipSource = readFileSync(
      new URL('../src/ui/map/components/Tooltip.tsx', import.meta.url),
      'utf8',
    );

    expect(corpsFrontPanelSource).not.toContain('ratio.toFixed(2)');
    expect(sectorsSectionSource).not.toContain('threatRatio.toFixed(2)');
    expect(sectorsSectionSource).not.toContain('THREAT RATIO');
    expect(situationTabSource).not.toContain('sector.threat_ratio.toFixed(2)');
    expect(tooltipSource).not.toContain('model.threatValue.toFixed(2)');
  });
});
