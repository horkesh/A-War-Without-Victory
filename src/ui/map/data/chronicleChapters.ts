import type { ChronicleEntry } from '../components/chronicle/generateChronicleEntries.js';
import { t, type MessageKey } from '../i18n';
import { turnToDateString } from '../utils/formatters.js';

export type ChronicleBoundaryKind = 'standing_order' | 'doctrine_phase' | 'month';

interface TimelineWindow {
    kind: ChronicleBoundaryKind;
    title: string;
    startTurn: number;
    endTurn: number;
}

export interface ChronicleChapterEntryRef {
    sourceEntryId: string;
    turn: number;
    type: ChronicleEntry['type'];
    headline: boolean;
    title: string;
    aftermathId?: string;
    costLedgerRef?: string;
    codexRef?: string;
}

export interface ChronicleChapter {
    id: string;
    playerFaction: string;
    boundaryKind: ChronicleBoundaryKind;
    title: string;
    summary: string;
    startTurn: number;
    endTurn: number;
    monthLabels: string[];
    entries: ChronicleChapterEntryRef[];
    sourceEntryIds: string[];
    sourceAftermathTurns: number[];
    costLedgerRefs: string[];
    codexRefs: string[];
    signals: {
        atrocity: boolean;
        rupture: boolean;
    };
}

export interface ChronicleCampaignRecap {
    id: string;
    chapterCount: number;
    entryCount: number;
    headlineCount: number;
    monthRange: string;
    dominantType: ChronicleEntry['type'];
    signalChapterCount: number;
    openingChapterTitle: string;
    closingChapterTitle: string;
}

function strictCompare(a: string, b: string): number {
    return a < b ? -1 : a > b ? 1 : 0;
}

function playerFactionFromState(state: any): string | null {
    const faction = state?.player_faction ?? state?.meta?.player_faction;
    return typeof faction === 'string' && faction.length > 0 ? faction : null;
}

function timelineFromState(state: any): any {
    return state?.military?.war_timeline ?? state?.war_timeline ?? null;
}

function turnToMonthLabel(turn: number): string {
    const parts = turnToDateString(turn).split(' ');
    if (parts.length >= 3) return `${parts[1]} ${parts[2]}`;
    return turnToDateString(turn);
}

export function formatChronicleTurnDateRange(startTurn: number, endTurn: number): string {
    const start = turnToDateString(startTurn);
    const end = turnToDateString(endTurn);
    return start === end ? start : `${start} - ${end}`;
}

export function formatChronicleChapterDateRange(chapter: Pick<ChronicleChapter, 'startTurn' | 'endTurn'>): string {
    return formatChronicleTurnDateRange(chapter.startTurn, chapter.endTurn);
}

export function formatChronicleBoundaryKind(kind: ChronicleBoundaryKind): string {
    const labels: Record<ChronicleBoundaryKind, MessageKey> = {
        standing_order: 'chronicle.boundary.standingOrder',
        doctrine_phase: 'chronicle.boundary.doctrinePhase',
        month: 'chronicle.boundary.month',
    };
    return t(labels[kind]);
}

function formatDoctrineStanceLabel(stance: unknown): string {
    const labels: Record<string, MessageKey> = {
        defensive: 'chronicle.doctrine.defensive',
        general_defensive: 'chronicle.doctrine.defensive',
        balanced: 'chronicle.doctrine.balanced',
        offensive: 'chronicle.doctrine.offensive',
        general_offensive: 'chronicle.doctrine.offensive',
        reorganize: 'chronicle.doctrine.reorganize',
        campaign: 'chronicle.doctrine.campaign',
    };
    return t(labels[String(stance ?? 'campaign')] ?? 'chronicle.doctrine.campaign');
}

