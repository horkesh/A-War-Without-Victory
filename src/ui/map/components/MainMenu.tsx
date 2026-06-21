/**
 * Main Menu - full-screen landing page.
 * Two-tier layout: primary actions (New Game, Continue, Tutorial)
 * and secondary actions (Load, Settings, Credits).
 */
import { type ReactNode } from 'react';
import { Z } from '../../shared/zIndex';
import { SUPPORTED_LOCALES, t, useLocale, type Locale } from '../i18n';
import type { StartNewCampaignPayload } from '../desktop/types';
import { getArmyName, getFactionFlag } from '../utils/factionAssets';
import { AWWV_APP_VERSION } from '../utils/appVersion';
import { playerFacingErrorCopy } from '../utils/errorCopy';
import { sidePickerFactionLabel } from '../utils/sidePickerLabels';

interface MainMenuProps {
    hasSave: boolean;
    starting?: boolean;
    errorMessage?: string | null;
    onNewGame: (faction: StartNewCampaignPayload['playerFaction']) => void;
    onContinue: () => void;
    onLoadGame: (json: unknown) => void;
    onSettings: () => void;
    onCredits: () => void;
    onQuit: () => void;
}

const FACTIONS: StartNewCampaignPayload['playerFaction'][] = ['RBiH', 'RS', 'HRHB'];

export function MainMenu({ hasSave, starting = false, errorMessage, onNewGame, onContinue, onLoadGame, onSettings, onCredits, onQuit }: MainMenuProps) {
    const [locale, setLocale] = useLocale();

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center px-6"
             style={{
                 zIndex: Z.HARD_MODAL,
                 background: 'radial-gradient(ellipse at center, #1a1816 0%, #0d0c0a 100%)',
                 fontFamily: 'Georgia, "Times New Roman", serif',
             }}>
            <label className="absolute top-4 right-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[#8a7a60]"
                   style={{ fontFamily: 'Courier New, monospace' }}>
                <span>{t('settings.language.label')}</span>
                <select
                    className="rounded border border-[#8a7a60]/25 bg-[#1a1816] px-2 py-1 text-[11px] text-[#d5c9bc] outline-none hover:border-[#c4a35a]/40 focus:border-[#c4a35a]/60"
                    aria-label={t('settings.language.ariaLabel')}
                    value={locale}
                    onChange={(event) => setLocale(event.target.value as Locale)}
                >
                    {SUPPORTED_LOCALES.map((option) => (
                        <option key={option} value={option}>
                            {option === 'en'
                                ? t('settings.language.option.en')
                                : t('settings.language.option.bcs')}
                        </option>
                    ))}
                </select>
            </label>

            {/* Title */}
            <div className="text-center mb-12">
                <div className="text-[10px] uppercase tracking-[0.5em] text-[#8a7a60]/60 mb-2">
                    {t('mainMenu.presents')}
                </div>
                <h1 className="text-[36px] font-bold text-[#c4a35a] tracking-wider leading-tight"
                    style={{ textShadow: '0 2px 20px rgba(196, 163, 90, 0.3)' }}>
                    {t('mainMenu.title')}
                </h1>
                <div className="text-[13px] text-[#8a7a60] mt-2 tracking-wide italic">
                    {t('mainMenu.subtitle')}
                </div>
            </div>

            {errorMessage && (
                <div className="mb-4 w-full max-w-2xl rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
                    {playerFacingErrorCopy(errorMessage)}
                </div>
            )}

            <div className="mb-6 w-full max-w-2xl">
                <div
                    className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[#8a7a60]"
                    style={{ fontFamily: 'Courier New, monospace' }}
                >
                    {t('sidePicker.chooseFaction')}
                </div>
                <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
                    {FACTIONS.map((faction) => (
                        <button
                            key={faction}
                            type="button"
                            data-testid={`main-menu-faction-${faction}`}
                            disabled={starting}
                            onClick={() => onNewGame(faction)}
                            className="min-h-[132px] rounded border border-[#c4a35a]/25 bg-[#15130f]/75 px-4 py-4 text-left transition-all hover:border-[#c4a35a]/55 hover:bg-[#201b13]/85 disabled:opacity-50"
                            style={{ fontFamily: 'Courier New, monospace' }}
                        >
                            {getFactionFlag(faction) && (
                                <img
                                    src={getFactionFlag(faction)}
                                    alt=""
                                    className="mb-3 h-9 w-14 rounded border border-white/10 object-cover shadow-sm"
                                />
                            )}
                            <div className="font-sans text-[15px] font-bold leading-tight text-[#d5c9bc]">
                                {sidePickerFactionLabel(faction)}
                            </div>
                            {getArmyName(faction) && (
                                <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-[#8a7a60]">
                                    {t('sidePicker.forces', { army: getArmyName(faction) ?? faction })}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Divider */}
            <div className="w-48 h-px bg-[#8a7a60]/20 mb-6" />

            {/* Secondary actions */}
            <div className="flex flex-col gap-2 w-48">
                {hasSave && <MenuButton onClick={onContinue} primary>{t('mainMenu.continue')}</MenuButton>}
                <input
                    type="file"
                    id="main-menu-save-input"
                    accept=".json"
                    aria-label={t('sidePicker.loadSaveAria')}
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = '';
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (readerEvent) => {
                            try {
                                onLoadGame(JSON.parse(String(readerEvent.target?.result ?? 'null')));
                            } catch (err) {
                                console.error('Failed to parse save file:', err);
                            }
                        };
                        reader.readAsText(file);
                    }}
                />
                <MenuButton onClick={() => document.getElementById('main-menu-save-input')?.click()}>{t('mainMenu.loadGame')}</MenuButton>
                <MenuButton onClick={onSettings}>{t('mainMenu.settings')}</MenuButton>
                <MenuButton onClick={onCredits}>{t('mainMenu.credits')}</MenuButton>
                <MenuButton onClick={onQuit}>{t('mainMenu.quit')}</MenuButton>
            </div>

            {/* Version */}
            <div className="absolute bottom-4 right-4 text-[10px] text-[#8a7a60]/40"
                 style={{ fontFamily: 'Courier New, monospace' }}>
                {AWWV_APP_VERSION}
            </div>
        </div>
    );
}

function MenuButton({ children, onClick, primary }: { children: ReactNode; onClick: () => void; primary?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full py-3 rounded border text-center uppercase tracking-[0.15em] font-bold transition-all ${
                primary
                    ? 'text-[14px] text-[#c4a35a] border-[#c4a35a]/30 bg-[#c4a35a]/5 hover:bg-[#c4a35a]/15 hover:border-[#c4a35a]/50'
                    : 'text-[12px] text-[#8a7a60] border-[#8a7a60]/20 hover:bg-[#8a7a60]/10 hover:border-[#8a7a60]/40'
            }`}
            style={{ fontFamily: 'Courier New, monospace' }}
        >
            {children}
        </button>
    );
}
