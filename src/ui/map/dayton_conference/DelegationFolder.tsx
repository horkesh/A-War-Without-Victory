import type { DelegationFolder as FolderData } from '../../../state/negotiation_types.js';
import { t } from '../i18n';
import { formatCount, turnToDateString } from '../utils/formatters';

/** The map's faction palette (DaytonSettlementViewer), so the folder and the board agree. */
const FACTION_COLORS: Record<string, string> = { RBiH: '#558463', HRHB: '#547ca7', RS: '#b35e53' };
const FACTIONS = ['RBiH', 'RS', 'HRHB'] as const;
const PLAN_KEYS: Record<string, string> = {
    vance_owen: 'dayton.folder.plan.vanceOwen',
    owen_stoltenberg: 'dayton.folder.plan.owenStoltenberg',
    contact_group: 'dayton.folder.plan.contactGroup',
};
const ENCLAVE_KEYS: Record<string, string> = {
    sarajevo: 'dayton.folder.enclave.sarajevo',
    srebrenica: 'dayton.folder.enclave.srebrenica',
    zepa: 'dayton.folder.enclave.zepa',
    gorazde: 'dayton.folder.enclave.gorazde',
    bihac: 'dayton.folder.enclave.bihac',
    bihac_pocket: 'dayton.folder.enclave.bihac',
    teocak: 'dayton.folder.enclave.teocak',
    kiseljak: 'dayton.folder.enclave.kiseljak',
    lasva_valley: 'dayton.folder.enclave.lasva',
    zepce: 'dayton.folder.enclave.zepce',
};
const CONDEMNATION_KEYS: Record<string, string> = {
    genocide_condemnation: 'dayton.folder.condemnation.genocide',
    authorized_cleansing_condemnation: 'dayton.folder.condemnation.cleansing',
};

const faction = (id: string) => t(`dayton.folder.faction.${id}` as 'dayton.folder.faction.RBiH');
const enclave = (id: string) => (ENCLAVE_KEYS[id] ? t(ENCLAVE_KEYS[id] as 'dayton.folder.enclave.sarajevo') : id);
const list = (items: string[]) => items.join(t('dayton.folder.listSeparator'));

/** Three-party share bar for an offered plan; labels carry the numbers so colour is never the only cue. */
function SplitBar({ split }: { split: FolderData['refused_plans'][number]['proposed_split'] }) {
    const total = FACTIONS.reduce((sum, f) => sum + (split[f] ?? 0), 0) || 1;
    return (
        <div className="dayton-folder-split" role="img"
            aria-label={FACTIONS.map(f => `${faction(f)} ${split[f]}%`).join(', ')}>
            {FACTIONS.map(f => (
                <span key={f} style={{ width: `${(100 * (split[f] ?? 0)) / total}%`, background: FACTION_COLORS[f] }}>
                    {split[f] >= 12 ? `${f} ${split[f]}%` : ''}
                </span>
            ))}
        </div>
    );
}