function stableEntryBaseId(entry: ChronicleEntry): string {
    if (entry.id) return entry.id;
    const raw = [
        entry.turn,
        entry.type,
        entry.title,
        entry.detail,
        entry.metadata?.operationName,
        entry.metadata?.corpsId,
        entry.metadata?.osid,
    ].filter(value => value !== undefined && value !== null).join('|');
    return raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || `turn-${entry.turn}-${entry.type}`;
}

function withStableSourceIds(entries: ChronicleEntry[]): Array<{ entry: ChronicleEntry; sourceEntryId: string }> {
    const provisional = entries.map(entry => ({ entry, baseId: stableEntryBaseId(entry) }));
    provisional.sort((a, b) => {
        if (a.entry.turn !== b.entry.turn) return a.entry.turn - b.entry.turn;
        const byId = strictCompare(a.baseId, b.baseId);
        if (byId !== 0) return byId;
        return strictCompare(`${a.entry.title}|${a.entry.detail}`, `${b.entry.title}|${b.entry.detail}`);
    });

    const seen = new Map<string, number>();
    return provisional.map(({ entry, baseId }) => {
        const count = (seen.get(baseId) ?? 0) + 1;
        seen.set(baseId, count);
        return {
            entry,
            sourceEntryId: count === 1 ? baseId : `${baseId}-${count}`,
        };
    });
}

function standingOrderWindows(timeline: any, playerFaction: string): TimelineWindow[] {
    const orders = timeline?.standing_orders?.[playerFaction];
    if (!Array.isArray(orders) || orders.length === 0) return [];
    return orders
        .filter(order => typeof order?.start_week === 'number' && typeof order?.end_week === 'number')
        .map(order => ({
            kind: 'standing_order' as const,
            title: typeof order.name === 'string' && order.name.trim().length > 0 ? order.name : 'Campaign order',
            startTurn: order.start_week,
            endTurn: order.end_week,
        }))
        .sort((a, b) => a.startTurn - b.startTurn || a.endTurn - b.endTurn || strictCompare(a.title, b.title));
}

function doctrineWindows(timeline: any, playerFaction: string): TimelineWindow[] {
    const phases = timeline?.doctrine_phases?.[playerFaction];
    if (!Array.isArray(phases) || phases.length === 0) return [];
    return phases
        .filter(phase => typeof phase?.start_week === 'number' && typeof phase?.end_week === 'number')
        .map((phase, index) => ({
            kind: 'doctrine_phase' as const,
            title: t('chronicle.doctrine.title', {
                index: index + 1,
                stance: formatDoctrineStanceLabel(phase.default_corps_stance),
            }),
            startTurn: phase.start_week,
            endTurn: phase.end_week,
        }))
        .sort((a, b) => a.startTurn - b.startTurn || a.endTurn - b.endTurn || strictCompare(a.title, b.title));
}

function monthWindows(entries: ChronicleEntry[]): TimelineWindow[] {
    const seen = new Map<string, { label: string; turns: number[] }>();
    for (const entry of entries) {
        const label = turnToMonthLabel(entry.turn);
        const bucket = seen.get(label) ?? { label, turns: [] };
        bucket.turns.push(entry.turn);
        seen.set(label, bucket);
    }
    return Array.from(seen.values())
        .map(bucket => ({
            kind: 'month' as const,
            title: bucket.label,
            startTurn: Math.min(...bucket.turns),
            endTurn: Math.max(...bucket.turns) + 1,
        }))
        .sort((a, b) => a.startTurn - b.startTurn || strictCompare(a.title, b.title));
}

function chooseWindows(entries: ChronicleEntry[], state: any, playerFaction: string): TimelineWindow[] {
    const timeline = timelineFromState(state);
    const campaignWindows = standingOrderWindows(timeline, playerFaction);
    if (campaignWindows.length > 0) return campaignWindows;
    const doctrine = doctrineWindows(timeline, playerFaction);
    if (doctrine.length > 0) return doctrine;
    return monthWindows(entries);
}

