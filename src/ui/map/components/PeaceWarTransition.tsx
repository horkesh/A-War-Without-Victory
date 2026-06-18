/**
 * PeaceWarTransition — overlay shown once when the game transitions from peace to war phase.
 * Shows the date, faction briefings, and OOB summary before the player begins the war.
 */
import { GlassPanel } from './GlassPanel';
import type { LoadedGameState } from '../data/types';
import { Z } from '../../shared/zIndex';
import { turnToDateString } from '../utils/formatters';
import { t, type MessageKey } from '../i18n';

interface PeaceWarTransitionProps {
    onDismiss: () => void;
    state: LoadedGameState;
}

const FACTION_BRIEFINGS: Record<string, { name: string; color: string; briefing: string }> = {
    RBiH: {
        name: 'ARBiH',
        color: '#2563eb',
        briefing:
            'The Army of the Republic of Bosnia and Herzegovina musters from territorial defense units, police, and volunteers. ' +
            'Poorly armed but defending homeland, its early survival depends on holding urban centers and buying time for organization.',
    },
    RS: {
        name: 'VRS',
        color: '#dc2626',
        briefing:
            'The Army of Republika Srpska inherits JNA equipment, officers, and doctrine. ' +
            'Professional and heavily armed, the VRS holds a decisive early advantage but faces long-term attrition as reserves thin.',
    },
    HRHB: {
        name: 'HVO',
        color: '#f59e0b',
        briefing:
            'The Croatian Defence Council organizes around western Herzegovina and central Bosnia enclaves. ' +
            'Capable but geographically fragmented, the HVO walks a tightrope between alliance with ARBiH and its own territorial ambitions.',
    },
};

