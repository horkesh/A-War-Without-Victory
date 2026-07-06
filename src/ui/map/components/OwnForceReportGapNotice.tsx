import { t } from '../i18n';

interface OwnForceReportGapNoticeProps {
  fields: Array<string | null | undefined>;
  className?: string;
}

function uniqueReportGapFields(fields: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const field of fields) {
    const normalized = field?.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

export function OwnForceReportGapNotice({ fields, className = '' }: OwnForceReportGapNoticeProps) {
  const uniqueFields = uniqueReportGapFields(fields);
  if (uniqueFields.length === 0) return null;

  const visibleFields = uniqueFields.slice(0, 3);
  const remainingCount = uniqueFields.length - visibleFields.length;
  const visibleList = [
    ...visibleFields,
    ...(remainingCount > 0 ? [t('reportGap.andMore', { count: remainingCount })] : []),
  ].join(t('reportGap.fieldSeparator'));

  return (
    <div
      data-awwv-report-gap={uniqueFields.join('|')}
      className={`rounded border border-panel-border/70 bg-panel-bg/60 px-2 py-1 text-[10px] text-text-secondary ${className}`}
    >
      {t('reportGap.notice', { fields: visibleList })}
    </div>
  );
}
