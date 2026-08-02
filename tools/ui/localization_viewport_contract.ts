export const LOCALIZATION_EVIDENCE_SURFACES = [
    'Desk',
    'Decision Room',
    'Army HQ',
    'Map',
    'Records',
    'Codex',
    'Chronicle',
    'Endgame',
] as const;

export const LOCALIZATION_EVIDENCE_VIEWPORTS = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 3440, height: 1440 },
] as const;

export type LocalizationEvidenceLocale = 'bs' | 'qps';

export interface LocalizationJourneyCase {
    id: string;
    locale: LocalizationEvidenceLocale;
    surface: (typeof LOCALIZATION_EVIDENCE_SURFACES)[number];
    viewport: (typeof LOCALIZATION_EVIDENCE_VIEWPORTS)[number];
}

export function buildLocalizationJourneyCases(locale: LocalizationEvidenceLocale): LocalizationJourneyCase[] {
    const cases: LocalizationJourneyCase[] = [];
    for (const viewport of LOCALIZATION_EVIDENCE_VIEWPORTS) {
        for (const surface of LOCALIZATION_EVIDENCE_SURFACES) {
            const surfaceId = surface.toLowerCase().replace(/\s+/g, '-');
            cases.push({
                id: `${locale}-${viewport.width}x${viewport.height}-${surfaceId}`,
                locale,
                surface,
                viewport,
            });
        }
    }
    return cases;
}
