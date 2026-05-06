/**
 * LANE-NIGHTSHIFT-V093-A11Y-LANE-B — Map / tactical-map landmarks +
 * keyboard pan/zoom + tutorial `map-container` anchor wire.
 *
 * Bundled with Tutorial Phase 0 Lane C (anchor coverage) per the audit
 * panel: A11y Lane B owns `MapContainer.tsx` for landmarks, and the
 * Tutorial Phase 0 audit identified `data-tutorial-step="map-container"`
 * as MISSING in src/. Same-file ownership → bundle.
 *
 * Seven contracts (predecessor audit `20260506_V093_A11Y_PHASE_0_PANEL.md`
 * + `20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md`):
 *   T1 — `<main>` landmark present in App.tsx tree.
 *   T2 — `<aside>` landmark present in OOBSidebar tree (mounted by App.tsx).
 *   T3 — Each landmark (`<header>`, `<main>`, `<aside>`, `<nav>`) has
 *        an aria-label or aria-labelledby attribute.
 *   T4 — Tactical map canvas wrapper carries tabIndex={0} + aria-label.
 *   T5 — Tutorial `map-container` anchor wired in MapContainer.tsx.
 *   T6 — Keyboard handler exists on map canvas wrapper and dispatches
 *        ArrowKeys / +/- / Home to MapLibre instance methods.
 *   T7 — Static-grep guards: no Math.random / Date.now / new Date in the
 *        landmarks-and-keyboard surface (determinism); no faction names
 *        in any aria-label string (faction-agnostic).
 *
 * Pure file-reading + regex contract. No React render, no MapLibre, no
 * Electron. Mirrors the pattern of `tests/modal_migration.test.ts`.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism, no §6
 * surface. UI-only — does NOT enter sim path. No `political_controllers`,
 * `OOB`, paint anchor, rupture wiring, or `enclave_resilience.ts` touched.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

const APP_PATH = 'src/ui/map/App.tsx';
const MAP_CONTAINER_PATH = 'src/ui/map/map/MapContainer.tsx';
const OOB_SIDEBAR_PATH = 'src/ui/map/components/OOBSidebar.tsx';
const BOTTOM_STATUS_PATH = 'src/ui/map/components/BottomStatusStrip.tsx';
const PRESIDENTIAL_TOOLBAR_PATH = 'src/ui/map/components/PresidentialToolbar.tsx';

const ALL_OWNED_PATHS = [
    APP_PATH,
    MAP_CONTAINER_PATH,
    OOB_SIDEBAR_PATH,
    BOTTOM_STATUS_PATH,
    PRESIDENTIAL_TOOLBAR_PATH,
];

/**
 * Collect every opening landmark JSX tag in a source file as { tag, attrs }
 * pairs. The regex requires whitespace after the tag name so we match the
 * actual JSX opening tag (which always has attributes — `<main role=...>`)
 * and skip bare-token references like `<main>` that appear in doc comments
 * describing the lane.
 */
function collectLandmarks(src: string): { tag: string; attrs: string }[] {
    const out: { tag: string; attrs: string }[] = [];
    const matches = src.matchAll(/<(header|main|aside|nav|footer|section)\s([^>]*)>/g);
    for (const m of matches) {
        out.push({ tag: m[1], attrs: m[2] });
    }
    return out;
}

/** Collect every landmark-attached aria-label string. */
function collectLandmarkAriaLabels(src: string): string[] {
    const out: string[] = [];
    const matches = src.matchAll(/<(?:header|main|aside|nav|footer|section)\s[^>]*aria-label=["']([^"']*)["'][^>]*>/g);
    for (const m of matches) {
        out.push(m[1]);
    }
    return out;
}

