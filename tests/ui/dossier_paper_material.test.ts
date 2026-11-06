// @vitest-environment jsdom
/**
 * Army HQ on paper — slice 1.
 *
 * Prose surfaces in Army HQ take their paper from one owner (DossierPaper):
 * the Chief of Staff missive and the situation briefing render on the `paper`
 * token with the shared band and ink classes, and no component keeps a private
 * paper hex literal. Figures stay on the dark panel; this test does not touch
 * them.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';
import { SituationBriefing } from '../../src/ui/map/components/army_hq/SituationBriefing.js';
import { DOSSIER_PAPER_CLASS } from '../../src/ui/map/components/army_hq/DossierPaper.js';

afterEach(cleanup);

const root = resolve(__dirname, '../..');
const armyHq = resolve(root, 'src/ui/map/components/army_hq');

describe('dossier paper material', () => {
  it('renders the situation briefing on the shared paper sheet', () => {
    const { container } = render(React.createElement(SituationBriefing, { items: [], onNavigate: undefined }));
    const details = container.querySelector('details[data-testid="situation-briefing"]') as HTMLElement;
    expect(details).not.toBeNull();
    expect(details.getAttribute('data-material')).toBe('paper');
    for (const cls of DOSSIER_PAPER_CLASS.split(' ')) expect(details.classList.contains(cls)).toBe(true);
  });

  it('keeps no private paper hex literal in Army HQ or the Codex essay', () => {
    const files = readdirSync(armyHq).filter((f) => f.endsWith('.tsx')).map((f) => join(armyHq, f));
    files.push(resolve(root, 'src/ui/map/components/CodexPanel.tsx'));
    const offenders: string[] = [];
    for (const file of files) {
      const source = withoutComments(readFileSync(file, 'utf8'));
      const hits = source.match(/bg-\[#(?:f5f0e8|ebe5d8|ebe1cd)\]/g);
      if (hits) offenders.push(`${file}: ${hits.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });

  it('sets the army commander personnel note and the front-visit sheet on paper', () => {
    const modal = withoutComments(readFileSync(join(armyHq, 'ArmyHQModal.tsx'), 'utf8'));
    expect(modal).toContain('<DossierPaper testId="army-hq-officer-note"');
    const frontVisit = withoutComments(readFileSync(join(armyHq, 'FrontVisitSection.tsx'), 'utf8'));
    expect(frontVisit).toContain('data-material="paper" className={DOSSIER_PAPER_CLASS}');
  });

  it('sets the Chief of Staff missive on DossierPaper', () => {
    const source = withoutComments(readFileSync(join(armyHq, 'ChiefOfStaffBriefing.tsx'), 'utf8'));
    expect(source).toContain('<DossierPaper');
    expect(source).toContain('testId="chief-of-staff-briefing"');
  });
});
