/**
 * Settings screen — gameplay, display, accessibility, and audio settings.
 * Uses section registry pattern for extensibility (v0.5.3 audio, v0.6.3 AI content).
 *
 * LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET: hosts the canonical
 * `OnboardingRestartButton` mount in the Gameplay section. The button is
 * visible only when `tutorial_state.dismissed === true` (no point restarting
 * an active tutorial). Singular ownership: SettingsScreen is the only
 * non-overlay host of the restart affordance.
 *
 * LANE-NIGHTSHIFT-V093-A11Y-LANE-D: Accessibility section with
 *   - Reduce-motion toggle (mirrors `prefers-reduced-motion` OS preference;
 *     persists in localStorage; sets `.user-reduce-motion` class on <html>).
 *   - Colorblind preset selector (4 presets: default / deuteranopia /
 *     protanopia / tritanopia; persists in localStorage; sets
 *     `data-cb-preset` attribute on <html> consumed by globals.css CSS vars).
 *
 * Both a11y additions are UI-preference-only (NOT in save schema; faction
 * palette CANONICAL tuples remain byte-stable). See
 * `docs/40_reports/implemented/20260506_V093_A11Y_LANE_D_CONTRAST_REDUCED_MOTION.md`.
 */
import { useCallback, useEffect, useState } from 'react';
import { playCue } from '../audio/audio_engine';
import { Z } from '../../shared/zIndex';
import { useDialogFocus } from '../../shared/Modal';
import { OnboardingRestartButton } from './onboarding/OnboardingOverlay';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import { useAudioPreferences } from '../audio/audio_preferences';
import { createCrashDiagnosticsQueue } from '../services/telemetry/telemetryQueue';
import { CRASH_DIAGNOSTICS_APP_VERSION } from '../services/telemetry/crashCapture';
import {
    buildLocalPlaytestEvidencePacketJson,
    clearPlaytestEvidenceBreadcrumbs,
    recordPlaytestEvidenceBreadcrumb,
} from '../services/telemetry/playtestEvidencePacket';
import {
    COLORBLIND_PRESETS,
    COLORBLIND_PRESET_STORAGE_KEY,
    REDUCE_MOTION_STORAGE_KEY,
    type ColorblindPreset,
} from '../../shared/factionPalette';
import { SUPPORTED_LOCALES, t, useLocale, type Locale } from '../i18n';
import { InterfaceScaleSettings } from '../preferences/InterfaceScale';
import {
    SurfaceCloseButton,
    SurfaceColumns,
    SurfaceContent,
    SurfaceHeader,
    SurfaceRail,
    SurfaceRailItem,
    SURFACE_MODAL_PANEL_MEDIUM,
    SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

interface SettingsSection {
    id: string;
    title: string;
    component: React.FC;
}

const settingsSections: SettingsSection[] = [];

/**
 * Register a settings section. Called by downstream milestones.
 * v0.5.3 registers audio, v0.6.3 registers AI content.
 */
export function registerSettingsSection(section: SettingsSection): void {
    if (!settingsSections.find(s => s.id === section.id)) {
        settingsSections.push(section);
    }
}

interface SettingsScreenProps {
    onClose: () => void;
}

export function SettingsScreen({ onClose }: SettingsScreenProps) {
    const dialogFocus = useDialogFocus(true);
    const handleClose = useCallback(() => {
        void playCue('ui_close_panel');
        onClose();
    }, [onClose]);
    const [activeSection, setActiveSection] = useState('audio');
    const [locale, setLocale] = useLocale();
    const [crashQueue] = useState(() => createCrashDiagnosticsQueue());
    const [crashConsentEnabled, setCrashConsentEnabled] = useState(() => crashQueue.isConsentEnabled());
    const [crashReportCount, setCrashReportCount] = useState(() => crashQueue.listReports().length);
    const [crashExportJson, setCrashExportJson] = useState('');
    const [playtestEvidenceJson, setPlaytestEvidenceJson] = useState('');

    // LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET: tutorial restart affordance.
    // Read tutorial_state from the canonical UI store (mirrored from
    // `meta.tutorial_state`). Show the restart button only when the tutorial
    // has been dismissed (either via Skip or via the auto-dismiss-on-final-
    // step path in OnboardingOverlay). Faction-agnostic.
    const tutorialState = useGameStore((s) => s.loadedGameState?.tutorial_state);
    const tutorialDismissed = tutorialState?.dismissed === true;
    const ipc = useIPC();
    const onboardingBridge = ipc.isAvailable
        ? {
              dismissTutorial: () => ipc.dismissTutorial(),
              advanceStep: (stepId: string) => ipc.advanceTutorialStep(stepId),
              restartTutorial: () => ipc.restartTutorial(),
          }
        : null;

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            handleClose();
        };
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [handleClose]);

    // ─── A11y: reduce-motion toggle (Lane D) ──────────────────────────────
    // Reads localStorage on mount; falls back to OS-level
    // `prefers-reduced-motion` if no explicit user preference is stored.
    // Persists user choice and toggles the `.user-reduce-motion` class on
    // <html> (consumed by globals.css). UI-preference-only — not in save.
    const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false;
        try {
            const stored = window.localStorage.getItem(REDUCE_MOTION_STORAGE_KEY);
            if (stored === '1' || stored === 'true') return true;
            if (stored === '0' || stored === 'false') return false;
        } catch { /* localStorage may be denied; fall through to OS preference */ }
        if (typeof window.matchMedia === 'function') {
            return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.classList.toggle('user-reduce-motion', reduceMotion);
        try {
            window.localStorage.setItem(REDUCE_MOTION_STORAGE_KEY, reduceMotion ? '1' : '0');
        } catch { /* localStorage denied; class on <html> is still applied */ }
    }, [reduceMotion]);

    // ─── A11y: colorblind preset selector (Lane D) ────────────────────────
    // Reads localStorage on mount, persists on change, sets `data-cb-preset`
    // on <html> (consumed by globals.css var declarations). UI-preference-
    // only; canonical FACTION_GLOW_RGB remains byte-stable.
    const [colorblindPreset, setColorblindPreset] = useState<ColorblindPreset>(() => {
        if (typeof window === 'undefined') return 'default';
        try {
            const stored = window.localStorage.getItem(COLORBLIND_PRESET_STORAGE_KEY);
            if (stored && (COLORBLIND_PRESETS as ReadonlyArray<string>).includes(stored)) {
                return stored as ColorblindPreset;
            }
        } catch { /* localStorage denied */ }
        return 'default';
    });

    useEffect(() => {
        if (typeof document === 'undefined') return;
        document.documentElement.setAttribute('data-cb-preset', colorblindPreset);
        try {
            window.localStorage.setItem(COLORBLIND_PRESET_STORAGE_KEY, colorblindPreset);
        } catch { /* localStorage denied; attribute on <html> is still applied */ }
    }, [colorblindPreset]);

    const [audioPreferences, updateAudioPreferences] = useAudioPreferences();

    useEffect(() => { void playCue('ui_open_panel'); }, []);

    const setSoundscapeEnabled = (enabled: boolean) => {
        updateAudioPreferences({ muted: !enabled });
    };

    const setMasterVolumePercent = (value: string) => {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) updateAudioPreferences({ masterVolume: parsed / 100 });
    };

    const refreshCrashDiagnosticsStatus = () => {
        setCrashConsentEnabled(crashQueue.isConsentEnabled());
        setCrashReportCount(crashQueue.listReports().length);
    };

    const setActiveSectionAndRefresh = (sectionId: string) => {
        setActiveSection(sectionId);
        if (sectionId === 'diagnostics') {
            recordPlaytestEvidenceBreadcrumb({ surface: 'settings', action: 'open_diagnostics' });
            refreshCrashDiagnosticsStatus();
        }
    };

    const setCrashDiagnosticsEnabled = (enabled: boolean) => {
        crashQueue.setConsentEnabled(enabled);
        setCrashExportJson('');
        setPlaytestEvidenceJson('');
        if (!enabled) clearPlaytestEvidenceBreadcrumbs();
        refreshCrashDiagnosticsStatus();
    };

    const exportCrashReports = () => {
        setCrashExportJson(crashQueue.exportReportsJson());
        setPlaytestEvidenceJson('');
        refreshCrashDiagnosticsStatus();
    };

    const exportPlaytestEvidence = () => {
        recordPlaytestEvidenceBreadcrumb({ surface: 'settings', action: 'export_playtest_evidence' });
        setPlaytestEvidenceJson(buildLocalPlaytestEvidencePacketJson({
            appVersion: CRASH_DIAGNOSTICS_APP_VERSION,
            platform: resolveSettingsPlatform(),
            osFamily: resolveSettingsOsFamily(),
            currentSurface: 'settings',
            crashReports: crashQueue.exportReports(),
        }));
        setCrashExportJson('');
        refreshCrashDiagnosticsStatus();
    };

    const clearCrashReports = () => {
        crashQueue.clearReports();
        clearPlaytestEvidenceBreadcrumbs();
        setCrashExportJson('');
        setPlaytestEvidenceJson('');
        refreshCrashDiagnosticsStatus();
    };

    const allSections: Array<{ id: string; title: string }> = [
        ...(tutorialDismissed ? [{ id: 'gameplay', title: t('settings.tab.gameplay') }] : []),
        { id: 'audio', title: t('settings.tab.audio') },
        { id: 'a11y', title: t('settings.tab.a11y') },
        { id: 'language', title: t('settings.tab.language') },
        { id: 'diagnostics', title: t('settings.tab.diagnostics') },
        ...settingsSections.map(s => ({ id: s.id, title: s.title })),
    ];

    // Surface redesign (owner, 2026-11-10): Settings is a surface in the Command Surface's
    // style — header with Close, the sections as a left rail, the chosen section's rows in
    // a column that scrolls on its own; 15–18px text, 48px controls.
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-[#05070a]/80"
             style={{ zIndex: Z.HARD_MODAL }}>
            <button
                type="button"
                className="absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
                tabIndex={-1}
                onClick={handleClose}
                aria-label={t('settings.close.ariaLabel')}
            />
            <div
                 data-testid="settings-panel"
                 ref={dialogFocus.ref}
                 onKeyDownCapture={dialogFocus.onKeyDown}
                 onClickCapture={event => {
                     const button = (event.target as HTMLElement).closest('button');
                     if (button && !button.hasAttribute('data-audio-close')) void playCue('ui_click');
                 }}
                 role="dialog"
                 aria-modal="true"
                 aria-labelledby="settings-title"
                 tabIndex={-1}
                 className={`relative z-10 ${SURFACE_MODAL_PANEL_MEDIUM}`}
            >
                <SurfaceHeader
                    eyebrow={t('settings.eyebrow')}
                    title={<span id="settings-title">{t('settings.title')}</span>}
                    close={(
                        <SurfaceCloseButton onClick={handleClose} data-audio-close>
                            {t('settings.close')}
                        </SurfaceCloseButton>
                    )}
                />

                <SurfaceColumns layout="rail-content">
                    <SurfaceRail aria-label={t('settings.title')}>
                        {allSections.map(sec => (
                            <SurfaceRailItem
                                key={sec.id}
                                selected={activeSection === sec.id}
                                onClick={() => setActiveSectionAndRefresh(sec.id)}
                                title={sec.title}
                            />
                        ))}
                    </SurfaceRail>

                    <SurfaceContent>
                        <div className="flex flex-col gap-3 px-8 py-6">
                            <InterfaceScaleSettings />
                            {activeSection === 'gameplay' && (
                                <>
                                    {/*
                                      LANE-NIGHTSHIFT-V092-TUTORIAL-LANE-B-SUBSET:
                                      tutorial restart affordance. Only rendered when
                                      the tutorial has been dismissed — there is no
                                      point restarting an already-active tutorial.
                                    */}
                                    {tutorialDismissed && (
                                        <SettingRow
                                            label={t('settings.tutorial.label')}
                                            description={t('settings.tutorial.description')}
                                        >
                                            <div data-testid="settings-tutorial-restart-host">
                                                <OnboardingRestartButton ipc={onboardingBridge} />
                                            </div>
                                        </SettingRow>
                                    )}
                                </>
                            )}
                            {activeSection === 'audio' && (
                                <>
                                    <SettingRow
                                        label={t('settings.audio.music.label')}
                                        description={t('settings.audio.music.description')}
                                    >
                                        <BoundToggleSwitch
                                            checked={audioPreferences.musicEnabled === true}
                                            onChange={(musicEnabled) => updateAudioPreferences({ musicEnabled })}
                                            ariaLabel={t('settings.audio.music.ariaLabel')}
                                        />
                                    </SettingRow>
                                    <SettingRow label={t('settings.audio.musicVolume.label')} description={t('settings.audio.musicVolume.description')}>
                                        <input
                                            type="range" min="0" max="100" step="5"
                                            value={Math.round((audioPreferences.musicVolume ?? 0.5) * 100)}
                                            onChange={event => updateAudioPreferences({ musicVolume: Number(event.target.value) / 100 })}
                                            aria-label={t('settings.audio.musicVolume.ariaLabel')}
                                            className="w-44 accent-[#c9a75c]"
                                        />
                                    </SettingRow>
                                    <SettingRow
                                        label={t('settings.audio.soundscape.label')}
                                        description={t('settings.audio.soundscape.description')}
                                    >
                                        <BoundToggleSwitch
                                            checked={!audioPreferences.muted}
                                            onChange={setSoundscapeEnabled}
                                            ariaLabel={t('settings.audio.soundscape.ariaLabel')}
                                        />
                                    </SettingRow>
                                    <SettingRow label={t('settings.masterVolume.label')} description={t('settings.masterVolume.description')}>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            step="5"
                                            value={Math.round(audioPreferences.masterVolume * 100)}
                                            onChange={(event) => setMasterVolumePercent(event.target.value)}
                                            aria-label={t('settings.masterVolume.aria')}
                                            className="w-44 accent-[#c9a75c]"
                                        />
                                    </SettingRow>
                                </>
                            )}
                            {activeSection === 'a11y' && (
                                <>
                                    <SettingRow label={t('settings.reduceMotion.label')} description={t('settings.reduceMotion.description')}>
                                        <BoundToggleSwitch
                                            checked={reduceMotion}
                                            onChange={setReduceMotion}
                                            ariaLabel={t('settings.reduceMotion.ariaLabel')}
                                        />
                                    </SettingRow>
                                    <SettingRow label={t('settings.colorblindMode.label')} description={t('settings.colorblindMode.description')}>
                                        <select
                                            className={SETTINGS_SELECT}
                                            aria-label={t('settings.colorblindMode.ariaLabel')}
                                            value={colorblindPreset}
                                            onChange={(e) => setColorblindPreset(e.target.value as ColorblindPreset)}>
                                            <option value="default">{t('settings.colorblindMode.default')}</option>
                                            <option value="deuteranopia">{t('settings.colorblindMode.deuteranopia')}</option>
                                            <option value="protanopia">{t('settings.colorblindMode.protanopia')}</option>
                                            <option value="tritanopia">{t('settings.colorblindMode.tritanopia')}</option>
                                        </select>
                                    </SettingRow>
                                </>
                            )}
                            {activeSection === 'language' && (
                                <SettingRow label={t('settings.language.label')} description={t('settings.language.description')}>
                                    <select
                                        className={SETTINGS_SELECT}
                                        aria-label={t('settings.language.ariaLabel')}
                                        value={locale}
                                        onChange={(e) => setLocale(e.target.value as Locale)}>
                                        {SUPPORTED_LOCALES.map((option) => (
                                            <option key={option} value={option}>
                                                {option === 'en'
                                                    ? t('settings.language.option.en')
                                                    : t('settings.language.option.bcs')}
                                            </option>
                                        ))}
                                    </select>
                                </SettingRow>
                            )}
                            {activeSection === 'diagnostics' && (
                                <>
                                    <SettingRow
                                        label={t('settings.crashDiagnostics.label')}
                                        description={t('settings.crashDiagnostics.description')}
                                    >
                                        <BoundToggleSwitch
                                            checked={crashConsentEnabled}
                                            onChange={setCrashDiagnosticsEnabled}
                                            ariaLabel={t('settings.crashDiagnostics.ariaLabel')}
                                        />
                                    </SettingRow>
                                    <div className="flex flex-col gap-3 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
                                        <p className="m-0 text-[15px] leading-relaxed text-[#c2b69c]">
                                            {t('settings.crashDiagnostics.privacy')}
                                        </p>
                                        <p className="m-0 text-[16px] text-[#f1e6c8]">
                                            {t('settings.crashDiagnostics.status', { count: String(crashReportCount) })}
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            <button
                                                type="button"
                                                onClick={exportCrashReports}
                                                className={SURFACE_SECONDARY_BUTTON}
                                            >
                                                {t('settings.crashDiagnostics.export')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={exportPlaytestEvidence}
                                                className={SURFACE_SECONDARY_BUTTON}
                                            >
                                                {t('settings.playtestEvidence.export')}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={clearCrashReports}
                                                className={SURFACE_SECONDARY_BUTTON}
                                            >
                                                {t('settings.crashDiagnostics.clear')}
                                            </button>
                                        </div>
                                        {crashExportJson && (
                                            <textarea
                                                readOnly
                                                aria-label={t('settings.crashDiagnostics.exportedAriaLabel')}
                                                value={crashExportJson}
                                                className="h-32 w-full resize-none rounded border border-[#3a4150] bg-[#0f1218] p-3 font-mono text-[13px] text-[#ddd1b3]"
                                            />
                                        )}
                                        {playtestEvidenceJson && (
                                            <textarea
                                                readOnly
                                                aria-label={t('settings.playtestEvidence.exportedAriaLabel')}
                                                value={playtestEvidenceJson}
                                                className="h-32 w-full resize-none rounded border border-[#3a4150] bg-[#0f1218] p-3 font-mono text-[13px] text-[#ddd1b3]"
                                            />
                                        )}
                                    </div>
                                </>
                            )}
                            {/* Registered sections */}
                            {settingsSections.filter(s => s.id === activeSection).map(s => {
                                const Component = s.component;
                                return <Component key={s.id} />;
                            })}
                        </div>
                    </SurfaceContent>
                </SurfaceColumns>
            </div>
        </div>
    );
}

