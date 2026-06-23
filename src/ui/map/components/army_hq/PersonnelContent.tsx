/**
 * Personnel tab content - ORBAT overview, officer roster, reserves.
 * Recruitment modal remains separate (requires IPC callbacks from App.tsx).
 */
import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatPersonnel } from '../../utils/formatters';
import { getRatingColor } from '../../utils/officerCharacter';
import { t, useLocale, type MessageKey } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';
import { resolveCorpsCommanderDisplay } from '../../utils/officerUtils';
import { inspectOnField } from '../../utils/shellNavigation';
import { FrontVisitSection } from './FrontVisitSection';
import { isFieldedTacticalFormation } from '../../../shared/playerVisibility';

function OfficerQualityChip({ label, value }: { label: string; value: number }) {
    const reported = Number.isFinite(value);
    const displayValue = reported ? value.toFixed(1) : t('corpsFront.unreported');
    return (
        <span
            className="inline-flex items-center gap-1 rounded border border-panel-border/50 bg-black/20 px-1.5 py-0.5"
            title={`${label}: ${displayValue}`}
        >
            <span className="text-[8px] uppercase tracking-[0.12em] text-text-secondary">{label}</span>
            <span className="font-mono text-[10px] font-bold tabular-nums" style={{ color: getRatingColor(value) }}>
                {displayValue}
            </span>
        </span>
    );
}

