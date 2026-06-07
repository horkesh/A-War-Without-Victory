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
 *   - duplicate display labels are disambiguated by appending the raw OSID, so
 *     two settlements that humanize to the same name remain distinguishable.
 *
 * Presentation-only; no sim/engine/determinism path. This locks the picker's
 * contract (it shipped untested in PR #241) so a future refactor can't silently
 * reintroduce a free-text-only / unsorted / ambiguous target surface.
 */
import { describe, expect, it } from 'vitest';
import { buildObjectiveTargetOptions } from '../../src/ui/map/utils/objectiveTargetOptions.js';
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

  it('disambiguates duplicate display labels by appending the OSID', () => {
    const options = buildObjectiveTargetOptions(
      { 'op:foca:gornja_1': null, 'op:foca:gornja_2': null, 'op:tuzla:tuzla_1': null },
      { 'op:foca:gornja_1': 'Gornja', 'op:foca:gornja_2': 'Gornja', 'op:tuzla:tuzla_1': 'Tuzla' },
    );
    const byOsid = new Map(options.map((o) => [o.osid, o.display]));
    // Both "Gornja" entries carry their OSID to stay distinguishable in the <select>.
    expect(byOsid.get('op:foca:gornja_1')).toBe('Gornja (op:foca:gornja_1)');
    expect(byOsid.get('op:foca:gornja_2')).toBe('Gornja (op:foca:gornja_2)');
    // A unique label is shown plain (no OSID noise).
    expect(byOsid.get('op:tuzla:tuzla_1')).toBe('Tuzla');
  });

  it('returns an empty list when no control/display state is loaded', () => {
    expect(buildObjectiveTargetOptions(undefined, null)).toEqual([]);
    expect(buildObjectiveTargetOptions({}, {})).toEqual([]);
  });
});
