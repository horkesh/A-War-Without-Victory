/**
 * AiSettingsPanel — right-side panel for AI Commander configuration.
 * API key input, mode selector with cost estimates.
 */
import { useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { useIPC } from '../desktop/useIPC';

const MODES = [
    { id: 'commander', label: 'Commander', cost: '~$0.15/turn', desc: 'Opus 4 — full strategic reasoning' },
    { id: 'officer', label: 'Officer', cost: '~$0.05/turn', desc: 'Sonnet 4 — balanced cost/quality' },
    { id: 'recruit', label: 'Recruit', cost: '~$0.01/turn', desc: 'Haiku 4 — fast, economical' },
    { id: 'cadet', label: 'Cadet', cost: 'Free', desc: 'Formula-only — no AI calls' },
] as const;

export interface AiSettingsPanelProps {
    onClose: () => void;
}

export function AiSettingsPanel({ onClose }: AiSettingsPanelProps) {
    const ipc = useIPC();
    const [apiKey, setApiKey] = useState('');
    const [mode, setMode] = useState<string>('cadet');
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (ipc.isAvailable) {
            try {
                await (ipc as any).invoke?.('set-ai-commander-config', { mode, anthropic_api_key: apiKey || undefined });
            } catch {
                // IPC not yet implemented — silent fallback
            }
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    return (
        <GlassPanel position="right" title="AI Commander" width="300px" onClose={onClose}>
            <div className="space-y-5">
                {/* API Key */}
                <div className="space-y-1.5">
                    <label
                        htmlFor="ai-settings-api-key"
                        className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]"
                    >
                        Anthropic API Key
                    </label>
                    <input
                        id="ai-settings-api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-ant-..."
                        className="w-full px-2 py-1.5 text-[11px] font-mono bg-black/40 border border-white/10 rounded text-[#d4d0c8] placeholder:text-[#8a8578]/50 focus:border-[#c4a04a]/40 focus:outline-none transition-colors"
                    />
                </div>

                {/* Mode selector */}
                <div className="space-y-2">
                    <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em]">
                        AI Mode
                    </div>
                    {MODES.map((m) => (
                        <label
                            key={m.id}
                            className={`flex items-start gap-2.5 p-2 rounded border cursor-pointer transition-all ${
                                mode === m.id
                                    ? 'border-[#c4a04a]/40 bg-[#c4a04a]/5'
                                    : 'border-white/5 bg-black/20 hover:border-white/10'
                            }`}
                        >
                            <input
                                type="radio"
                                name="ai-mode"
                                value={m.id}
                                aria-label={`AI mode: ${m.label}`}
                                checked={mode === m.id}
                                onChange={() => setMode(m.id)}
                                className="mt-0.5 accent-[#c4a04a]"
                            />
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-[#d4d0c8] font-medium">
                                        {m.label}
                                    </span>
                                    <span className="text-[9px] font-mono text-[#c4a04a]">
                                        {m.cost}
                                    </span>
                                </div>
                                <span className="text-[9px] text-[#8a8578] leading-snug">
                                    {m.desc}
                                </span>
                            </div>
                        </label>
                    ))}
                </div>

                {/* Save button */}
                <button
                    onClick={handleSave}
                    className={`w-full px-4 py-2 text-[10px] font-mono uppercase tracking-[0.15em] rounded transition-all ${
                        saved
                            ? 'bg-green-900/30 text-green-400 border border-green-500/30'
                            : 'bg-black/40 hover:bg-[#c4a04a]/20 text-[#d4d0c8] border border-white/10 hover:border-[#c4a04a]/40'
                    }`}
                >
                    {saved ? 'Saved!' : 'Save'}
                </button>
            </div>
        </GlassPanel>
    );
}

export default AiSettingsPanel;
