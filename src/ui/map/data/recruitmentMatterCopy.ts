/**
 * Player-facing words for the recruitment matter (EN + BCS through `t`). Shared by the
 * Command Surface card and the President's Desk item so both say the same thing.
 *
 * Canonical owner: src/ui/map/data/recruitmentMatterCopy.ts
 */

import { getActiveLocale, t, type MessageKey } from '../i18n';
import { getLocalizedFormationName } from './formationNameLocalizations';
import {
  humanizeMunicipalityId,
  recruitmentStaysWithPresident,
  type RecruitmentMatter,
  type RecruitmentWatchBrigade,
} from './recruitmentMatter';

const AUTONOMY_LEVEL_KEYS: readonly MessageKey[] = [
  'autonomy.level.fullControl',
  'autonomy.level.assisted',
  'autonomy.level.delegated',
  'autonomy.level.observer',
];

/** How many brigade names a one-line summary lists before "and N more". */
const SUMMARY_NAME_LIMIT = 3;

export type MunicipalityNames = Readonly<Record<string, string>> | null | undefined;

export function autonomyLevelLabel(level: number): string {
  const index = Math.max(0, Math.min(AUTONOMY_LEVEL_KEYS.length - 1, Math.trunc(level)));
  return t(AUTONOMY_LEVEL_KEYS[index]!);
}

export function recruitmentBrigadeName(brigade: RecruitmentWatchBrigade): string {
  return getLocalizedFormationName({ id: brigade.id, name: brigade.name, kind: 'brigade' }, getActiveLocale());
}

export function recruitmentBrigadePlace(brigade: RecruitmentWatchBrigade, municipalityNames: MunicipalityNames): string {
  return municipalityNames?.[brigade.homeMun] ?? humanizeMunicipalityId(brigade.homeMun);
}

function nameList(brigades: readonly RecruitmentWatchBrigade[]): string {
  const names = brigades.slice(0, SUMMARY_NAME_LIMIT).map(recruitmentBrigadeName).join(', ');
  const rest = brigades.length - SUMMARY_NAME_LIMIT;
  return rest > 0 ? names + t('recruitment.desk.more', { count: rest }) : names;
}

export interface RecruitmentMatterCopy {
  title: string;
  /** Why this reaches the president, at this autonomy level. */
  explanation: string;
  /** One line for the Desk card. */
  summary: string;
  /** One line per brigade: name, where it forms, the cost (decision) or that staff decide. */
  facts: string[];
  primaryActionLabel: string;
  setAsideLabel: string;
  familyLabel: string;
}

export function buildRecruitmentMatterCopy(matter: RecruitmentMatter, municipalityNames: MunicipalityNames): RecruitmentMatterCopy {
  const level = autonomyLevelLabel(matter.autonomyLevel);
  const familyLabel = t('recruitment.desk.family');
  if (recruitmentStaysWithPresident(matter.autonomyLevel) && matter.mode === 'decision') {
    const first = matter.ready[0]!;
    const one = matter.ready.length === 1;
    return {
      title: one
        ? t('recruitment.desk.decision.titleOne', { name: recruitmentBrigadeName(first) })
        : t('recruitment.desk.decision.titleMany', { count: matter.ready.length }),
      explanation: t('recruitment.desk.decision.explanation', { level }),
      summary: one
        ? t('recruitment.desk.decision.summaryOne', {
          place: recruitmentBrigadePlace(first, municipalityNames),
          manpower: first.manpowerCost,
          capital: first.capitalCost,
        })
        : t('recruitment.desk.decision.summaryMany', { names: nameList(matter.ready) }),
      facts: matter.ready.map((brigade) => t('recruitment.desk.fact.ready', {
        name: recruitmentBrigadeName(brigade),
        place: recruitmentBrigadePlace(brigade, municipalityNames),
        manpower: brigade.manpowerCost,
        capital: brigade.capitalCost,
      })),
      primaryActionLabel: t('recruitment.desk.action.open'),
      setAsideLabel: t('recruitment.desk.action.setAside'),
      familyLabel,
    };
  }

  const raised = matter.raised;
  const ready = matter.ready;
  const title = raised.length > 0
    ? raised.length === 1
      ? t('recruitment.desk.notice.titleRaisedOne', { name: recruitmentBrigadeName(raised[0]!) })
      : t('recruitment.desk.notice.titleRaisedMany', { count: raised.length })
    : ready.length === 1
      ? t('recruitment.desk.notice.titleReadyOne', { name: recruitmentBrigadeName(ready[0]!) })
      : t('recruitment.desk.notice.titleReadyMany', { count: ready.length });
  const summaryParts: string[] = [];
  if (raised.length > 0) summaryParts.push(t('recruitment.desk.notice.raisedPart', { names: nameList(raised) }));
  if (ready.length > 0) summaryParts.push(t('recruitment.desk.notice.readyPart', { names: nameList(ready) }));
  return {
    title,
    explanation: t('recruitment.desk.notice.explanation', { level }),
    summary: summaryParts.join('. ') + '.',
    facts: [
      ...raised.map((brigade) => t('recruitment.desk.fact.raised', {
        name: recruitmentBrigadeName(brigade),
        place: recruitmentBrigadePlace(brigade, municipalityNames),
      })),
      ...ready.map((brigade) => t('recruitment.desk.fact.readyStaff', {
        name: recruitmentBrigadeName(brigade),
        place: recruitmentBrigadePlace(brigade, municipalityNames),
      })),
    ],
    primaryActionLabel: t('recruitment.desk.action.view'),
    setAsideLabel: t('recruitment.desk.action.noted'),
    familyLabel,
  };
}
