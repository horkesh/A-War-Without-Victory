// @vitest-environment jsdom
// Army HQ Personnel officer chips must carry the rating colour as a class.
// Before the fix, PersonnelContent passed getRatingColor() (a Tailwind class
// name) into style.color; the browser dropped it and every chip rendered
// uncoloured. This test fails against that version.
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PersonnelContent } from '../../src/ui/map/components/army_hq/PersonnelContent.js';
import { useGameStore } from '../../src/ui/map/store/gameStore.js';
import { getRatingColor } from '../../src/ui/map/utils/officerCharacter.js';
import type { LoadedGameState } from '../../src/ui/map/data/types.js';

function makeState(): LoadedGameState {
  return {
    label: 'Turn 1',
    turn: 1,
    phase: 'war',
    formations: [
      { id: 'vrs_drina', name: 'Drina Corps', faction: 'RS', kind: 'corps', status: 'active' },
      { id: 'vrs_bde_1', name: '1st Brigade', faction: 'RS', kind: 'brigade', status: 'active', corps_id: 'vrs_drina', personnel: 1000 },
    ],
    militiaPools: [],
    controlBySettlement: {},
    statusBySettlement: {},
    brigadeAorByFormationId: {},
    attackOrders: [],
    aorOrders: [],
    recentControlEvents: [],
    allControlEvents: [],
    displacementEventLog: [],
    battlesByOsid: {},
    movementsByOsid: {},
    supplyTransitionsByOsid: {},
    historicalEventsByTurn: [],
    pressureWarning: false,
    latestTurnSummary: null,
    turnSummaries: [],
    player_faction: 'RS',
    namedOfficerData: [
      {
        id: 'officer_1',
        name: 'Staff Officer',
        faction: 'RS',
        status: 'active',
        rank: 'corps_commander',
        assigned_corps_id: 'vrs_drina',
        competence: 5,
        aggressiveness: 2,
        defensive_skill: 1,
        political_reliability: 3,
      },
    ],
  } as unknown as LoadedGameState;
}

/** Tailwind colours the rating classes resolve to (tailwind.config.ts + Tailwind defaults). */
const TONE_HEX: Record<string, string> = {
  'text-accent-gold': '#c4a35a',
  'text-green-400': '#4ade80',
  'text-text-primary': '#ddd5c8',
  'text-orange-400': '#fb923c',
  'text-red-400': '#f87171',
  'text-text-secondary': '#a89e90',
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

afterEach(() => {
  cleanup();
  useGameStore.setState({ loadedGameState: null, selectedArmyId: null });
});

describe('Army HQ Personnel rating colours', () => {
  it('applies the rating tone as a class on each officer quality chip, never as an inline colour', () => {
    useGameStore.setState({ loadedGameState: makeState(), selectedArmyId: 'RS' });
    const { container } = render(React.createElement(PersonnelContent));

    const values = Array.from(container.querySelectorAll('span.font-mono.tabular-nums'))
      .filter((el) => el.closest('[title]')?.getAttribute('title')?.includes(':'));
    const byText = new Map(values.map((el) => [el.textContent?.trim(), el as HTMLElement]));

    for (const [text, rating] of [['5.0', 5], ['2.0', 2], ['1.0', 1]] as const) {
      const el = byText.get(text);
      expect(el, `chip ${text} rendered`).toBeTruthy();
      expect(el!.classList.contains(getRatingColor(rating))).toBe(true);
      expect(el!.getAttribute('style') ?? '').not.toMatch(/color/);
    }
  });

  it('keeps every rating tone at 4.5:1 or better on the chip background', () => {
    // Chip: bg-black/20 over the bg-panel-bg card (#1c1a17) => about #161512.
    const chipBackground = '#161512';
    for (const rating of [null, 1, 2, 3, 4, 5]) {
      const tone = getRatingColor(rating);
      const hex = TONE_HEX[tone];
      expect(hex, `known hex for ${tone}`).toBeTruthy();
      expect(contrast(hex, chipBackground), tone).toBeGreaterThanOrEqual(4.5);
    }
  });
});
