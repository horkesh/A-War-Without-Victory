// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { SettlementDetailContent } from '../../src/ui/map/components/SettlementDetailContent.js';
import { buildOsidSupplyExplanation } from '../../src/ui/map/data/osidSupplyExplanation.js';

afterEach(() => cleanup());

const BASE_PROPS = {
  osid: 'op:test:a',
  osidDisplayNames: { 'op:test:a': 'Testograd' } as Record<string, string>,
  osidPropertiesMap: { 'op:test:a': { mun1990_name: 'Testmun' } } as Record<string, Record<string, unknown>>,
  controlBySettlement: { 'op:test:a': 'RBiH' } as Record<string, string>,
  formationsAtOsid: [] as never[],
  variant: 'panel' as const,
  statusLabel: 'Held',
};

describe('buildOsidSupplyExplanation (read-model)', () => {
  it('returns null when no scoped supply level is known (e.g. enemy/unknown settlement)', () => {
    expect(buildOsidSupplyExplanation(undefined)).toBeNull();
    expect(buildOsidSupplyExplanation(null)).toBeNull();
    // Defensive: a non-level value is not surfaced.
    expect(buildOsidSupplyExplanation('bogus' as never)).toBeNull();
  });

  it('maps each derived level to a player-legible label key + tone', () => {
    expect(buildOsidSupplyExplanation('adequate')).toMatchObject({
      level: 'adequate',
      labelKey: 'settlement.supply.adequate.label',
      explanationKey: 'settlement.supply.adequate.explanation',
      tone: 'good',
    });
    expect(buildOsidSupplyExplanation('strained')).toMatchObject({
      level: 'strained',
      labelKey: 'settlement.supply.strained.label',
      tone: 'caution',
    });
    expect(buildOsidSupplyExplanation('critical')).toMatchObject({
      level: 'critical',
      labelKey: 'settlement.supply.critical.label',
      tone: 'danger',
    });
  });
});

describe('SettlementDetailContent supply status surface', () => {
  it('renders a player-legible supply status for a controlled settlement', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      supplyStateByOsid: { 'op:test:a': 'critical' },
    }));

    const row = screen.getByTestId('settlement-supply-status');
    expect(row).toBeTruthy();
    // Player-legible label, NOT the raw enum.
    expect(screen.getByText('Cut off')).toBeTruthy();
    expect(screen.getByText('No supply route reaches this place — it is isolated.')).toBeTruthy();
    // Raw enum value must never be rendered.
    expect(screen.queryByText('critical')).toBeNull();
    expect(screen.queryByText('CRITICAL')).toBeNull();
  });

  it('renders the adequate framing for a well-supplied settlement', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      supplyStateByOsid: { 'op:test:a': 'adequate' },
    }));

    expect(screen.getByText('Well supplied')).toBeTruthy();
    expect(screen.queryByText('adequate')).toBeNull();
  });

  it('shows nothing when there is no scoped supply entry for the settlement', () => {
    render(createElement(SettlementDetailContent, {
      ...BASE_PROPS,
      // Only another (player) settlement is scoped; the selected one is absent.
      supplyStateByOsid: { 'op:test:b': 'adequate' },
    }));

    expect(screen.queryByTestId('settlement-supply-status')).toBeNull();
  });

  it('shows nothing when no supply data is provided at all', () => {
    render(createElement(SettlementDetailContent, { ...BASE_PROPS }));
    expect(screen.queryByTestId('settlement-supply-status')).toBeNull();
  });
});
