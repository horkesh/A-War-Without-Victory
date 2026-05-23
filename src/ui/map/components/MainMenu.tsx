/**
 * Main Menu — full-screen landing page.
 * Two-tier layout: primary actions (New Game, Continue, Tutorial)
 * and secondary actions (Load, Settings, Credits).
 */
import { Z } from '../../shared/zIndex';
import { SUPPORTED_LOCALES, t, useLocale, type Locale } from '../i18n';

interface MainMenuProps {
    hasSave: boolean;
    onNewGame: () => void;
    onContinue: () => void;
    onLoadGame: () => void;
    onSettings: () => void;
    onCredits: () => void;
    onQuit: () => void;
}

export function MainMenu({ hasSave, onNewGame, onContinue, onLoadGame, onSettings, onCredits, onQuit }: MainMenuProps) {
    const [locale, setLocale] = useLocale();

    return (
        <div className="fixed inset-0 flex flex-col items-center justify-center"
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

            {/* Primary actions */}
            <div className="flex flex-col gap-3 w-64 mb-6">
                <MenuButton onClick={onNewGame} primary>{t('mainMenu.newGame')}</MenuButton>
                {hasSave && <MenuButton onClick={onContinue} primary>{t('mainMenu.continue')}</MenuButton>}
            </div>

            {/* Divider */}
            <div className="w-48 h-px bg-[#8a7a60]/20 mb-6" />

            {/* Secondary actions */}
            <div className="flex flex-col gap-2 w-48">
                <MenuButton onClick={onLoadGame}>{t('mainMenu.loadGame')}</MenuButton>
                <MenuButton onClick={onSettings}>{t('mainMenu.settings')}</MenuButton>
                <MenuButton onClick={onCredits}>{t('mainMenu.credits')}</MenuButton>
                <MenuButton onClick={onQuit}>{t('mainMenu.quit')}</MenuButton>
            </div>

            {/* Version */}
            <div className="absolute bottom-4 right-4 text-[10px] text-[#8a7a60]/40"
                 style={{ fontFamily: 'Courier New, monospace' }}>
                v0.5.0
            </div>
        </div>
    );
}

function MenuButton({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
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
