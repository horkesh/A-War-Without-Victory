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

  it('redacts filesystem load failures before they reach player-facing surfaces', () => {
    const raw = "Failed to load save file. ENOENT: no such file or directory, open 'C:\\Users\\User\\data\\derived\\operational\\operational_settlements.geojson'";
    const copy = playerFacingErrorCopy(raw);

    expect(copy).toBe('Required game data could not be found. Reinstall or verify the game files.');
    expect(copy).not.toContain('ENOENT');
    expect(copy).not.toContain('C:\\');
    expect(copy).not.toContain('operational_settlements.geojson');
  });

  it('redacts absolute data paths even when the message is not an ENOENT', () => {
    const copy = playerFacingErrorCopy('Failed to load: missing scenario file at path /tmp/foo.json');

    expect(copy).toBe('Required game data could not be found. Reinstall or verify the game files.');
    expect(copy).not.toContain('/tmp/foo.json');
  });
});
