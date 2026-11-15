/**
 * ArmyClashActions (command loop L7; proposal 2A step A1): the president's answer when his army
 * commander objects to an order he staged this week. Hosted by DirectiveCard (lever `army_clash`)
 * on the Command Surface and lazily loaded with its copy, so none of it sits in the map entry chunk.
 *
 * Facts: the order as issued, the army's counter-order, the corps affected, his reason (and the
 * corps commander's own objection when it fired on the same order), and the previous clash.
 * Three equal buttons, each with its price and an aria label that includes it:
 *   Accept  (free)  the army's version is staged instead; anything paid for the order is refunded.
 *   Insist  (15)    the order stands; one override on the army commander's record.
 *   Replace (25)    the corps commander who would carry it out is replaced this week.
 * Advisory: unanswered at Advance, the order stands as given. Applied by `resolve-army-clash`.
 */

import { useState } from 'react';
import type { ArmyClashView, LoadedGameState } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import { armyClashOrderPhrase } from '../data/armyClashCopy';
import { ARMY_CLASH_INSIST_COST, REPLACE_CO_COST } from '../utils/commandAuthority';
import { turnToDateString } from '../utils/formatters';
import { SURFACE_LABEL_MUTED, SURFACE_SECONDARY_BUTTON } from './surface/Surface';

export interface ArmyClashActionsProps {
  clash: ArmyClashView;
  gameState: LoadedGameState;
  /** Called after a successful answer (the host publishes a receipt). */
  onAnswered?: (message: string) => void;
}

type Answer = 'accept' | 'insist' | 'replace';

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toLocaleUpperCase() + text.slice(1) : text;
}

export function ArmyClashActions({ clash, gameState, onAnswered }: ArmyClashActionsProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const officer = clash.armyCommanderName ?? t('clash.armyCommanderFallback');
  const current = gameState.commandAuthority?.current;
  const canAfford = (cost: number) => typeof current !== 'number' || current >= cost;
  const replaceLabel = clash.corpsCommanderName
    ? t('clash.answer.replace', { commander: clash.corpsCommanderName })
    : t('clash.answer.replaceFallback');

  const answers: Array<{ answer: Answer; label: string; cost: number; aria: string; effect: string; disabled: boolean }> = [
    {
      answer: 'accept', label: t('clash.answer.accept'), cost: 0,
      aria: t('clash.aria.accept'), effect: t('clash.effect.accept'), disabled: false,
    },
    {
      answer: 'insist', label: t('clash.answer.insist'), cost: ARMY_CLASH_INSIST_COST,
      aria: t('clash.aria.insist', { cost: ARMY_CLASH_INSIST_COST }), effect: t('clash.effect.insist'),
      disabled: !canAfford(ARMY_CLASH_INSIST_COST),
    },
    {
      answer: 'replace', label: replaceLabel, cost: REPLACE_CO_COST,
      aria: t('clash.aria.replace', { cost: REPLACE_CO_COST }), effect: t('clash.effect.replace'),
      disabled: !canAfford(REPLACE_CO_COST) || !clash.corpsCommanderName,
    },
  ];

  const send = async (answer: Answer) => {
    if (busy || !ipc.isAvailable) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ipc.resolveArmyClash({ clashId: clash.id, answer });
      if (!result.ok) {
        const message = t('clash.failed');
        setError(message);
        setLoadError(message);
        return;
      }
      // The main process pushes the updated state to the renderer after the write.
      onAnswered?.(answer === 'replace'
        ? t('clash.done.replace', { corps: clash.corpsName })
        : t(`clash.done.${answer}`, { officer }));
    } finally {
      setBusy(false);
    }
  };

  const facts: Array<{ label: string; value: string; testId: string }> = [
    { label: t('clash.fact.order'), value: capitalize(armyClashOrderPhrase(clash, osidDisplayNames)), testId: 'army-clash-order' },
    { label: t('clash.fact.counter'), value: t(`clash.counter.${clash.counterOrder}`), testId: 'army-clash-counter' },
    { label: t('clash.fact.corps'), value: clash.corpsName, testId: 'army-clash-corps' },
    { label: t('clash.fact.reason'), value: t(`clash.reason.${clash.conflict}`), testId: 'army-clash-reason' },
  ];
  if (clash.previousClash) {
    facts.push({
      label: t('clash.fact.previous'),
      value: t('clash.previous', {
        date: turnToDateString(clash.previousClash.turn),
        outcome: t(`clash.outcome.${clash.previousClash.outcome}`),
      }),
      testId: 'army-clash-previous',
    });
  }

  return (
    <div className="flex flex-col gap-3" data-testid="army-clash-actions" data-clash-id={clash.id}>
      <dl className="flex flex-col gap-2 text-[15px]" data-testid="army-clash-facts">
        {facts.map((fact) => (
          <div key={fact.testId} className="flex flex-col gap-0.5">
            <dt className={SURFACE_LABEL_MUTED}>{fact.label}</dt>
            <dd className="text-[#e8dcbc]" data-testid={fact.testId}>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {clash.corpsObjection && (
        <p className="text-[15px] text-[#e8dcbc]" data-testid="army-clash-corps-objection">
          {clash.corpsCommanderName
            ? t('clash.corpsObjection', { commander: clash.corpsCommanderName })
            : t('clash.corpsObjectionFallback')}
        </p>
      )}
      {/* Three equal full-width rows (label left, price right): equal weight, and long officer
          names never overflow a narrow desk column. */}
      <div className="flex flex-col gap-2" role="group" aria-label={t('clash.actionLabel')}>
        {answers.map((option) => (
          <button
            key={option.answer}
            type="button"
            className={`${SURFACE_SECONDARY_BUTTON} flex w-full items-center justify-between gap-3 text-left`}
            aria-label={option.aria}
            title={option.effect}
            data-testid={`army-clash-${option.answer}`}
            disabled={busy || !ipc.isAvailable || option.disabled}
            onClick={() => { void send(option.answer); }}
          >
            <span className="min-w-0 break-words">{option.label}</span>
            <span className="shrink-0 text-[13px] text-[#cfc3a6]">
              {option.cost > 0 ? t('clash.cost.authority', { cost: option.cost }) : t('clash.cost.free')}
            </span>
          </button>
        ))}
      </div>
      {typeof current === 'number' && (
        <p className="text-[14px] text-[#b9ad94]" data-testid="army-clash-balance">{t('clash.unaffordable', { current: Math.round(current * 100) / 100 })}</p>
      )}
      {!ipc.isAvailable && (
        <p className="text-[14px] text-[#b9ad94]">{t('clash.bridgeUnavailable')}</p>
      )}
      {error && <p className="text-[14px] text-red-200" role="alert">{error}</p>}
    </div>
  );
}

export default ArmyClashActions;
