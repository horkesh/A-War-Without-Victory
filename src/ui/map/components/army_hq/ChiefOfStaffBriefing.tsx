/**
 * Chief of Staff Briefing — paper missive from the named deputy.
 * Styled like a formal military document (cream paper, neutral tones, stamp).
 * Template-based personality-driven narrative from game state.
 * Inline clickable links for corps, sectors, operations.
 */
import { useMemo } from 'react';
import type { LoadedGameState } from '../../data/types';
import type { BriefingItem } from './SituationBriefing';
import { turnToDateString } from '../../utils/formatters';
import { generateLetterHome } from '../../../../sim/letter_home.js';
import type { LetterHomeInput } from '../../../../sim/letter_home.js';
import letterHomeData from '../../../../../data/templates/letter_home_templates.json';
import type { CommandStrainLabel } from '../../data/command_strain.js';

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

// ── Segment types ───────────────────────────────────────────────────

type TextSegment = { type: 'text'; value: string };
type LinkSegment = { type: 'link'; label: string; corpsId: string };
type Segment = TextSegment | LinkSegment;
type Paragraph = Segment[];

function text(value: string): TextSegment { return { type: 'text', value }; }
function link(label: string, corpsId: string): LinkSegment { return { type: 'link', label, corpsId }; }

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

function pickPhrase(phrases: string[], turn: number): string {
    return phrases[turn % phrases.length];
}

// ── Generator ───────────────────────────────────────────────────────

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

// ── Strain paragraph phrases ─────────────────────────────────────────

const STRAIN_PHRASES: Record<CoSProfile['tone'], Record<'strained' | 'compromised', (corpsName: string) => string>> = {
    cautious: {
        strained: (n) => `I must note that command relations with ${n} remain under strain following recent presidential interventions. The staff are compliant but the relationship requires careful management.`,
        compromised: (n) => `I am deeply concerned about the command relationship with ${n}. Repeated direct interventions have created serious institutional friction. The staff are executing orders, but their confidence in the chain of command has been damaged.`,
    },
    precise: {
        strained: (n) => `Command Authority Status: ${n} command relationship is under strain. Recent direct interventions have introduced friction into the planning cycle. Staff cohesion remains functional.`,
        compromised: (n) => `Command Authority Status: ${n} command relationship is compromised. Repeated direct interventions have created institutional friction. Recommend restoring delegated command before further operations.`,
    },
    aggressive: {
        strained: (n) => `${n} staff are still with us, but the overrides have left a mark. They'll execute, but we've spent some goodwill. Worth keeping in mind before the next intervention.`,
        compromised: (n) => `The situation with ${n} is serious. Too many overrides have damaged the command relationship. The staff are carrying out orders but operating under pressure. We need to let them run their own operations for a while.`,
    },
};

/**
 * Build strain paragraph segments for any player-faction corps with commandStrain > 0.
 * Returns a paragraph per strained corps, placed after the main operational summary.
 * No paragraph if all corps are healthy (silence = healthy).
 */
function buildStrainParagraphs(state: LoadedGameState, faction: string, tone: CoSProfile['tone']): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    const playerCorps = state.formations.filter(
        f => f.faction === faction && (f.kind === 'corps' || f.kind === 'corps_asset'),
    );
    // Deterministic: sort by id
    const sorted = [...playerCorps].sort((a, b) => a.id.localeCompare(b.id));
    for (const corps of sorted) {
        // Use adapter-derived commandStrainLabel — never cast LoadedGameState to raw GameState
        const label: CommandStrainLabel | undefined = corps.commandStrainLabel;
        if (!label || label === 'healthy') continue;
        const corpsName = corps.name ?? corps.id;
        const phrase = STRAIN_PHRASES[tone][label](corpsName);
        paragraphs.push([text(phrase)]);
    }
    return paragraphs;
}

