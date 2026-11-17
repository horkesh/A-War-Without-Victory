import { t, type MessageKey } from '../i18n';

const WAR_CRIMES_RECORD_KEYS: Readonly<Record<string, MessageKey>> = {
    RBiH: 'eventModal.effect.warCrimesRecord.RBiH',
    RS: 'eventModal.effect.warCrimesRecord.RS',
    HRHB: 'eventModal.effect.warCrimesRecord.HRHB',
};

/**
 * §6 E1 display ruling (2026-11-17; historian + narrative designer, canon, red-team,
 * game designer): a war-crimes entry on an event card shows NO count, because the
 * deltas are game weights and a number would rank atrocities against each other
 * (Ring 3 #7). It names the side's forces (§4, Ring 3 #9). It appears only when
 * `war_crimes_delta > 0`, so there is no false zero. One full string per side
 * keeps the BCS genitive out of interpolation. Every card that carries the effect
 * rests on a final judicial finding (cards without one carry no delta).
 */
export function formatWarCrimesRecordLine(faction: string | undefined, warCrimesDelta: number | undefined): string {
    if (!(typeof warCrimesDelta === 'number' && warCrimesDelta > 0) || !faction) return '';
    const key = WAR_CRIMES_RECORD_KEYS[faction];
    return key ? t(key) : '';
}
