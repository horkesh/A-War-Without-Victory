import type { DaytonAgreementRecord } from '../../../state/negotiation_types.js';
import { t } from '../i18n';
import { treatyAnnexes } from './annexes';
import './annexes.css';

interface TreatyAnnexesProps {
    agreement: DaytonAgreementRecord;
    faction: string | null | undefined;
    signed?: boolean;
    /** Opens the Boundary Map from Annex 2. */
    onOpenMap?: () => void;
}

/** The binder read as the treaty's annexes (DC A4): each clause with what it means for you. */
export function TreatyAnnexes({ agreement, faction, signed = false, onOpenMap }: TreatyAnnexesProps) {
    const annexes = treatyAnnexes(agreement, faction, signed);
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
