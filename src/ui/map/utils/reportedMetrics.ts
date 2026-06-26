export interface ReportedMetricSummary {
    reportedTotal: number;
    reportedCount: number;
    unreportedCount: number;
    totalCount: number;
}

export interface EquipmentConditionSummary {
    operational: number;
    total: number;
    reportedCount: number;
    unreportedCount: number;
}

export function sumReportedPersonnel(rows: ReadonlyArray<{ personnel?: unknown }>): ReportedMetricSummary {
    return rows.reduce<ReportedMetricSummary>((acc, row) => {
        acc.totalCount += 1;
        if (typeof row.personnel === 'number' && Number.isFinite(row.personnel)) {
            acc.reportedTotal += Math.max(0, row.personnel);
            acc.reportedCount += 1;
        } else {
            acc.unreportedCount += 1;
        }
        return acc;
    }, { reportedTotal: 0, reportedCount: 0, unreportedCount: 0, totalCount: 0 });
}

export function formatReportedPersonnel(
    summary: ReportedMetricSummary,
    labels: { partial: (personnel: string) => string; unreported: string },
): string {
    if (summary.unreportedCount > 0) {
        return summary.reportedTotal > 0 ? labels.partial(summary.reportedTotal.toLocaleString()) : labels.unreported;
    }
    return summary.reportedTotal.toLocaleString();
}

export function formatCompactReportedPersonnel(
    summary: ReportedMetricSummary,
    format: (personnel: number) => string,
    labels: { partial: (personnel: string) => string; unreported: string },
): string {
    if (summary.unreportedCount > 0) {
        return summary.reportedTotal > 0 ? labels.partial(format(summary.reportedTotal)) : labels.unreported;
    }
    return format(summary.reportedTotal);
}

export function addEquipmentCondition(
    summary: EquipmentConditionSummary,
    total: unknown,
    operational: unknown,
): EquipmentConditionSummary {
    const count = typeof total === 'number' && Number.isFinite(total) ? Math.max(0, total) : 0;
    if (count <= 0) return summary;
    summary.total += count;
    if (typeof operational !== 'number' || !Number.isFinite(operational)) {
        summary.unreportedCount += 1;
        return summary;
    }
    summary.reportedCount += 1;
    const operationalCount = operational <= 1 ? count * operational : operational;
    summary.operational += Math.min(count, Math.max(0, Math.round(operationalCount)));
    return summary;
}

export function emptyEquipmentConditionSummary(): EquipmentConditionSummary {
    return { operational: 0, total: 0, reportedCount: 0, unreportedCount: 0 };
}
