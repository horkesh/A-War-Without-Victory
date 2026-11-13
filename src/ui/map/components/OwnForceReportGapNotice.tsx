import { t, type MessageKey } from '../i18n';

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

/**
 * Callers name missing figures with stable English field ids (kept in `data-awwv-report-gap`
 * for harnesses). The visible list speaks the player's language.
 */
const REPORT_GAP_FIELD_KEYS: Record<string, MessageKey> = {
  posture: 'reportGap.field.posture',
  readiness: 'reportGap.field.readiness',
  cohesion: 'reportGap.field.cohesion',
  morale: 'reportGap.field.morale',
  fatigue: 'reportGap.field.fatigue',
  personnel: 'reportGap.field.personnel',
  effectiveness: 'reportGap.field.effectiveness',
  'tank condition': 'reportGap.field.tankCondition',
  'artillery condition': 'reportGap.field.artilleryCondition',
  'air defense condition': 'reportGap.field.airDefenseCondition',
  'corps stance': 'reportGap.field.corpsStance',
  'sector stance': 'reportGap.field.sectorStance',
  'operational security': 'reportGap.field.opsec',
  confidence: 'reportGap.field.confidence',
  'supply priority': 'reportGap.field.supplyPriority',
  'offensive power': 'reportGap.field.offensivePower',
  'defensive power': 'reportGap.field.defensivePower',
  'defense per front segment': 'reportGap.field.defensePerSegment',
};

function reportGapFieldLabel(field: string): string {
  const key = REPORT_GAP_FIELD_KEYS[field];
  return key ? t(key) : field;
}

export function OwnForceReportGapNotice({ fields, className = '' }: OwnForceReportGapNoticeProps) {
  const uniqueFields = uniqueReportGapFields(fields);
  if (uniqueFields.length === 0) return null;

  const visibleFields = uniqueFields.slice(0, 3).map(reportGapFieldLabel);
  const remainingCount = uniqueFields.length - visibleFields.length;
  const visibleList = [
    ...visibleFields,
    ...(remainingCount > 0 ? [t('reportGap.andMore', { count: remainingCount })] : []),
  ].join(t('reportGap.fieldSeparator'));

  return (
    <div
      data-awwv-report-gap={uniqueFields.join('|')}
      className={`rounded-md border border-[#2a303c] bg-[#14171e] px-3 py-2 text-[14px] leading-snug text-[#b9ad94] ${className}`}
    >
      {t('reportGap.notice', { fields: visibleList })}
    </div>
  );
}