export function DelegationFolder({ folder }: { folder: FolderData | undefined }) {
    if (!folder) return <p className="dayton-folder-empty">{t('dayton.folder.unavailable')}</p>;
    const { settlements, enclaves, condemnation, patron, refused_plans: plans, war } = folder;
    const patronName = t(`dayton.folder.patron.${folder.faction}` as 'dayton.folder.patron.RS');
    const heldPct = (100 * settlements.held) / Math.max(1, settlements.total);
    const peakPct = (100 * settlements.peak) / Math.max(1, settlements.total);

    return (
        <article className="dayton-folder" aria-label={t('dayton.conference.folder')}>
            <header className="dayton-folder-cover">
                <p className="dayton-folder-stamp">{t('dayton.folder.stamp')}</p>
                <h3>{faction(folder.faction)}</h3>
                <p>{t('dayton.folder.asOf', { date: turnToDateString(folder.turn) })}</p>
            </header>

            <section className="dayton-folder-section" aria-labelledby="dayton-folder-ground">
                <h4 id="dayton-folder-ground">{t('dayton.folder.groundTitle')}</h4>
                <p className="dayton-folder-figure">
                    {t('dayton.folder.held', { held: formatCount(settlements.held), total: formatCount(settlements.total) })}
                </p>
                <div className="dayton-folder-meter" aria-hidden="true">
                    <span className="dayton-folder-meter-fill" style={{ width: `${heldPct}%`, background: FACTION_COLORS[folder.faction] }} />
                    <span className="dayton-folder-meter-peak" style={{ left: `${peakPct}%` }} />
                </div>
                <p>
                    {settlements.peak > settlements.held
                        ? t('dayton.folder.peak', { peak: formatCount(settlements.peak), date: turnToDateString(settlements.peak_turn) })
                        : t('dayton.folder.peakNow')}
                </p>
                {(enclaves.held.length > 0 || enclaves.lost.length > 0) && (
                    <dl className="dayton-folder-pairs">
                        {enclaves.held.length > 0 && <><dt>{t('dayton.folder.enclavesHeld')}</dt><dd>{list(enclaves.held.map(enclave))}</dd></>}
                        {enclaves.lost.length > 0 && <><dt>{t('dayton.folder.enclavesLost')}</dt><dd>{list(enclaves.lost.map(enclave))}</dd></>}
                    </dl>
                )}
            </section>

            <section className="dayton-folder-section" aria-labelledby="dayton-folder-record">
                <h4 id="dayton-folder-record">{t('dayton.folder.recordTitle')}</h4>
                {condemnation.length === 0
                    ? <p>{t('dayton.folder.condemnation.none')}</p>
                    : condemnation.map(flag => (
                        <p key={flag} className="dayton-folder-condemned">
                            {CONDEMNATION_KEYS[flag] ? t(CONDEMNATION_KEYS[flag] as 'dayton.folder.condemnation.genocide') : flag}
                        </p>
                    ))}
            </section>

            <section className="dayton-folder-section" aria-labelledby="dayton-folder-pen">
                <h4 id="dayton-folder-pen">{t('dayton.folder.penTitle')}</h4>
                <div className="dayton-folder-meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={patron.override_authority}
                    aria-label={t('dayton.folder.penMeter', { patron: patronName })}>
                    <span className="dayton-folder-meter-fill dayton-folder-meter-pen" style={{ width: `${patron.override_authority}%` }} />
                    <span className="dayton-folder-meter-peak" style={{ left: `${patron.force_threshold}%` }} />
                </div>
                <p>
                    {t(patron.can_force ? 'dayton.folder.penForces' : 'dayton.folder.penWaits', {
                        patron: patronName, value: patron.override_authority, threshold: patron.force_threshold,
                    })}
                </p>
            </section>

            <section className="dayton-folder-section" aria-labelledby="dayton-folder-plans">
                <h4 id="dayton-folder-plans">{t('dayton.folder.plansTitle')}</h4>
                {plans.length === 0
                    ? <p>{t('dayton.folder.plansNone')}</p>
                    : (
                        <ol className="dayton-folder-plans">
                            {plans.map(plan => {
                                const byYou = plan.refused_by.includes(folder.faction);
                                const others = plan.refused_by.filter(f => f !== folder.faction).map(faction);
                                return (
                                    <li key={plan.plan_id} className={byYou ? 'dayton-folder-plan dayton-folder-plan-yours' : 'dayton-folder-plan'}>
                                        <p className="dayton-folder-plan-name">
                                            <strong>{PLAN_KEYS[plan.plan_id] ? t(PLAN_KEYS[plan.plan_id] as 'dayton.folder.plan.vanceOwen') : plan.plan_id}</strong>
                                            <span>{turnToDateString(plan.turn_offered)}</span>
                                        </p>
                                        <SplitBar split={plan.proposed_split} />
                                        <p>
                                            {byYou && others.length === 0 && t('dayton.folder.refusedByYou')}
                                            {byYou && others.length > 0 && t('dayton.folder.refusedByYouAnd', { others: list(others) })}
                                            {!byYou && t('dayton.folder.refusedBy', { others: list(others) })}
                                        </p>
                                        <p className="dayton-folder-since">
                                            {plan.dead_since
                                                ? t('dayton.folder.since', {
                                                    weeks: formatCount(plan.weeks_since),
                                                    military: formatCount(plan.dead_since.military),
                                                    civilian: formatCount(plan.dead_since.civilian),
                                                    displaced: formatCount(plan.displaced_since),
                                                })
                                                : t('dayton.folder.sinceNoDead', {
                                                    weeks: formatCount(plan.weeks_since),
                                                    displaced: formatCount(plan.displaced_since),
                                                })}
                                        </p>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
            </section>

            <footer className="dayton-folder-total" aria-labelledby="dayton-folder-total">
                <h4 id="dayton-folder-total">{t('dayton.folder.totalTitle')}</h4>
                <dl className="dayton-folder-figures">
                    <div><dt>{t('dayton.folder.totalWeeks')}</dt><dd>{formatCount(war.weeks)}</dd></div>
                    <div><dt>{t('dayton.folder.totalSoldiers')}</dt><dd>{formatCount(war.dead.military)}</dd></div>
                    <div><dt>{t('dayton.folder.totalCivilians')}</dt><dd>{formatCount(war.dead.civilian)}</dd></div>
                    <div><dt>{t('dayton.folder.totalDisplaced')}</dt><dd>{formatCount(war.displaced)}</dd></div>
                </dl>
            </footer>
        </article>
    );
}
