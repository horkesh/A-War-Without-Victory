import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
    formatHistoricalRole,
    formatRank,
    getRankDisplayName,
    getRankStarCount,
} from '../src/ui/map/utils/officerCharacter.js';

describe('officer appointment and historical-role display truth', () => {
    it('never turns a gameplay appointment class into an invented general rank', () => {
        expect(formatRank('corps_commander')).toBe('Corps appointment');
        expect(getRankDisplayName('corps_commander', 'RBiH')).toBe('Corps appointment');
        expect(getRankStarCount('corps_commander')).toBe(0);
    });

    it('renders the sourced historical office separately', () => {
        expect(formatHistoricalRole('brigade_commander')).toBe('Brigade commander');
        expect(formatHistoricalRole('political_military_authority')).toBe('Political-military authority');
        expect(formatHistoricalRole(undefined)).toBe('Command-pool member');
    });

    it('keeps gameplay appointment classes out of every live officer identity surface', () => {
        const nameOnlySurfaces = [
            'src/ui/map/components/army_hq/PersonnelContent.tsx',
            'src/ui/map/components/army_hq/OperationsSection.tsx',
            'src/ui/map/components/army_hq/OperationOpportunityDossierPanel.tsx',
            'src/ui/map/data/backTheOfficer.ts',
            'src/ui/map/data/historicalOperationAuthorization.ts',
            'src/ui/map/data/opDirectiveObjection.ts',
            'src/ui/map/data/presidentialDecisionRoom.ts',
            'src/ui/map/components/EventDecisionModal.tsx',
        ];
        for (const surface of nameOnlySurfaces) {
            const source = fs.readFileSync(surface, 'utf8');
            expect(source, surface).not.toMatch(/humanizeRank|formatOfficerRank|proposal\.commander\.rank/);
        }

        const sourcedRoleSurfaces = [
            'src/ui/map/components/CommanderSelectionModal.tsx',
            'src/ui/map/components/OOBSidebar.tsx',
            'src/ui/map/components/OperationBriefingModal.tsx',
            'src/ui/map/components/ops_modal/CommanderPhase.tsx',
        ];
        for (const surface of sourcedRoleSurfaces) {
            const source = fs.readFileSync(surface, 'utf8');
            expect(source, surface).toContain('formatHistoricalRole');
            expect(source, surface).not.toContain('formatRank(');
        }

        const persistedRecordSurfaces = [
            'src/ui/map/components/OperationHistoryPanel.tsx',
            'src/ui/map/components/chronicle/generateChronicleEntries.ts',
            'src/scenario/scenario_end_report.ts',
        ];
        for (const surface of persistedRecordSurfaces) {
            const source = fs.readFileSync(surface, 'utf8');
            expect(source, surface).not.toMatch(/commander_rank|officerRank/);
        }
    });

    it('localizes appointment classes as neutral appointments, not military ranks', () => {
        for (const messages of ['src/ui/map/i18n/messages.en.ts', 'src/ui/map/i18n/messages.bcs.ts']) {
            const source = fs.readFileSync(messages, 'utf8');
            expect(source, messages).not.toMatch(/'personnel\.rank\.(?:armyCommander|corpsCommander|general|colonel|major)'\s*:\s*'(?:Army commander|Corps commander|General|Colonel|Major|Komandant armije|Komandant korpusa|Pukovnik)'/);
        }
    });
});
