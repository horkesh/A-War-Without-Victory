/**
 * Tactical toolbar single-line contract.
 *
 * The toolbar is a symmetric grid with the army crest FIXED over the centre
 * column, so each half must fit its own worst case — there is no reflow room.
 * The 2026-09-03 overflow (chips wrapping into lines clipped by the h-12 bar and
 * spilling leftward under the crest) shipped because nothing pinned this.
 *
 * A `scrollWidth === clientWidth` check does NOT catch it: on a `justify-end`
 * flex container, overflow projects from the START edge and is excluded from
 * scrollWidth in LTR. So this suite pins the SOURCE contract instead — the
 * properties that make overflow impossible — which is what a jsdom test can
 * assert honestly. Geometric proof at real widths is
 * `tmp_gui_observation/verify_toolbar_fit.mjs` (measures start-side overflow and
 * crest collision at 1280/1366/1400/1440/1600/1920).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();
const read = (rel: string) => readFileSync(join(REPO, rel), 'utf8');

describe('tactical toolbar single-line contract', () => {
    const toolbar = read('src/ui/map/components/PresidentialToolbar.tsx');

    it('keeps reference routes in the left navigation group, not the right cluster', () => {
        const leftGroup = toolbar.slice(
            toolbar.indexOf('{/* LEFT: field navigation'),
            toolbar.indexOf('{/* CENTER:'),
        );
        for (const testid of ['toolbar-route-records', 'toolbar-route-chronicle', 'toolbar-route-codex']) {
            expect(leftGroup, `${testid} must live in the left group`).toContain(testid);
        }
    });

    it('never lets a toolbar item wrap: every route button is nowrap and unshrinkable', () => {
        // className is a plain string on most routes and a template literal on
        // DESK (it tints for the warroom-return state) — match both forms.
        const routes = toolbar.match(
            /data-testid="toolbar-route-[a-z-]+"[\s\S]{0,240}?className=(?:"[^"]+"|\{`[^`]+`)/g,
        ) ?? [];
        expect(routes.length, 'all six route buttons must be covered').toBe(6);
        for (const route of routes) {
            const id = route.match(/toolbar-route-[a-z-]+/)?.[0];
            expect(route, `${id} must not wrap`).toContain('whitespace-nowrap');
            expect(route, `${id} must not shrink`).toContain('shrink-0');
        }
    });

    it('gives the alert chips a compact band so their minimum width cannot exceed the track', () => {
        // Each chip's word is hidden below 2xl; the dot and count always render.
        expect(toolbar).toContain("hidden 2xl:inline");
        expect(toolbar).toContain("presidentialToolbar.reviewWord");
        expect(toolbar).toContain("presidentialToolbar.reserveWord");
        // The gauge sheds its label and bar before it can push the cluster leftward.
        expect(toolbar).toContain('hidden xl:block w-14 h-1.5');
    });

    it('keeps the full phrase as the accessible name while the label is visually hidden', () => {
        // In the compact band the chip is a coloured dot, so the accessible name
        // must be the LONG phrase, never the shortened visual label.
        expect(toolbar).toMatch(/aria-label=\{t\(pendingReviews === 1 \? 'presidentialToolbar\.reviewSingular'/);
        expect(toolbar).toContain('aria-label={reserveSignal.label}');
        expect(toolbar).toContain("aria-label={t('presidentialToolbar.tensionsRising')}");
        expect(toolbar).not.toContain("aria-label={t('presidentialToolbar.tensions')}");
    });

    it('leaves exactly one shrinkable element — the turn date', () => {
        const dateSpan = toolbar.slice(toolbar.indexOf('presidentialToolbar.currentDateTitle') - 400,
                                       toolbar.indexOf('presidentialToolbar.currentDateTitle'));
        expect(dateSpan).toContain('truncate');
        expect(dateSpan).toContain('min-w-0');
    });
});

describe('command window is sized for the toolbar it hosts', () => {
    const main = read('src/desktop/electron-main.cjs');

    it('opens at full HD, clamped to the display work area', () => {
        expect(main).toContain('const PREFERRED_WINDOW = { width: 1920, height: 1080 }');
        expect(main).toContain('const DESIGN_MIN_WINDOW = { width: 1280, height: 720 }');
        expect(main).toContain('getCommandWindowSize');
        expect(main).toContain('workAreaSize');
        // no window may reintroduce a hardcoded sub-HD default
        expect(main).not.toMatch(/width:\s*1400,/);
    });

    it('never lets the floor exceed the display, which would strand the window off-screen', () => {
        // A work area smaller than the design floor (a 1024-wide screen, a scaled
        // remote session, 720p minus a taskbar) must clamp the MINIMUM too —
        // otherwise minWidth pins the window larger than the screen and it can
        // never be resized back into view.
        expect(main).toContain('getCommandWindowMinimum');
        expect(main).toContain('Math.min(DESIGN_MIN_WINDOW.width, work.width)');
        expect(main).toContain('Math.min(DESIGN_MIN_WINDOW.height, work.height)');
        // the requested size is a pure min() against the work area — no max() floor
        expect(main).toContain('width: Math.min(PREFERRED_WINDOW.width, work.width)');
        expect(main).not.toMatch(/Math\.max\(\s*(DESIGN_)?MIN_WINDOW\.width/);
    });

    it('applies the computed size and the clamped minimum to every command window', () => {
        expect((main.match(/const windowSize = getCommandWindowSize\(\);/g) ?? []).length).toBe(2);
        expect((main.match(/const windowMinimum = getCommandWindowMinimum\(\);/g) ?? []).length).toBe(2);
        expect((main.match(/minWidth: windowMinimum\.width,/g) ?? []).length).toBe(2);
        expect((main.match(/minHeight: windowMinimum\.height,/g) ?? []).length).toBe(2);
    });
});
