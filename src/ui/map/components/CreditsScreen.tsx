/**
 * Credits screen — studio, sources, acknowledgments, dedication.
 */
import { Z } from '../../shared/zIndex';

interface CreditsScreenProps {
    onClose: () => void;
}

export function CreditsScreen({ onClose }: CreditsScreenProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm"
             style={{ zIndex: Z.MODAL_HARD }}
             onClick={onClose}>
            <div className="w-[90%] max-w-[480px] max-h-[80vh] overflow-auto rounded-lg border border-[#8a7a60]/30 shadow-2xl p-8"
                 style={{
                     background: 'rgba(26, 24, 21, 0.97)',
                     fontFamily: 'Georgia, "Times New Roman", serif',
                 }}
                 onClick={(e) => e.stopPropagation()}>

                <h2 className="text-[18px] text-[#c4a35a] font-bold tracking-wider text-center mb-6">
                    Credits
                </h2>

                <CreditSection title="Studio">
                    <p className="text-[#d5c9bc]">Pyrrhic Games</p>
                </CreditSection>

                <CreditSection title="Design & Development">
                    <p className="text-[#d5c9bc]">A War Without Victory</p>
                    <p className="text-[#8a7a60] text-[11px]">Strategic simulation of the 1992-1995 Bosnian War</p>
                </CreditSection>

                <CreditSection title="Historical Sources">
                    <p className="text-[#d5c9bc] text-[12px]">
                        Based on <em>Balkan Battlegrounds: A Military History of the Yugoslav Conflict, 1990-1995</em> (CIA, 2002)
                    </p>
                    <p className="text-[#8a7a60] text-[11px] mt-1">
                        Additional sources: ICTY trial records, UNPROFOR reports, academic publications
                    </p>
                </CreditSection>

                <CreditSection title="Technology">
                    <p className="text-[#8a7a60] text-[11px] leading-relaxed">
                        Electron · React · TypeScript · MapLibre GL JS · Deck.gl · Vite · Vitest · Node.js
                    </p>
                </CreditSection>

                <div className="border-t border-[#8a7a60]/20 pt-4 mt-4">
                    <p className="text-[12px] text-[#8a7a60] text-center italic leading-relaxed">
                        This game is dedicated to the memory of all who suffered
                        in the Bosnian War, 1992–1995.
                    </p>
                </div>

                <div className="text-center mt-6">
                    <button type="button" onClick={onClose}
                        className="text-[11px] uppercase tracking-wider text-[#8a7a60] border border-[#8a7a60]/20 px-4 py-2 rounded hover:bg-[#8a7a60]/10 transition-colors"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        Close
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
