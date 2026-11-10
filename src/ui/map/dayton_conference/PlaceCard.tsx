import { t, type MessageKey } from '../i18n';
import type { PlaceBody, PlaceCard as PlaceCardData } from './place_authority';

/**
 * Inspection by place (DC plan stage 3): the card for one place on the Boundary Map. Who held
 * it, which entity and canton it falls to on the line shown, any pending status, and who sets
 * the rules for police, education and defense there and who runs them.
 */
const key = (k: string) => k as MessageKey;

function holder(faction: string | null): string {
    return faction === 'RBiH' || faction === 'HRHB' || faction === 'RS'
        ? t(key(`dayton.boundary.party.${faction}`))
        : t('dayton.boundary.party.none');
}

function bodyName(body: PlaceBody): string {
    switch (body.kind) {
        case 'canton': return body.canton ? t(key(`dayton.place.canton.${body.canton}`)) : t('dayton.place.cantonBody');
        case 'entity': return t(key(`dayton.place.${body.role}.${body.entity}`));
        default: return t(key(`dayton.body.${body.id}`));
    }
}

const list = (bodies: PlaceBody[]) => bodies.length
    ? bodies.map(bodyName).join(t('dayton.folder.listSeparator'))
    : t('dayton.path.nobody');

interface PlaceCardProps {
    card: PlaceCardData;
    name: string;
    titleId: string;
    onTreatyLine: boolean;
    hasTerms: boolean;
    onClose: () => void;
}

export function PlaceCard({ card, name, titleId, onTreatyLine, hasTerms, onClose }: PlaceCardProps) {
    return (
        <section className="dayton-place" aria-labelledby={titleId} data-dayton-place={card.osid}>
            <header>
                <h4 id={titleId}>{name}</h4>
                <button type="button" className="dayton-live-button" onClick={onClose}>{t('dayton.place.close')}</button>
            </header>
            <dl className="dayton-place-facts">
                <div><dt>{t('dayton.place.heldBy')}</dt><dd>{holder(card.heldBy)}</dd></div>
                {onTreatyLine && (
                    <div>
                        <dt>{t('dayton.place.entity')}</dt>
                        <dd data-dayton-place-entity={card.entity ?? 'none'}>
                            {card.entity ? t(key(`dayton.place.entity.${card.entity}`)) : t('dayton.boundary.party.none')}
                        </dd>
                    </div>
                )}
                {card.entity === 'federation' && (
                    <div>
                        <dt>{t('dayton.place.cantonLabel')}</dt>
                        <dd data-dayton-place-canton={card.canton ?? 'open'}>
                            {card.canton ? t(key(`dayton.place.canton.${card.canton}`)) : t('dayton.place.cantonOpenShort')}
                        </dd>
                    </div>
                )}
            </dl>
            {card.pending.map(p => (
                <p key={p} className="dayton-place-pending" role="note" data-dayton-pending={p}>
                    <strong>{t('dayton.place.pending')}</strong> {t(key(`dayton.place.pending.${p}`))}
                </p>
            ))}
            {card.powers.length > 0 ? (
                <dl className="dayton-place-powers">
                    {card.powers.map(p => (
                        <div key={p.power} data-dayton-place-power={p.power}>
                            <dt>{t(key(`dayton.power.${p.power}`))} <span>· {t(`dayton.owner.${p.owner}`)}</span></dt>
                            <dd>{t('dayton.place.rules')} {list(p.rules)}</dd>
                            <dd>{t('dayton.place.operates')} {list(p.operates)}</dd>
                        </div>
                    ))}
                </dl>
            ) : card.entity !== 'brcko' && (
                <p className="dayton-place-hint">
                    {t(!onTreatyLine ? 'dayton.place.hintFront' : hasTerms ? 'dayton.place.hintNone' : 'dayton.place.hintPreview')}
                </p>
            )}
        </section>
    );
}
