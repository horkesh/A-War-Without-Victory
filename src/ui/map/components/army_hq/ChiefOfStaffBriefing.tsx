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
import { shouldNarrateTerritorySummary } from '../../data/territorySummaryGuard';
import { getActiveLocale, t, type MessageKey } from '../../i18n';
import { getPlayerSafeCorpsName } from '../../utils/playerSafeText';

// ── CoS identity ────────────────────────────────────────────────────

interface CoSProfile {
    name: string;
    rank: string;
    titleKey: MessageKey;
    tone: 'cautious' | 'precise' | 'aggressive';
}

const COS_PROFILES: Record<string, CoSProfile> = {
    RS: { name: 'Manojlo Milovanović', rank: 'Gen.', titleKey: 'chiefOfStaff.title.mainStaff', tone: 'precise' },
    RBiH: { name: 'Jovan Divjak', rank: 'Gen.', titleKey: 'chiefOfStaff.title.deputyCommander', tone: 'cautious' },
    HRHB: { name: 'Milivoj Petković', rank: 'Gen.', titleKey: 'chiefOfStaff.title.mainStaff', tone: 'aggressive' },
};

// ── Segment types ───────────────────────────────────────────────────

type TextSegment = { type: 'text'; value: string };
type LinkSegment = { type: 'link'; label: string; corpsId: string };
type Segment = TextSegment | LinkSegment;
type Paragraph = Segment[];

function text(value: string): TextSegment { return { type: 'text', value }; }
function link(label: string, corpsId: string): LinkSegment { return { type: 'link', label, corpsId }; }

// ── Tone phrases ────────────────────────────────────────────────────

const GREETINGS: Record<CoSProfile['tone'], MessageKey[]> = {
    cautious: [
        'chiefOfStaff.greeting.cautious.0',
        'chiefOfStaff.greeting.cautious.1',
        'chiefOfStaff.greeting.cautious.2',
    ],
    precise: [
        'chiefOfStaff.greeting.precise.0',
        'chiefOfStaff.greeting.precise.1',
        'chiefOfStaff.greeting.precise.2',
    ],
    aggressive: [
        'chiefOfStaff.greeting.aggressive.0',
        'chiefOfStaff.greeting.aggressive.1',
        'chiefOfStaff.greeting.aggressive.2',
    ],
};

function pickPhrase(phrases: MessageKey[], turn: number): string {
    return t(phrases[turn % phrases.length]);
}

function countLabel(count: number, one: MessageKey, many: MessageKey): string {
    return t(count === 1 ? one : many);
}

// ── Generator ───────────────────────────────────────────────────────

const BATTLE_PHRASES: Record<CoSProfile['tone'], (won: number, lost: number, total: number) => string> = {
    cautious: (w, l, total) => {
        if (l > w) return t('chiefOfStaff.battle.cautious.losing', { total, totalS: total > 1 ? 's' : '', lost: l, lostS: l > 1 ? 's' : '' });
        if (w > 0) return t('chiefOfStaff.battle.cautious.winning', { total, totalS: total > 1 ? 's' : '', won: w });
        return t('chiefOfStaff.battle.cautious.inconclusive', { total, totalS: total > 1 ? 's' : '' });
    },
    precise: (w, l, total) => t('chiefOfStaff.battle.precise.summary', {
        total,
        engagementLabel: countLabel(total, 'chiefOfStaff.count.engagement.one', 'chiefOfStaff.count.engagement.many'),
        won: w,
        lost: l,
        inconclusive: total - w - l,
    }),
    aggressive: (w, l, total) => {
        if (w > l) return t('chiefOfStaff.battle.aggressive.winning', {
            total,
            battleLabel: countLabel(total, 'chiefOfStaff.count.battle.one', 'chiefOfStaff.count.battle.many'),
            won: w,
        });
        if (l > 0) return t('chiefOfStaff.battle.aggressive.losing', {
            total,
            engagementLabel: countLabel(total, 'chiefOfStaff.count.engagement.one', 'chiefOfStaff.count.engagement.many'),
            lost: l,
            hitLabel: countLabel(l, 'chiefOfStaff.count.hit.one', 'chiefOfStaff.count.hit.many'),
        });
        return t('chiefOfStaff.battle.aggressive.stalemate', {
            total,
            engagementLabel: countLabel(total, 'chiefOfStaff.count.engagement.one', 'chiefOfStaff.count.engagement.many'),
        });
    },
};

