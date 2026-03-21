/**
 * Settings screen — gameplay, display, and audio settings.
 * Uses section registry pattern for extensibility (v0.5.3 audio, v0.6.3 AI content).
 */
import { useState } from 'react';

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
    const [activeSection, setActiveSection] = useState('gameplay');

    const allSections: Array<{ id: string; title: string }> = [
        { id: 'gameplay', title: 'Gameplay' },
        { id: 'display', title: 'Display' },
        ...settingsSections.map(s => ({ id: s.id, title: s.title })),
    ];

    return (
        <div className="fixed inset-0 z-[8500] flex items-center justify-center bg-black/80 backdrop-blur-sm"
             onClick={onClose}>
            <div className="w-[90%] max-w-[500px] max-h-[80vh] overflow-auto rounded-lg border border-[#8a7a60]/30 shadow-2xl p-6"
                 style={{ background: 'rgba(26, 24, 21, 0.97)' }}
                 onClick={(e) => e.stopPropagation()}>

                <h2 className="text-[16px] text-[#c4a35a] font-bold tracking-wider text-center mb-4"
                    style={{ fontFamily: 'Georgia, serif' }}>
                    Settings
                </h2>

                {/* Section tabs */}
                <div className="flex gap-2 mb-4 justify-center">
                    {allSections.map(sec => (
                        <button key={sec.id} type="button"
                            onClick={() => setActiveSection(sec.id)}
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
                            <SettingRow label="Turn Confirmation" description="Require confirmation before advancing turn">
                                <ToggleSwitch />
                            </SettingRow>
                            <SettingRow label="Fog of War" description="Enable fog of war by default">
                                <ToggleSwitch />
                            </SettingRow>
                        </>
                    )}
                    {activeSection === 'display' && (
                        <>
                            <SettingRow label="Map Quality" description="Rendering quality (affects performance)">
                                <select className="bg-[#2a2720] text-[#d5c9bc] text-[11px] border border-[#8a7a60]/20 rounded px-2 py-1">
                                    <option value="low">Low</option>
                                    <option value="medium" selected>Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </SettingRow>
                            <SettingRow label="Colorblind Mode" description="Adjust colors for accessibility">
                                <ToggleSwitch />
                            </SettingRow>
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
                        Close
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

function ToggleSwitch() {
    const [on, setOn] = useState(true);
    return (
        <button type="button" onClick={() => setOn(!on)}
            className={`w-10 h-5 rounded-full border transition-colors relative ${
                on ? 'bg-[#c4a35a]/30 border-[#c4a35a]/50' : 'bg-[#2a2720] border-[#8a7a60]/30'
            }`}>
            <div className={`w-3.5 h-3.5 rounded-full absolute top-0.5 transition-all ${
                on ? 'left-5 bg-[#c4a35a]' : 'left-0.5 bg-[#8a7a60]'
            }`} />
        </button>
    );
}
