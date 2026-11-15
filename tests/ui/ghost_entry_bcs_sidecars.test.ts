/**
 * Ghost-entry BCS sidecars are real translations, and no authoring metadata renders.
 *
 * R8 polish (2026-11-15): the 19 sidecars in data/codex/ghost_entries_bcs/ were one generic
 * boilerplate paragraph each ("Ovaj bosanski sidecar lokalizira ..."), so a BCS player read
 * none of an entry's content. Each is now a full translation. Ten EN bodies also carry a YAML
 * front-matter block (historical_source, source_tier, source_note), which rendered as a visible
 * paragraph of raw keys; the parser now drops it.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseGhostEntryProse } from '../../src/ui/map/data/ghostEntryProse.js';

const root = join(__dirname, '../../data/codex');
const ids = readdirSync(join(root, 'ghost_entries')).filter((n) => n.endsWith('.md')).map((n) => n.slice(0, -3)).sort();
const read = (dir: string, id: string) => readFileSync(join(root, dir, `${id}.md`), 'utf8');
const blocks = (md: string) => parseGhostEntryProse(md, 'path_not_taken');

describe('ghost entry front matter', () => {
  it('is dropped by the parser, never shown as text', () => {
    const md = '---\nhistorical_source: ICTY\nsource_tier: icty_icj_un\n---\n\n# Title\n\nBody text.\n';
    expect(blocks(md)).toEqual([
      { kind: 'heading', text: 'Title' },
      { kind: 'paragraph', text: 'Body text.' },
    ]);
  });

  it('drops the "path not taken" strapline from a divergence entry in both languages', () => {
    const en = '# T\n\n**Ring 2 — narrative observation. Path-not-taken. Ghost entry.**\n\nBody.';
    const bcs = '# T\n\n**Ring 2 — narativna opservacija. Put kojim se nije išlo. Ghost zapis.**\n\nTekst.';
    expect(parseGhostEntryProse(en, 'divergence_context').map((b) => b.text)).toEqual(['T', 'Body.']);
    expect(parseGhostEntryProse(bcs, 'divergence_context').map((b) => b.text)).toEqual(['T', 'Tekst.']);
    expect(parseGhostEntryProse(bcs, 'path_not_taken').length).toBe(3);
  });

  it('leaves a body without front matter, and a dash line inside the prose, alone', () => {
    expect(blocks('# T\n\nA paragraph.\n\n---\n\nAnother.').map((b) => b.text)).toEqual(['T', 'A paragraph.', '---', 'Another.']);
  });

  it('no EN or BCS body shows authoring keys after parsing', () => {
    for (const dir of ['ghost_entries', 'ghost_entries_bcs']) {
      for (const id of ids) {
        const text = blocks(read(dir, id)).map((b) => b.text).join('\n');
        expect(text, `${dir}/${id}`).not.toMatch(/historical_source:|source_tier:|source_note:/);
      }
    }
  });
});

describe('ghost entry BCS sidecars', () => {
  it('has a sidecar for every EN entry, and none carries front matter', () => {
    expect(ids.length).toBe(20);
    expect(readdirSync(join(root, 'ghost_entries_bcs')).filter((n) => n.endsWith('.md')).length).toBe(ids.length);
    for (const id of ids) expect(read('ghost_entries_bcs', id).startsWith('---'), id).toBe(false);
  });

  it('is a translation, not the old boilerplate', () => {
    for (const id of ids) {
      const bcs = read('ghost_entries_bcs', id);
      expect(bcs, id).not.toMatch(/sidecar|lokalizira Codex ghost zapis/i);
      expect(bcs, id).not.toMatch(/[Ѐ-ӿ]/); // no stray Cyrillic
      expect(bcs.length, id).toBeGreaterThan(900);
    }
  });

  it('has the same block structure as the EN entry (heading first, same number of paragraphs)', () => {
    for (const id of ids) {
      const en = blocks(read('ghost_entries', id));
      const bcs = blocks(read('ghost_entries_bcs', id));
      expect(bcs[0]?.kind, id).toBe('heading');
      expect(bcs.length, id).toBe(en.length);
    }
  });

  it('keeps every court case number the EN entry cites', () => {
    const cases = /\b(?:IT|MICT|IT-\d+)-\d+(?:\/\d+)*(?:-[A-Z]+)?\b/g;
    for (const id of ids) {
      const en = [...new Set(read('ghost_entries', id).replace(/^---[\s\S]*?\n---\n/, '').match(cases) ?? [])];
      const bcs = read('ghost_entries_bcs', id);
      for (const number of en) expect(bcs, `${id}: ${number}`).toContain(number);
    }
  });
});