describe('LANE-NIGHTSHIFT-V093-A11Y-LANE-B — Map / tactical landmarks + keyboard + tutorial anchor', () => {
    it('T1 — <main> landmark present in MapContainer (mounted at App root)', () => {
        // The <main> landmark is authored inside MapContainer.tsx so the
        // tutorial spotlight's `data-tutorial-step="map-container"` token
        // resolves to the same wrapping element. App.tsx mounts <MapContainer/>
        // at the App root; verify both the source landmark exists and the
        // App imports the component.
        const mapSrc = read(MAP_CONTAINER_PATH);
        const appSrc = read(APP_PATH);

        // Opening <main ...> tag with role="main" attribute.
        expect(mapSrc).toMatch(/<main[\s\S]*?role=["']main["']/);
        // Closing </main> tag — sanity-pair the opener.
        expect(mapSrc).toContain('</main>');
        // App mounts the MapContainer.
        expect(appSrc).toMatch(/<MapContainer\s*\/>/);
        // The <main> wrapper carries id="main-content" (skip-link target
        // convention reserved by the audit; sibling Lane skip-link will
        // hash-link to this id when it ships).
        expect(mapSrc).toMatch(/id=["']main-content["']/);
    });

    it('T2 — <aside> landmark wraps the OOBSidebar (mounted at App root)', () => {
        const appSrc = read(APP_PATH);
        // Opening <aside ...> tag in App.tsx surrounding the <OOBSidebar/> mount.
        expect(appSrc).toMatch(/<aside[\s\S]*?aria-label=["'][^"']+["'][\s\S]*?>[\s\S]*?<OOBSidebar\s*\/>/);
        // Closing </aside> tag — sanity-pair the opener.
        expect(appSrc).toContain('</aside>');
    });

    it('T3 — every landmark carries an aria-label or aria-labelledby attribute', () => {
        const appSrc = read(APP_PATH);
        const mapSrc = read(MAP_CONTAINER_PATH);

        const landmarks = [
            ...collectLandmarks(appSrc).map(l => ({ ...l, file: APP_PATH })),
            ...collectLandmarks(mapSrc).map(l => ({ ...l, file: MAP_CONTAINER_PATH })),
        ];

        // Must have at least one of each: header, main, aside, nav.
        const tags = new Set(landmarks.map(l => l.tag));
        expect(tags.has('header'), 'expected at least one <header> landmark').toBe(true);
        expect(tags.has('main'), 'expected at least one <main> landmark').toBe(true);
        expect(tags.has('aside'), 'expected at least one <aside> landmark').toBe(true);
        expect(tags.has('nav'), 'expected at least one <nav> landmark').toBe(true);

        // Each landmark must carry aria-label or aria-labelledby on its
        // opening tag.
        for (const lm of landmarks) {
            const labelled = /aria-label\s*=/.test(lm.attrs) || /aria-labelledby\s*=/.test(lm.attrs);
            expect(
                labelled,
                `<${lm.tag}> in ${lm.file} must declare aria-label or aria-labelledby (attrs: ${lm.attrs})`,
            ).toBe(true);
        }
    });

    it('T4 — tactical map canvas wrapper carries tabIndex={0} + aria-label', () => {
        const mapSrc = read(MAP_CONTAINER_PATH);

        // The <main> wrapper is the focusable canvas description for SR users.
        // It must declare tabIndex={0} so keyboard users can focus it and
        // receive arrow-key/+/-/Home events.
        expect(mapSrc).toMatch(/<main[\s\S]*?tabIndex=\{0\}[\s\S]*?>/);
        // It must carry an aria-label that describes the map and keyboard
        // controls (so SR announces "Tactical map ... pan with arrow keys").
        expect(mapSrc).toMatch(/<main[\s\S]*?aria-label=["'][^"']*[Tt]actical map[\s\S]*?>/);
        // The aria-label should mention arrow keys (keyboard discoverability).
        // Match the multiline JSX opening tag (which has attributes spread
        // across lines), not the bare `<main>` token that may appear in
        // doc comments.
        const mainTag = mapSrc.match(/<main\s[\s\S]*?>/);
        expect(mainTag, 'expected to find <main ...> JSX opening tag').not.toBeNull();
        expect(mainTag![0]).toMatch(/arrow/i);
    });

    it('T5 — tutorial `map-container` anchor wired on MapContainer wrapper', () => {
        const mapSrc = read(MAP_CONTAINER_PATH);

        // The tutorial spotlight token MUST be emitted by exactly one source
        // file. MapContainer.tsx is the canonical owner per Tutorial Phase 0
        // audit (20260506_V092_TUTORIAL_FILL_OUT_PHASE_0_PANEL.md §1.3 — the
        // `02_map` step targets `map-container` and the audit flagged this
        // anchor as MISSING in src/ until this lane wires it).
        expect(mapSrc).toMatch(/data-tutorial-step=["']map-container["']/);

        // The anchor must live on the <main> wrapping element (same div
        // that gets the <main> landmark, per lane spec). Use `<main\s` so
        // we match the JSX opening tag with attributes (multi-line) rather
        // than a bare `<main>` token in doc comments.
        const mainTag = mapSrc.match(/<main\s[\s\S]*?>/);
        expect(mainTag, 'expected to find <main ...> JSX opening tag').not.toBeNull();
        expect(
            mainTag![0],
            '`data-tutorial-step="map-container"` must live on the <main> wrapper',
        ).toMatch(/data-tutorial-step=["']map-container["']/);

        // Counter-check: no other owned file emits the token (single-owner
        // contract — the spotlight resolves to a unique element).
        for (const path of [APP_PATH, OOB_SIDEBAR_PATH, BOTTOM_STATUS_PATH, PRESIDENTIAL_TOOLBAR_PATH]) {
            const src = read(path);
            expect(
                src.includes('data-tutorial-step="map-container"'),
                `${path} should NOT emit data-tutorial-step="map-container" (MapContainer.tsx is the canonical owner)`,
            ).toBe(false);
        }
    });

    it('T6 — keyboard handler dispatches ArrowKeys / +/- / Home to MapLibre methods', () => {
        const mapSrc = read(MAP_CONTAINER_PATH);

        // The <main> wrapper must declare an onKeyDown handler.
        expect(mapSrc).toMatch(/<main[\s\S]*?onKeyDown=\{[\s\S]*?\}[\s\S]*?>/);

        // The handler implementation must include the canonical key tokens.
        expect(mapSrc).toContain("'ArrowUp'");
        expect(mapSrc).toContain("'ArrowDown'");
        expect(mapSrc).toContain("'ArrowLeft'");
        expect(mapSrc).toContain("'ArrowRight'");
        // Plus / minus zoom (both '+' and '=' are accepted; both '-' and '_').
        expect(mapSrc).toMatch(/case\s+['"]\+['"]/);
        expect(mapSrc).toMatch(/case\s+['"]-['"]/);
        // Home/End reset.
        expect(mapSrc).toMatch(/case\s+['"]Home['"]/);

        // The handler must dispatch to MapLibre instance methods.
        expect(mapSrc).toMatch(/\.panBy\s*\(/);
        expect(mapSrc).toMatch(/\.zoomIn\s*\(/);
        expect(mapSrc).toMatch(/\.zoomOut\s*\(/);
        expect(mapSrc).toMatch(/\.jumpTo\s*\(/);
    });

    it('T7 — static-grep guards: determinism + faction-agnostic landmarks', () => {
        // Determinism: my Lane B edits must NOT introduce Math.random,
        // Date.now, or `new Date(`. (Existing usages elsewhere in the
        // owned files predate this lane; we scope the determinism check
        // to the landmark / keyboard handler region by re-reading the
        // tail of MapContainer.tsx where the new code lives.)
        const mapSrc = read(MAP_CONTAINER_PATH);
        const mainTagIdx = mapSrc.indexOf('<main');
        expect(mainTagIdx, 'expected to find <main> in MapContainer.tsx').toBeGreaterThan(0);
        const landmarkRegion = mapSrc.slice(mainTagIdx);
        expect(landmarkRegion).not.toMatch(/Math\.random/);
        expect(landmarkRegion).not.toMatch(/Date\.now/);
        expect(landmarkRegion).not.toMatch(/new\s+Date\s*\(/);

        // Faction-agnostic: aria-labels on the new landmarks must not name
        // a faction (RBiH / ARBiH / RS / VRS / HRHB / HVO).
        const appSrc = read(APP_PATH);
        const allLabels = [
            ...collectLandmarkAriaLabels(appSrc),
            ...collectLandmarkAriaLabels(mapSrc),
        ];
        expect(
            allLabels.length,
            'expected at least 4 landmark aria-label strings across owned files',
        ).toBeGreaterThanOrEqual(4);
        for (const label of allLabels) {
            expect(
                label.toLowerCase(),
                `landmark aria-label must be faction-agnostic (offending label: "${label}")`,
            ).not.toMatch(/\b(rbih|arbih|rs|vrs|hrhb|hvo)\b/);
        }

        // Sensitive-history boundary: every owned file is UI surface only
        // (no sim / state / scenario / canon import).
        for (const path of ALL_OWNED_PATHS) {
            const src = read(path);
            expect(src, `${path} must not import from src/sim/`).not.toMatch(/from\s+['"][^'"]*src\/sim\//);
            expect(src, `${path} must not import from src/state/`).not.toMatch(/from\s+['"][^'"]*src\/state\//);
            expect(src, `${path} must not import from data/scenarios/`).not.toMatch(/from\s+['"][^'"]*data\/scenarios\//);
            expect(src, `${path} must not import from docs/10_canon/`).not.toMatch(/from\s+['"][^'"]*docs\/10_canon\//);
        }
    });
});
