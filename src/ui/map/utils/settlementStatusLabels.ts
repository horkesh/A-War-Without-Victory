import { t } from '../i18n';
import type { MessageKey } from '../i18n';

const SETTLEMENT_STATUS_LABEL_KEYS: Record<string, MessageKey> = {
  CONSOLIDATED: 'settlement.status.consolidated',
  CONTESTED: 'settlement.status.contested',
  HIGHLY_CONTESTED: 'settlement.status.highlyContested',
};

export function getPlayerSafeSettlementStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  const normalized = status.trim().toUpperCase();
  if (!normalized) return null;
  return t(SETTLEMENT_STATUS_LABEL_KEYS[normalized] ?? 'settlement.status.unknown');
}
