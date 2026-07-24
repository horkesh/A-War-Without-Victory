// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecruitmentModal } from '../../src/ui/map/components/RecruitmentModal.js';
import { setLocale } from '../../src/ui/map/i18n/index.js';
import type { RecruitmentCatalogBrigade } from '../../src/ui/map/desktop/types.js';

const LIGHT_INFANTRY_BRIGADE: RecruitmentCatalogBrigade = {
  id: 'rbih_test_light_infantry',
  name: '1st Test Brigade',
  faction: 'RBiH',
  home_mun: 'sarajevo',
  capital_cost: 12,
  manpower_cost: 345,
  default_equipment_class: 'light_infantry',
  available_from: 0,
  mandatory: false,
  eligible: true,
  reason_codes: [],
};

describe('RecruitmentModal player copy', () => {
  afterEach(() => {
    cleanup();
    setLocale('en');
  });

  it('renders brigade options and equipment selection with player-safe labels', () => {
    const onApply = vi.fn();
    const { container } = render(React.createElement(RecruitmentModal, {
      isOpen: true,
      loading: false,
      applying: false,
      playerFaction: 'RBiH',
      brigades: [LIGHT_INFANTRY_BRIGADE],
      onClose: vi.fn(),
      onRefresh: vi.fn(),
      onApply,
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Recruit' }));

    expect(container.textContent).toContain('1st Test Brigade');
    expect(container.textContent).toContain('Republic of Bosnia and Herzegovina');
    expect(container.textContent).toContain('Capital 12');
    expect(container.textContent).toContain('Manpower 345');
    expect(screen.getByDisplayValue('Light Infantry')).toBeTruthy();
    expect(container.textContent).not.toMatch(/\bcap\b|\bman\b|light_infantry|RBiH/);
    expect(onApply).toHaveBeenCalledWith('rbih_test_light_infantry', 'light_infantry');
  });

  it('separates eligible and unavailable formations and explains stable reason codes', () => {
    const onApply = vi.fn();
    const late: RecruitmentCatalogBrigade = {
      ...LIGHT_INFANTRY_BRIGADE,
      id: 'rbih_late',
      name: 'Late Brigade',
      available_from: 8,
      eligible: false,
      reason_codes: ['not_yet_available'],
    };

    render(React.createElement(RecruitmentModal, {
      isOpen: true,
      loading: false,
      applying: false,
      playerFaction: 'RBiH',
      brigades: [late, LIGHT_INFANTRY_BRIGADE],
      onClose: vi.fn(),
      onRefresh: vi.fn(),
      onApply,
    }));

    expect(screen.getByText('Eligible now')).toBeTruthy();
    expect(screen.getByText('Unavailable')).toBeTruthy();
    expect(screen.getByText('Available from week 8')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Recruit' }));
    expect(onApply).toHaveBeenCalledWith(LIGHT_INFANTRY_BRIGADE.id, 'light_infantry');
  });
});
