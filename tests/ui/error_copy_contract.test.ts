import { describe, expect, it } from 'vitest';
import { playerFacingErrorCopy } from '../../src/ui/map/utils/errorCopy.js';

describe('playerFacingErrorCopy', () => {
  it('maps advance blocker engine keys to presidential copy', () => {
    expect(playerFacingErrorCopy('pending_required_decisions')).toBe(
      'Presidential decisions are still unsigned. Review the highlighted desk item before advancing.',
    );
  });

  it('does not echo raw snake_case implementation keys to player-facing errors', () => {
    expect(playerFacingErrorCopy('level_2_plus_not_yet_enabled')).toBe(
      'This command channel is not available in the current build.',
    );
  });

  it('redacts raw decision identifier errors before they reach menus or overlays', () => {
    expect(playerFacingErrorCopy('Missing event_id for response_id opt_a')).toBe(
      'The requested action could not be completed.',
    );
    expect(playerFacingErrorCopy('response_id_not_found')).toBe(
      'The requested action could not be completed.',
    );
  });
});
