import { describe, expect, it } from 'vitest';

import { deriveAssessmentLabel } from '../../src/ui/map/components/EventDecisionModal.js';

// Phase 2 slice 1 "Back the Officer": the assessment block speaks in a named
// officer's voice for operation/corps-scoped events ('command' / 'military'),
// and otherwise keeps the generic "Staff assessment". Pure derivation — no DOM.
describe('EventDecisionModal advisor label (Phase 2 slice 1)', () => {
  it('renders {rank} {name} for a command-scoped event when a commander resolves', () => {
    expect(deriveAssessmentLabel('command', { name: 'Atif Dudaković', rank: 'corps_commander' }))
      .toBe('Corps Commander Atif Dudaković');
  });

  it('renders {rank} {name} for a military-scoped event', () => {
    expect(deriveAssessmentLabel('military', { name: 'Sefer Halilović', rank: 'general' }))
      .toBe('General Sefer Halilović');
  });

  it('renders just the name when the officer has no rank', () => {
    expect(deriveAssessmentLabel('command', { name: 'Atif Dudaković' })).toBe('Atif Dudaković');
  });

  it('falls back to "Staff assessment" when no advisor resolves on an officer-scoped event', () => {
    expect(deriveAssessmentLabel('command', undefined)).toBe('Staff assessment');
    expect(deriveAssessmentLabel('military', { name: '   ' })).toBe('Staff assessment');
    expect(deriveAssessmentLabel('command', { name: null })).toBe('Staff assessment');
  });

  it('keeps "Staff assessment" for non-officer-scoped events even with an advisor', () => {
    for (const cat of ['political', 'diplomatic', 'humanitarian', 'economic', 'territorial', undefined]) {
      expect(deriveAssessmentLabel(cat, { name: 'Atif Dudaković', rank: 'corps_commander' }))
        .toBe('Staff assessment');
    }
  });
});
