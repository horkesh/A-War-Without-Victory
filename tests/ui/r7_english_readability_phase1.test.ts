import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';

const BARE_VALUE_SLOT_KEYS = [
  'corpsFront.unknown',
  'corpsFront.unreported',
  'orbat.metricUnreported',
  'orbat.postureUnreported',
  'operationsSection.metricUnreported',
  'operationHistory.gradeFactorUnreported',
  'corpsCard.stance.unreported',
  'peace.metricUnreported',
  'strategicPosition.unreported',
  'armyReserve.personnelUnreported',
  'opportunity.axis.unreported',
  'warSummary.objective.status.unreported',
  'warSummary.objective.trend.unreported',
] as const;

describe('R7 English readability Phase 1', () => {
  it('uses the standard sparse-truth phrase in exactly the 13 bare value slots', () => {
    expect(BARE_VALUE_SLOT_KEYS).toHaveLength(13);
    for (const key of BARE_VALUE_SLOT_KEYS) {
      expect(enMessages[key]).toBe('No staff report');
    }

    expect(enMessages['forceReadiness.fatigueUnreported']).toBe('fatigue unreported');
    expect(enMessages['orbat.cohesionUnreported']).toBe('Cohesion unreported');
    expect(enMessages['operationBriefing.commanderUnreported']).toBe('Commander record unreported');
  });

  it('replaces scoped implementation vocabulary with staff-facing copy', () => {
    const targetKeys = [
      'armyHq.decisionRoomHandoff.filedAction',
      'attention.queueDetail',
      'operationsPanel.subtitle',
      'recordsContent.operationLedger.help',
      'recordsContent.codexHelp',
      'codex.ghostEntry',
      'codex.historicalGhostEntry',
      'codex.ghostEntryBadge',
      'codex.dynamicLabel.historicalGhost',
      'warSummary.objective.command',
      'warSummary.objective.commitment.dimension',
    ] as const;
    const copy = targetKeys.map((key) => enMessages[key]).join('\n');

    expect(copy).not.toMatch(/\bowns\b|\bshell\b|executable staff items|ghost entry|responsible owner|recorded decision effect/i);
    expect(enMessages['warSummary.objective.commitment.dimension']).not.toMatch(/\byour\b/i);
    expect(enMessages['chronicle.recapArc']).toBe('Campaign arc: {opening} to {closing} — sensitive-history chapters: {signals}');
  });

  it('states cumulative counts and staff-facing units without exposing internal identifiers', () => {
    expect(enMessages['situation.sustainmentCollapsed']).toBe(', {count} permanently collapsed municipalities (cumulative)');
    expect(enMessages['warSummary.label.netOsids']).toBe('Net operational areas (settlements)');
    expect(enMessages['warSummary.label.netOsids']).not.toMatch(/\bOSID\b/i);
    expect(enMessages['corpsFront.standardBrigadeBaseline']).toBe('Combat power reference: 1.0 equals one standard brigade');
  });

  it('distinguishes critical review and reserve queue counts', () => {
    expect(enMessages['attention.reviewCritical']).toBe('Critical reviews');
    expect(enMessages['attention.reserveCritical']).toBe('Critical reserve requests');

    const source = readFileSync(
      join(process.cwd(), 'src', 'ui', 'map', 'components', 'army_hq', 'PresidentialAttentionPanel.tsx'),
      'utf8',
    );
    expect(source).toContain("<CountCard label={t('attention.reviewCritical')} value={liveCriticalCount}");
    expect(source).toContain("<CountCard label={t('attention.reserveCritical')} value={armyReserveQueue.criticalCount}");
  });

  it('uses weeks for the three audited duration strings', () => {
    expect(enMessages['formationDetail.turnCount']).toBe('{count} weeks');
    expect(enMessages['enclave.risk.criticalDetail']).toBe('Resilience {resilience} after {turns} weeks of isolation.');
    expect(enMessages['enclave.risk.heightenedDetail']).toBe('Supply is strained after {turns} weeks of isolation.');
  });

  it('keeps sensitive-history methodology and personnel references factual and visible', () => {
    const methodology = enMessages['paramilitaryReview.sourceContext'];
    expect(methodology).toContain('1991 census map data');
    expect(methodology).toContain('Balkan Battlegrounds, Vol. I');
    expect(methodology).toContain('{modelPopulation}-person');
    expect(methodology).toContain('not claim that this exact outcome occurred here');
    expect(methodology).not.toMatch(/simulation/i);
    expect(enMessages['personnel.dossier.reserveOfficersDetail']).toBe('See the reserve roster below.');
  });

  it('applies the remaining bounded label and punctuation changes', () => {
    expect(enMessages['dayton.patronOverrideActive']).toBe('Patron Override Active ({pct}%) — forced concessions likely at a final settlement');
    expect(enMessages['personnel.totalPersonnel']).toBe('Fielded personnel');
    expect(enMessages['chronicle.openTurnRecord']).toBe('View Aftermath');
    expect(enMessages['commandBriefing.item.cohesion.detail']).toContain(' — ');
    expect(enMessages['commandBriefing.item.patronOverride.detail']).toContain(' — ');
    expect(enMessages['warCost.findingSeverity.none']).toBe('No finding');
  });
});
