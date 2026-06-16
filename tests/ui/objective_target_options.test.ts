/**
 * Settlement/front objective-target picker — deterministic contract.
 *
 * `buildObjectiveTargetOptions` backs the request-op presidential lever's
 * settlement/front PICKER on every live surface (the in-corps OperationsSection
 * request-op affordance AND the Decision-Room DirectiveCard). It must be a pure,
 * deterministic projection of already-loaded control + display-name state:
 *   - the option set is the UNION of controlBySettlement keys and
 *     osidDisplayNames keys (so an OSID known only to control, or only to the
 *     display-name map, still appears);
 *   - ordering is strictCompare on the display label, OSID-tiebroken — never
 *     locale-/Date-/insertion-order-dependent;
 *   - duplicate display labels are disambiguated with deterministic player-safe
 *     ordinal text; raw OSIDs stay in the option value, not visible copy.
 *
 * Presentation-only; no sim/engine/determinism path. This locks the picker's
 * contract (it shipped untested in PR #241) so a future refactor can't silently
 * reintroduce a free-text-only / unsorted / ambiguous target surface.
 */
import { describe, expect, it } from 'vitest';
import { buildObjectiveTargetOptions } from '../../src/ui/map/utils/objectiveTargetOptions.js';
import { buildControlLookup } from '../../src/ui/map/data/ControlLookup.js';
import { strictCompare } from '../../src/state/validateGameState.js';

describe('buildObjectiveTargetOptions — settlement/front picker contract', () => {
  it('unions control-only and display-name-only OSIDs', () => {
    const options = buildObjectiveTargetOptions(
      { 'op:tuzla:tuzla_1': 'RBiH' },
      { 'op:mostar:mostar_1': 'Mostar' },
    );
    const osids = options.map((o) => o.osid);
    expect(osids).toContain('op:tuzla:tuzla_1');
    expect(osids).toContain('op:mostar:mostar_1');
    expect(osids).toHaveLength(2);
  });

  it('is sorted by display label, OSID-tiebroken (strictCompare, deterministic)', () => {
    const options = buildObjectiveTargetOptions(
      { 'op:c:zulu_1': null, 'op:a:alpha_1': null, 'op:b:mike_1': null },
      { 'op:c:zulu_1': 'Zulu', 'op:a:alpha_1': 'Alpha', 'op:b:mike_1': 'Mike' },
    );
    const labels = options.map((o) => o.label);
    expect(labels).toEqual(['Alpha', 'Mike', 'Zulu']);

    // Explicit determinism guard: the emitted order matches a strictCompare
    // re-sort of the same tuples (label, then osid) regardless of input order.
    const expected = [...options].sort(
      (a, b) => strictCompare(a.label, b.label) || strictCompare(a.osid, b.osid),
    );
    expect(options.map((o) => o.osid)).toEqual(expected.map((o) => o.osid));
  });

  it('disambiguates duplicate display labels without showing raw OSIDs', () => {
    const options = buildObjectiveTargetOptions(
      { 'op:foca:gornja_1': null, 'op:foca:gornja_2': null, 'op:tuzla:tuzla_1': null },
      { 'op:foca:gornja_1': 'Gornja', 'op:foca:gornja_2': 'Gornja', 'op:tuzla:tuzla_1': 'Tuzla' },
    );
    const byOsid = new Map(options.map((o) => [o.osid, o.display]));
    // Both "Gornja" entries stay distinguishable without visible internal IDs.
    expect(byOsid.get('op:foca:gornja_1')).toBe('Gornja - option 1');
    expect(byOsid.get('op:foca:gornja_2')).toBe('Gornja - option 2');
    // A unique label is shown plain (no OSID noise).
    expect(byOsid.get('op:tuzla:tuzla_1')).toBe('Tuzla');
    expect([...byOsid.values()].join(' ')).not.toContain('op:');
  });

  it('filters out S<census> compatibility-alias keys injected by buildControlLookup (#241)', () => {
    // buildControlLookup mirrors every `mun:census` control key into a bare
    // `S<census>` compatibility alias. Those aliases are colon-free duplicates and
    // must never surface as bogus picker rows (e.g. a phantom "Sbanja_luka").
    const control = buildControlLookup({
      '10014:banja_luka': 'RS',
      '10002:tuzla': 'RBiH',
    });
    // Sanity: the alias keys really are present in the lookup the picker consumes.
    expect(Object.keys(control)).toContain('Sbanja_luka');
    expect(Object.keys(control)).toContain('Stuzla');

    const options = buildObjectiveTargetOptions(control, {
      '10014:banja_luka': 'Banja Luka',
      '10002:tuzla': 'Tuzla',
    });
    const osids = options.map((o) => o.osid);
    // Only the canonical OSID-set keys survive — never the S-prefixed aliases.
    expect(osids).toContain('10014:banja_luka');
    expect(osids).toContain('10002:tuzla');
    expect(osids).not.toContain('Sbanja_luka');
    expect(osids).not.toContain('Stuzla');
    expect(osids.some((id) => id.startsWith('S'))).toBe(false);
    expect(options).toHaveLength(2);
  });

  it('preserves a legitimate S-prefixed control key when the display-name map knows it', () => {
    // Some saves carry S-prefixed control keys directly (dual key formats). Such a
    // key is canonical when the OSID-set (display-name map) independently lists it,
    // so it must be kept even though it lacks a ':'.
    const options = buildObjectiveTargetOptions(
      { 'S100013': 'RS' },
      { 'S100013': 'Doboj' },
    );
    expect(options.map((o) => o.osid)).toEqual(['S100013']);
  });

  it('returns an empty list when no control/display state is loaded', () => {
    expect(buildObjectiveTargetOptions(undefined, null)).toEqual([]);
    expect(buildObjectiveTargetOptions({}, {})).toEqual([]);
  });
});