const TERRITORY_PHRASES: Record<CoSProfile['tone'], (gained: number, lost: number) => string> = {
    cautious: (g, l) => {
        if (l > 0 && g === 0) return t('chiefOfStaff.territory.cautious.lostOnly', { lost: l, lostS: l > 1 ? 's' : '' });
        if (g > 0 && l === 0) return t('chiefOfStaff.territory.cautious.gainedOnly', { gained: g, gainedS: g > 1 ? 's' : '' });
        if (g > 0 && l > 0) return t('chiefOfStaff.territory.cautious.mixed', { gained: g, lost: l, lostS: l > 1 ? 's' : '' });
        return '';
    },
    precise: (g, l) => {
        if (g === 0 && l === 0) return '';
        return t('chiefOfStaff.territory.precise.summary', { gained: g, lost: l });
    },
    aggressive: (g, l) => {
        if (l > 0 && g === 0) return t('chiefOfStaff.territory.aggressive.lostOnly', {
            lost: l,
            positionLabel: countLabel(l, 'chiefOfStaff.count.position.one', 'chiefOfStaff.count.position.many'),
        });
        if (g > 0 && l === 0) return t('chiefOfStaff.territory.aggressive.gainedOnly', {
            gained: g,
            positionLabel: countLabel(g, 'chiefOfStaff.count.position.one', 'chiefOfStaff.count.position.many'),
        });
        if (g > 0 && l > 0) return t('chiefOfStaff.territory.aggressive.mixed', { gained: g, lost: l });
        return '';
    },
};

// ── Strain paragraph phrases ─────────────────────────────────────────

const STRAIN_PHRASES: Record<CoSProfile['tone'], Record<'strained' | 'compromised', MessageKey>> = {
    cautious: {
        strained: 'chiefOfStaff.strain.cautious.strained',
        compromised: 'chiefOfStaff.strain.cautious.compromised',
    },
    precise: {
        strained: 'chiefOfStaff.strain.precise.strained',
        compromised: 'chiefOfStaff.strain.precise.compromised',
    },
    aggressive: {
        strained: 'chiefOfStaff.strain.aggressive.strained',
        compromised: 'chiefOfStaff.strain.aggressive.compromised',
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
        const corpsName = getPlayerSafeCorpsName(corps.name, corps.id, t('chiefOfStaff.corpsCommandFallback'));
        const phrase = t(STRAIN_PHRASES[tone][label], { corpsName });
        paragraphs.push([text(phrase)]);
    }
    return paragraphs;
}

function briefingCategory(item: BriefingItem): string | undefined {
    return item.briefingCategory ?? item.category;
}

function findCorpsName(state: LoadedGameState, corpsId: string | undefined): string | undefined {
    if (!corpsId) return undefined;
    const formation = state.formations.find(f => f.id === corpsId);
    return formation?.name ? getPlayerSafeCorpsName(formation.name, formation.id, t('chiefOfStaff.corpsCommandFallback')) : undefined;
}

function subjectLabel(item: BriefingItem, state: LoadedGameState, fallback: string): string {
    if (item.subject?.type === 'corps') return findCorpsName(state, item.subject.id) ?? item.subject.label ?? fallback;
    if (item.subject?.label) return item.subject.label;
    if (item.target.label) return item.target.label;
    return fallback;
}

