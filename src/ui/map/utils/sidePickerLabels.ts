import type { StartNewCampaignPayload } from '../desktop/types';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafePoliticalFactionName } from './playerSafeText';

type PlayerFaction = StartNewCampaignPayload['playerFaction'];

const SIDE_PICKER_FACTION_LABEL_KEYS: Record<PlayerFaction, MessageKey> = {
    RBiH: 'sidePicker.faction.RBiH',
    RS: 'sidePicker.faction.RS',
    HRHB: 'sidePicker.faction.HRHB',
};

export function sidePickerFactionLabel(faction: PlayerFaction): string {
    const key = SIDE_PICKER_FACTION_LABEL_KEYS[faction];
    return key ? t(key) : getPlayerSafePoliticalFactionName(faction);
}
