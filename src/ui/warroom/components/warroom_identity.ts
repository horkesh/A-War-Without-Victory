import type { FactionId } from '../../../state/game_state.js';

export interface WarroomFactionIdentity {
    ceremonialLine: string;
    commandBriefLabel: string;
    archiveLabel: string;
    tickerLabel: string;
    pressLabel: string;
    photoPlaceholder: string;
}

const DEFAULT_IDENTITY: WarroomFactionIdentity = {
    ceremonialLine: 'Maintain command continuity and preserve operational coherence.',
    commandBriefLabel: 'Command Briefing',
    archiveLabel: 'Record Book',
    tickerLabel: 'LIVE WIRE',
    pressLabel: 'Press Bulletin',
    photoPlaceholder: 'Field dispatch file photo'
};

const IDENTITIES: Record<FactionId, WarroomFactionIdentity> = {
    RBiH: {
        ceremonialLine: 'Hold the state together, preserve the corridor, and keep the field formations supplied.',
        commandBriefLabel: 'General Staff Briefing',
        archiveLabel: 'State Record Book',
        tickerLabel: 'SARAJEVO WIRE',
        pressLabel: 'National Press Brief',
        photoPlaceholder: 'Sarajevo desk file photo'
    },
    RS: {
        ceremonialLine: 'Secure Serb-held ground, protect the corridor, and keep the corps aligned with the Main Staff.',
        commandBriefLabel: 'Main Staff Briefing',
        archiveLabel: 'Command Dossier',
        tickerLabel: 'PALE SIGNAL',
        pressLabel: 'Regional Press Brief',
        photoPlaceholder: 'Front headquarters file photo'
    },
    HRHB: {
        ceremonialLine: 'Preserve local control, coordinate the brigades, and sustain the Herzeg-Bosna command network.',
        commandBriefLabel: 'General Staff Briefing',
        archiveLabel: 'Command Ledger',
        tickerLabel: 'MOSTAR SIGNAL',
        pressLabel: 'Croatian Press Brief',
        photoPlaceholder: 'Mostar staff photo'
    }
};

export function getWarroomFactionIdentity(factionId: FactionId): WarroomFactionIdentity {
    return IDENTITIES[factionId] ?? DEFAULT_IDENTITY;
}