export function generateCoSBriefing(
    briefingItems: BriefingItem[],
    state: LoadedGameState,
    faction: string,
): Paragraph[] {
    const profile = COS_PROFILES[faction];
    if (!profile) return [];
    const tone = profile.tone;
    const turn = state.turn ?? 0;

    const criticals = briefingItems.filter(i => i.severity === 'critical');
    const warnings = briefingItems.filter(i => i.severity === 'warning');

    const paragraphs: Paragraph[] = [];

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
        const segments: Segment[] = [];
        if (factionBattles.length > 0) {
            const won = factionBattles.filter(b =>
                (b.attacker_faction === faction && (b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory')) ||
                (b.defender_faction === faction && (b.outcome === 'repulsed' || b.outcome === 'catastrophic')),
            ).length;
            const lost_b = factionBattles.filter(b =>
                (b.attacker_faction === faction && (b.outcome === 'repulsed' || b.outcome === 'catastrophic')) ||
                (b.defender_faction === faction && (b.outcome === 'decisive_victory' || b.outcome === 'victory' || b.outcome === 'costly_victory')),
            ).length;
            segments.push(text(BATTLE_PHRASES[tone](won, lost_b, factionBattles.length)));
        }
        const terrText = TERRITORY_PHRASES[tone](gained, lost);
        if (terrText) {
            if (segments.length > 0) segments.push(text(' '));
            segments.push(text(terrText));
        }
        if (segments.length > 0) paragraphs.push(segments);
    }

    // § 2 — Current situation with linked entities
    if (criticals.length === 0 && warnings.length === 0) {
        paragraphs.push([
            text(pickPhrase(GREETINGS[tone], turn) + ' '),
            text(tone === 'cautious'
                ? 'The situation is stable for now, but we should remain vigilant.'
                : tone === 'precise'
                    ? 'No critical issues. All sectors maintaining adequate readiness.'
                    : 'Things are quiet — too quiet. We should be planning our next move.'),
        ]);
    } else {
        const segments: Segment[] = [text(pickPhrase(GREETINGS[tone], turn) + ' ')];
        let count = 0;

        const cohesionItem = criticals.find(i => i.category === 'cohesion');
        if (cohesionItem && count < 3) {
            const corpsName = cohesionItem.title.split(' cohesion')[0];
            const corpsId = cohesionItem.corpsId;
            if (tone === 'cautious') {
                segments.push(text('I am concerned about '));
                segments.push(corpsId ? link(corpsName, corpsId) : text(corpsName));
                segments.push(text(' — their cohesion is dangerously low. We should consider reorganization. '));
            } else if (tone === 'precise') {
                segments.push(corpsId ? link(corpsName, corpsId) : text(corpsName));
                segments.push(text(' reports critical cohesion. Force readiness degraded. Recommend reorganization. '));
            } else {
                segments.push(corpsId ? link(corpsName, corpsId) : text(corpsName));
                segments.push(text(' is in trouble. We need to reinforce them or pull them back. '));
            }
            count++;
        }

        const opItem = criticals.find(i => i.category === 'operations');
        if (opItem && count < 3) {
            const opName = opItem.title.replace(/^Op /, '').replace(/ awaits.*/, '');
            const corpsId = opItem.corpsId;
            if (tone === 'cautious') {
                segments.push(text('Operation '));
                segments.push(corpsId ? link(opName, corpsId) : text(opName));
                segments.push(text(' awaits your authorization. I recommend reviewing force ratios first. '));
            } else if (tone === 'precise') {
                segments.push(text('Operation '));
                segments.push(corpsId ? link(opName, corpsId) : text(opName));
                segments.push(text(' has completed preparation. Awaiting GO/NO-GO decision. '));
            } else {
                segments.push(corpsId ? link(opName, corpsId) : text(opName));
                segments.push(text(' is ready to launch. The longer we wait, the more the enemy prepares. '));
            }
            count++;
        }

        const thinItem = warnings.find(i => i.category === 'defense');
        if (thinItem && count < 3) {
            const sectorName = thinItem.title.replace(/^Thin front: /, '');
            const corpsId = thinItem.corpsId;
            if (tone === 'cautious') {
                segments.push(text('Our line at '));
                segments.push(corpsId ? link(sectorName, corpsId) : text(sectorName));
                segments.push(text(' is dangerously thin. If the enemy probes there, we may not hold. '));
            } else if (tone === 'precise') {
                segments.push(text('Sector '));
                segments.push(corpsId ? link(sectorName, corpsId) : text(sectorName));
                segments.push(text(' is undermanned relative to frontage. Vulnerability: high. '));
            } else {
                segments.push(corpsId ? link(sectorName, corpsId) : text(sectorName));
                segments.push(text(' is exposed — one push and the line breaks. We need brigades there now. '));
            }
            count++;
        }

        const exhaustionItem = warnings.find(i => i.category === 'exhaustion');
        if (exhaustionItem && count < 3) {
            // Wording note (Cluster B): staff interpretation, not prediction.
            // Canonical corps-level readout lives in CommandRelationshipSection;
            // this line stays at army-wide narrative scope and avoids fake certainty.
            segments.push(text(
                tone === 'cautious' ? 'War exhaustion is narrowing our offensive latitude across the theater.'
                    : tone === 'precise' ? 'Faction war exhaustion is limiting sustainable offensive tempo. Corps-level detail in Command Relationship.'
                        : 'The men are tired, but so is the enemy. Push through or lose initiative.',
            ));
            count++;
        }

        paragraphs.push(segments);
    }

    // § 3 — Command strain institutional signal (silence = healthy)
    const strainParagraphs = buildStrainParagraphs(state, faction, tone);
    for (const p of strainParagraphs) paragraphs.push(p);

    return paragraphs;
}

// ── Letter Home helper ───────────────────────────────────────────────

function buildLetterHomeInput(state: LoadedGameState, faction: string): LetterHomeInput | null {
    const turn = state.turn ?? 0;
    const battles = state.latestTurnSummary?.battles ?? [];
    const factionBattles = battles.filter(
        b => b.attacker_faction === faction || b.defender_faction === faction,
    );
    if (factionBattles.length === 0) return null;

    // Cumulative casualties from the casualty ledger
    const ledgerEntry = state.casualtyLedger?.[faction];
    const factionKilled = ledgerEntry?.killed ?? 0;
    const factionWounded = ledgerEntry?.wounded ?? 0;
    const factionMissing = ledgerEntry?.missing_captured ?? 0;

    if (factionKilled + factionWounded + factionMissing === 0) return null;

    // Build formation lookup from adapter formations
    const formationLookup = new Map<string, { id: string; name: string; home_osid?: string; turns_under_siege?: number }>();
    for (const f of state.formations) {
        formationLookup.set(f.id, {
            id: f.id,
            name: f.name,
            home_osid: f.home_osid,
            turns_under_siege: f.brigade_history?.turns_under_siege,
        });
    }

    return {
        turn,
        faction,
        factionKilled,
        factionWounded,
        factionMissing,
        factionBattles,
        formationLookup,
        templateData: letterHomeData as LetterHomeInput['templateData'],
    };
}

// ── Component ───────────────────────────────────────────────────────

interface ChiefOfStaffBriefingProps {
    briefingItems: BriefingItem[];
    gameState: LoadedGameState;
    faction: string;
    onCorpsClick?: (corpsId: string) => void;
}

export function ChiefOfStaffBriefing({ briefingItems, gameState, faction, onCorpsClick }: ChiefOfStaffBriefingProps) {
    const profile = COS_PROFILES[faction];
    const turn = gameState.turn ?? 0;

    const paragraphs = useMemo(
        () => generateCoSBriefing(briefingItems, gameState, faction),
        [briefingItems, gameState, faction],
    );

    const letterHomeText = useMemo(() => {
        const input = buildLetterHomeInput(gameState, faction);
        if (!input) return null;
        return generateLetterHome(input);
    }, [gameState, faction]);

    if (!profile || paragraphs.length === 0) return null;

    return (
        <div className="bg-[#f5f0e8] border border-neutral-300 rounded-lg overflow-hidden flex flex-col min-h-[150px] max-h-[220px] shadow-md relative">
            {/* Stamp */}
            <div className="absolute top-2 right-3 opacity-[0.08] font-black text-xl -rotate-12 select-none uppercase text-neutral-800 pointer-events-none">
                BRIEFING
            </div>

            {/* Header */}
            <div className="px-3 py-1.5 border-b border-neutral-300/60 bg-[#ebe5d8]">
                <div className="text-[8px] uppercase font-bold text-neutral-500 tracking-[0.2em]">Daily Briefing — {turnToDateString(turn)}</div>
                <div className="text-[11px] font-bold text-neutral-800 mt-0.5">
                    {profile.rank} {profile.name}
                </div>
                <div className="text-[8px] text-neutral-500 italic">{profile.title}</div>
            </div>

            {/* Body — missive text with inline links */}
            <div className="px-3 py-1.5 flex-1 overflow-y-auto">
                {paragraphs.map((segments, i) => (
                    <p key={i} className="text-[10px] text-neutral-700 leading-relaxed mb-2 last:mb-0" style={{ fontFamily: 'Georgia, serif' }}>
                        {i === 0 && <>&ldquo;</>}
                        {segments.map((seg, j) =>
                            seg.type === 'link' && onCorpsClick ? (
                                <button
                                    key={j}
                                    type="button"
                                    onClick={() => onCorpsClick(seg.corpsId)}
                                    className="underline decoration-amber-700/40 hover:decoration-amber-700 text-amber-900 font-semibold hover:text-amber-700 transition-colors cursor-pointer"
                                    style={{ fontFamily: 'Georgia, serif' }}
                                >
                                    {seg.label}
                                </button>
                            ) : (
                                <span key={j}>{(seg as TextSegment).value}</span>
                            ),
                        )}
                        {i === paragraphs.length - 1 && <>&rdquo;</>}
                    </p>
                ))}

                {/* Letter Home — casualty vignette */}
                {letterHomeText && (
                    <div className="mt-2 pt-2 border-t border-neutral-300/40">
                        <p
                            className="text-[9.5px] text-neutral-600 leading-relaxed italic"
                            style={{ fontFamily: 'Georgia, serif', borderLeft: '2px solid #b8860b44', paddingLeft: '8px' }}
                        >
                            {letterHomeText}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer — signature line */}
            <div className="px-3 py-1 border-t border-neutral-300/60 bg-[#ebe5d8]">
                <div className="text-[8px] text-neutral-400 italic text-right">
                    — {profile.rank} {profile.name.split(' ').pop()}, {profile.title}
                </div>
            </div>
        </div>
    );
}