function signalFromEntry(entry: ChronicleEntry, signal: 'atrocity' | 'rupture'): boolean {
    if (entry.metadata?.sensitiveSignals?.includes(signal)) return true;
    const text = `${entry.title} ${entry.detail}`.toLowerCase();
    if (signal === 'atrocity') return /\b(atrocity|genocide|catastrophe)\b/.test(text);
    return /\b(rupture|historical rupture)\b/.test(text);
}

function uniqueSorted<T extends string | number>(values: T[]): T[] {
    return Array.from(new Set(values)).sort((a, b) => {
        if (typeof a === 'number' && typeof b === 'number') return a - b;
        return strictCompare(String(a), String(b));
    });
}

function uniqueMonthLabelsByTurn(entries: ChronicleEntry[]): string[] {
    const labels = new Map<string, number>();
    for (const entry of entries) {
        const label = turnToMonthLabel(entry.turn);
        labels.set(label, Math.min(labels.get(label) ?? entry.turn, entry.turn));
    }
    return Array.from(labels.entries())
        .sort((a, b) => a[1] - b[1] || strictCompare(a[0], b[0]))
        .map(([label]) => label);
}

export function chronicleTypeLabel(type: ChronicleEntry['type']): string {
    const labels: Partial<Record<ChronicleEntry['type'], MessageKey>> = {
        combat: 'chronicle.type.combat',
        consequence: 'chronicle.type.consequence',
        cost: 'chronicle.type.cost',
        diplomatic: 'chronicle.type.diplomatic',
        humanitarian: 'chronicle.type.humanitarian',
        military: 'chronicle.type.military',
        narrative: 'chronicle.type.narrative',
        personnel: 'chronicle.type.personnel',
        political: 'chronicle.type.political',
    };
    const key = labels[type];
    return key ? t(key) : String(type).replace(/_/g, ' ');
}

function chapterMonthRange(monthLabels: readonly string[]): string {
    if (monthLabels.length === 0) return t('chronicle.monthRange.empty');
    if (monthLabels.length === 1) return monthLabels[0];
    return t('chronicle.monthRange.many', { start: monthLabels[0], end: monthLabels[monthLabels.length - 1] });
}

function buildChapterSummary(entries: readonly ChronicleEntry[], monthLabels: readonly string[]): string {
    const typeCounts = new Map<ChronicleEntry['type'], number>();
    let headlineCount = 0;
    for (const entry of entries) {
        typeCounts.set(entry.type, (typeCounts.get(entry.type) ?? 0) + 1);
        if (entry.headline) headlineCount += 1;
    }

    const dominantType = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1] || strictCompare(chronicleTypeLabel(a[0]), chronicleTypeLabel(b[0])))[0]?.[0] ?? 'narrative';
    const entryCount = entries.length;
    const entryPhrase = t(entryCount === 1 ? 'chronicle.sourcedEntry.one' : 'chronicle.sourcedEntry.many', { count: entryCount });
    const headlinePhrase = headlineCount === 0
        ? t('chronicle.headlineRecord.none')
        : t(headlineCount === 1 ? 'chronicle.headlineRecord.one' : 'chronicle.headlineRecord.many', { count: headlineCount });
    return t(entryCount === 1 ? 'chronicle.summary.one' : 'chronicle.summary.many', {
        range: chapterMonthRange(monthLabels),
        entries: entryPhrase,
        thread: chronicleTypeLabel(dominantType),
        headlines: headlinePhrase,
    });
}

