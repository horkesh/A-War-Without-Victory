/**
 * Chief of Staff Briefing — paper missive from the named deputy.
 * Styled like a formal military document (cream paper, neutral tones, stamp).
 * Template-based personality-driven narrative from game state.
 *
 * Deputies:
 *   RBiH — Gen. Jovan Divjak (cautious, analytical)
 *   RS   — Gen. Manojlo Milovanović (professional, precise)
 *   HRHB — Gen. Milivoj Petković (direct, aggressive)
 */
import { useMemo } from 'react';
import type { LoadedGameState } from '../../data/types';
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
    cautious: (c) => `I am concerned about ${c} — their cohesion is dangerously low. We should consider reorganization.`,
    precise: (c) => `${c} reports critical cohesion. Force readiness degraded. Recommend reorganization assessment.`,
    aggressive: (c) => `${c} is in trouble. We need to reinforce them or pull them back — half measures cost more.`,
};

const THIN_FRONT_PHRASES: Record<CoSProfile['tone'], (sector: string) => string> = {
    cautious: (s) => `Our line at ${s} is dangerously thin. If the enemy probes there, we may not hold.`,
    precise: (s) => `Sector ${s} is undermanned relative to frontage. Vulnerability: high.`,
    aggressive: (s) => `${s} is exposed — one push and the line breaks. We need brigades there now.`,
};

const OP_PHRASES: Record<CoSProfile['tone'], (op: string) => string> = {
    cautious: (o) => `Operation ${o} awaits your authorization. I recommend reviewing force ratios first.`,
    precise: (o) => `Operation ${o} has completed preparation. Awaiting GO/NO-GO decision.`,
    aggressive: (o) => `${o} is ready to launch. The longer we wait, the more the enemy prepares.`,
};

const EXHAUSTION_PHRASES: Record<CoSProfile['tone'], string> = {
    cautious: 'War exhaustion is taking its toll. Our offensive capacity is diminishing.',
    precise: 'War exhaustion levels affecting offensive capability. Tempo reduction advisable.',
    aggressive: 'The men are tired, but so is the enemy. Push through or lose initiative.',
};

const STABLE_PHRASES: Record<CoSProfile['tone'], string> = {
    cautious: 'The situation is stable for now, but we should remain vigilant.',
    precise: 'No critical issues. All sectors maintaining adequate readiness.',
    aggressive: 'Things are quiet — too quiet. We should be planning our next move.',
};

// ── Last-turn events ────────────────────────────────────────────────

const BATTLE_PHRASES: Record<CoSProfile['tone'], (won: number, lost: number, total: number) => string> = {
    cautious: (w, l, t) => {
        if (l > w) return `We fought ${t} engagement${t > 1 ? 's' : ''} — results are concerning, with ${l} unfavorable outcome${l > 1 ? 's' : ''}.`;
        if (w > 0) return `${t} engagement${t > 1 ? 's' : ''} this turn. ${w} went in our favor, but every battle costs us.`;
        return `${t} engagement${t > 1 ? 's' : ''} this turn, mostly inconclusive.`;
    },
    precise: (w, l, t) => `${t} engagement${t > 1 ? 's' : ''} this turn: ${w} favorable, ${l} unfavorable, ${t - w - l} inconclusive.`,
    aggressive: (w, l, t) => {
        if (w > l) return `We fought ${t} battle${t > 1 ? 's' : ''} and won ${w}. Good, but we need to keep pressing.`;
        if (l > 0) return `${t} engagement${t > 1 ? 's' : ''} — we took ${l} hit${l > 1 ? 's' : ''}. We need to hit back harder.`;
        return `${t} engagement${t > 1 ? 's' : ''}, mostly stalemates. We need to break through.`;
    },
};

const TERRITORY_PHRASES: Record<CoSProfile['tone'], (gained: number, lost: number) => string> = {
    cautious: (g, l) => {
        if (l > 0 && g === 0) return `We lost ${l} position${l > 1 ? 's' : ''} this turn. This is deeply troubling.`;
        if (g > 0 && l === 0) return `We gained ${g} position${g > 1 ? 's' : ''} — encouraging, but we must consolidate.`;
        if (g > 0 && l > 0) return `Mixed results: gained ${g}, lost ${l} position${l > 1 ? 's' : ''}.`;
        return '';
    },
    precise: (g, l) => {
        if (g === 0 && l === 0) return '';
        return `Territory changes: +${g} gained, -${l} lost.`;
    },
    aggressive: (g, l) => {
        if (l > 0 && g === 0) return `We lost ${l} position${l > 1 ? 's' : ''} — unacceptable. We need to take them back.`;
        if (g > 0 && l === 0) return `Took ${g} position${g > 1 ? 's' : ''}. Good. Keep going.`;
        if (g > 0 && l > 0) return `Gained ${g} but lost ${l} — we need to be smarter about where we commit.`;
        return '';
    },
};

// ── Generator ───────────────────────────────────────────────────────

function pickPhrase(phrases: string[], turn: number): string {
    return phrases[turn % phrases.length];
}