const SETTINGS_SELECT = 'h-11 rounded-md border border-[#3a4150] bg-[#1b2029] px-3 text-[15px] text-[#f1e6c8]';

function resolveSettingsPlatform(): 'desktop' | 'browser' | 'unknown' {
    if (typeof window === 'undefined') return 'unknown';
    return (window as Window & { awwv?: unknown }).awwv ? 'desktop' : 'browser';
}

function resolveSettingsOsFamily(): 'windows' | 'macos' | 'linux' | 'unknown' {
    if (typeof navigator === 'undefined') return 'unknown';
    const platform = `${navigator.userAgent} ${navigator.platform}`.toLowerCase();
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('linux')) return 'linux';
    return 'unknown';
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-6 rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4">
            <div className="flex min-w-0 flex-col gap-1">
                <div className="text-[17px] font-semibold text-[#f1e6c8]">{label}</div>
                <div className="text-[15px] leading-snug text-[#b9ad94]">{description}</div>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

/**
 * Controlled variant of `ToggleSwitch`. Used by the v0.9.3 a11y Lane D
 * Reduce-Motion toggle so its on/off state is bound to the parent's
 * `reduceMotion` state (and thereby to localStorage + the
 * `.user-reduce-motion` class on <html>). Adds `aria-pressed` so screen
 * readers announce on/off correctly.
 */
function BoundToggleSwitch({
    checked,
    onChange,
    ariaLabel,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    ariaLabel?: string;
}) {
    return (
        <button type="button"
            aria-pressed={checked}
            aria-label={ariaLabel}
            onClick={() => onChange(!checked)}
            className={`w-14 h-8 rounded-full border transition-colors relative ${
                checked ? 'bg-[#c9a75c]/35 border-[#c9a75c]/70' : 'bg-[#1b2029] border-[#3a4150]'
            }`}>
            <div className={`w-6 h-6 rounded-full absolute top-[3px] transition-all ${
                checked ? 'left-[26px] bg-[#c9a75c]' : 'left-[3px] bg-[#7d7462]'
            }`} />
        </button>
    );
}
