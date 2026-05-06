/**
 * LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-C — anchor coverage regression test.
 *
 * Predecessor panel: `docs/40_reports/audits/20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md`
 * Lane C scope (`6a0ad4c2`).
 *
 * The Phase 0 panel inventoried 8 anchors used by `OnboardingOverlay`'s
 * 8-step tutorial. A11y Lane B (`f496de43`) wired the previously-missing
 * `map-container` anchor. This regression test asserts that EVERY anchor
 * referenced in the canonical step list (`ONBOARDING_STEPS` from
 * `onboardingSteps.ts`) has at least one corresponding emitter under
 * `src/`. Future modal-migrations / refactors that drop an anchor would
 * break this test, preventing tutorial regression.
 *
 * Eight contracts:
 *   T1 — Canonical step list shape and length: 8 steps, sorted by id, the
 *        target_ui_element values are either null or members of
 *        TUTORIAL_SPOTLIGHT_TARGETS.
 *   T2 — Per-anchor emitter coverage: for each non-null target_ui_element
 *        (and each TUTORIAL_SPOTLIGHT_TARGETS token), grep src/ for an
 *        emitter and assert at least one match. Either a literal
 *        data-tutorial-step attribute OR a JSX-expression emitter that
 *        provably yields the value (template literal over a token list)
 *        counts. Static-time test (fs scan at test runtime; no React
 *        rendering required).
 *   T3 — Welcome-step exception: 01_welcome has target_ui_element === null
 *        per spec (overlay-self spotlight, no external emitter required).
 *        The overlay's own self-emitter branch is verified to exist.
 *   T4 — No orphan emitters: every literal data-tutorial-step attribute
 *        under src/ must either be in TUTORIAL_SPOTLIGHT_TARGETS or in a
 *        documented ancillary allowlist (sibling anchors used by other
 *        tutorial contexts). Future drift adds either the step or the
 *        allowlist entry.
 *   T5 — Static-grep guards: this test source itself contains no
 *        Math.random / Date.now / new Date.
 *   T6 — Faction symmetry: the test does not read player_faction and
 *        never branches on faction id literals.
 *   T7 — Manifest determinism: re-running the discovery (read + sort +
 *        map) yields a byte-identical anchor manifest.
 *   T8 — Dynamic-anchor coverage for army-hq tabs: the
 *        army-hq-tab-briefing anchor is emitted via a JSX template
 *        literal over a canonical HQ_TABS list that contains briefing.
 *        Both halves are asserted.
 *
 * Sensitive-history compliance: Ring 1, test-only lane, faction-agnostic.
 *
 * Determinism: pure fs reads + sorted iteration; no clock, no randomness.
 */

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

import {
    ONBOARDING_STEPS,
    TUTORIAL_SPOTLIGHT_TARGETS,
} from '../src/ui/map/components/onboarding/onboardingSteps.js';

const REPO_ROOT = process.cwd();
const SRC_DIR = resolve(REPO_ROOT, 'src');

/**
 * Documented ancillary anchor allowlist. These literal
 * data-tutorial-step attributes exist in src/ but are NOT step targets
 * in the 8-step campaign loop. They are sibling anchors used by the
 * overlay's spotlight surface (e.g. tab-bar containers) or
 * future-reserved tokens. Any new entry added here MUST be reviewed by
 * the tutorial owner; this allowlist is the throttle against silent
 * anchor proliferation.
 */
const ANCILLARY_ANCHOR_ALLOWLIST: ReadonlyArray<string> = Object.freeze([
    // ArmyHQModal tab-bar container; sits one DOM level above the
    // individual army-hq-tab-XXX buttons. Useful as a future
    // hover-target for an "open the tab bar" tutorial step.
    'army-hq-tabs',
]);

/**
 * Recursively discover .ts/.tsx source files under dir. Skip
 * node_modules and any nested dist outputs. Sorted output for
 * deterministic iteration.
 */
function listSourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir).sort()) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
            if (entry === 'node_modules' || entry.startsWith('dist')) continue;
            out.push(...listSourceFiles(full));
            continue;
        }
        const ext = extname(full);
        if (ext === '.ts' || ext === '.tsx') out.push(full);
    }
    return out;
}

/** Cached source-file list for the test run (deterministic). */
const SOURCE_FILES: ReadonlyArray<string> = Object.freeze(listSourceFiles(SRC_DIR));

/** Read a source file (UTF-8). */
function readSrc(absPath: string): string {
    return readFileSync(absPath, 'utf-8');
}

/**
 * Find files emitting a literal data-tutorial-step attribute equal to
 * anchor. Returns the list of repo-relative file paths (sorted).
 */
function findLiteralEmitters(anchor: string): string[] {
    const needle = 'data-tutorial-step="' + anchor + '"';
    const out: string[] = [];
    for (const file of SOURCE_FILES) {
        const src = readSrc(file);
        if (src.includes(needle)) out.push(relative(REPO_ROOT, file).replaceAll('\\', '/'));
    }
    return out.sort();
}

