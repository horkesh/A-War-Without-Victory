import type { TreatyAgainstDraft } from '../../../state/negotiation_types.js';
import { COMPETENCY_PACKAGES } from '../../../sim/negotiation/competency_packages.js';
import { getConstitutionalChoiceById } from '../../../sim/negotiation/constitutional_packages.js';
import { t } from '../i18n';
import './treaty.css';

/**
 * The treaty against the mediator's draft (owner, 2026-11-08). The grade judges the war;
 * this shows what the table changed. Final review and the Verdict read the same record.
 */
const DIAL_KEYS: Record<string, string> = {
    confederation: 'dayton.dial.confederation',
    'dayton-historical': 'dayton.dial.daytonHistorical',
    federalized: 'dayton.dial.federalized',
    unitary: 'dayton.dial.unitary',
};

function powerText(p: TreatyAgainstDraft['powers_won'][number], value: string): string {
    if (p.kind === 'competency') {
        const label = COMPETENCY_PACKAGES.find(c => c.id === p.id)?.label ?? p.id;
        return `${label}: ${t(`dayton.owner.${value as 'state' | 'entity' | 'shared'}`)}`;
    }
    if (p.kind === 'constitutional') {
        const choice = getConstitutionalChoiceById(p.id);
        return `${choice?.label ?? p.id}: ${choice?.options.find(o => o.id === value)?.label ?? value}`;
    }
    return `${t('dayton.dialTitle')}: ${DIAL_KEYS[value] ? t(DIAL_KEYS[value] as 'dayton.dial.confederation') : value}`;
}

function Row({ label, items }: { label: string; items: string[] }) {
    if (items.length === 0) return null;
    return (
        <div className="dayton-treaty-row">
            <dt>{label}</dt>
            <dd>{items.join(t('dayton.folder.listSeparator'))}</dd>
        </div>
    );
}

export function TreatyLedger({ treaty, signed }: { treaty: TreatyAgainstDraft | undefined; signed: boolean }) {
    if (!treaty) return null;
    const f = treaty.faction;
    const delta = Math.round(((treaty.signed_share[f] ?? 0) - (treaty.draft_share[f] ?? 0)) * 10) / 10;
    const unchanged = treaty.land_won.length + treaty.land_given.length + treaty.land_refused.length
        + treaty.powers_won.length + treaty.powers_refused.length === 0;
    const signedPct = (treaty.signed_share[f] ?? 0).toFixed(1);
    const draftPct = (treaty.draft_share[f] ?? 0).toFixed(1);
    return (
        <section className="dayton-treaty" aria-labelledby="dayton-treaty-title">
            <h3 id="dayton-treaty-title">{t(signed ? 'dayton.treaty.titleSigned' : 'dayton.treaty.titleDraft')}</h3>
            <p className="dayton-treaty-delta" data-direction={delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'}>
                {delta === 0
                    ? t('dayton.treaty.shareSame', { pct: signedPct })
                    : t(delta > 0 ? 'dayton.treaty.shareUp' : 'dayton.treaty.shareDown', { delta: Math.abs(delta).toFixed(1), pct: signedPct, draft: draftPct })}
            </p>
            {unchanged ? (
                <p>{t('dayton.treaty.unchanged')}</p>
            ) : (
                <dl>
                    <Row label={t('dayton.treaty.landWon')} items={treaty.land_won.map(l => l.name)} />
                    <Row label={t('dayton.treaty.landGiven')} items={treaty.land_given.map(l => l.name)} />
                    <Row label={t('dayton.treaty.landRefused')} items={treaty.land_refused.map(l => l.name)} />
                    <Row label={t('dayton.treaty.powersWon')} items={treaty.powers_won.map(p => powerText(p, p.signed))} />
                    <Row label={t('dayton.treaty.powersRefused')} items={treaty.powers_refused.map(p => powerText(p, p.asked))} />
                </dl>
            )}
        </section>
    );
}
