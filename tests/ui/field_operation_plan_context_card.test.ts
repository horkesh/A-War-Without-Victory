// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FieldOperationPlanContextCard } from '../../src/ui/map/components/FieldOperationPlanContextCard.js';

afterEach(cleanup);

describe('field operation plan context card', () => {
  it('selects exact objectives and returns to the owning dossier without exposing IDs', () => {
    const onSelectObjective = vi.fn();
    const onReturn = vi.fn();
    const view = render(React.createElement(FieldOperationPlanContextCard, {
      presentation: {
        objectives: [{ osid: 'op:vlasenica:cerska_2', label: 'Cerska' }],
        staging: [{ osid: 'op:vlasenica:grabovica', label: 'Grabovica' }],
        participants: [{ id: 'rs_1st_birac', label: '1st Birac Infantry Brigade', locationLabel: 'Vlasenica' }],
      },
      onSelectObjective,
      onReturn,
    }));

    expect(screen.getByTestId('field-operation-plan-context').dataset.fieldOperationFocusStatus).toBe('pending');
    expect(screen.getByTestId('field-operation-staging').dataset.osid).toBe('op:vlasenica:grabovica');
    expect(screen.getByTestId('field-operation-focus-status').textContent).toMatch(/framing/i);
    view.rerender(React.createElement(FieldOperationPlanContextCard, {
      presentation: {
        objectives: [{ osid: 'op:vlasenica:cerska_2', label: 'Cerska' }],
        staging: [{ osid: 'op:vlasenica:grabovica', label: 'Grabovica' }],
        participants: [{ id: 'rs_1st_birac', label: '1st Birac Infantry Brigade', locationLabel: 'Vlasenica' }],
      },
      focusReceipt: {
        key: 'review-cerska|op:vlasenica:cerska_2',
        proposalId: 'review-cerska',
        status: 'applied',
        target: { center: [18.8, 44.2], zoom: 8.5 },
        reason: null,
      },
      onSelectObjective,
      onReturn,
    }));
    expect(screen.getByTestId('field-operation-focus-status').textContent).toMatch(/framed/i);
    expect(screen.getByTestId('field-operation-focus-status').className).toContain('text-xs');
    expect(screen.getByTestId('field-operation-focus-status').className).not.toContain('text-[11px]');

    fireEvent.click(screen.getByRole('button', { name: 'Cerska' }));
    expect(onSelectObjective).toHaveBeenCalledWith('op:vlasenica:cerska_2');
    fireEvent.click(screen.getByRole('button', { name: /return to dossier/i }));
    expect(onReturn).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('field-operation-plan-context').textContent).not.toContain('op:vlasenica');
    expect(screen.getByTestId('field-operation-plan-context').textContent).not.toContain('rs_1st_birac');
  });

  it('shows an honest failure instead of inferring success from target presence', () => {
    render(React.createElement(FieldOperationPlanContextCard, {
      presentation: { objectives: [], staging: [], participants: [] },
      focusReceipt: {
        key: 'review-missing',
        proposalId: 'review-missing',
        status: 'failed',
        target: null,
        reason: 'missing-centroids:missing',
      },
      onSelectObjective: vi.fn(),
      onReturn: vi.fn(),
    }));
    expect(screen.getByTestId('field-operation-plan-context').dataset.fieldOperationFocusStatus).toBe('failed');
    expect(screen.getByTestId('field-operation-focus-status').textContent).toMatch(/could not frame/i);
  });
});