function formatNumber(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

// Player factions that have an authored "who you are" identity block.
// Other player_faction values (or null) simply omit the block.
const IDENTITY_FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
type IdentityFaction = (typeof IDENTITY_FACTIONS)[number];

function isIdentityFaction(fid: string | null | undefined): fid is IdentityFaction {
    return fid === 'RBiH' || fid === 'RS' || fid === 'HRHB';
}

const IDENTITY_KEYS: Record<IdentityFaction, { identity: MessageKey; situation: MessageKey; escape: MessageKey }> = {
    RBiH: {
        identity: 'intro.identity.RBiH.identity',
        situation: 'intro.identity.RBiH.situation',
        escape: 'intro.identity.RBiH.escape',
    },
    RS: {
        identity: 'intro.identity.RS.identity',
        situation: 'intro.identity.RS.situation',
        escape: 'intro.identity.RS.escape',
    },
    HRHB: {
        identity: 'intro.identity.HRHB.identity',
        situation: 'intro.identity.HRHB.situation',
        escape: 'intro.identity.HRHB.escape',
    },
};

function IdentityBlock({ faction }: { faction: IdentityFaction }) {
    const keys = IDENTITY_KEYS[faction];
    const color = FACTION_BRIEFINGS[faction]?.color ?? '#c4a04a';
    const rows: Array<{ label: string; body: string }> = [
        { label: t('intro.identity.identityLabel'), body: t(keys.identity) },
        { label: t('intro.identity.situationLabel'), body: t(keys.situation) },
        { label: t('intro.identity.escapeLabel'), body: t(keys.escape) },
    ];
    return (
        <div
            className="mb-4 rounded border border-[#c4a04a]/40 bg-[#c4a04a]/5 p-3.5"
            style={{ borderLeft: `3px solid ${color}` }}
        >
            <div className="text-[10px] font-black uppercase tracking-[0.28em] text-[#c4a04a] mb-2.5">
                {t('intro.identity.heading')}
            </div>
            <div className="space-y-2.5">
                {rows.map((row) => (
                    <div key={row.label}>
                        <div className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#8a8578] mb-1">
                            {row.label}
                        </div>
                        <p className="text-[10.5px] leading-relaxed text-[#cfc7b6]">{row.body}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function getPeaceWarTransitionDateLabel(state: Pick<LoadedGameState, 'metadata' | 'turn'>): string {
    const metadataDate = state.metadata?.date?.trim();
    const normalizedMetadataDate = metadataDate?.split('·')[0]?.trim();
    return normalizedMetadataDate && normalizedMetadataDate !== 'UNKNOWN'
        ? normalizedMetadataDate
        : turnToDateString(state.turn ?? 0);
}

export function PeaceWarTransition({ onDismiss, state }: PeaceWarTransitionProps) {
    const date = getPeaceWarTransitionDateLabel(state);

    // OOB summary per faction
    const factionSummary: Record<string, { brigades: number; personnel: number; tanks: number; artillery: number }> = {};
    for (const f of state.formations) {
        if (f.kind !== 'brigade') continue;
        const fid = f.faction;
        if (!factionSummary[fid]) {
            factionSummary[fid] = { brigades: 0, personnel: 0, tanks: 0, artillery: 0 };
        }
        factionSummary[fid].brigades += 1;
        factionSummary[fid].personnel += f.personnel ?? 0;
        factionSummary[fid].tanks += f.composition?.tanks ?? 0;
        factionSummary[fid].artillery += f.composition?.artillery ?? 0;
    }

    const factionOrder = ['RBiH', 'RS', 'HRHB'];

    return (
        <GlassPanel position="overlay" title={t('peace.warBegins')} width="560px" onClose={onDismiss} zIndex={Z.MODAL_HARD}>
            {/* Date */}
            <div className="text-center mb-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a8578] mb-1">{t('peace.date')}</div>
                <div className="text-lg font-bold text-[#e8e0d4] tracking-wide">{date}</div>
                <div className="text-[11px] text-[#8a8578] mt-1">
                    {t('peace.referendumHeld')}
                </div>
            </div>

            {/* "Who you are" identity block — player faction only */}
            {isIdentityFaction(state.player_faction) && <IdentityBlock faction={state.player_faction} />}

            {/* Faction briefings */}
            <div className="space-y-3 mb-4">
                {factionOrder.map((fid) => {
                    const info = FACTION_BRIEFINGS[fid];
                    if (!info) return null;
                    const summary = factionSummary[fid];
                    const isPlayer = fid === state.player_faction;
                    return (
                        <div
                            key={fid}
                            className={`p-3 rounded border ${isPlayer ? 'border-[#c4a04a]/40 bg-[#c4a04a]/5' : 'border-[rgba(180,160,130,0.15)] bg-black/20'}`}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: info.color }} />
                                <span className="text-[11px] font-bold text-[#e8e0d4] uppercase tracking-wide">
                                    {info.name}
                                </span>
                                {isPlayer && (
                                    <span className="text-[8px] bg-[#c4a04a]/20 text-[#c4a04a] px-1.5 py-0.5 rounded border border-[#c4a04a]/30 font-bold uppercase tracking-wider">
                                        {t('peace.you')}
                                    </span>
                                )}
                            </div>
                            <p className="text-[10px] text-[#b0a898] leading-relaxed mb-2">
                                {info.briefing}
                            </p>
                            {summary && (
                                <div className="flex gap-4 text-[9px] font-mono text-[#8a8578]">
                                    <span>{t('peace.brigadeCount', { count: summary.brigades })}</span>
                                    <span>{t('peace.personnelShort', { count: formatNumber(summary.personnel) })}</span>
                                    <span>{t('peace.tankCount', { count: summary.tanks })}</span>
                                    <span>{t('peace.artyCount', { count: summary.artillery })}</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Begin button */}
            <div className="sticky bottom-0 -mx-2.5 flex justify-center border-t border-[rgba(180,160,130,0.15)] bg-panel-bg/95 px-2.5 pt-2 pb-1 backdrop-blur-md">
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label={t('peace.begin')}
                    className="px-8 py-2.5 bg-[#c4a04a]/20 hover:bg-[#c4a04a]/30 text-[#c4a04a] border border-[#c4a04a]/40 rounded font-bold uppercase tracking-[0.2em] text-sm transition-all duration-200 hover:shadow-[0_0_12px_rgba(196,160,74,0.2)]"
                >
                    {t('peace.begin')}
                </button>
            </div>
        </GlassPanel>
    );
}
