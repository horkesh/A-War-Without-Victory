/**
 * StanceMatterActions: the president's answer to a corps/OG stance matter (posture
 * model option 2). One component, two hosts: the Command Surface card
 * (DirectiveCard, lever `stance_matter`) and the sector panel stance step
 * (SectorStanceStep). Confirm / Countermand / Constrain; the answer can be changed until
 * the turn advances. Silence lets the commander's change stand.
 *
 * Records intent only through `resolve-stance-matter`; the war pipeline resolves it.
 * A failed send shows `corpsFront.stageStanceFailed`.
 */

import { useState } from 'react';
import type { StanceMatterView } from '../data/types';
import { useIPC } from '../desktop/useIPC';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import { stanceMatterAnswerLine, stanceMatterConstraintLabel } from '../data/stanceMatterCopy';
import {
  SURFACE_LABEL_MUTED,
  SURFACE_PRIMARY_BUTTON_COMPACT,
  SURFACE_SECONDARY_BUTTON,
} from './surface/Surface';

export interface StanceMatterActionsProps {
  matter: StanceMatterView;
  /** Called after a successful send (hosts refresh or publish a receipt). */
  onAnswered?: (message: string) => void;
}

export function StanceMatterActions({ matter, onAnswered }: StanceMatterActionsProps) {
  const ipc = useIPC();
  const setLoadError = useGameStore((s) => s.setLoadError);
  const [busy, setBusy] = useState(false);
  const [showConstraints, setShowConstraints] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answerLine = stanceMatterAnswerLine(matter);
  const canOverrule = matter.countermandAllowed;
  const canConstrain = canOverrule && matter.constraintOptions.length > 0;

  const send = async (answer: 'confirm' | 'countermand' | 'constrain', constraint?: string) => {
    if (busy || !ipc.isAvailable) return;
    setBusy(true);
    setError(null);
    try {
      const result = await ipc.resolveStanceMatter({ matterId: matter.id, answer, ...(constraint ? { constraint } : {}) });
      if (!result.ok) {
        const message = t('corpsFront.stageStanceFailed');
        setError(message);
        setLoadError(message);
        return;
      }
      // The main process pushes the updated state to the renderer after the write.
      setShowConstraints(false);
      onAnswered?.(t('stanceMatter.sent'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3" data-testid="stance-matter-actions" data-matter-id={matter.id}>
      {answerLine && (
        <p className="text-[15px] text-[#e8dcbc]" data-testid="stance-matter-answer">{answerLine}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={SURFACE_PRIMARY_BUTTON_COMPACT}
          disabled={busy || !ipc.isAvailable || matter.answer === 'confirm'}
          onClick={() => { void send('confirm'); }}
        >
          {t('stanceMatter.button.confirm')}
        </button>
        {canOverrule && (
          <button
            type="button"
            className={SURFACE_SECONDARY_BUTTON}
            disabled={busy || !ipc.isAvailable || matter.answer === 'countermand'}
            onClick={() => { void send('countermand'); }}
          >
            {t('stanceMatter.button.countermand')}
          </button>
        )}
        {canConstrain && (
          <button
            type="button"
            className={SURFACE_SECONDARY_BUTTON}
            aria-expanded={showConstraints}
            disabled={busy || !ipc.isAvailable}
            onClick={() => setShowConstraints((open) => !open)}
          >
            {t('stanceMatter.button.constrain')}
          </button>
        )}
      </div>
      {canConstrain && showConstraints && (
        <div className="flex flex-col gap-2" role="group" aria-label={t('stanceMatter.constrainHeading')}>
          <div className={SURFACE_LABEL_MUTED}>{t('stanceMatter.constrainHeading')}</div>
          {matter.constraintOptions.map((option) => (
            <button
              key={option}
              type="button"
              className={`${SURFACE_SECONDARY_BUTTON} text-left`}
              disabled={busy || (matter.answer === 'constrain' && matter.constraint === option)}
              onClick={() => { void send('constrain', option); }}
            >
              {stanceMatterConstraintLabel(option)}
            </button>
          ))}
        </div>
      )}
      {!ipc.isAvailable && (
        <p className="text-[14px] text-[#b9ad94]">{t('stanceMatter.bridgeUnavailable')}</p>
      )}
      {error && <p className="text-[14px] text-red-200" role="alert">{error}</p>}
    </div>
  );
}
