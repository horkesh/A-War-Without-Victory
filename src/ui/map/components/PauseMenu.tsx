/**
 * In-game pause menu — triggered by Escape when no other modal is open.
 */
interface PauseMenuProps {
    onResume: () => void;
    onSave: () => void;
    onSettings: () => void;
    onMainMenu: () => void;
    onQuit: () => void;
}

export function PauseMenu({ onResume, onSave, onSettings, onMainMenu, onQuit }: PauseMenuProps) {
    return (
        <div className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
             onClick={onResume}>
            <div className="w-56 rounded-lg border border-[#8a7a60]/30 shadow-2xl p-6 flex flex-col gap-2"
                 style={{
                     background: 'rgba(26, 24, 21, 0.97)',
                     backdropFilter: 'blur(8px)',
                 }}
                 onClick={(e) => e.stopPropagation()}>
                <div className="text-center text-[11px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold mb-2">
                    Paused
                </div>
                <PauseButton onClick={onResume}>Resume</PauseButton>
                <PauseButton onClick={onSave}>Save Game</PauseButton>
                <PauseButton onClick={onSettings}>Settings</PauseButton>
                <PauseButton onClick={onMainMenu}>Main Menu</PauseButton>
                <div className="h-px bg-[#8a7a60]/20 my-1" />
                <PauseButton onClick={onQuit} danger>Quit</PauseButton>
            </div>
        </div>
    );
}

function PauseButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full py-2 rounded border text-[11px] uppercase tracking-wider font-bold transition-colors ${
                danger
                    ? 'text-red-400 border-red-400/20 hover:bg-red-400/10'
                    : 'text-[#d5c9bc] border-[#8a7a60]/20 hover:bg-[#8a7a60]/15'
            }`}
            style={{ fontFamily: 'Courier New, monospace' }}
        >
            {children}
        </button>
    );
}