export function generateCoSBriefing(
    briefingItems: BriefingItem[],
    state: LoadedGameState,
    faction: string,
): string[] {
    const profile = COS_PROFILES[faction];
    if (!profile) return [];
    const tone = profile.tone;
    const turn = state.turn ?? 0;

    const criticals = briefingItems.filter(i => i.severity === 'critical');
    const warnings = briefingItems.filter(i => i.severity === 'warning');

    const paragraphs: string[] = [];

    // § 1 — Last turn events
    const battles = state.latestTurnSummary?.battles ?? [];
    const factionBattles = battles.filter(
        b => b.attacker_faction === faction || b.defender_faction === faction,
    );
    const territoryNet = state.latestTurnSummary?.territory_net ?? {};
    const netChange = territoryNet[faction as keyof typeof territoryNet] ?? 0;
    const gained = netChange > 0 ? netChange : 0;
    const lost = netChange < 0 ? -netChange : 0;

    if (factionBattles.length > 0 || gained > 0 || lost > 0) {
        const lastTurnParts: string[] = [];
        if (factionBattles.length > 0) {
            const won = factionBattles.filter(b =>
                (b.attacker_faction === faction && (b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory')) ||
                (b.defender_faction === faction && (b.outcome === 'repulsed' || b.outcome === 'catastrophic')),
            ).length;
            const lost_b = factionBattles.filter(b =>
                (b.attacker_faction === faction && (b.outcome === 'repulsed' || b.outcome === 'catastrophic')) ||
                (b.defender_faction === faction && (b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory')),
            ).length;
            lastTurnParts.push(BATTLE_PHRASES[tone](won, lost_b, factionBattles.length));
        }
        const terrText = TERRITORY_PHRASES[tone](gained, lost);
        if (terrText) lastTurnParts.push(terrText);
        if (lastTurnParts.length > 0) paragraphs.push(lastTurnParts.join(' '));
    }

    // § 2 — Current situation
    if (criticals.length === 0 && warnings.length === 0) {
        paragraphs.push(`${pickPhrase(GREETINGS[tone], turn)} ${STABLE_PHRASES[tone]}`);
    } else {
        const sitParts: string[] = [pickPhrase(GREETINGS[tone], turn)];

        const cohesionItem = criticals.find(i => i.category === 'cohesion');
        if (cohesionItem) {
            sitParts.push(THREAT_PHRASES[tone](cohesionItem.title.split(' cohesion')[0]));
        }

        const opItem = criticals.find(i => i.category === 'operations');
        if (opItem) {
            sitParts.push(OP_PHRASES[tone](opItem.title.replace(/^Op /, '').replace(/ awaits.*/, '')));
        }

        const thinItem = warnings.find(i => i.category === 'defense');
        if (thinItem) {
            sitParts.push(THIN_FRONT_PHRASES[tone](thinItem.title.replace(/^Thin front: /, '')));
        }

        const exhaustionItem = warnings.find(i => i.category === 'exhaustion');
        if (exhaustionItem) {
            sitParts.push(EXHAUSTION_PHRASES[tone]);
        }

        paragraphs.push(sitParts.slice(0, 3).join(' '));
    }

    return paragraphs;
}

// ── Component ───────────────────────────────────────────────────────

interface ChiefOfStaffBriefingProps {
    briefingItems: BriefingItem[];
    gameState: LoadedGameState;
    faction: string;
}

export function ChiefOfStaffBriefing({ briefingItems, gameState, faction }: ChiefOfStaffBriefingProps) {
    const profile = COS_PROFILES[faction];
    const turn = gameState.turn ?? 0;

    const paragraphs = useMemo(
        () => generateCoSBriefing(briefingItems, gameState, faction),
        [briefingItems, gameState, faction],
    );

    if (!profile || paragraphs.length === 0) return null;

    return (
        <div className="bg-[#f5f0e8] border border-neutral-300 rounded-lg overflow-hidden flex flex-col h-full shadow-md relative">
            {/* Stamp */}
            <div className="absolute top-2 right-3 opacity-[0.08] font-black text-xl -rotate-12 select-none uppercase text-neutral-800 pointer-events-none">
                BRIEFING
            </div>

            {/* Header */}
            <div className="px-3 py-2 border-b border-neutral-300/60 bg-[#ebe5d8]">
                <div className="text-[8px] uppercase font-bold text-neutral-500 tracking-[0.2em]">Daily Briefing — Week {turn}</div>
                <div className="text-[11px] font-bold text-neutral-800 mt-0.5">
                    {profile.rank} {profile.name}
                </div>
                <div className="text-[8px] text-neutral-500 italic">{profile.title}</div>
            </div>

            {/* Body — missive text */}
            <div className="px-3 py-2 flex-1 overflow-y-auto">
                {paragraphs.map((p, i) => (
                    <p key={i} className="text-[10px] text-neutral-700 leading-relaxed mb-2 last:mb-0" style={{ fontFamily: 'Georgia, serif' }}>
                        {p}
                    </p>
                ))}
            </div>

            {/* Footer — signature line */}
            <div className="px-3 py-1.5 border-t border-neutral-300/60 bg-[#ebe5d8]">
                <div className="text-[8px] text-neutral-400 italic text-right">
                    — {profile.rank} {profile.name.split(' ').pop()}, {profile.title}
                </div>
            </div>
        </div>
    );
}
