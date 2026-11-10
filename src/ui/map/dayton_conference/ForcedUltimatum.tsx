import type { DelegationFolder } from '../../../state/negotiation_types.js';
import { t, type MessageKey } from '../i18n';
import { formatCount } from '../utils/formatters';
import './signing.css';

/** Banner text for the imposed table, by the power that forced it. */
const FORCED_MESSAGE: Record<string, MessageKey> = {
    united_states: 'dayton.forced.united_states',
    belgrade: 'dayton.forced.belgrade',
    zagreb: 'dayton.forced.zagreb',
};

interface ForcedUltimatumProps {
    by: string;
    /** The forced table's folder carries what declining cost (DC A5); absent on older saves. */
    declined?: DelegationFolder['declined'];
    compact?: boolean;
}

/**
 * The mediator's ultimatum at the table reopened after a decline (DC A5): who forced the
 * delegation back, that there is no decline this time, and what the refusal cost since.
 * The cost is stated as a sequence; it does not claim the refusal caused it.
 */
export function ForcedUltimatum({ by, declined, compact }: ForcedUltimatumProps) {
    return (
        <section className="dayton-ultimatum" data-compact={compact || undefined} aria-labelledby={compact ? undefined : 'dayton-ultimatum-title'}
            data-testid="dayton-ultimatum">
            {!compact && <h3 id="dayton-ultimatum-title">{t('dayton.ultimatum.title')}</h3>}
            <p>{t(FORCED_MESSAGE[by] ?? 'dayton.forced.united_states')}</p>
            <p>{t('dayton.ultimatum.terms')}</p>
            {declined && (
                <div className="dayton-ultimatum-cost">
                    <h4>{t('dayton.ultimatum.costTitle')}</h4>
                    <p>
                        {declined.dead_since
                            ? t('dayton.ultimatum.cost', {
                                weeks: formatCount(declined.weeks_since),
                                military: formatCount(declined.dead_since.military),
                                civilian: formatCount(declined.dead_since.civilian),
                                displaced: formatCount(declined.displaced_since),
                            })
                            : t('dayton.ultimatum.costNoDead', {
                                weeks: formatCount(declined.weeks_since),
                                displaced: formatCount(declined.displaced_since),
                            })}
                    </p>
                    <p>
                        {declined.held_then !== null
                            ? t('dayton.ultimatum.ground', { then: formatCount(declined.held_then), now: formatCount(declined.held_now) })
                            : t('dayton.ultimatum.groundNow', { now: formatCount(declined.held_now) })}
                    </p>
                </div>
            )}
        </section>
    );
}
