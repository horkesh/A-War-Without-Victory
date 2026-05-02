import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('turn aftermath UI wiring', () => {
  it('mounts the aftermath modal from the tactical shell', () => {
    const app = read('../src/ui/map/App.tsx');
    expect(app).toContain("import { TurnAftermathModal }");
    expect(app).toContain('const turnAftermath = useGameStore');
    expect(app).toContain('<TurnAftermathModal');
    expect(app).toContain('openInboxHome');
    expect(app).toContain("openArmyHQRecords('aftermath')");
  });

  it('persists aftermath packets in Army HQ records', () => {
    const records = read('../src/ui/map/components/army_hq/RecordsContent.tsx');
    const panel = read('../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx');

    expect(records).toContain("{ id: 'aftermath' as const, label: 'TURN AFTERMATH' }");
    expect(records).toContain("subTab === 'aftermath'");
    expect(panel).toContain('buildTurnAftermathRecordViews');
    expect(panel).toContain('No turn aftermath records');
  });

  it('surfaces turn-cost packets in the modal and records surface', () => {
    const modal = read('../src/ui/map/components/TurnAftermathModal.tsx');
    const panel = read('../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx');

    expect(modal).toContain('Turn Cost');
    expect(modal).toContain('view.cost.severity');
    expect(panel).toContain('view.cost.severity');
    expect(panel).toContain('friendlyMilitaryCasualties');
  });

  it('surfaces strategic signals in the immediate turn aftermath modal', () => {
    const modal = read('../src/ui/map/components/TurnAftermathModal.tsx');

    expect(modal).toContain('Strategic Signals');
    expect(modal).toContain('view.signals.slice');
  });

  it('surfaces campaign pulse and strategic signals in records', () => {
    const panel = read('../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx');

    expect(panel).toContain('buildTurnAftermathCampaignPulse');
    expect(panel).toContain('Campaign pulse');
    expect(panel).toContain('Strategic signals');
  });

  it('surfaces active campaign cost in records and war summary', () => {
    const panel = read('../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx');
    const summary = read('../src/ui/map/components/army_hq/WarSummaryContent.tsx');

    expect(panel).toContain('buildTurnAftermathCampaignCost');
    expect(panel).toContain('Campaign cost so far');
    expect(panel).toContain('data-testid="campaign-cost-spine"');
    expect(summary).toContain('buildTurnAftermathCampaignCost');
    expect(summary).toContain('Campaign Cost');
    expect(summary).toContain('data-testid="war-summary-campaign-cost"');
  });

  it('exposes commander review filters for long aftermath archives', () => {
    const panel = read('../src/ui/map/components/army_hq/TurnAftermathRecordsPanel.tsx');

    expect(panel).toContain('filterTurnAftermathRecords');
    expect(panel).toContain('Hard turns');
    expect(panel).toContain('No aftermath records match this review filter.');
  });

  it('routes all tactical advance-turn entrypoints through the aftermath dependency bundle', () => {
    const files = [
      '../src/ui/map/components/PresidentialToolbar.tsx',
      '../src/ui/map/components/warroom/AdvanceTurnModal.tsx',
      '../src/ui/map/hooks/useKeyboardShortcuts.ts',
      '../src/ui/map/components/PeaceStatusPanel.tsx',
      '../src/ui/map/components/TopToolbar.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source, file).toContain('getTurnAftermathAdvanceDeps');
      expect(source, file).toContain('...getTurnAftermathAdvanceDeps()');
    }
  });
});
