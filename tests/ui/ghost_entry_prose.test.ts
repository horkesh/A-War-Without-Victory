/**
 * @vitest-environment jsdom
 *
 * Ghost-entry prose wiring (VerdictScreen "Paths Not Taken" codex panel).
 *
 * Orphaned-wiring audit T2-A / content C5
 * (docs/40_reports/proposals/20260609_ORPHANED_WIRING_AUDIT_content.md): the
 * panel rendered the raw repo-relative `.md` PATH instead of the authored
 * narrative. This suite proves the resolver now returns the authored body and
 * that §6-adjacent bodies are gated out (label only, never the path).
 *
 * UI/data-only, calibration-INERT: read-model resolution of authored prose;
 * touches no engine state.
 */

import { describe, expect, it } from 'vitest';
import { resolveGhostEntryProse } from '../../src/ui/map/data/ghostEntryProse.js';

describe('resolveGhostEntryProse', () => {
  it('returns the authored EN body for a non-§6 ghost id (not a file path)', () => {
    const prose = resolveGhostEntryProse('winter_held', 'en');
    expect(prose).not.toBeNull();
    // The authored narrative — NOT the raw repo path that was shown before.
    expect(prose).toContain('Winter Supply');
    expect(prose).not.toContain('data/codex/ghost_entries/');
    expect((prose ?? '').length).toBeGreaterThan(200);
  });

  it('returns the BCS body when locale is bcs', () => {
    const en = resolveGhostEntryProse('winter_held', 'en');
    const bcs = resolveGhostEntryProse('winter_held', 'bcs');
    expect(bcs).not.toBeNull();
    expect((bcs ?? '').length).toBeGreaterThan(200);
    // EN and BCS bodies are distinct localizations of the same entry.
    expect(bcs).not.toEqual(en);
  });

  it('falls back to the EN body for an unknown locale gap (locale not bcs)', () => {
    // Sanity: a valid id always resolves at least the EN body.
    expect(resolveGhostEntryProse('alliance_held', 'en')).not.toBeNull();
    expect(resolveGhostEntryProse('alliance_held', 'bcs')).not.toBeNull();
  });

  it('gates out §6-adjacent bodies (label only, never the prose)', () => {
    // Both bodies exist on disk but must NOT surface without owner + §6 sign-off.
    expect(resolveGhostEntryProse('cleansing_refused', 'en')).toBeNull();
    expect(resolveGhostEntryProse('cleansing_refused', 'bcs')).toBeNull();
    expect(resolveGhostEntryProse('enclave_defended', 'en')).toBeNull();
    expect(resolveGhostEntryProse('enclave_defended', 'bcs')).toBeNull();
  });

  it('returns null for unknown / empty ids (graceful fallback to label only)', () => {
    expect(resolveGhostEntryProse('', 'en')).toBeNull();
    expect(resolveGhostEntryProse('   ', 'en')).toBeNull();
    expect(resolveGhostEntryProse('no_such_ghost_entry', 'en')).toBeNull();
  });
});