export function buildChronicleChapters(entries: ChronicleEntry[], state: any): ChronicleChapter[] {
    const playerFaction = playerFactionFromState(state);
    if (!playerFaction || entries.length === 0) return [];

    const sourceEntries = withStableSourceIds(entries);
    const windows = chooseWindows(entries, state, playerFaction);
    const chapters: ChronicleChapter[] = [];

    for (const window of windows) {
        const chapterEntries = sourceEntries.filter(({ entry }) =>
            entry.turn >= window.startTurn && entry.turn < window.endTurn,
        );
        if (chapterEntries.length === 0) continue;

        const startTurn = Math.min(...chapterEntries.map(({ entry }) => entry.turn));
        const endTurn = Math.max(...chapterEntries.map(({ entry }) => entry.turn));
        const sourceEntryIds = chapterEntries.map(({ sourceEntryId }) => sourceEntryId);
        const entriesInChapter = chapterEntries.map(({ entry }) => entry);
        const monthLabels = uniqueMonthLabelsByTurn(entriesInChapter);
        const signals = {
            atrocity: chapterEntries.some(({ entry }) => signalFromEntry(entry, 'atrocity')),
            rupture: chapterEntries.some(({ entry }) => signalFromEntry(entry, 'rupture')),
        };

        chapters.push({
            id: `${playerFaction}-${window.kind}-${window.startTurn}-${window.endTurn}-${sourceEntryIds[0]}`,
            playerFaction,
            boundaryKind: window.kind,
            title: window.title,
            summary: buildChapterSummary(entriesInChapter, monthLabels),
            startTurn,
            endTurn,
            monthLabels,
            entries: chapterEntries.map(({ entry, sourceEntryId }) => ({
                sourceEntryId,
                turn: entry.turn,
                type: entry.type,
                headline: entry.headline,
                title: entry.title,
                aftermathId: entry.metadata?.aftermathId,
                costLedgerRef: entry.metadata?.costLedgerRef,
                codexRef: entry.metadata?.codexRef,
            })),
            sourceEntryIds,
            sourceAftermathTurns: uniqueSorted(chapterEntries.map(({ entry }) => entry.turn)),
            costLedgerRefs: uniqueSorted(chapterEntries
                .map(({ entry }) => entry.metadata?.costLedgerRef)
                .filter((value): value is string => typeof value === 'string' && value.length > 0)),
            codexRefs: uniqueSorted(chapterEntries
                .map(({ entry }) => entry.metadata?.codexRef)
                .filter((value): value is string => typeof value === 'string' && value.length > 0)),
            signals,
        });
    }

    return chapters.sort((a, b) => a.startTurn - b.startTurn || strictCompare(a.id, b.id));
}

export function buildChronicleCampaignRecap(chapters: readonly ChronicleChapter[]): ChronicleCampaignRecap | null {
    if (chapters.length === 0) return null;

    const sorted = [...chapters].sort((a, b) => a.startTurn - b.startTurn || strictCompare(a.id, b.id));
    const typeCounts = new Map<ChronicleEntry['type'], number>();
    let entryCount = 0;
    let headlineCount = 0;
    let signalChapterCount = 0;
    const monthLabels: string[] = [];

    for (const chapter of sorted) {
        if (chapter.signals.atrocity || chapter.signals.rupture) signalChapterCount += 1;
        monthLabels.push(...chapter.monthLabels);
        for (const entry of chapter.entries) {
            entryCount += 1;
            typeCounts.set(entry.type, (typeCounts.get(entry.type) ?? 0) + 1);
            if (entry.headline) headlineCount += 1;
        }
    }

    const dominantType = Array.from(typeCounts.entries())
        .sort((a, b) => b[1] - a[1] || strictCompare(chronicleTypeLabel(a[0]), chronicleTypeLabel(b[0])))[0]?.[0] ?? 'narrative';
    const seenMonths = new Set<string>();
    const uniqueMonths = monthLabels.filter((label) => {
        if (seenMonths.has(label)) return false;
        seenMonths.add(label);
        return true;
    });

    return {
        id: `chronicle-campaign-recap-${sorted[0].startTurn}-${sorted[sorted.length - 1].endTurn}`,
        chapterCount: sorted.length,
        entryCount,
        headlineCount,
        monthRange: chapterMonthRange(uniqueMonths),
        dominantType,
        signalChapterCount,
        openingChapterTitle: sorted[0].title,
        closingChapterTitle: sorted[sorted.length - 1].title,
    };
}
