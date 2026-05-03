import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

describe('opportunity ledger panel wiring', () => {
  it('mounts the OpportunityLedgerPanel under the Records subtab', () => {
    const records = read('../src/ui/map/components/army_hq/RecordsContent.tsx');
    expect(records).toContain("import { OpportunityLedgerPanel }");
    expect(records).toContain("subTab === 'opportunities'");
    expect(records).toContain('<OpportunityLedgerPanel');
  });

  it('imports buildOpportunityLedgerPulse and renders a pulse band at the top', () => {
    const panel = read('../src/ui/map/components/army_hq/OpportunityLedgerPanel.tsx');
    expect(panel).toContain('buildOpportunityLedgerPulse');
    expect(panel).toContain("from '../../data/opportunityLedgerPulse'");
    // Pulse band uses Army HQ styling cues consistent with TurnAftermathRecordsPanel.
    expect(panel).toContain('data-testid="opportunity-ledger-pulse"');
    expect(panel).toContain('Decisions Taken');
    expect(panel).toContain('Decisions Missed');
    expect(panel).toContain('Outcomes');
  });

  it('exposes the canonical pulse fields the band relies on', () => {
    const aggregator = read('../src/ui/map/data/opportunityLedgerPulse.ts');
    // Field surface stays stable for the panel + tests.
    for (const field of [
      'total_decisions',
      'resolved_decisions',
      'pending',
      'taken',
      'missed',
      'in_progress',
      'completed_success',
      'completed_failure',
      't3_authorized',
      'lifetime_axes',
      'headline',
    ]) {
      expect(aggregator, field).toContain(field);
    }
    // Determinism guard: aggregator sorts by proposal_id via strictCompare.
    expect(aggregator).toContain('strictCompare');
  });
});
