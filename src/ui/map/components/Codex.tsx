/**
 * Codex / Encyclopedia — reference material for game mechanics, factions, history.
 * Full-screen overlay accessible from MainMenu, PauseMenu, and TopToolbar.
 *
 * Content loaded from JSON files in data/codex/ at build time.
 * v0.5.2: shell + category structure. Content authored separately.
 */
import { useState } from 'react';

export interface CodexEntry {
    id: string;
    category: string;
    title: string;
    summary: string;
    body: string;
    related?: string[];
}

export interface CodexCategory {
    id: string;
    label: string;
    entries: CodexEntry[];
}

// Placeholder categories — content loaded from data/codex/*.json
const CODEX_CATEGORIES: CodexCategory[] = [
    { id: 'factions', label: 'Factions', entries: [] },
    { id: 'corps', label: 'Corps', entries: [] },
    { id: 'mechanics', label: 'Game Mechanics', entries: [] },
    { id: 'history', label: 'Historical Context', entries: [] },
    { id: 'geography', label: 'Geography', entries: [] },
];

interface CodexProps {
    onClose: () => void;
}

export function Codex({ onClose }: CodexProps) {
    const [selectedCategory, setSelectedCategory] = useState('factions');
    const [selectedEntry, setSelectedEntry] = useState<CodexEntry | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const category = CODEX_CATEGORIES.find(c => c.id === selectedCategory);
    const filteredEntries = category?.entries.filter(e =>
        !searchQuery || e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.summary.toLowerCase().includes(searchQuery.toLowerCase())
    ) ?? [];

    return (
        <div className="fixed inset-0 z-[8500] flex bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="w-full max-w-[900px] mx-auto my-4 flex rounded-lg border border-[#8a7a60]/30 shadow-2xl overflow-hidden"
                 style={{ background: 'rgba(26, 24, 21, 0.97)' }}
                 onClick={(e) => e.stopPropagation()}>

                {/* Sidebar */}
                <div className="w-48 shrink-0 border-r border-[#8a7a60]/20 p-3 flex flex-col">
                    <h2 className="text-[14px] text-[#c4a35a] font-bold tracking-wider mb-3 text-center"
                        style={{ fontFamily: 'Georgia, serif' }}>
                        Codex
                    </h2>

                    {/* Search */}
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full text-[11px] bg-[#2a2720] text-[#d5c9bc] border border-[#8a7a60]/20 rounded px-2 py-1.5 mb-3 placeholder:text-[#8a7a60]/50"
                    />

                    {/* Categories */}
                    <div className="space-y-1 flex-1">
                        {CODEX_CATEGORIES.map(cat => (
                            <button key={cat.id} type="button"
                                onClick={() => { setSelectedCategory(cat.id); setSelectedEntry(null); }}
                                className={`w-full text-left text-[11px] px-2 py-1.5 rounded transition-colors ${
                                    selectedCategory === cat.id
                                        ? 'text-[#c4a35a] bg-[#c4a35a]/10'
                                        : 'text-[#8a7a60] hover:bg-[#8a7a60]/10'
                                }`}>
                                {cat.label}
                                {cat.entries.length > 0 && (
                                    <span className="text-[9px] text-[#8a7a60]/60 ml-1">({cat.entries.length})</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <button type="button" onClick={onClose}
                        className="mt-3 text-[10px] uppercase tracking-wider text-[#8a7a60] border border-[#8a7a60]/20 px-3 py-1.5 rounded hover:bg-[#8a7a60]/10 w-full"
                        style={{ fontFamily: 'Courier New, monospace' }}>
                        Close
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 overflow-auto">
                    {selectedEntry ? (
                        <div>
                            <button type="button" onClick={() => setSelectedEntry(null)}
                                className="text-[10px] text-[#c4a35a] mb-3 hover:underline">
                                &larr; Back to {category?.label}
                            </button>
                            <h3 className="text-[18px] font-bold text-[#d5c9bc] mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                                {selectedEntry.title}
                            </h3>
                            <div className="text-[12px] text-[#8a7a60] leading-relaxed whitespace-pre-wrap">
                                {selectedEntry.body}
                            </div>
                        </div>
                    ) : filteredEntries.length > 0 ? (
                        <div className="space-y-2">
                            {filteredEntries.map(entry => (
                                <button key={entry.id} type="button"
                                    onClick={() => setSelectedEntry(entry)}
                                    className="w-full text-left p-3 rounded border border-[#8a7a60]/15 hover:bg-[#8a7a60]/10 transition-colors">
                                    <div className="text-[13px] font-bold text-[#d5c9bc]">{entry.title}</div>
                                    <div className="text-[11px] text-[#8a7a60] mt-0.5">{entry.summary}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-[#8a7a60] italic mt-12">
                            {searchQuery
                                ? `No entries matching "${searchQuery}"`
                                : 'Codex content will be added in a future update.'}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
