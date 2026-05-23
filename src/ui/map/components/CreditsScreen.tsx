/**
 * Credits screen - studio, sources, acknowledgments, dedication.
 */
import { type ReactNode } from 'react';
import { Z } from '../../shared/zIndex';
import { t, useLocale } from '../i18n';

interface CreditsScreenProps {
    onClose: () => void;
}

export function CreditsScreen({ onClose }: CreditsScreenProps) {
    const [locale] = useLocale();

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
             style={{ zIndex: Z.MODAL_HARD }}>
            <button
                type="button"
                className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
                onClick={onClose}
                aria-label={t('credits.closeAriaLabel', undefined, locale)}
            />
            <div className="w-[90%] max-w-[480px] max-h-[80vh] overflow-auto rounded-lg border border-[#8a7a60]/30 shadow-2xl p-8"
                 style={{
                     background: 'rgba(26, 24, 21, 0.97)',
                     fontFamily: 'Georgia, "Times New Roman", serif',
                 }}
            >

                <h2 className="text-[18px] text-[#c4a35a] font-bold tracking-wider text-center mb-6">
                    {t('credits.title', undefined, locale)}
                </h2>

                <CreditSection title={t('credits.section.studio', undefined, locale)}>
                    <p className="text-[#d5c9bc]">Pyrrhic Games</p>
                </CreditSection>

                <CreditSection title={t('credits.section.design', undefined, locale)}>
                    <p className="text-[#d5c9bc]">A War Without Victory</p>
                    <p className="text-[#8a7a60] text-[11px]">{t('credits.design.subtitle', undefined, locale)}</p>
                </CreditSection>

                <CreditSection title={t('credits.section.sources', undefined, locale)}>
                    <p className="text-[#d5c9bc] text-[12px]">
                        {t('credits.sources.basedOnPrefix', undefined, locale)}{' '}
                        <em>Balkan Battlegrounds: A Military History of the Yugoslav Conflict, 1990-1995</em>
                        {' '}(CIA, 2002)
                    </p>
                    <p className="text-[#8a7a60] text-[11px] mt-1">
                        {t('credits.sources.additional', undefined, locale)}
                    </p>
                </CreditSection>

                <CreditSection title={t('credits.section.technology', undefined, locale)}>
                    <p className="text-[#8a7a60] text-[11px] leading-relaxed">
                        Electron · React · TypeScript · MapLibre GL JS · Deck.gl · Vite · Vitest · Node.js
                    </p>
                </CreditSection>

                <div className="border-t border-[#8a7a60]/20 pt-4 mt-4">
                    <p className="text-[12px] text-[#8a7a60] text-center italic leading-relaxed">
                        {t('credits.dedication', undefined, locale)}
                    </p>
                </div>

                <div className="text-center mt-6">
                    <button type="button" onClick={onClose}
                        className="text-[11px] uppercase tracking-wider text-[#8a7a60] border border-[#8a7a60]/20 px-4 py-2 rounded hover:bg-[#8a7a60]/10 transition-colors"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        {t('credits.close', undefined, locale)}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CreditSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mb-4">
            <div className="text-[9px] uppercase tracking-[0.2em] text-[#c4a35a]/60 font-bold mb-1">{title}</div>
            {children}
        </div>
    );
}
