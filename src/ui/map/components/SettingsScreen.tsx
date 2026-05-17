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
import { useEffect, useState } from 'react';
import { Z } from '../../shared/zIndex';
import { OnboardingRestartButton } from './onboarding/OnboardingOverlay';
import { useGameStore } from '../store/gameStore';
import { useIPC } from '../desktop/useIPC';
import {
    applyAudioPreferences,
    loadAudioPreferences,
    saveAudioPreferences,
    type AudioPreferences,
} from '../audio/audio_preferences';
import { createCrashDiagnosticsQueue } from '../services/telemetry/telemetryQueue';
import {
    COLORBLIND_PRESETS,
    COLORBLIND_PRESET_STORAGE_KEY,
    REDUCE_MOTION_STORAGE_KEY,
    type ColorblindPreset,
} from '../../shared/factionPalette';
import { SUPPORTED_LOCALES, t, useLocale, type Locale } from '../i18n';

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
    const [activeSection, setActiveSection] = useState('audio');
    const [locale, setLocale] = useLocale();
    const [crashQueue] = useState(() => createCrashDiagnosticsQueue());
    const [crashConsentEnabled, setCrashConsentEnabled] = useState(() => crashQueue.isConsentEnabled());
    const [crashReportCount, setCrashReportCount] = useState(() => crashQueue.listReports().length);
    const [crashExportJson, setCrashExportJson] = useState('');

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

    const [audioPreferences, setAudioPreferences] = useState<AudioPreferences>(() => loadAudioPreferences());

    useEffect(() => {
        const saved = saveAudioPreferences(audioPreferences);
        applyAudioPreferences(saved);
    }, [audioPreferences]);

    const setSoundscapeEnabled = (enabled: boolean) => {
        setAudioPreferences((current) => ({ ...current, muted: !enabled }));
    };

    const setMasterVolumePercent = (value: string) => {
        const parsed = Number(value);
        setAudioPreferences((current) => ({
            ...current,
            masterVolume: Number.isFinite(parsed) ? parsed / 100 : current.masterVolume,
        }));
    };

    const refreshCrashDiagnosticsStatus = () => {
        setCrashConsentEnabled(crashQueue.isConsentEnabled());
        setCrashReportCount(crashQueue.listReports().length);
    };

    const setActiveSectionAndRefresh = (sectionId: string) => {
        setActiveSection(sectionId);
        if (sectionId === 'diagnostics') refreshCrashDiagnosticsStatus();
    };

    const setCrashDiagnosticsEnabled = (enabled: boolean) => {
        crashQueue.setConsentEnabled(enabled);
        setCrashExportJson('');
        refreshCrashDiagnosticsStatus();
    };

    const exportCrashReports = () => {
        setCrashExportJson(crashQueue.exportReportsJson());
        refreshCrashDiagnosticsStatus();
    };

    const clearCrashReports = () => {
        crashQueue.clearReports();
        setCrashExportJson('');
        refreshCrashDiagnosticsStatus();
    };

    const allSections: Array<{ id: string; title: string }> = [
        ...(tutorialDismissed ? [{ id: 'gameplay', title: t('settings.tab.gameplay') }] : []),
        { id: 'audio', title: 'Audio' },
        { id: 'a11y', title: t('settings.tab.a11y') },
        { id: 'language', title: t('settings.tab.language') },
        { id: 'diagnostics', title: t('settings.tab.diagnostics') },
        ...settingsSections.map(s => ({ id: s.id, title: s.title })),
    ];

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
             style={{ zIndex: Z.MODAL_HARD }}>
            <button
                type="button"
                className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
                onClick={onClose}
                aria-label={t('settings.close.ariaLabel')}
            />
            <div className="w-[90%] max-w-[500px] max-h-[80vh] overflow-auto rounded-lg border border-[#8a7a60]/30 shadow-2xl p-6"
                 style={{ background: 'rgba(26, 24, 21, 0.97)' }}
            >

                <h2 className="text-[16px] text-[#c4a35a] font-bold tracking-wider text-center mb-4"
                    style={{ fontFamily: 'Georgia, serif' }}>
                    {t('settings.title')}
                </h2>

                {/* Section tabs */}
                <div className="flex gap-2 mb-4 justify-center">
                    {allSections.map(sec => (
                        <button key={sec.id} type="button"
                            onClick={() => setActiveSectionAndRefresh(sec.id)}
                            className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded border transition-colors ${
                                activeSection === sec.id
                                    ? 'text-[#c4a35a] border-[#c4a35a]/40 bg-[#c4a35a]/10'
                                    : 'text-[#8a7a60] border-[#8a7a60]/20 hover:bg-[#8a7a60]/10'
                            }`}
                            style={{ fontFamily: 'Courier New, monospace' }}>
                            {sec.title}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="space-y-3 mb-6">
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
                            <SettingRow label="Soundscape" description="Allow tactical-map audio cues">
                                <BoundToggleSwitch
                                    checked={!audioPreferences.muted}
                                    onChange={setSoundscapeEnabled}
                                    ariaLabel="Toggle soundscape audio"
                                />
                            </SettingRow>
                            <SettingRow label="Master Volume" description="Overall level for optional audio">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="5"
                                    value={Math.round(audioPreferences.masterVolume * 100)}
                                    onChange={(event) => setMasterVolumePercent(event.target.value)}
                                    aria-label="Master volume"
                                    className="w-28 accent-[#c4a35a]"
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
                                    className="bg-[#2a2720] text-[#d5c9bc] text-[11px] border border-[#8a7a60]/20 rounded px-2 py-1"
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
                                className="bg-[#2a2720] text-[#d5c9bc] text-[11px] border border-[#8a7a60]/20 rounded px-2 py-1"
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
                            <div className="rounded border border-[#8a7a60]/10 bg-[#2a2720]/50 p-2">
                                <p className="m-0 text-[10px] leading-relaxed text-[#8a7a60]">
                                    {t('settings.crashDiagnostics.privacy')}
                                </p>
                                <p className="mb-0 mt-2 text-[10px] text-[#d5c9bc]">
                                    {t('settings.crashDiagnostics.status', { count: String(crashReportCount) })}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={exportCrashReports}
                                        className="text-[10px] uppercase tracking-wider text-[#c4a35a] border border-[#c4a35a]/30 px-2 py-1 rounded hover:bg-[#c4a35a]/10"
                                        style={{ fontFamily: 'Courier New, monospace' }}
                                    >
                                        {t('settings.crashDiagnostics.export')}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={clearCrashReports}
                                        className="text-[10px] uppercase tracking-wider text-[#8a7a60] border border-[#8a7a60]/20 px-2 py-1 rounded hover:bg-[#8a7a60]/10"
                                        style={{ fontFamily: 'Courier New, monospace' }}
                                    >
                                        {t('settings.crashDiagnostics.clear')}
                                    </button>
                                </div>
                                {crashExportJson && (
                                    <textarea
                                        readOnly
                                        aria-label={t('settings.crashDiagnostics.exportedAriaLabel')}
                                        value={crashExportJson}
                                        className="mt-2 h-24 w-full resize-none rounded border border-[#8a7a60]/20 bg-[#1c1a16] p-2 text-[10px] text-[#d5c9bc]"
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

                <div className="flex justify-center gap-3">
                    <button type="button" onClick={onClose}
                        className="text-[11px] uppercase tracking-wider text-[#8a7a60] border border-[#8a7a60]/20 px-4 py-2 rounded hover:bg-[#8a7a60]/10"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {t('settings.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between p-2 rounded border border-[#8a7a60]/10 bg-[#2a2720]/50">
            <div>
                <div className="text-[12px] text-[#d5c9bc]">{label}</div>
                <div className="text-[10px] text-[#8a7a60]">{description}</div>
            </div>
            {children}
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
            className={`w-10 h-5 rounded-full border transition-colors relative ${
                checked ? 'bg-[#c4a35a]/30 border-[#c4a35a]/50' : 'bg-[#2a2720] border-[#8a7a60]/30'
            }`}>
            <div className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all ${
                checked ? 'left-5 bg-[#c4a35a]' : 'left-0.5 bg-[#8a7a60]'
            }`} />
        </button>
    );
}
