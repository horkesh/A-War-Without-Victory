// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PeaceStatusPanel } from '../../src/ui/map/components/PeaceStatusPanel';
import { useGameStore } from '../../src/ui/map/store/gameStore';
import { turnToDateString } from '../../src/ui/map/utils/formatters';

afterEach(() => {
  cleanup();
  useGameStore.setState({ loadedGameState: null });
});

describe('PeaceStatusPanel player copy', () => {
  it('renders peace timing and events without raw turn or enum labels', () => {
    useGameStore.setState({
      loadedGameState: {
        turn: 3,
        phase: 'peace',
        player_faction: 'RBiH',
        peaceFactions: [
          { id: 'RBiH', capital: 42, declared: false, declaration_pressure: 10 },
          { id: 'RS', capital: 20, declared: true, declaration_pressure: 100 },
        ],
        peaceAllianceValue: 0.2,
        peaceReferendum: {
          held: true,
          deadline_turn: 5,
          war_start_turn: 6,
        },
        peaceEvents: [
          { type: 'staged_investment', faction: 'RBiH' },
          { type: 'internal_debug_marker', faction: 'RS' },
        ],
      } as any,
    });

    const { container } = render(createElement(PeaceStatusPanel));
    const text = container.textContent ?? '';

    expect(text).toContain(turnToDateString(3));
    expect(text).toContain(`War begins: ${turnToDateString(6)}`);
    expect(screen.getByText('Political investment')).toBeTruthy();
    expect(screen.getByText('Political development')).toBeTruthy();
    expect(text).toContain('Pre-war capital');
    expect(text).toContain('Political course declared');
    expect(text).toContain('End turn');
    expect(text).not.toMatch(/\bTurn\s+\d+\b|WAR BEGINS: Turn|Referendum deadline: Turn/i);
    expect(text).not.toMatch(/staged investment|staged_investment|internal debug marker|internal_debug_marker/i);
    expect(text).not.toMatch(/Pre-War Capital|Declaration posture:/);
  });
});
