import type { CommandBriefingItemView, CommandBriefingView } from './types';
import { t, type MessageKey } from '../i18n';

interface ResolvedCommandBriefingItemCopy {
  title: string;
  detail: string;
  actionLabel?: string;
  actionChipLabel?: string;
}

function leadingNumber(value: string | undefined, fallback = 0): number {
  const match = (value ?? '').match(/\b\d+\b/);
  return match ? Number(match[0]) : fallback;
}

function firstPercent(value: string | undefined, fallback = 0): number {
  const match = (value ?? '').match(/\b\d+(?=%)/);
  return match ? Number(match[0]) : fallback;
}

function labelBeforeColon(value: string | undefined): string | undefined {
  const index = (value ?? '').indexOf(':');
  if (index <= 0) return undefined;
  return value?.slice(0, index).trim() || undefined;
}

function afterColon(value: string | undefined, fallback: string): string {
  const index = (value ?? '').indexOf(':');
  if (index < 0) return fallback;
  return value?.slice(index + 1).trim() || fallback;
}

function subjectLabel(item: CommandBriefingItemView): string | undefined {
  return item.subject?.label ?? item.target.label ?? labelBeforeColon(item.title);
}

function countKey(base: string, count: number): MessageKey {
  return `${base}.${count === 1 ? 'one' : 'many'}` as MessageKey;
}

function parseSupplyCounts(detail: string): Record<string, number> {
  const match = detail.match(/(\d+)\s+adequate,\s+(\d+)\s+strained,\s+(\d+)\s+critical;\s+(\d+)\s+cut corridors?,\s+(\d+)\s+brittle corridors?/i);
  return {
    adequate: match ? Number(match[1]) : 0,
    strained: match ? Number(match[2]) : 0,
    critical: match ? Number(match[3]) : 0,
    cut: match ? Number(match[4]) : 0,
    brittle: match ? Number(match[5]) : 0,
  };
}

function supplyTitleKey(severity: CommandBriefingItemView['severity']): MessageKey {
  if (severity === 'critical') return 'commandBriefing.item.supply.title.critical';
  if (severity === 'warning') return 'commandBriefing.item.supply.title.warning';
  return 'commandBriefing.item.supply.title.info';
}

function orderInterpretationDetailKey(detail: string): MessageKey {
  if (/refused orders/i.test(detail)) return 'commandBriefing.item.orderInterpretations.detail.refused';
  if (/autonomous operation/i.test(detail)) return 'commandBriefing.item.orderInterpretations.detail.proposal';
  return 'commandBriefing.item.orderInterpretations.detail.pushback';
}

function localizedTargetLabel(item: CommandBriefingItemView): string | undefined {
  if (item.id === 'log-supply') return t('commandBriefing.action.reviewSupply');
  if (item.id === 'dip-peace-plan') return t('commandBriefing.target.peacePlan');
  if (item.id === 'cmd-order-interpretations') return t('commandBriefing.target.officerInterpretations');
  if (item.id === 'cmd-officer-events') return t('commandBriefing.target.personnel');
  if (item.briefingCategory === 'enclave') return t('commandBriefing.action.reviewEnclaves');
  return item.actionChipLabel ?? item.target.label;
}

export function resolveCommandBriefingHeadline(briefing: Pick<CommandBriefingView, 'criticalCount' | 'pendingCount' | 'items' | 'headline'>): string {
  if (briefing.criticalCount > 0) {
    return t(countKey('commandBriefing.headline.critical', briefing.criticalCount), { count: briefing.criticalCount });
  }
  const warningCount = briefing.items.filter((item) => item.severity === 'warning').length;
  if (warningCount > 0) {
    return t(countKey('commandBriefing.headline.warning', warningCount), { count: warningCount });
  }
  if (briefing.pendingCount > 0) {
    return t(countKey('commandBriefing.headline.review', briefing.pendingCount), { count: briefing.pendingCount });
  }
  return t('commandBriefing.headline.none');
}

