/**
 * In-game pause menu — triggered by Escape when no other modal is open.
 */
import { Z } from '../../shared/zIndex';

interface PauseMenuProps {
    onResume: () => void;
    onSave: () => void;
    onSettings: () => void;
    onMainMenu: () => void;
    onQuit: () => void;
}

export function PauseMenu({ onResume, onSave, onSettings, onMainMenu, onQuit }: PauseMenuProps) {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black/45"
             style={{ zIndex: Z.PAUSE_MENU }}>
            <button
                type="button"
                className="absolute inset-0 cursor-default border-0 bg-transparent p-0"
                onClick={onResume}
                aria-label="Resume game"
            />
            <div className="w-[320px] rounded-lg border border-[#8a7a60]/35 shadow-2xl p-4 flex flex-col gap-2"
                 style={{
                     background: 'rgba(26, 24, 21, 0.97)',
                     backdropFilter: 'blur(8px)',
                 }}>
                <div className="flex items-center justify-between border-b border-[#8a7a60]/20 pb-2 mb-1">
                    <div className="text-[11px] uppercase tracking-[0.2em] text-[#c4a35a] font-bold">
                        Paused
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-[#d5c9bc]/65">
                        ESC Resume
                    </div>
                </div>
                <PauseButton onClick={onResume}>Resume</PauseButton>
                <PauseButton onClick={onSave}>Save Game</PauseButton>
                <PauseButton onClick={onSettings}>Settings</PauseButton>
                <PauseButton onClick={onMainMenu}>Main Menu</PauseButton>
                <div className="h-px bg-[#8a7a60]/20 my-1" />
                <PauseButton onClick={onQuit} danger>Quit</PauseButton>
                <div className="pt-1 text-[9px] text-[#d5c9bc]/55 text-center">
                    Command paused. Planning state is preserved.
                </div>
            </div>
        </div>
    );
}

function PauseButton({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full py-2.5 rounded border text-[11px] uppercase tracking-wider font-bold transition-colors ${
                danger
                    ? 'text-red-400 border-red-400/20 hover:bg-red-400/10'
                    : 'text-[#d5c9bc] border-[#8a7a60]/20 hover:bg-[#8a7a60]/15'
            }`}
        >
            {children}
        </button>
    );
}
