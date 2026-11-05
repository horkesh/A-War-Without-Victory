/**
 * Visual polish Phase D — paper and type for Army HQ, Chronicle and Codex.
 *
 * Type policy on these surfaces: body prose is set in the command face (IBM
 * Plex Sans Condensed, the Tailwind default); the data face (IBM Plex Mono) is
 * an opt-in for figures, dates, codes and small-caps labels. The policy is
 * expressed once, as a scan over the Army HQ and Chronicle sources: no
 * paragraph and no prose-leading element may carry `font-mono` unless it is a
 * small-caps label (`uppercase`). Codex badges never wrap mid-label and the
 * essay reads on the project paper token. jsdom cannot measure wrapping, and
 * the families themselves are pinned by typography_contract.test.ts.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { withoutComments } from '../helpers/sourceComments';

const root = resolve(__dirname, '../..');
// Comments are stripped before any absence assertion: the prose most likely to mention
// `font-mono` is the comment explaining why it is not used (tests/helpers/sourceComments.ts).
const read = (relativePath: string) => withoutComments(readFileSync(resolve(root, relativePath), 'utf8'));

function tsxFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...tsxFiles(path));
    else if (entry.endsWith('.tsx')) out.push(path);
  }
  return out.sort();
}

/** JSX opening tags whose className carries the data face on prose. */
function proseInDataFace(source: string): string[] {
  const offenders: string[] = [];
  const tagRe = /<(p|div|span|li|h[1-6])\b[^>]*?className=(?:"([^"]*)"|\{`([^`]*)`\})[^>]*>/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(source)) !== null) {
    const className = match[2] ?? match[3] ?? '';
    if (!/\bfont-mono\b/.test(className)) continue;
    if (/\buppercase\b/.test(className)) continue; // small-caps label: data face is intended
    const isParagraph = match[1] === 'p';
    const hasProseLeading = /\bleading-(relaxed|snug|tight|4)\b/.test(className);
    if (!isParagraph && !hasProseLeading) continue; // figures, badges, rows: data face is intended
    const line = source.slice(0, match.index).split('\n').length;
    offenders.push(`${line}: <${match[1]} className="${className}">`);
  }
  return offenders;
}

describe('type policy: prose in the command face, figures in the data face', () => {
  it('does not set the whole Army HQ dialog in the data face', () => {
    const source = read('src/ui/map/components/army_hq/ArmyHQModal.tsx');
    expect(source).not.toMatch(/overflow-hidden font-mono/);
  });

  it('keeps paragraphs and prose-leading elements out of the data face in Army HQ and the Chronicle', () => {
    const dirs = ['src/ui/map/components/army_hq', 'src/ui/map/components/chronicle'];
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const file of tsxFiles(resolve(root, dir))) {
        for (const offender of proseInDataFace(withoutComments(readFileSync(file, 'utf8')))) {
          offenders.push(`${relative(root, file)}:${offender}`);
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('scan positive control: a prose paragraph in the data face is reported, a small-caps label is not', () => {
    const sample = [
      '<p className="text-xs font-mono text-stone-400">prose</p>',
      '<div className="text-xs leading-snug font-mono">prose</div>',
      '<span className="text-xs font-mono uppercase tracking-wider">LABEL</span>',
      '<span className="text-xs tabular-nums font-mono">1,212</span>',
    ].join('\n');
    expect(proseInDataFace(sample)).toHaveLength(2);
  });

  it('keeps the data face on figures', () => {
    const relationship = read('src/ui/map/components/army_hq/CommandRelationshipSection.tsx');
    expect(relationship).toMatch(/tabular-nums font-mono|font-mono tabular-nums/);
  });
});

describe('Codex badges and paper', () => {
  it('never wraps a tier or category badge mid-label', () => {
    const source = read('src/ui/map/components/CodexPanel.tsx');
    expect((source.match(/whitespace-nowrap/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(source).toMatch(/flex flex-wrap items-center gap-x-2 gap-y-1 mb-0\.5/);
  });

  it('reads essays on the project paper token, clipped to the card', () => {
    const source = read('src/ui/map/components/CodexPanel.tsx');
    expect(source).not.toContain('bg-[#f5f0e8]');
    expect(source).toContain('bg-paper paper-grain');
    expect(source).toMatch(/bg-paper paper-grain[^"]*overflow-hidden/);
  });
});