export function resolveCommandBriefingItemCopy(item: CommandBriefingItemView): ResolvedCommandBriefingItemCopy {
  const token = item.copyToken ?? item.id;
  const count = leadingNumber(item.title, 1);

  if (token === 'mil-active-ops') {
    return {
      title: t(countKey('commandBriefing.item.activeOps.title', count), { count }),
      detail: t(countKey('commandBriefing.item.activeOps.detail', count), { count }),
    };
  }

  if (token === 'mil-disrupted') {
    return {
      title: t(countKey('commandBriefing.item.disrupted.title', count), { count }),
      detail: t(countKey('commandBriefing.item.disrupted.detail', count), { count }),
    };
  }

  if (token.startsWith('mil-cohesion-') || item.briefingCategory === 'cohesion') {
    const corpsName = subjectLabel(item) ?? t('chiefOfStaff.corpsCommandFallback');
    const cohesion = firstPercent(item.detail, 0);
    return {
      title: t('commandBriefing.item.cohesion.title', { corpsName }),
      detail: t('commandBriefing.item.cohesion.detail', { cohesion }),
    };
  }

  if (token === 'log-supply') {
    const params = parseSupplyCounts(item.detail);
    return {
      title: t(supplyTitleKey(item.severity)),
      detail: t('commandBriefing.item.supply.detail', params),
      actionLabel: t('commandBriefing.action.reviewSupply'),
      actionChipLabel: t('commandBriefing.action.reviewSupply'),
    };
  }

  if (token === 'dip-peace-plan') {
    return {
      title: t('commandBriefing.item.peacePlan.title'),
      detail: t('commandBriefing.item.peacePlan.detail'),
      actionLabel: t('commandBriefing.action.reviewPlan'),
      actionChipLabel: t('commandBriefing.target.peacePlan'),
    };
  }

  if (token === 'dip-patron-override' || token === 'dip-patron-pressure') {
    const authority = firstPercent(item.detail, 0);
    const detailKey: MessageKey = token === 'dip-patron-override'
      ? 'commandBriefing.item.patronOverride.detail'
      : 'commandBriefing.item.patronPressure.detail';
    return {
      title: t(token === 'dip-patron-override'
        ? 'commandBriefing.item.patronOverride.title'
        : 'commandBriefing.item.patronPressure.title'),
      detail: t(detailKey, { authority }),
    };
  }

  if (token.startsWith('hum-enclave-') || item.briefingCategory === 'enclave') {
    const enclaveName = subjectLabel(item) ?? item.target.enclaveId ?? t('commandBriefing.target.enclave');
    const isolation = leadingNumber(item.detail, 0);
    const resilience = Number((item.detail.match(/Resilience:\s*(\d+)/i) ?? [])[1] ?? 0);
    return {
      title: t('commandBriefing.item.enclave.title', { enclaveName }),
      detail: t('commandBriefing.item.enclave.detail', { isolation, resilience }),
      actionLabel: t('commandBriefing.action.reviewEnclaves'),
      actionChipLabel: t('commandBriefing.action.reviewEnclaves'),
    };
  }

  if (token.startsWith('aar-') || item.briefingCategory === 'field_report') {
    const officerName = afterColon(item.title, item.title);
    return {
      title: t('commandBriefing.item.fieldReport.title', { officerName }),
      detail: item.detail,
    };
  }

  if (token === 'cmd-order-interpretations') {
    return {
      title: t(countKey('commandBriefing.item.orderInterpretations.title', count), { count }),
      detail: t(orderInterpretationDetailKey(item.detail)),
      actionLabel: t('commandBriefing.action.reviewInterpretations'),
      actionChipLabel: t('commandBriefing.target.officerInterpretations'),
    };
  }

  if (token === 'cmd-officer-events') {
    return {
      title: t(countKey('commandBriefing.item.officerEvents.title', count), { count }),
      detail: t('commandBriefing.item.officerEvents.detail'),
      actionLabel: t('commandBriefing.action.reviewOfficers'),
      actionChipLabel: t('commandBriefing.target.personnel'),
    };
  }

  return {
    title: item.title,
    detail: item.detail,
    actionLabel: item.actionLabel,
    actionChipLabel: localizedTargetLabel(item),
  };
}
