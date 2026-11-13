// @vitest-environment jsdom
/**
 * Surface redesign, step 5 (shell clean-up, 2026-11-13). Pins what the step changed:
 * War Footing is reachable from the President's Desk (lazy-loaded), GameOverModal is gone,
 * faction names and the rail copy go through i18n, BCS strings keep their diacritics,
 * formatTurnLabel survives a missing label, the map toolbar keeps the 13 px floor, the
 * cost-0 chip is truthful, and the balance/records colours use the surface palette.
 * Rendered layout is proven by tools/ui/step5_shell_browser_proof.mjs, not here.
 */
import React from 'react';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PresidentDeskShell } from '../../src/ui/map/components/presidential_desk/PresidentDeskShell.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';
import { setLocale, t } from '../../src/ui/map/i18n/index.js';
import { enMessages } from '../../src/ui/map/i18n/messages.en.js';
import { bcsMessages } from '../../src/ui/map/i18n/messages.bcs.js';
import { formatTurnLabel, turnToDateString } from '../../src/ui/map/utils/formatters.js';
import {
  getPlayerSafeCorridorLabel,
  getPlayerSafeMilitaryFactionName,
  getPlayerSafePoliticalFactionName,
} from '../../src/ui/map/utils/playerSafeText.js';
import { getPlayerSafeOperationBalancePresentation } from '../../src/shared/playerSafeOperationBalance.js';
import { withoutComments } from '../helpers/sourceComments';

const read = (file: string) => readFileSync(join(process.cwd(), file), 'utf8');

function deskState(): LoadedGameState {
  return {
    label: 'Turn 1', turn: 1, phase: 'war', formations: [], militiaPools: [],
    controlBySettlement: {}, statusBySettlement: {}, brigadeAorByFormationId: {},
    attackOrders: [], aorOrders: [], recentControlEvents: [], allControlEvents: [],
    displacementEventLog: [], battlesByOsid: {}, movementsByOsid: {}, supplyTransitionsByOsid: {},
    historicalEventsByTurn: [], pressureWarning: false, latestTurnSummary: null, turnSummaries: [],
    player_faction: 'RBiH',
  } as unknown as LoadedGameState;
}

afterEach(() => {
  cleanup();
  setLocale('en');
});