function subjectCorpsId(item: BriefingItem): string | undefined {
    if (item.subject?.type === 'corps') return item.subject.id;
    if (item.subject?.type === 'operation' || item.subject?.type === 'sector') return item.subject.corpsId ?? item.corpsId;
    return item.corpsId ?? item.target.corpsId;
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
    const territoryNet = shouldNarrateTerritorySummary(state.latestTurnSummary)
        ? (state.latestTurnSummary?.territory_net ?? {})
        : {};
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
                ? t('chiefOfStaff.stable.cautious')
                : tone === 'precise'
                    ? t('chiefOfStaff.stable.precise')
                    : t('chiefOfStaff.stable.aggressive')),
        ]);
    } else {
        const segments: Segment[] = [text(pickPhrase(GREETINGS[tone], turn) + ' ')];
        let count = 0;

        const cohesionItem = [...criticals, ...warnings].find(i => briefingCategory(i) === 'cohesion');
        if (cohesionItem && count < 3) {
            const corpsName = subjectLabel(cohesionItem, state, t('chiefOfStaff.corpsCommandFallback'));
            const corpsId = subjectCorpsId(cohesionItem);
            if (tone === 'cautious') {
                segments.push(text(t('chiefOfStaff.alert.cohesion.cautious.prefix')));
                segments.push(corpsId ? link(corpsName, corpsId) : text(corpsName));
                segments.push(text(t('chiefOfStaff.alert.cohesion.cautious.suffix')));
            } else if (tone === 'precise') {
                segments.push(corpsId ? link(corpsName, corpsId) : text(corpsName));
                segments.push(text(t('chiefOfStaff.alert.cohesion.precise.suffix')));
            } else {
                segments.push(corpsId ? link(corpsName, corpsId) : text(corpsName));
                segments.push(text(t('chiefOfStaff.alert.cohesion.aggressive.suffix')));
            }
            count++;
        }

        const opItem = criticals.find(i => briefingCategory(i) === 'operations');
        if (opItem && count < 3) {
            const opName = subjectLabel(opItem, state, opItem.title);
            const corpsId = subjectCorpsId(opItem);
            if (tone === 'cautious') {
                segments.push(text(t('chiefOfStaff.alert.operation.cautious.prefix')));
                segments.push(corpsId ? link(opName, corpsId) : text(opName));
                segments.push(text(t('chiefOfStaff.alert.operation.cautious.suffix')));
            } else if (tone === 'precise') {
                segments.push(text(t('chiefOfStaff.alert.operation.precise.prefix')));
                segments.push(corpsId ? link(opName, corpsId) : text(opName));
                segments.push(text(t('chiefOfStaff.alert.operation.precise.suffix')));
            } else {
                segments.push(corpsId ? link(opName, corpsId) : text(opName));
                segments.push(text(t('chiefOfStaff.alert.operation.aggressive.suffix')));
            }
            count++;
        }

        const thinItem = warnings.find(i => briefingCategory(i) === 'defense');
        if (thinItem && count < 3) {
            const sectorName = subjectLabel(thinItem, state, thinItem.title);
            const corpsId = subjectCorpsId(thinItem);
            if (tone === 'cautious') {
                segments.push(text(t('chiefOfStaff.alert.defense.cautious.prefix')));
                segments.push(corpsId ? link(sectorName, corpsId) : text(sectorName));
                segments.push(text(t('chiefOfStaff.alert.defense.cautious.suffix')));
            } else if (tone === 'precise') {
                segments.push(text(t('chiefOfStaff.alert.defense.precise.prefix')));
                segments.push(corpsId ? link(sectorName, corpsId) : text(sectorName));
                segments.push(text(t('chiefOfStaff.alert.defense.precise.suffix')));
            } else {
                segments.push(corpsId ? link(sectorName, corpsId) : text(sectorName));
                segments.push(text(t('chiefOfStaff.alert.defense.aggressive.suffix')));
            }
            count++;
        }

        const exhaustionItem = warnings.find(i => briefingCategory(i) === 'exhaustion');
        if (exhaustionItem && count < 3) {
            // Wording note (Cluster B): staff interpretation, not prediction.
            // Canonical corps-level readout lives in CommandRelationshipSection;
            // this line stays at army-wide narrative scope and avoids fake certainty.
            segments.push(text(
                tone === 'cautious' ? t('chiefOfStaff.exhaustion.cautious')
                    : tone === 'precise' ? t('chiefOfStaff.exhaustion.precise')
                        : t('chiefOfStaff.exhaustion.aggressive'),
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
        locale: getActiveLocale(),
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
    const profileTitle = profile ? t(profile.titleKey) : '';

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
                {t('chiefOfStaff.header.stamp')}
            </div>

            {/* Header */}
            <div className="px-3 py-1.5 border-b border-neutral-300/60 bg-[#ebe5d8]">
                <div className="text-[8px] uppercase font-bold text-neutral-500 tracking-[0.2em]">{t('chiefOfStaff.header.dailyBriefing')} — {turnToDateString(turn)}</div>
                <div className="text-[11px] font-bold text-neutral-800 mt-0.5">
                    {profile.rank} {profile.name}
                </div>
                <div className="text-[8px] text-neutral-500 italic">{profileTitle}</div>
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
                    — {profile.rank} {profile.name.split(' ').pop()}, {profileTitle}
                </div>
            </div>
        </div>
    );
}
