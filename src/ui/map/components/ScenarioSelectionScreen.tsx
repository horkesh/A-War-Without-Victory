/**
 * ScenarioSelectionScreen — full-screen glassmorphism scenario picker.
 *
 * Displays available scenarios as cards, allows faction selection,
 * and triggers campaign start. Greyed-out cards for unavailable scenarios.
 */
import { useState } from 'react';
import { SCENARIO_REGISTRY, type ScenarioEntry, type FactionDifficulty } from '../../../scenario/scenario_registry';
import { getFactionFlag, getArmyName } from '../utils/factionAssets';

interface ScenarioSelectionScreenProps {
    onStart: (scenarioKey: string, playerFaction: string) => void;
    onClose?: () => void;
}

const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;

const DIFFICULTY_COLORS: Record<FactionDifficulty, string> = {
    easy: '#4ade80',
    medium: '#facc15',
    hard: '#ef4444',
};

const DIFFICULTY_LABEL: Record<FactionDifficulty, string> = {
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
};

function DifficultyDot({ level }: { level: FactionDifficulty }) {
    return (
        <span
            className="inline-block w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: DIFFICULTY_COLORS[level] }}
            title={DIFFICULTY_LABEL[level]}
        />
    );
}

function ScenarioCard({
    entry,
    selected,
    onSelect,
}: {
    entry: ScenarioEntry;
    selected: boolean;
    onSelect: () => void;
}) {
    const unavailable = !entry.available;

    return (
        <button
            type="button"
            disabled={unavailable}
            onClick={onSelect}
            className={`
                relative w-full text-left rounded-lg border p-4 transition-all duration-200
                ${unavailable
                    ? 'opacity-40 cursor-not-allowed border-[#333] bg-[#111]/60'
                    : selected
                        ? 'border-[#c4a04a] bg-[#1a1d24]/90 shadow-[0_0_20px_rgba(196,160,74,0.15)]'
                        : 'border-[#2a2d34] bg-[#12151a]/80 hover:border-[#c4a04a]/40 hover:bg-[#1a1d24]/70'
                }
            `}
        >
            {unavailable && (
                <span className="absolute top-2 right-2 text-[10px] uppercase tracking-wider text-[#666] font-semibold bg-[#1a1a1a] px-2 py-0.5 rounded">
                    Coming Soon
                </span>
            )}

            <div className="flex items-start justify-between mb-2">
                <div>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#8a8578] font-medium">
                        {entry.startDate}
                    </span>
                    <h3 className="text-sm font-bold text-[#e8e0d0] mt-0.5">{entry.name}</h3>
                </div>
                <span className="text-[10px] text-[#8a8578] whitespace-nowrap ml-2">
                    {entry.durationWeeks}w
                </span>
            </div>

            <p className="text-[11px] text-[#8a8578] leading-relaxed mb-3">
                {entry.description}
            </p>

            <div className="flex gap-3">
                {FACTIONS.map(f => {
                    const diff = entry.difficulty[f] as FactionDifficulty | undefined;
                    if (!diff) return null;
                    return (
                        <span key={f} className="flex items-center text-[10px] text-[#8a8578]">
                            <DifficultyDot level={diff} />
                            {f}
                        </span>
                    );
                })}
            </div>
        </button>
    );
}

export function ScenarioSelectionScreen({ onStart, onClose }: ScenarioSelectionScreenProps) {
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [selectedFaction, setSelectedFaction] = useState<string | null>(null);

    const selectedEntry = SCENARIO_REGISTRY.find(e => e.key === selectedKey);
    const canStart = selectedEntry?.available && selectedFaction;

    const handleStart = () => {
        if (selectedKey && selectedFaction) {
            onStart(selectedKey, selectedFaction);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center"
            style={{
                background: 'radial-gradient(ellipse at 50% 40%, #1a2030 0%, #0a0c12 60%, #050608 100%)',
            }}
        >
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(#c4a04a 1px, transparent 1px), linear-gradient(90deg, #c4a04a 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                }}
            />

            <div className="relative w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="text-center mb-6">
                    <h1
                        className="text-2xl font-black uppercase tracking-[0.4em] text-[#c4a04a]"
                        style={{ textShadow: '0 0 20px rgba(196,160,74,0.3)' }}
                    >
                        Select Campaign
                    </h1>
                    <p className="text-[11px] text-[#8a8578] mt-1 tracking-wider uppercase">
                        Bosnia-Herzegovina, 1991 &ndash; 1995
                    </p>
                </div>

                {/* Scenario cards grid */}
                <div className="flex-1 overflow-y-auto mb-4 pr-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {SCENARIO_REGISTRY.map(entry => (
                            <ScenarioCard
                                key={entry.key}
                                entry={entry}
                                selected={selectedKey === entry.key}
                                onSelect={() => {
                                    setSelectedKey(entry.key);
                                    setSelectedFaction(null);
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Faction selection (visible when scenario selected) */}
                {selectedEntry?.available && (
                    <div className="bg-[#12151a]/90 backdrop-blur-md border border-[#2a2d34] rounded-lg p-4 mb-4">
                        <h2 className="text-[10px] uppercase tracking-[0.3em] text-[#c4a04a] font-semibold mb-3">
                            Choose Your Faction
                        </h2>
                        <div className="flex gap-2">
                            {FACTIONS.map(faction => {
                                const isSelected = selectedFaction === faction;
                                const diff = selectedEntry.difficulty[faction] as FactionDifficulty | undefined;
                                return (
                                    <button
                                        key={faction}
                                        type="button"
                                        onClick={() => setSelectedFaction(faction)}
                                        className={`
                                            flex-1 flex items-center gap-3 px-3 py-2.5 rounded border transition-all
                                            ${isSelected
                                                ? 'border-[#c4a04a] bg-[#1a1d24] shadow-[0_0_12px_rgba(196,160,74,0.1)]'
                                                : 'border-[#2a2d34] bg-[#0e1015] hover:border-[#c4a04a]/30'
                                            }
                                        `}
                                    >
                                        {getFactionFlag(faction) && (
                                            <img
                                                src={getFactionFlag(faction)}
                                                alt=""
                                                className={`w-10 h-7 object-cover rounded border border-white/5 shadow-sm transition-opacity ${isSelected ? 'opacity-100' : 'opacity-60'}`}
                                            />
                                        )}
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-semibold text-[#e8e0d0] tracking-wide">{faction}</span>
                                            {getArmyName(faction) && (
                                                <span className="text-[10px] text-[#8a8578] uppercase truncate">{getArmyName(faction)}</span>
                                            )}
                                        </div>
                                        {diff && (
                                            <span className="ml-auto flex items-center text-[10px] text-[#8a8578]">
                                                <DifficultyDot level={diff} />
                                                {DIFFICULTY_LABEL[diff]}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex justify-between items-center">
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs uppercase tracking-wider text-[#8a8578] hover:text-[#c4a04a] border border-[#2a2d34] hover:border-[#c4a04a]/30 rounded transition-all"
                        >
                            Back
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={!canStart}
                        onClick={handleStart}
                        className={`
                            ml-auto px-8 py-2.5 text-sm font-bold uppercase tracking-[0.2em] rounded border transition-all
                            ${canStart
                                ? 'border-[#c4a04a] bg-[#c4a04a]/10 text-[#c4a04a] hover:bg-[#c4a04a]/20 shadow-[0_0_16px_rgba(196,160,74,0.15)]'
                                : 'border-[#333] bg-transparent text-[#555] cursor-not-allowed'
                            }
                        `}
                    >
                        Start Campaign
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ScenarioSelectionScreen;