export function PersonnelContent() {
    const [locale] = useLocale();
    const state = useGameStore((s) => s.loadedGameState);
    const faction = useGameStore((s) => s.selectedArmyId);

    const data = useMemo(() => {
        if (!state || !faction) return null;

        const formations = state.formations.filter(f => f.faction === faction);
        const brigades = formations.filter(f => isFieldedTacticalFormation(f));
        const corpsFormations = formations.filter(f => f.kind === 'corps' || f.kind === 'corps_asset');
        const commandFormations = formations.filter(f => f.kind === 'corps' || f.kind === 'corps_asset' || f.kind === 'army_hq');
        const commandNameById = new Map(commandFormations.map((command) => [command.id, getLocalizedFormationName(command, locale)]));
        const totalPersonnel = brigades.reduce((s, f) => s + (f.personnel ?? 0), 0);
        const officers = (state.namedOfficerData ?? []).filter(o => o.faction === faction);
        const activeOfficers = officers.filter(o => o.status === 'active');
        const reserveOfficers = officers.filter(o => o.status === 'reserve');
        const reserves = state.factionReserves?.[faction];
        const mobilization = state.mobilizationSummary?.[faction];
        const commanderVacancies = corpsFormations
            .filter((corps) => !resolveCorpsCommanderDisplay(corps.id, corps.faction, state))
            .sort((a, b) => strictCompare(a.id, b.id));
        const lowReliabilityCommanders = activeOfficers
            .filter((officer) => officer.assigned_corps_id && typeof officer.political_reliability === 'number' && officer.political_reliability <= 2)
            .sort((a, b) => strictCompare(a.assigned_corps_id ?? '', b.assigned_corps_id ?? '') || strictCompare(a.id, b.id));

        const brigadesByCorps = new Map<string, typeof brigades>();
        for (const b of brigades) {
            const cid = b.corps_id ?? 'unassigned';
            const list = brigadesByCorps.get(cid) || [];
            list.push(b);
            brigadesByCorps.set(cid, list);
        }

        return {
            brigades,
            corpsFormations,
            commandFormations,
            commandNameById,
            totalPersonnel,
            activeOfficers,
            reserveOfficers,
            reserves,
            mobilization,
            commanderVacancies,
            lowReliabilityCommanders,
            brigadesByCorps,
        };
    }, [state, faction, locale]);

    if (!data) return <div className="text-text-secondary italic text-[12px] py-8 text-center">{t('personnel.noGameState')}</div>;

    return (
        <div className="space-y-4">
            {/* Presidential FRONT VISIT — leadership/morale action (Command Surface §10).
                Self-gates to desktop (IPC) and to availability; renders null otherwise. */}
            <FrontVisitSection />

            <div className="bg-panel-card border border-panel-border rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                    {t('personnel.commandDossier')}
                </div>
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <DossierCard
                        label={t('personnel.dossier.vacancies')}
                        value={String(data.commanderVacancies.length)}
                        detail={data.commanderVacancies.length > 0
                            ? t('personnel.dossier.vacanciesDetail', { commands: data.commanderVacancies.map((corps) => getLocalizedFormationName(corps, locale)).join(', ') })
                            : t('personnel.dossier.vacanciesClear')}
                        tone={data.commanderVacancies.length > 0 ? 'warning' : 'steady'}
                    />
                    <DossierCard
                        label={t('personnel.dossier.lowLoyalty')}
                        value={String(data.lowReliabilityCommanders.length)}
                        detail={data.lowReliabilityCommanders.length > 0
                            ? t('personnel.dossier.lowLoyaltyDetail', { officers: data.lowReliabilityCommanders.map((officer) => officer.name).join(', ') })
                            : t('personnel.dossier.lowLoyaltyClear')}
                        tone={data.lowReliabilityCommanders.length > 0 ? 'warning' : 'steady'}
                    />
                    <DossierCard
                        label={t('personnel.dossier.reserveOfficers')}
                        value={String(data.reserveOfficers.length)}
                        detail={data.reserveOfficers.length > 0
                            ? t('personnel.dossier.reserveOfficersDetail', { officers: data.reserveOfficers.map((officer) => officer.name).join(', ') })
                            : t('personnel.dossier.reserveOfficersEmpty')}
                    />
                    <DossierCard
                        label={t('personnel.dossier.mobilizationStrain')}
                        value={data.mobilization ? `${data.mobilization.exhaustion_pct.toFixed(1)}%` : '-'}
                        detail={data.mobilization
                            ? t('personnel.dossier.mobilizationStrainDetail', { exhausted: formatWholeNumber(data.mobilization.total_exhausted) })
                            : t('personnel.dossier.mobilizationStrainUnknown')}
                        tone={data.mobilization && data.mobilization.exhaustion_pct >= 30 ? 'warning' : 'neutral'}
                    />
                </div>
            </div>

            <div className="bg-panel-card border border-panel-border rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                    {t('personnel.forceOverview')}
                </div>
                <div className="grid grid-cols-4 gap-3">
                    <StatCard label={t('personnel.totalPersonnel')} value={data.totalPersonnel.toLocaleString()} />
                    <StatCard label={t('personnel.activeBrigades')} value={String(data.brigades.length)} />
                    <StatCard label={t('personnel.corps')} value={String(data.corpsFormations.length)} />
                    <StatCard label={t('personnel.supplyReserve')} value={data.reserves ? Math.round(data.reserves.generalSupply ?? 0).toString() : '-'} />
                </div>
            </div>

            {data.mobilization && (
                <div className="bg-panel-card border border-panel-border rounded-lg p-3">
                    <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                        {t('personnel.mobilization')}
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        <StatCard label={t('personnel.mobilization.availablePool')} value={formatWholeNumber(data.mobilization.total_available)} />
                        <StatCard label={t('personnel.mobilization.committed')} value={formatWholeNumber(data.mobilization.total_committed)} />
                        <StatCard label={t('personnel.mobilization.exhausted')} value={formatWholeNumber(data.mobilization.total_exhausted)} />
                        <StatCard label={t('personnel.mobilization.strategicReserve')} value={formatWholeNumber(data.mobilization.strategic_reserve)} />
                        <StatCard label={t('personnel.mobilization.exhaustion')} value={`${data.mobilization.exhaustion_pct.toFixed(1)}%`} />
                    </div>
                    {data.mobilization.top_pools.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-panel-border/50">
                            <div className="text-[9px] uppercase tracking-wider text-text-secondary/60 mb-1">{t('personnel.largestAvailablePools')}</div>
                            <div className="grid grid-cols-2 gap-1.5">
                                {data.mobilization.top_pools.map((pool) => (
                                    <div key={pool.mun_id} className="flex items-center justify-between gap-3 text-[10px] px-2 py-1 rounded-sm bg-panel-bg border border-panel-border/40">
                                        <span className="text-text-secondary truncate">{formatPoolName(pool.mun_id)}</span>
                                        <span className="text-text-primary tabular-nums font-mono shrink-0">{formatWholeNumber(pool.available)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-panel-card border border-panel-border rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                    {t('personnel.orderOfBattle')}
                </div>
                <div className="space-y-2">
                    {data.commandFormations.map(command => {
                        const commandBrigades = data.brigadesByCorps.get(command.id) ?? [];
                        const commandPers = commandBrigades.reduce((s, b) => s + (b.personnel ?? 0), 0);
                        const commandName = data.commandNameById.get(command.id) ?? getLocalizedFormationName(command, locale);
                        return (
                            <div key={command.id} className="border border-panel-border/50 rounded-md overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-panel-bg">
                                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{commandName}</span>
                                    <span className="text-[10px] text-text-secondary tabular-nums">{t('personnel.brigadeSummary', { count: commandBrigades.length, personnel: formatPersonnel(commandPers) })}</span>
                                </div>
                                <div className="px-3 py-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                                    {commandBrigades.map(b => (
                                        <button
                                            key={b.id}
                                            type="button"
                                            data-testid="personnel-orbat-brigade-link"
                                            data-command-id={command.id}
                                            data-command-kind={command.kind}
                                            data-formation-id={b.id}
                                            className="flex w-full items-center justify-between text-[10px] py-0.5 text-left hover:text-amber-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400/70"
                                            onClick={() => {
                                                inspectOnField(useGameStore.getState(), command.kind === 'army_hq'
                                                    ? { kind: 'field-formation-in-army-reserve', formationId: b.id, armyHqId: command.id, osid: b.location_osid ?? null }
                                                    : { kind: 'field-formation-in-corps', formationId: b.id, corpsId: command.id, osid: b.location_osid ?? null });
                                            }}
                                        >
                                            <span className="text-text-secondary truncate mr-2">{getLocalizedFormationName(b, locale)}</span>
                                            <span className="text-text-primary tabular-nums shrink-0">{formatPersonnel(b.personnel ?? 0)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="bg-panel-card border border-panel-border rounded-lg p-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-text-secondary font-bold mb-2 pb-1 border-b border-panel-border">
                    {t('personnel.officerRoster', { active: data.activeOfficers.length, reserve: data.reserveOfficers.length })}
                </div>
                <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
                    {data.activeOfficers.map(o => (
                        <div key={o.id} className="border border-panel-border/50 rounded-md bg-panel-bg px-2.5 py-2 text-[10px]">
                            <div className="min-w-0">
                                <div className="font-bold text-text-primary truncate">{o.name}</div>
                                <div className="text-text-secondary/60 text-[9px] uppercase">
                                    {formatOfficerRank(o.rank)}
                                    {o.assigned_corps_id ? ` - ${data.commandNameById.get(o.assigned_corps_id) ?? t('personnel.attachedCommand')}` : ''}
                                </div>
                                {(o.command_style || o.known_for) && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {o.command_style && (
                                            <OfficerTraitPill label={t('personnel.trait.doctrinal')} value={o.command_style} tone="doctrine" />
                                        )}
                                        {o.known_for && (
                                            <OfficerTraitPill label={t('personnel.trait.narrative')} value={o.known_for} tone="narrative" />
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <OfficerQualityChip label={t('commander.quality.command')} value={o.competence} />
                                <OfficerQualityChip label={t('commander.quality.initiative')} value={o.aggressiveness} />
                                {typeof o.defensive_skill === 'number' && (
                                    <OfficerQualityChip label={t('commander.quality.defense')} value={o.defensive_skill} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                {data.reserveOfficers.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-panel-border/50">
                        <div className="text-[9px] uppercase tracking-wider text-text-secondary/60 mb-1">{t('personnel.reservePool')}</div>
                        <div className="flex flex-wrap gap-1.5">
                            {data.reserveOfficers.map(o => (
                                <span key={o.id} className="text-[9px] px-2 py-0.5 border border-panel-border/40 rounded text-text-secondary bg-panel-bg">
                                    {o.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function formatPoolName(munId: string): string {
    return munId
        .split(/[_-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatWholeNumber(value: number): string {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

const OFFICER_RANK_LABEL_KEYS: Record<string, MessageKey> = {
    army_commander: 'personnel.rank.armyCommander',
    corps_commander: 'personnel.rank.corpsCommander',
    brigadier_general: 'personnel.rank.brigadierGeneral',
    tactical_commander: 'personnel.rank.tacticalCommander',
    general: 'personnel.rank.general',
    colonel: 'personnel.rank.colonel',
    major: 'personnel.rank.major',
    deputy: 'personnel.rank.deputy',
};

function formatOfficerRank(rank: string | undefined): string {
    if (!rank) return t('personnel.rank.unspecified');
    return t(OFFICER_RANK_LABEL_KEYS[rank] ?? 'personnel.rank.unspecified');
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function DossierCard({
    label,
    value,
    detail,
    tone = 'neutral',
}: {
    label: string;
    value: string;
    detail: string;
    tone?: 'neutral' | 'steady' | 'warning';
}) {
    const valueClass = tone === 'warning'
        ? 'text-amber-300'
        : tone === 'steady'
            ? 'text-emerald-300'
            : 'text-text-primary';
    return (
        <div className="min-w-0 rounded border border-panel-border/55 bg-panel-bg/65 px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.13em] text-text-secondary">{label}</div>
            <div className={`mt-1 text-[17px] font-bold tabular-nums ${valueClass}`}>{value}</div>
            <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-text-secondary">{detail}</div>
        </div>
    );
}

function OfficerTraitPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: 'doctrine' | 'narrative';
}) {
    const toneClass = tone === 'doctrine'
        ? 'border-cyan-500/35 bg-cyan-500/10 text-cyan-100'
        : 'border-amber-500/35 bg-amber-500/10 text-amber-100';

    return (
        <span className={`inline-flex max-w-full items-center gap-1 rounded-sm border px-1.5 py-0.5 ${toneClass}`}>
            <span className="shrink-0 text-[7px] font-bold uppercase tracking-[0.12em] opacity-75">{label}</span>
            <span className="min-w-0 truncate text-[8px] text-text-primary">{value}</span>
        </span>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-center">
            <div className="text-[15px] font-bold text-text-primary tabular-nums leading-tight">{value}</div>
            <div className="text-[9px] text-text-secondary uppercase tracking-wider">{label}</div>
        </div>
    );
}
