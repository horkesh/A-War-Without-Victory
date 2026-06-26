import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiAdvisorPanel } from '../../src/ui/map/components/AiAdvisorPanel.js';
import { EconomyPanel } from '../../src/ui/map/components/EconomyPanel.js';
import { EnclaveDashboard } from '../../src/ui/map/components/EnclaveDashboard.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';

function baseState(overrides: Partial<LoadedGameState>): LoadedGameState {
  return {
    player_faction: 'RBiH',
    latestTurnSummary: null,
    turnSummaries: [],
    ...overrides,
  } as LoadedGameState;
}

describe('presidential command surface repurpose panels', () => {
  it('keeps repurposed surface ordering locale-independent', () => {
    const files = [
      'src/ui/map/components/AiAdvisorPanel.tsx',
      'src/ui/map/components/EconomyPanel.tsx',
      'src/ui/map/components/EnclaveDashboard.tsx',
    ];

    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), 'utf8');
      expect(source, file).not.toContain('localeCompare');
    }
  });

  it('frames enclaves as a humanitarian and siege ledger with deterministic ordering', () => {
    setLocale('en');

    const html = renderToStaticMarkup(
      React.createElement(EnclaveDashboard, {
        open: true,
        onClose: () => {},
        state: baseState({
          enclaveResilience: {
            zulu: {
              display_name: 'Zulu Enclave',
              resilience: 6,
              isolation_turns: 5,
              hardening_active: true,
              supply_state: 'critical',
              faction: 'RBiH',
            },
            alpha: {
              display_name: 'Alpha Enclave',
              resilience: 18,
              isolation_turns: 4,
              hardening_active: false,
              supply_state: 'strained',
              faction: 'RBiH',
            },
          },
        }),
      }),
    );

    expect(html).toContain('Humanitarian &amp; Siege Ledger');
    expect(html).toContain('Presidential readout');
    expect(html).toContain('Critical');
    expect(html.indexOf('Alpha Enclave')).toBeLessThan(html.indexOf('Zulu Enclave'));
  });

  it('renders enclave faction and supply state as player-facing labels', () => {
    setLocale('en');

    const html = renderToStaticMarkup(
      React.createElement(EnclaveDashboard, {
        open: true,
        onClose: () => {},
        state: baseState({
          enclaveResilience: {
            gorazde: {
              display_name: 'Gorazde',
              resilience: 6,
              isolation_turns: 5,
              hardening_active: true,
              supply_state: 'critical',
              faction: 'RBiH',
            },
          },
        }),
      }),
    );

    expect(html).toContain('Republic of Bosnia and Herzegovina');
    expect(html).toContain('Critical supply');
    expect(html).not.toContain('>RBiH<');
    expect(html).not.toContain('>critical<');
  });

  it('keeps enclave airdrop controls read-only without the desktop command bridge', () => {
    setLocale('en');

    const html = renderToStaticMarkup(
      React.createElement(EnclaveDashboard, {
        open: true,
        onClose: () => {},
        state: baseState({
          enclaveResilience: {
            gorazde: {
              display_name: 'Gorazde',
              resilience: 18,
              isolation_turns: 4,
              hardening_active: false,
              supply_state: undefined,
              faction: 'RBiH',
            },
          },
        }),
      }),
    );

    expect(html).toContain('Unreported');
    expect(html).toContain('disabled');
    expect(html).toContain('Desktop command bridge unavailable');
  });

  it('keeps enclave airdrop allocations inside the turn budget', () => {
    const source = readFileSync(join(process.cwd(), 'src/ui/map/components/EnclaveDashboard.tsx'), 'utf8');

    expect(source).toContain('const overAllocated = allocated > airdropBudget');
    expect(source).toContain('const canStageAirdrop = ipc.isAvailable && !overAllocated');
    expect(source).toContain('disabled={!canStageAirdrop}');
    expect(source).toContain('remaining + currentAllocation');
    expect(source).toContain('Math.min(Math.max(value, 0), maxAllocation)');
    expect(source).toContain("t('enclave.airdropOverBudget'");
  });

  it('frames economy as War Footing and renders player-faction summary only', () => {
    setLocale('en');

    const html = renderToStaticMarkup(
      React.createElement(EconomyPanel, {
        onClose: () => {},
        state: baseState({
          factionReserves: {
            RBiH: { generalSupply: 12, heavyMunitions: 55 },
            RS: { generalSupply: 1, heavyMunitions: 1 },
          },
          productionFacilities: [
            { id: 'z_facility', name: 'Zenica Works', type: 'heavy_equipment', municipality: 'zenica', condition: 0.8, controller: 'RBiH' },
            { id: 'm_facility', name: 'Munitions Line', type: 'ammunition', municipality: 'konjic', condition: 0.7, controller: 'RBiH' },
            { id: 'a_facility', name: 'Alpha Depot', type: 'small_arms', municipality: 'tuzla', condition: 0.5, controller: 'RBiH' },
            { id: 'enemy_facility', name: 'Enemy Plant', type: 'factory', municipality: 'prijedor', condition: 0.9, controller: 'RS' },
          ],
          smugglingRoutes: [
            { id: 'z_route', name: 'Western Run', faction: 'RBiH', capacity: 70, disrupted: true, active_turns: 2 },
            { id: 'a_route', name: 'Southern Run', faction: 'RBiH', capacity: 40, disrupted: false, active_turns: 1 },
            { id: 'enemy_route', name: 'Enemy Run', faction: 'RS', capacity: 80, disrupted: false, active_turns: 3 },
          ],
          embargoStatus: {
            RS: { pipeline: 0.2, smuggling: 0.3 },
            RBiH: { pipeline: 0.5, smuggling: 0.4 },
          },
        }),
      }),
    );

    expect(html).toContain('War Footing');
    expect(html).toContain('Presidential readout');
    expect(html).toContain('Strained');
    expect(html).not.toContain('Enemy Plant');
    expect(html).not.toContain('Enemy Run');
    expect(html).not.toContain('heavy_equipment');
    expect(html).not.toContain('small_arms');
    expect(html).not.toContain('ammunition');
    expect(html).toContain('Heavy equipment');
    expect(html).toContain('Small arms');
    expect(html).toContain('Ammunition');
    expect(html.indexOf('Alpha Depot')).toBeLessThan(html.indexOf('Zenica Works'));
    expect(html.indexOf('Southern Run')).toBeLessThan(html.indexOf('Western Run'));
  });

  it('orders staff recommendations by priority with stable text tie-breaks', () => {
    setLocale('en');

    const html = renderToStaticMarkup(
      React.createElement(AiAdvisorPanel, {
        response: {
          commander_name: 'Chief of Staff',
          assessment: 'The front can hold for one more turn.',
          recommendations: [
            { priority: 2, action: 'Review reserves', reasoning: 'A weak sector is under pressure.' },
            { priority: 1, action: 'Open convoy channel', reasoning: 'Civilian pressure is rising.' },
          ],
        },
        onClose: () => {},
      }),
    );

    expect(html).toContain('Chief-of-Staff Counsel');
    expect(html).not.toContain('AI Advisor');
    expect(html.indexOf('Open convoy channel')).toBeLessThan(html.indexOf('Review reserves'));
  });
});
