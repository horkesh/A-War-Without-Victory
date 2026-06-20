import { t, type MessageKey } from '../i18n/index.js';

type MunicipalitySupportType = 'weapons_shipment' | 'staff_priority' | 'croatian_support_package';

const MUNICIPALITY_SUPPORT_LABEL_KEYS: Record<MunicipalitySupportType, MessageKey> = {
    weapons_shipment: 'municipalitySupport.label.weaponsShipment',
    staff_priority: 'municipalitySupport.label.staffPriority',
    croatian_support_package: 'municipalitySupport.label.croatianSupportPackage',
};

export function getLocalizedMunicipalitySupportLabel(type: string | null | undefined): string {
    if (type === 'weapons_shipment' || type === 'staff_priority' || type === 'croatian_support_package') {
        return t(MUNICIPALITY_SUPPORT_LABEL_KEYS[type]);
    }
    return t('municipalitySupport.label.localSupport');
}

export function getMunicipalitySupportTypeForFaction(faction: string | null | undefined): MunicipalitySupportType | null {
    if (faction === 'RBiH') return 'weapons_shipment';
    if (faction === 'RS') return 'staff_priority';
    if (faction === 'HRHB') return 'croatian_support_package';
    return null;
}
