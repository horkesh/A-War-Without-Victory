/**
 * Credits screen — studio, sources, acknowledgments, dedication.
 */
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';

interface CreditsScreenProps {
    onClose: () => void;
}

export function CreditsScreen({ onClose }: CreditsScreenProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
             style={{ zIndex: Z.MODAL_HARD }}>
            <button
                type="button"
                className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
                onClick={onClose}
                aria-label={t('credits.closeCredits')}
            />
            <div className="w-[90%] max-w-[480px] max-h-[80vh] overflow-auto rounded-lg border border-[#8a7a60]/30 shadow-2xl p-8"
                 style={{
                     background: 'rgba(26, 24, 21, 0.97)',
                     fontFamily: 'Georgia, "Times New Roman", serif',
                 }}
            >

                <h2 className="text-[18px] text-[#c4a35a] font-bold tracking-wider text-center mb-6">
                    {t('credits.title')}
                </h2>

                <CreditSection title={t('credits.studio')}>
                    <p className="text-[#d5c9bc]">{t('credits.studioName')}</p>
                </CreditSection>

                <CreditSection title={t('credits.designDevelopment')}>
                    <p className="text-[#d5c9bc]">A War Without Victory</p>
                    <p className="text-[#8a7a60] text-[11px]">{t('credits.subtitle')}</p>
                </CreditSection>

                <CreditSection title={t('credits.historicalSources')}>
                    <p className="text-[#d5c9bc] text-[12px]">
                        {t('credits.basedOn')} <em>{t('credits.balkanBattlegroundsTitle')}</em> (CIA, 2002)
                    </p>
                    <p className="text-[#8a7a60] text-[11px] mt-1">
                        {t('credits.additionalSources')}
                    </p>
                </CreditSection>

                <CreditSection title={t('credits.technology')}>
                    <p className="text-[#8a7a60] text-[11px] leading-relaxed">
                        Electron · React · TypeScript · MapLibre GL JS · Deck.gl · Vite · Vitest · Node.js
                    </p>
                </CreditSection>

                <div className="border-t border-[#8a7a60]/20 pt-4 mt-4">
                    <p className="text-[12px] text-[#8a7a60] text-center italic leading-relaxed">
                        {t('credits.dedication')}
                    </p>
                </div>

                <div className="text-center mt-6">
                    <button type="button" onClick={onClose}
                        className="text-[11px] uppercase tracking-wider text-[#8a7a60] border border-[#8a7a60]/20 px-4 py-2 rounded hover:bg-[#8a7a60]/10 transition-colors"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {t('common.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreditSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="mb-4">
            <div className="text-[9px] uppercase tracking-[0.2em] text-[#c4a35a]/60 font-bold mb-1">{title}</div>
            {children}
        </div>
    );
}
