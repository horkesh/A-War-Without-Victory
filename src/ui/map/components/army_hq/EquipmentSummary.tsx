import type { OwnEquipmentSummary } from '../../../shared/equipmentSummary';
import { t, useLocale } from '../../i18n';
import { formatCount } from '../../utils/formatters';
export function EquipmentSummary({ summary }: { summary: OwnEquipmentSummary | undefined }) {
    useLocale();
    if (!summary) return null;
    const reports = (reported: number) => t('equipmentReport.reports', { reported: formatCount(reported), total: formatCount(summary.brigadeCount) });
    return <section data-testid="equipment-report" aria-label={t('equipmentReport.title')} className="mb-3 xl:col-span-2 min-[2200px]:col-span-3 rounded-lg border border-panel-border bg-panel-card p-3 text-text-primary">
        <h3 className="text-[13px] font-bold uppercase tracking-wide">{t('equipmentReport.title')}</h3>
        <p className="my-2 text-[13px] text-text-secondary">{t('equipmentReport.explanation')}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(['tanks', 'artillery', 'aa_systems'] as const).map(key => {
                const metric = summary.holdings[key];
                return <div key={key} data-testid={`equipment-holdings-${key}`}>
                    <dt className="text-[13px] text-text-secondary">{t(`equipmentReport.${key}`)}</dt>
                    <dd className="font-bold tabular-nums">{metric.total == null ? t('corpsFront.unreported') : metric.reportedCount < summary.brigadeCount ? t('equipmentReport.partial', {count: formatCount(metric.total)}) : formatCount(metric.total)}</dd>
                    <dd className="text-[13px] text-text-secondary">{reports(metric.reportedCount)}</dd>
                </div>;
            })}
        </dl>
    </section>;
}
