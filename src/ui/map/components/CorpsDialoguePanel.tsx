/**
 * CorpsDialoguePanel — shows corps commander acknowledgment responses.
 * Cosmetic flavor panel: officer name, acknowledgment, concern, confidence dot.
 * Props: { dialogues, corpsId? } — filter by corpsId if provided.
 */

import type { CorpsDialogueEntry } from '../../../sim/ai_commander/corps_dialogue.js';

export interface CorpsDialoguePanelProps {
    dialogues: CorpsDialogueEntry[];
    /** If provided, show only the entry for this corps. */
    corpsId?: string;
}

function ConfidenceDot({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
    const colorClass =
        confidence === 'high'
            ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'
            : confidence === 'medium'
              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]'
              : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]';

    return (
        <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-[3px] ${colorClass}`}
            title={`Confidence: ${confidence}`}
        />
    );
}

function DialogueCard({ entry }: { entry: CorpsDialogueEntry }) {
    return (
        <div className="bg-black/30 rounded px-3 py-2 border border-white/5 space-y-2">
            {/* Officer header */}
            <div className="flex items-center gap-2">
                <ConfidenceDot confidence={entry.confidence} />
                <span className="text-[11px] font-mono text-[#c4a04a] uppercase tracking-[0.12em] font-bold">
                    {entry.officer_name}
                </span>
                <span className="text-[9px] font-mono text-[#8a8578] ml-auto uppercase tracking-[0.15em]">
                    {entry.corps_id}
                </span>
            </div>

            {/* Acknowledgment */}
            <p className="text-[11px] text-[#d4d0c8] leading-relaxed italic">
                &ldquo;{entry.acknowledgment}&rdquo;
            </p>

            {/* Concern — only shown when non-empty */}
            {entry.concern && (
                <div className="flex items-start gap-2 bg-amber-900/20 rounded px-2 py-1 border border-amber-500/20">
                    <span className="text-[10px] text-amber-400/80 flex-shrink-0 font-mono uppercase tracking-[0.1em]">
                        Concern:
                    </span>
                    <p className="text-[10px] text-amber-300/90 leading-relaxed">
                        {entry.concern}
                    </p>
                </div>
            )}
        </div>
    );
}

export function CorpsDialoguePanel({ dialogues, corpsId }: CorpsDialoguePanelProps) {
    const filtered = corpsId
        ? dialogues.filter(d => d.corps_id === corpsId)
        : dialogues;

    if (filtered.length === 0) {
        return (
            <div className="text-[10px] font-mono text-[#8a8578] uppercase tracking-[0.15em] py-2">
                No officer reports this turn.
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-[9px] font-mono text-[#8a8578] uppercase tracking-[0.2em] mb-1">
                Officer Reports — Turn {filtered[0]?.turn ?? '?'}
            </div>
            {filtered.map(entry => (
                <DialogueCard key={entry.corps_id} entry={entry} />
            ))}
        </div>
    );
}
