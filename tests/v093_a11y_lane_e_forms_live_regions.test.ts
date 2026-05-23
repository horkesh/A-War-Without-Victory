// @vitest-environment jsdom
/**
 * LANE-NIGHTSHIFT-V093-A11Y-LANE-E — Forms + inputs + live-regions
 * accessibility baseline tests.
 *
 * Per `docs/40_reports/audits/20260506_V093_A11Y_PHASE_0_PANEL.md` Lane E
 * acceptance criteria C-E1 (form-label `htmlFor`) and C-E3 (canonical
 * `<SrAnnouncer/>` live-region primitive).
 *
 * Closes the form-label `htmlFor` P0 (audit gap A8-A) by pinning each of
 * the 8 owned forms; ships the canonical screen-reader announcer
 * primitive (A5-B) by rendering it via React Testing Library and
 * asserting both `aria-live` regions plus `announce()` routing.
 *
 * Sensitive-history compliance: Ring 1, faction-agnostic mechanism, no §6
 * surface. UI-only.
 */
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    SrAnnouncerProvider,
    useSrAnnouncer,
} from '../src/ui/shared/SrAnnouncer';

const repoRoot = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(repoRoot, p), 'utf8');

// The 8 forms exclusively owned by Lane E (per Phase 0 panel + lane
// scope; SettingsScreen is Lane D, RecruitmentModal is Lane A,
// `army_hq/*` is Lane C, ReplayScrubber already a11y-clean).
const AI_SETTINGS_PATH = 'src/ui/map/components/AiSettingsPanel.tsx';
const PRESIDENTIAL_TOOLBAR_PATH =
    'src/ui/map/components/PresidentialToolbar.tsx';
const TOP_TOOLBAR_PATH =
    'src/ui/map/components/_retired_chrome/TopToolbar.tsx';
const SIDE_PICKER_PATH = 'src/ui/map/components/SidePickerOverlay.tsx';
const COMMAND_TOPBAR_PATH = 'src/ui/map/components/plan_ui/CommandTopBar.tsx';
const PLAN_PARAMETERS_PATH = 'src/ui/map/components/ops_modal/PlanParameters.tsx';
const CORPS_CARD_PATH = 'src/ui/map/components/CorpsCard.tsx';
const ENCLAVE_DASHBOARD_PATH = 'src/ui/map/components/EnclaveDashboard.tsx';
const REPLAY_SCRUBBER_PATH = 'src/ui/map/components/replay/ReplayScrubber.tsx';

const ALL_LANE_E_FORM_FILES: ReadonlyArray<string> = [
    AI_SETTINGS_PATH,
    PRESIDENTIAL_TOOLBAR_PATH,
    TOP_TOOLBAR_PATH,
    SIDE_PICKER_PATH,
    COMMAND_TOPBAR_PATH,
    PLAN_PARAMETERS_PATH,
    CORPS_CARD_PATH,
    ENCLAVE_DASHBOARD_PATH,
];