/**
 * Find files emitting a JSX-expression data-tutorial-step whose
 * resolvable value includes anchor. We accept two patterns deemed
 * provably-yielding:
 *
 *  (a) Template literal of the form data-tutorial-step={`<prefix>${id}`}
 *      where <prefix> matches the lead of anchor and the suffix is a
 *      token from a co-located *_TABS / *_STEPS const list that
 *      contains the trailing slug as id: '<suffix>'.
 *
 *  (b) Direct identifier inside the OnboardingOverlay self-anchor
 *      branch (welcome step uses this; the emitter resolves to next.id
 *      which is a step id).
 *
 * Returns repo-relative paths (sorted). Adding more dynamic emitter
 * shapes in the future requires extending this helper alongside the
 * new emitter.
 */
function findDynamicEmitters(anchor: string): string[] {
    const out: string[] = [];

    // Pattern (a): template literal with a matching prefix.
    const templateRe = /data-tutorial-step=\{`([^`${}]+)\$\{([A-Za-z_][A-Za-z0-9_]*)\}`\}/g;
    for (const file of SOURCE_FILES) {
        const src = readSrc(file);
        let match: RegExpExecArray | null;
        templateRe.lastIndex = 0;
        while ((match = templateRe.exec(src)) !== null) {
            const prefix = match[1];
            if (!anchor.startsWith(prefix)) continue;
            const suffix = anchor.slice(prefix.length);
            const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const idTokenRe = new RegExp("id:\\s*'" + escapedSuffix + "'");
            if (idTokenRe.test(src)) {
                out.push(relative(REPO_ROOT, file).replaceAll('\\', '/'));
                break;
            }
        }
    }

    // Pattern (b): overlay self-anchor.
    const selfAnchorRe = /data-tutorial-step=\{[^}]*next\.target_ui_element\s*===\s*null\s*\?\s*next\.id\s*:\s*undefined[^}]*\}/;
    const stepIds = new Set(ONBOARDING_STEPS.map(s => s.id));
    if (stepIds.has(anchor)) {
        for (const file of SOURCE_FILES) {
            const src = readSrc(file);
            if (selfAnchorRe.test(src)) {
                out.push(relative(REPO_ROOT, file).replaceAll('\\', '/'));
            }
        }
    }

    return Array.from(new Set(out)).sort();
}

/** Aggregate emitter list for an anchor (literal + dynamic). */
function findAllEmitters(anchor: string): string[] {
    return Array.from(
        new Set([...findLiteralEmitters(anchor), ...findDynamicEmitters(anchor)]),
    ).sort();
}

/**
 * Files that document anchors in docstrings/comments rather than
 * emitting them. T4's orphan detector skips these so docstring
 * placeholders (e.g. `data-tutorial-step="<step_id>"` in
 * onboardingSteps.ts) are not flagged as orphan emitters.
 */
const DOC_ONLY_FILES: ReadonlyArray<string> = Object.freeze([
    'src/ui/map/components/onboarding/onboardingSteps.ts',
]);

/**
 * Discover EVERY literal data-tutorial-step attribute under src/. Used
 * by T4 (orphan detection). Returns a sorted unique list of values.
 *
 * Files in DOC_ONLY_FILES are skipped because they document anchors in
 * comments rather than emit them.
 */
function discoverAllLiteralAnchors(): string[] {
    const out = new Set<string>();
    const re = /data-tutorial-step="([^"]+)"/g;
    for (const file of SOURCE_FILES) {
        const rel = relative(REPO_ROOT, file).replaceAll('\\', '/');
        if (DOC_ONLY_FILES.includes(rel)) continue;
        const src = readSrc(file);
        let match: RegExpExecArray | null;
        re.lastIndex = 0;
        while ((match = re.exec(src)) !== null) {
            out.add(match[1]);
        }
    }
    return Array.from(out).sort();
}

describe('LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-C — anchor coverage regression', () => {
    it('T1 — canonical step list shape: 8 steps, sorted, targets in allowlist or null', () => {
        expect(ONBOARDING_STEPS.length).toBe(8);

        const ids = ONBOARDING_STEPS.map(s => s.id);
        const sorted = [...ids].sort();
        expect(ids).toEqual(sorted);

        const validTargets = new Set(TUTORIAL_SPOTLIGHT_TARGETS);
        for (const step of ONBOARDING_STEPS) {
            if (step.target_ui_element === null) continue;
            expect(
                validTargets.has(step.target_ui_element),
                "step '" + step.id + "' targets '" + step.target_ui_element + "' which is not in TUTORIAL_SPOTLIGHT_TARGETS",
            ).toBe(true);
        }
    });

    it('T2 — every step target_ui_element has at least one emitter in src/', () => {
        const failures: string[] = [];
        for (const step of ONBOARDING_STEPS) {
            const target = step.target_ui_element;
            if (target === null) continue;
            const emitters = findAllEmitters(target);
            if (emitters.length === 0) {
                failures.push("step '" + step.id + "' anchor '" + target + "' has NO emitter in src/");
            }
        }
        expect(failures, failures.join('\n')).toEqual([]);

        const targetFailures: string[] = [];
        for (const target of TUTORIAL_SPOTLIGHT_TARGETS) {
            const emitters = findAllEmitters(target);
            if (emitters.length === 0) {
                targetFailures.push("TUTORIAL_SPOTLIGHT_TARGETS token '" + target + "' has NO emitter in src/");
            }
        }
        expect(targetFailures, targetFailures.join('\n')).toEqual([]);
    });

    it('T3 — welcome step uses overlay self-anchor (no external emitter required)', () => {
        const welcome = ONBOARDING_STEPS.find(s => s.id === '01_welcome');
        expect(welcome).toBeDefined();
        expect(welcome!.target_ui_element).toBeNull();

        const overlayPath = resolve(
            REPO_ROOT,
            'src/ui/map/components/onboarding/OnboardingOverlay.tsx',
        );
        const overlaySrc = readSrc(overlayPath);
        expect(overlaySrc).toMatch(
            /data-tutorial-step=\{[^}]*next\.target_ui_element\s*===\s*null\s*\?\s*next\.id\s*:\s*undefined[^}]*\}/,
        );
    });

    it('T4 — no orphan literal emitters: every literal anchor is in spotlight targets or ancillary allowlist', () => {
        const allLiteralAnchors = discoverAllLiteralAnchors();
        const allowed = new Set<string>([
            ...TUTORIAL_SPOTLIGHT_TARGETS,
            ...ANCILLARY_ANCHOR_ALLOWLIST,
        ]);
        const orphans = allLiteralAnchors.filter(a => !allowed.has(a));
        expect(
            orphans,
            'orphan literal emitters (not in spotlight targets or ancillary allowlist): ' + JSON.stringify(orphans),
        ).toEqual([]);
    });

    it('T5 — this test source contains no Math.random / Date.now / new Date', () => {
        const selfPath = resolve(REPO_ROOT, 'tests/v092_tutorial_anchor_coverage.test.ts');
        const raw = readSrc(selfPath);
        const stripped = raw
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
        expect(stripped).not.toMatch(/Math\.random\s*\(/);
        expect(stripped).not.toMatch(/Date\.now\s*\(/);
        expect(stripped).not.toMatch(/new\s+Date\s*\(/);
    });

    it('T6 — faction symmetry: canonical step list bodies and titles never name a faction', () => {
        // Anchor coverage is a property of the UI surface, not the
        // player — the test logic itself never branches on faction
        // (verifiable by reading this file: no `player_faction` reads,
        // no faction-id branches in any test). We instead assert the
        // canonical step content is faction-agnostic, which is the
        // observable contract the tutorial promises.
        const factionTokens = ['RBiH', 'ARBiH', 'HRHB', 'HVO', 'VRS', 'Bosniak', 'Serb', 'Croat'];
        for (const step of ONBOARDING_STEPS) {
            for (const token of factionTokens) {
                expect(
                    step.title.includes(token),
                    "step '" + step.id + "' title names faction-token '" + token + "'",
                ).toBe(false);
                expect(
                    step.body.includes(token),
                    "step '" + step.id + "' body names faction-token '" + token + "'",
                ).toBe(false);
            }
        }
    });

    it('T7 — manifest determinism: re-running discovery yields a byte-identical anchor manifest', () => {
        function buildManifest(): string {
            const entries: Array<[string, string[]]> = [];
            for (const step of ONBOARDING_STEPS) {
                if (step.target_ui_element === null) {
                    entries.push([step.id, []]);
                    continue;
                }
                entries.push([step.id, findAllEmitters(step.target_ui_element)]);
            }
            entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
            return JSON.stringify(entries);
        }
        const first = buildManifest();
        const second = buildManifest();
        expect(first).toBe(second);

        const firstLiterals = discoverAllLiteralAnchors();
        const secondLiterals = discoverAllLiteralAnchors();
        expect(firstLiterals).toEqual(secondLiterals);
    });

    it('T8 — army-hq-tab-briefing dynamic emitter: template literal + briefing in HQ_TABS', () => {
        const armyHqPath = resolve(
            REPO_ROOT,
            'src/ui/map/components/army_hq/ArmyHQModal.tsx',
        );
        const src = readSrc(armyHqPath);

        // (1) The template-literal emitter exists.
        expect(src).toMatch(
            /data-tutorial-step=\{`army-hq-tab-\$\{[A-Za-z_][A-Za-z0-9_]*\}`\}/,
        );

        // (2) The HQ_TABS const contains an entry with id: 'briefing'.
        expect(src).toMatch(/HQ_TABS\s*=\s*\[[\s\S]*?id:\s*'briefing'[\s\S]*?\]/);

        // (3) The aggregate finder discovers ArmyHQModal.tsx as an emitter.
        const emitters = findAllEmitters('army-hq-tab-briefing');
        expect(emitters.some(p => p.endsWith('ArmyHQModal.tsx'))).toBe(true);
    });
});
