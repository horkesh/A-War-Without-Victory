import type { DaytonAgreementRecord } from '../../../state/negotiation_types.js';
import { isAuthorityPower } from '../../../sim/negotiation/power_authority.js';
import { t } from '../i18n';
import { entityOf, treatyAnnexes, type Owner } from './annexes';
import { DecisionPath } from './DecisionPath';
import './annexes.css';

interface TreatyAnnexesProps {
    agreement: DaytonAgreementRecord;
    faction: string | null | undefined;
    signed?: boolean;
    /** Opens the Boundary Map from Annex 2. */
    onOpenMap?: () => void;
    /** What the delegation asked for per competency (the draft), shown where the treaty differs (stage 3). */
    asked?: Readonly<Record<string, string>>;
}

/** The binder read as the treaty's annexes (DC A4): each clause with what it means for you. */
export function TreatyAnnexes({ agreement, faction, signed = false, onOpenMap, asked }: TreatyAnnexesProps) {
    const annexes = treatyAnnexes(agreement, faction, signed);
    const entity = entityOf(faction);
    return (
        <div className="dayton-annexes" data-testid="dayton-annexes">
            <p className="dayton-annexes-intro">{t(signed ? 'dayton.annex.introSigned' : 'dayton.annex.intro')}</p>
            {annexes.map(annex => (
                <section key={annex.id} className="dayton-annex" data-dayton-annex={annex.id} aria-labelledby={`dayton-annex-${annex.id}`}>
                    <h3 id={`dayton-annex-${annex.id}`}>{annex.title}</h3>
                    <dl>
                        {annex.clauses.map(clause => (
                            <div key={clause.id} className="dayton-annex-clause" data-dayton-term={clause.id}>
                                <dt>{clause.label}</dt>
                                <dd className="dayton-annex-value">{clause.value}</dd>
                                <dd className="dayton-annex-means">
                                    <span>{t('dayton.annex.meansLabel')}</span> {clause.means}
                                </dd>
                                {/* Stage 3: the first three subjects are deep. */}
                                {clause.owner && isAuthorityPower(clause.id) && (
                                    <dd className="dayton-annex-path">
                                        <DecisionPath power={clause.id} owner={clause.owner} entity={entity}
                                            asked={asked?.[clause.id] as Owner | undefined} />
                                    </dd>
                                )}
                            </div>
                        ))}
                    </dl>
                    {annex.id === '2' && onOpenMap && (
                        <button type="button" className="dayton-clause-link" onClick={onOpenMap}>{t('dayton.annex.openMap')}</button>
                    )}
                </section>
            ))}
        </div>
    );
}
