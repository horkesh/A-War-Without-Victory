/**
 * Personnel tab content - ORBAT overview, officer roster, reserves.
 * Recruitment modal remains separate (requires IPC callbacks from App.tsx).
 */
import { useMemo } from 'react';
import { useGameStore } from '../../store/gameStore';
import { formatPersonnel } from '../../utils/formatters';
import { getRatingColor } from '../../utils/officerCharacter';
import { t, useLocale } from '../../i18n';
import { getLocalizedFormationName } from '../../data/formationNameLocalizations';

export function PersonnelContent() {
    const [locale] = useLocale();
    const state = useGameStore((s) => s.loadedGameState);
    const faction = useGameStore((s) => s.selectedArmyId);

    const data = useMemo(() => {
        if (!state || !faction) return null;

        const formations = state.formations.filter(f => f.faction === faction);
        const brigades = formations.filter(f => f.kind === 'brigade' && f.status === 'active');
        const corpsFormations = formations.filter(f => f.kind === 'corps' || f.kind === 'corps_asset');
        const corpsNameById = new Map(corpsFormations.map((corps) => [corps.id, corps.name]));
        const totalPersonnel = brigades.reduce((s, f) => s + (f.personnel ?? 0), 0);
        const officers = (state.namedOfficerData ?? []).filter(o => o.faction === faction);
        const activeOfficers = officers.filter(o => o.status === 'active');
        const reserveOfficers = officers.filter(o => o.status === 'reserve');
        const reserves = state.factionReserves?.[faction];
        const mobilization = state.mobilizationSummary?.[faction];

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
            corpsNameById,
            totalPersonnel,
            activeOfficers,
            reserveOfficers,
            reserves,
            mobilization,
            brigadesByCorps,
        };
    }, [state, faction]);

    if (!data) return <div className="text-text-secondary italic text-[12px] py-8 text-center">{t('personnel.noGameState')}</div>;

    return (
        <div className="space-y-4">
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
                        MOBILIZATION
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                        <StatCard label="Available Pool" value={formatWholeNumber(data.mobilization.total_available)} />
                        <StatCard label="Committed" value={formatWholeNumber(data.mobilization.total_committed)} />
                        <StatCard label="Exhausted" value={formatWholeNumber(data.mobilization.total_exhausted)} />
                        <StatCard label="Strategic Reserve" value={formatWholeNumber(data.mobilization.strategic_reserve)} />
                        <StatCard label="Exhaustion" value={`${data.mobilization.exhaustion_pct.toFixed(1)}%`} />
                    </div>
                    {data.mobilization.top_pools.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-panel-border/50">
                            <div className="text-[9px] uppercase tracking-wider text-text-secondary/60 mb-1">Largest Available Pools</div>
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
                    {data.corpsFormations.map(corps => {
                        const corpsBrigades = data.brigadesByCorps.get(corps.id) ?? [];
                        const corpsPers = corpsBrigades.reduce((s, b) => s + (b.personnel ?? 0), 0);
                        return (
                            <div key={corps.id} className="border border-panel-border/50 rounded-md overflow-hidden">
                                <div className="flex items-center justify-between px-3 py-2 bg-panel-bg">
                                    <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">{corps.name}</span>
                                    <span className="text-[10px] text-text-secondary tabular-nums">{t('personnel.brigadeSummary', { count: corpsBrigades.length, personnel: formatPersonnel(corpsPers) })}</span>
                                </div>
                                <div className="px-3 py-1.5 grid grid-cols-2 gap-x-4 gap-y-0.5">
                                    {corpsBrigades.map(b => (
                                        <div key={b.id} className="flex items-center justify-between text-[10px] py-0.5">
                                            <span className="text-text-secondary truncate mr-2">{getLocalizedFormationName(b, locale)}</span>
                                            <span className="text-text-primary tabular-nums shrink-0">{formatPersonnel(b.personnel ?? 0)}</span>
                                        </div>
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
                <div className="grid grid-cols-2 gap-2">
                    {data.activeOfficers.map(o => (
                        <div key={o.id} className="flex items-start justify-between gap-3 px-2.5 py-1.5 border border-panel-border/50 rounded-md bg-panel-bg text-[10px]">
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-text-primary truncate">{o.name}</div>
                                <div className="text-text-secondary/60 text-[9px] uppercase">
                                    {o.rank?.replace(/_/g, ' ')}
                                    {o.assigned_corps_id ? ` - ${data.corpsNameById.get(o.assigned_corps_id) ?? t('personnel.attachedCommand')}` : ''}
                                </div>
                                {(o.command_style || o.known_for) && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {o.command_style && (
                                            <OfficerTraitPill label="Doctrinal trait" value={o.command_style} tone="doctrine" />
                                        )}
                                        {o.known_for && (
                                            <OfficerTraitPill label="Narrative trait" value={o.known_for} tone="narrative" />
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 tabular-nums font-mono">
                                <span style={{ color: getRatingColor(o.competence) }}>C:{o.competence.toFixed(1)}</span>
                                <span style={{ color: getRatingColor(o.aggressiveness) }}>A:{o.aggressiveness.toFixed(1)}</span>
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
