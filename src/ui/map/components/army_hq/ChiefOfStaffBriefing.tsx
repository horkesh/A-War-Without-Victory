/**
 * Chief of Staff Briefing — personality-driven summary from named deputy.
 * Template-based: reads game state, generates narrative text flavored by
 * the CoS's personality. No API calls — deterministic from state.
 *
 * Deputies:
 *   RBiH — Gen. Jovan Divjak (cautious, analytical)
 *   RS   — Gen. Manojlo Milovanović (professional, precise)
 *   HRHB — Gen. Milivoj Petković (direct, aggressive)
 */
import { useMemo } from 'react';
import type { LoadedGameState, FactionId } from '../../data/types';
import type { BriefingItem } from './SituationBriefing';

// ── CoS identity ────────────────────────────────────────────────────

interface CoSProfile {
    name: string;
    rank: string;
    title: string;
    tone: 'cautious' | 'precise' | 'aggressive';
}

const COS_PROFILES: Record<string, CoSProfile> = {
    RS: { name: 'Manojlo Milovanović', rank: 'Gen.', title: 'Chief of Main Staff', tone: 'precise' },
    RBiH: { name: 'Jovan Divjak', rank: 'Gen.', title: 'Deputy Commander', tone: 'cautious' },
    HRHB: { name: 'Milivoj Petković', rank: 'Gen.', title: 'Chief of Main Staff', tone: 'aggressive' },
};

// ── Tone phrases ────────────────────────────────────────────────────

const GREETINGS: Record<CoSProfile['tone'], string[]> = {
    cautious: [
        'Commander, I must bring several matters to your attention.',
        'Commander, the situation requires careful consideration.',
        'Commander, I have concerns that need your attention.',
    ],
    precise: [
        'Commander, here is the current situation assessment.',
        'Commander, reporting on operational status.',
        'Commander, the following requires your decision.',
    ],
    aggressive: [
        'Commander, we need to act on several fronts.',
        'Commander, the situation demands decisive action.',
        'Commander, I have updates requiring immediate attention.',
    ],
};

const THREAT_PHRASES: Record<CoSProfile['tone'], (corps: string) => string> = {
    cautious: (c) => `I am concerned about ${c} — their cohesion is dangerously low. We should consider reorganization before we lose combat effectiveness entirely.`,
    precise: (c) => `${c} reports critical cohesion levels. Force readiness is degraded. Recommend immediate assessment of reorganization options.`,
    aggressive: (c) => `${c} is in trouble. We need to either reinforce them or pull them back — half measures will cost us more troops.`,
};

const THIN_FRONT_PHRASES: Record<CoSProfile['tone'], (sector: string) => string> = {
    cautious: (s) => `Our line at ${s} is dangerously thin. If the enemy probes there, we may not hold.`,
    precise: (s) => `Sector ${s} is undermanned relative to frontage. Vulnerability assessment: high.`,
    aggressive: (s) => `${s} is exposed — one push and the line breaks. We need brigades there now.`,
};

const OP_PHRASES: Record<CoSProfile['tone'], (op: string) => string> = {
    cautious: (o) => `Operation ${o} awaits your authorization. I recommend reviewing force ratios before committing.`,
    precise: (o) => `Operation ${o} has completed preparation. Awaiting GO/NO-GO decision.`,
    aggressive: (o) => `${o} is ready to launch. The longer we wait, the more the enemy can prepare.`,
};

const EXHAUSTION_PHRASES: Record<CoSProfile['tone'], string> = {
    cautious: 'War exhaustion is taking its toll. Our capacity for sustained offensive operations is diminishing. We must be selective about where we commit forces.',
    precise: 'War exhaustion levels have reached a threshold affecting offensive capability. Tempo reduction advisable.',
    aggressive: 'The men are tired, but so is the enemy. We need to push through this or we lose the initiative entirely.',
};

const STABLE_PHRASES: Record<CoSProfile['tone'], string> = {
    cautious: 'The situation is stable for now, but we should remain vigilant. Quiet periods often precede enemy offensives.',
    precise: 'No critical issues to report. All sectors maintaining adequate readiness levels.',
    aggressive: 'Things are quiet — too quiet. We should be planning our next move, not waiting for theirs.',
};

// ── Generator ───────────────────────────────────────────────────────

function pickPhrase(phrases: string[], turn: number): string {
    return phrases[turn % phrases.length];
}

export function generateCoSBriefing(
    briefingItems: BriefingItem[],
    state: LoadedGameState,
    faction: string,
): string {
    const profile = COS_PROFILES[faction];
    if (!profile) return '';
    const tone = profile.tone;
    const turn = state.turn ?? 0;

    const criticals = briefingItems.filter(i => i.severity === 'critical');
    const warnings = briefingItems.filter(i => i.severity === 'warning');

    // No issues — stable
    if (criticals.length === 0 && warnings.length === 0) {
        return `${pickPhrase(GREETINGS[tone], turn)} ${STABLE_PHRASES[tone]}`;
    }

    const parts: string[] = [pickPhrase(GREETINGS[tone], turn)];

    // Critical cohesion
    const cohesionItem = criticals.find(i => i.category === 'cohesion');
    if (cohesionItem) {
        const corpsName = cohesionItem.title.split(' cohesion')[0];
        parts.push(THREAT_PHRASES[tone](corpsName));
    }

    // Operations awaiting decision
    const opItem = criticals.find(i => i.category === 'operations');
    if (opItem) {
        const opName = opItem.title.replace(/^Op /, '').replace(/ awaits.*/, '');
        parts.push(OP_PHRASES[tone](opName));
    }

    // Thin fronts
    const thinItem = warnings.find(i => i.category === 'defense');
    if (thinItem) {
        const sectorName = thinItem.title.replace(/^Thin front: /, '');
        parts.push(THIN_FRONT_PHRASES[tone](sectorName));
    }

    // War exhaustion
    const exhaustionItem = warnings.find(i => i.category === 'exhaustion');
    if (exhaustionItem) {
        parts.push(EXHAUSTION_PHRASES[tone]);
    }

    // Cap at 4 sentences to keep it compact
    return parts.slice(0, 4).join(' ');
}

// ── Component ───────────────────────────────────────────────────────

interface ChiefOfStaffBriefingProps {
    briefingItems: BriefingItem[];
    gameState: LoadedGameState;
    faction: string;
}

export function ChiefOfStaffBriefing({ briefingItems, gameState, faction }: ChiefOfStaffBriefingProps) {
    const profile = COS_PROFILES[faction];

    const text = useMemo(
        () => generateCoSBriefing(briefingItems, gameState, faction),
        [briefingItems, gameState, faction],
    );

    if (!profile || !text) return null;

    return (
        <div className="bg-panel-card border border-panel-border rounded-lg p-4 flex flex-col h-full">
            <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1.5 border-b border-panel-border">
                CHIEF OF STAFF
            </div>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-bold text-amber-400">
                    {profile.rank} {profile.name}
                </span>
                <span className="text-[9px] text-text-secondary/60 uppercase tracking-wider">
                    {profile.title}
                </span>
            </div>
            <div className="text-[11px] text-text-secondary leading-relaxed italic flex-1">
                &ldquo;{text}&rdquo;
            </div>
        </div>
    );
}