describe('R1: War Footing from the President\'s Desk', () => {
  it('shows the entry on the Desk and calls the handler', () => {
    const onOpenEconomy = vi.fn();
    render(React.createElement(PresidentDeskShell, {
      state: deskState(), osidNameMap: null, onAction: vi.fn(), onAdvance: vi.fn(),
      onOpenArmyHQ: vi.fn(), onOpenRecords: vi.fn(), onOpenEconomy,
    }));
    const button = screen.getByTestId('desk-action-economy');
    expect(button.textContent).toBe(t('desk.action.openEconomy'));
    fireEvent.click(button);
    expect(onOpenEconomy).toHaveBeenCalledTimes(1);
  });

  it('App wires the entry and keeps EconomyPanel out of the entry chunk', () => {
    const app = withoutComments(read('src/ui/map/App.tsx'));
    expect(app).toContain('onOpenEconomy={() => setEconomyOpen(true)}');
    expect(app).toMatch(/const EconomyPanel = lazy\(\(\) =>\s*import\('\.\/components\/EconomyPanel'\)/);
    expect(app).not.toMatch(/import \{ EconomyPanel \} from/);
  });
});

describe('R2: GameOverModal is retired', () => {
  it('has no source file and no importer', () => {
    expect(existsSync(join(process.cwd(), 'src/ui/map/components/GameOverModal.tsx'))).toBe(false);
    expect(read('src/ui/map/App.tsx')).not.toContain('GameOverModal');
  });
});

describe('R4: faction names follow the locale', () => {
  it('shows BCS names in BCS and the existing English names in English', () => {
    expect(getPlayerSafePoliticalFactionName('HRHB')).toBe('Croatian Republic of Herzeg-Bosnia');
    expect(getPlayerSafePoliticalFactionName('RBiH')).toBe('Republic of Bosnia and Herzegovina');
    setLocale('bcs');
    expect(getPlayerSafePoliticalFactionName('HRHB')).toBe('Hrvatska Republika Herceg-Bosna');
    expect(getPlayerSafePoliticalFactionName('RBiH')).toBe('Republika Bosna i Hercegovina');
    expect(getPlayerSafeMilitaryFactionName('RS')).toBe('VRS');
    expect(getPlayerSafeCorridorLabel('RBiH')).toBe('koridor pod kontrolom ARBiH');
    expect(getPlayerSafePoliticalFactionName('nobody')).toBe('Unknown faction');
  });
});

describe('R5 and M2: BCS diacritics and English-only rail copy', () => {
  it('keeps the named strings spelled with diacritics', () => {
    expect(bcsMessages['onboarding.skip']).toBe('Preskoči uvod');
    expect(bcsMessages['decisionRoom.advance.recommendedBeforeAdvance']).toBe('Preporučeno prije napredovanja');
    expect(bcsMessages['tooltip.posture.elasticDefense']).toBe('Elastična odbrana');
  });

  it('has none of the transliterations the sweep removed', () => {
    const words = /\b(?:Preskoci|Preporuceno|preporucuje|izvjestaj|polozaj|podrska|drzano|predsjednicki|zabiljezen|napadaca|Stab armije|moze|zrtve|Elasticna|ELASTICNO|puknuce|Klizac|nego sto)\b/;
    const offenders = Object.entries(bcsMessages)
      // The parked operation planner keeps its strings untouched (owner, 2026-11-12).
      .filter(([key]) => !key.startsWith('opsPlanning.'))
      .filter(([, value]) => typeof value === 'string' && words.test(value))
      .map(([key]) => key);
    expect(offenders).toEqual([]);
  });

  it('routes the map rail labels through i18n', () => {
    const files: Array<[string, RegExp]> = [
      ['src/ui/map/components/FormationDetail.tsx', /'Officer cadre'|'Distance from home'|attacker: 'attacker'/],
      ['src/ui/map/components/CorpsFrontPanel.tsx', /'Recommends launch'|'Urges delay'|'Advises abort'/],
      ['src/ui/map/components/ArmyReservePanel.tsx', /'Recall failed'|Loan terminated by player/],
      ['src/ui/map/components/OOBSidebar.tsx', /'Main Staff'|'Ungrouped'/],
      ['src/ui/map/components/OperationBriefingModal.tsx', /'This corps'/],
    ];
    for (const [file, literal] of files) {
      expect(withoutComments(read(file)), file).not.toMatch(literal);
    }
  });

  it('drops the jargon and ASCII arrows from the live strings', () => {
    expect(enMessages['operationHistory.oic']).not.toMatch(/OiC/);
    expect(enMessages['operationHistory.equipmentLost']).not.toMatch(/\{tanks\}T/);
    expect(enMessages['operationBriefing.costCa']).not.toMatch(/\bCA\b/);
    expect(enMessages['operationsPanel.schwerpunkt']).not.toMatch(/Schwerpunkt/);
    expect(enMessages['operationsPanel.na']).not.toBe('N/A');
    expect(enMessages['presidentialToolbar.advanceTurn']).not.toContain('->');
    expect(bcsMessages['presidentialToolbar.advanceTurn']).not.toContain('->');
  });
});

describe('R6: formatTurnLabel', () => {
  it('returns an empty label for a missing label instead of throwing', () => {
    expect(formatTurnLabel(undefined)).toBe('');
    expect(formatTurnLabel(null)).toBe('');
    expect(formatTurnLabel('')).toBe('');
  });

  it('still replaces the turn counter with the date', () => {
    expect(formatTurnLabel('Turn 32')).toBe(turnToDateString(32));
    expect(formatTurnLabel('No counter here')).toBe('No counter here');
  });
});

describe('Toolbar type floor', () => {
  it('keeps player-facing toolbar text at 13 px or more (the dev strip is exempt)', () => {
    const source = withoutComments(read('src/ui/map/components/PresidentialToolbar.tsx'));
    const devStrip = source.indexOf('devMode && devDrawerOpen');
    expect(devStrip).toBeGreaterThan(0);
    const playerFacing = source.slice(0, devStrip);
    expect(playerFacing).not.toMatch(/\btext-(?:xs|\[(?:[0-9]|1[0-2])(?:\.\d+)?px\])/);
  });
});

describe('S7: the cost-0 chip is truthful', () => {
  it('names Authority instead of claiming the action is free', () => {
    expect(enMessages['commandSurface.chip.free']).toBe('No Authority spent');
    expect(bcsMessages['commandSurface.chip.free']).not.toBe('Bez troška');
  });
});

describe('O7 and O8: surface palette', () => {
  it('uses the surface text tones for the force balance', () => {
    for (const ratio of [2.0, 1.3, 0.9, 0.5]) {
      expect(getPlayerSafeOperationBalancePresentation(ratio).toneClass).toMatch(/-200\b/);
    }
  });

  it('keeps amber-400 out of the Records sub-tabs', () => {
    expect(withoutComments(read('src/ui/map/components/army_hq/RecordsContent.tsx'))).not.toMatch(/amber-400/);
  });
});
