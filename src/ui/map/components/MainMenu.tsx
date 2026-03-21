/**
 * Main Menu — full-screen landing page.
 * Two-tier layout: primary actions (New Game, Continue, Tutorial)
 * and secondary actions (Load, Settings, Credits).
 */

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
    return (
        <div className="fixed inset-0 z-[9000] flex flex-col items-center justify-center"
             style={{
                 background: 'radial-gradient(ellipse at center, #1a1816 0%, #0d0c0a 100%)',
                 fontFamily: 'Georgia, "Times New Roman", serif',
             }}>

            {/* Title */}
            <div className="text-center mb-12">
                <div className="text-[10px] uppercase tracking-[0.5em] text-[#8a7a60]/60 mb-2">
                    Pyrrhic Games presents
                </div>
                <h1 className="text-[36px] font-bold text-[#c4a35a] tracking-wider leading-tight"
                    style={{ textShadow: '0 2px 20px rgba(196, 163, 90, 0.3)' }}>
                    A War Without Victory
                </h1>
                <div className="text-[13px] text-[#8a7a60] mt-2 tracking-wide italic">
                    Bosnia-Herzegovina, 1992–1995
                </div>
            </div>

            {/* Primary actions */}
            <div className="flex flex-col gap-3 w-64 mb-6">
                <MenuButton onClick={onNewGame} primary>New Game</MenuButton>
                {hasSave && <MenuButton onClick={onContinue} primary>Continue</MenuButton>}
            </div>

            {/* Divider */}
            <div className="w-48 h-px bg-[#8a7a60]/20 mb-6" />

            {/* Secondary actions */}
            <div className="flex flex-col gap-2 w-48">
                <MenuButton onClick={onLoadGame}>Load Game</MenuButton>
                <MenuButton onClick={onSettings}>Settings</MenuButton>
                <MenuButton onClick={onCredits}>Credits</MenuButton>
                <MenuButton onClick={onQuit}>Quit</MenuButton>
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
