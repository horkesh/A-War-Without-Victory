import type { StartNewCampaignPayload } from '../desktop/types';
import { t, type MessageKey } from '../i18n';
import { getPlayerSafePoliticalFactionName } from './playerSafeText';

type PlayerFaction = StartNewCampaignPayload['playerFaction'];

const SIDE_PICKER_FACTION_LABEL_KEYS: Record<PlayerFaction, MessageKey> = {
    RBiH: 'sidePicker.faction.RBiH',
    RS: 'sidePicker.faction.RS',
    HRHB: 'sidePicker.faction.HRHB',
};

/** The faction's one-line character. A choice is a faction, not an army, so this is the sublabel. */
const SIDE_PICKER_FACTION_DESCRIPTOR_KEYS: Record<PlayerFaction, MessageKey> = {
    RBiH: 'mainMenu.dossier.RBiH.descriptor',
    RS: 'mainMenu.dossier.RS.descriptor',
    HRHB: 'mainMenu.dossier.HRHB.descriptor',
};

export function sidePickerFactionDescriptor(faction: PlayerFaction): string {
    return t(SIDE_PICKER_FACTION_DESCRIPTOR_KEYS[faction]);
}

export function sidePickerFactionLabel(faction: PlayerFaction): string {
    const key = SIDE_PICKER_FACTION_LABEL_KEYS[faction];
    return key ? t(key) : getPlayerSafePoliticalFactionName(faction);
}
