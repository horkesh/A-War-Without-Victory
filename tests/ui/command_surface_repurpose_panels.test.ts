import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AiAdvisorPanel } from '../../src/ui/map/components/AiAdvisorPanel.js';
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

  it('shows no airdrop budget or staging action (retired 2026-11-17, Fable consult 6)', () => {
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
              isolation_turns: 6,
              hardening_active: false,
              supply_state: undefined,
              faction: 'RBiH',
            },
          },
        }),
      }),
    );

    expect(html).toContain('No staff report');
    expect(html).not.toContain('Airdrop');
    expect(html).not.toContain('Stage');
    const source = readFileSync(join(process.cwd(), 'src/ui/map/components/EnclaveDashboard.tsx'), 'utf8');
    expect(source).not.toContain('stageAirdropAllocation');
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