describe('v0.9.3 a11y Lane E — Forms + inputs + live regions', () => {
    it('T1 — AiSettingsPanel API-key label is htmlFor-bound to its input', () => {
        const src = read(AI_SETTINGS_PATH);
        expect(src).toContain('htmlFor="ai-settings-api-key"');
        expect(src).toContain('id="ai-settings-api-key"');
    });

    it('T2 — PresidentialToolbar dev inputs carry aria-label', () => {
        const src = read(PRESIDENTIAL_TOOLBAR_PATH);
        // dev RUN_ID text input
        expect(src).toContain("aria-label={t('presidentialToolbar.loadRunById')}");
        // hidden file picker
        expect(src).toContain("aria-label={t('presidentialToolbar.loadSaveFile')}");
    });

    it('T3 — retired TopToolbar dev inputs carry aria-label', () => {
        const src = read(TOP_TOOLBAR_PATH);
        expect(src).toContain('aria-label="Dev: load run by ID"');
        expect(src).toContain('aria-label="Dev: load save file"');
    });

    it('T4 — SidePickerOverlay hidden file-picker carries aria-label', () => {
        const src = read(SIDE_PICKER_PATH);
        expect(src).toContain("aria-label={t('sidePicker.loadSaveAria')}");
    });

    it('T5 — CommandTopBar Directive Name label is htmlFor-bound', () => {
        const src = read(COMMAND_TOPBAR_PATH);
        expect(src).toContain('htmlFor="command-topbar-directive-name"');
        expect(src).toContain('id="command-topbar-directive-name"');
    });

    it('T6 — PlanParameters op-name label is htmlFor-bound', () => {
        const src = read(PLAN_PARAMETERS_PATH);
        expect(src).toContain('htmlFor="plan-params-op-name"');
        expect(src).toContain('id="plan-params-op-name"');
    });

    it('T7 — CorpsCard stance <select> carries aria-label', () => {
        const src = read(CORPS_CARD_PATH);
        // The visible "Stance" span carries an icon and is kept as a
        // styled section header; the <select> itself must carry the
        // programmatic label.
        expect(src).toContain("aria-label={t('corpsCard.stanceAria')}");
    });

    it('T8 — EnclaveDashboard allocation input is htmlFor-bound (per-enclave id)', () => {
        const src = read(ENCLAVE_DASHBOARD_PATH);
        expect(src).toContain('htmlFor={`enclave-allocation-${enclaveId}`}');
        expect(src).toContain('id={`enclave-allocation-${enclaveId}`}');
    });

    it('T9 — SrAnnouncer renders both polite and assertive aria-live regions', () => {
        const { container, unmount } = render(
            createElement(
                SrAnnouncerProvider,
                null,
                createElement('div', null, 'child'),
            ),
        );
        const polite = container.querySelector(
            '[data-awwv-sr-announcer="polite"]',
        );
        const assertive = container.querySelector(
            '[data-awwv-sr-announcer="assertive"]',
        );
        expect(polite).not.toBeNull();
        expect(assertive).not.toBeNull();
        expect(polite?.getAttribute('aria-live')).toBe('polite');
        expect(assertive?.getAttribute('aria-live')).toBe('assertive');
        expect(polite?.getAttribute('aria-atomic')).toBe('true');
        expect(assertive?.getAttribute('aria-atomic')).toBe('true');
        // sr-only utility (Tailwind ships this by default — visually
        // hidden, screen-reader audible).
        expect(polite?.className).toContain('sr-only');
        expect(assertive?.className).toContain('sr-only');
        unmount();
    });

    it('T10 — SrAnnouncer.announce() routes to the correct live region', () => {
        // Drive the announcer from a button click inside the provider
        // so React flushes naturally via RTL's auto-act on fireEvent.
        function ProbeButtons() {
            const { announce } = useSrAnnouncer();
            return createElement(
                'div',
                {},
                createElement(
                    'button',
                    {
                        'data-testid': 'announce-polite',
                        onClick: () => announce('Turn 18 complete.'),
                    },
                    'polite',
                ),
                createElement(
                    'button',
                    {
                        'data-testid': 'announce-assertive',
                        onClick: () =>
                            announce(
                                'Save corruption — load failed.',
                                'assertive',
                            ),
                    },
                    'assertive',
                ),
            );
        }
        const { container, getByTestId, unmount } = render(
            createElement(
                SrAnnouncerProvider,
                null,
                createElement(ProbeButtons),
            ),
        );
        const getPolite = () =>
            container.querySelector(
                '[data-awwv-sr-announcer="polite"]',
            )?.textContent ?? '';
        const getAssertive = () =>
            container.querySelector(
                '[data-awwv-sr-announcer="assertive"]',
            )?.textContent ?? '';

        // Default level → polite.
        fireEvent.click(getByTestId('announce-polite'));
        expect(getPolite()).toBe('Turn 18 complete.');
        expect(getAssertive()).toBe('');

        // Explicit assertive level routes to assertive region.
        fireEvent.click(getByTestId('announce-assertive'));
        expect(getAssertive()).toBe('Save corruption — load failed.');
        // Polite stays at last polite message — independent regions.
        expect(getPolite()).toBe('Turn 18 complete.');

        unmount();
    });

    it('T11 — ReplayScrubber retains aria-label on its slider (regression guard)', () => {
        // Lane E does NOT modify ReplayScrubber, but the slider's
        // pre-existing aria-label is part of the form-input
        // accessibility contract; pin it to catch silent regressions.
        const src = read(REPLAY_SCRUBBER_PATH);
        expect(src).toContain("aria-label={t('replay.turnScrubber')}");
    });

    it('T12 — Faction-symmetric: no faction names appear in any Lane E label/aria string changes', () => {
        // Lane E's contract is faction-agnostic. None of the new
        // htmlFor / id / aria-label strings introduced in any of the
        // 8 owned files (or in SrAnnouncer.tsx) may hardcode RBiH /
        // RS / HRHB. Pin via static grep on label-related lines.
        const FACTION_TOKENS = ['RBiH', 'HRHB'] as const;
        // 'RS' is too generic to grep raw (matches "RS" in many JSX
        // tokens). Restrict to whole-faction-token contexts: quoted
        // string literal or word boundary inside a label string.
        const RS_FACTION_REGEX = /["'`]RS["'`]|\bRS\s+(faction|corps|brigade|army)/i;

        for (const file of [
            ...ALL_LANE_E_FORM_FILES,
            'src/ui/shared/SrAnnouncer.tsx',
        ]) {
            const src = read(file);
            const labelLines = src
                .split('\n')
                .filter(
                    (line) =>
                        /aria-label\s*=|htmlFor\s*=|id="[a-z-]+"/.test(line),
                );
            const labelBlob = labelLines.join('\n');
            for (const tok of FACTION_TOKENS) {
                expect(
                    labelBlob.includes(tok),
                    `${file} label/id/aria strings must not mention faction "${tok}"`,
                ).toBe(false);
            }
            expect(
                RS_FACTION_REGEX.test(labelBlob),
                `${file} label/id/aria strings must not mention faction "RS"`,
            ).toBe(false);
        }
    });

    it('T13 - AiSettingsPanel saves through the typed AI commander IPC bridge', () => {
        const src = read(AI_SETTINGS_PATH);
        expect(src).toContain('ipc.setAiCommanderConfig');
        expect(src).not.toContain('(ipc as any).invoke');
    });
});
