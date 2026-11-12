import { POWER_AUTHORITY, bodiesFor, isSplit, type AuthorityOwner, type AuthorityPower, type Bodies } from '../../../sim/negotiation/power_authority.js';
import { t, type MessageKey } from '../i18n';

/**
 * Constitution depth (DC plan, stage 3): the decision path for police, education and
 * defense under the owner the treaty carries. Who makes the rules, runs the service, pays,
 * must agree and rules on a dispute, then the subject's case step by step. Where the
 * Federation (with its cantons) and Republika Srpska differ, both are named, the player's
 * entity first.
 */
const key = (k: string) => k as MessageKey;
const ROLES = ['rules', 'operates', 'pays', 'consents', 'disputes'] as const;

function names(bodies: Bodies, entity: 'federation' | 'rs'): string {
    const list = (ids: readonly string[]) => ids.length
        ? ids.map(id => t(key(`dayton.body.${id}`))).join(t('dayton.folder.listSeparator'))
        : t('dayton.path.nobody');
    if (!isSplit(bodies)) return list(bodiesFor(bodies, entity));
    const order: Array<'federation' | 'rs'> = entity === 'rs' ? ['rs', 'federation'] : ['federation', 'rs'];
    return order.map(e => `${t(key(`dayton.annex.entity.${e}`))}: ${list(bodiesFor(bodies, e))}`).join('; ');
}

interface DecisionPathProps {
    power: AuthorityPower;
    owner: AuthorityOwner;
    entity: 'federation' | 'rs';
    /** What the player's delegation asked for, when the treaty projects something else. */
    asked?: AuthorityOwner;
}

export function DecisionPath({ power, owner, entity, asked }: DecisionPathProps) {
    const profile = POWER_AUTHORITY[power][owner];
    return (
        <>
        {/* Shown outside the collapsed path: the divergence is what the player most needs to see. */}
        {asked && asked !== owner && (
            <p className="dayton-path-asked" role="note" data-dayton-asked={power}>
                {t('dayton.path.asked', { asked: t(key(`dayton.path.to.${asked}`)), owner: t(key(`dayton.path.to.${owner}`)) })}
            </p>
        )}
        <details className="dayton-path" data-dayton-path={power}>
            <summary>{t('dayton.path.summary')}</summary>
            <dl className="dayton-path-roles">
                {ROLES.map(role => (
                    <div key={role}>
                        <dt>{t(key(`dayton.path.role.${role}`))}</dt>
                        <dd>{names(profile[role], entity)}</dd>
                    </div>
                ))}
                <div>
                    <dt>{t('dayton.path.role.effective')}</dt>
                    <dd>
                        {t(profile.effective === 'signing' ? 'dayton.path.effective.signing' : 'dayton.path.effective.authored')}
                        {profile.later && <> {t(key(`dayton.path.later.${profile.later}`))}</>}
                    </dd>
                </div>
            </dl>
            <h4>{t(key(`dayton.path.case.${power}`))}</h4>
            <ol className="dayton-path-case">
                {profile.case.map((step, i) => (
                    <li key={i}>
                        <span>{t(key(`dayton.path.act.${step.act}`))}</span> <strong>{names(step.who, entity)}</strong>
                    </li>
                ))}
            </ol>
            {profile.effective === 'signing' && <p className="dayton-path-source">{profile.citation}</p>}
        </details>
        </>
    );
}
