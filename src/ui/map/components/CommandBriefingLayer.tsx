import { useEffect, useRef, useState } from 'react';
import type { CommandBriefingItemView, SummaryFocusSection } from '../data/types';
import type { ArmyHQTab } from '../../shared/shellHandoff';
import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import { inspectOnField, openArmyHQBriefingForCorps, openArmyHQTab } from '../utils/shellNavigation';
import {
  isCommandBriefingItemCurrent,
  resolveCommandBriefingHeadline,
  resolveCommandBriefingItemCopy,
} from '../data/commandBriefingCopy';

interface CommandBriefingLayerProps {
  onOpenSummary: (focus?: SummaryFocusSection) => void;
  onOpenEnclaves: () => void;
  onOpenPeacePlan?: () => void;
  suppressedTurn?: number | null;
}

const SEVERITY_DOT: Record<CommandBriefingItemView['severity'], string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-400',
  info: 'bg-sky-400',
};

const SEVERITY_TEXT: Record<CommandBriefingItemView['severity'], string> = {
  critical: 'text-red-300',
  warning: 'text-amber-300',
  info: 'text-sky-300',
};

const SEVERITY_BORDER: Record<CommandBriefingItemView['severity'], string> = {
  critical: 'border-red-500/60',
  warning: 'border-amber-500/40',
  info: 'border-sky-500/30',
};

const SEVERITY_BG: Record<CommandBriefingItemView['severity'], string> = {
  critical: 'bg-red-950/50',
  warning: 'bg-amber-950/40',
  info: 'bg-sky-950/30',
};

export function CommandBriefingLayer({ onOpenSummary, onOpenEnclaves, onOpenPeacePlan, suppressedTurn = null }: CommandBriefingLayerProps) {
  const loadedGameState = useGameStore((state) => state.loadedGameState);
  const commandBriefing = loadedGameState?.commandBriefing;
  const setArmyHQExpandedCorpsId = useGameStore((state) => state.setArmyHQExpandedCorpsId);
  const setIsOperationsPanelOpen = useGameStore((state) => state.setIsOperationsPanelOpen);
  const devMode = useGameStore((state) => state.devMode);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const turn = useGameStore((state) => state.loadedGameState?.turn);
  const lastObservedTurn = useRef<number | null>(turn ?? null);

  useEffect(() => {
    if (turn == null || lastObservedTurn.current === turn) return;
    lastObservedTurn.current = turn;
    setDismissed(false);
    setExpanded(false);
  }, [turn]);

  const visibleItems = commandBriefing?.items.filter((item) => (
    isCommandBriefingItemCurrent(item, loadedGameState?.pendingPeacePlan)
  )) ?? [];

  if (turn != null && suppressedTurn === turn) return null;
  if (!commandBriefing || visibleItems.length === 0 || dismissed) return null;

  const handleOpenItem = (item: CommandBriefingItemView) => {
    if (item.briefingCategory === 'active_operations') {
      setIsOperationsPanelOpen(true);
      return;
    }
    switch (item.target.type) {
      case 'summary':
        if (!openArmyHQTab(useGameStore.getState(), 'summary')) {
          onOpenSummary(item.target.summaryFocus);
        }
        return;
      case 'enclaves':
        onOpenEnclaves();
        return;
      case 'operation':
        if (item.target.operationKey) {
          inspectOnField(useGameStore.getState(), { kind: 'field-operation', operationKey: item.target.operationKey });
        }
        return;
      case 'sector':
        if (item.target.sectorId) {
          const corpsId = item.target.corpsId ?? item.corpsId;
          inspectOnField(useGameStore.getState(), corpsId
            ? { kind: 'field-sector-in-corps', sectorId: item.target.sectorId, corpsId }
            : { kind: 'field-sector', sectorId: item.target.sectorId });
        }
        return;
      case 'settlement':
        if (item.target.osid) {
          inspectOnField(useGameStore.getState(), { kind: 'field-settlement', osid: item.target.osid });
        }
        return;
      case 'corps': {
        openArmyHQBriefingForCorps(useGameStore.getState(), item.target.corpsId ?? null);
        return;
      }
      case 'officer_events': {
        openArmyHQTab(useGameStore.getState(), officerTargetTab(item.target.officerFocus));
        if (item.target.officerFocus === 'interpretations') setArmyHQExpandedCorpsId(null);
        return;
      }
      case 'peace_plan':
        onOpenPeacePlan?.();
        return;
      case 'none':
      default:
        return;
    }
  };

  // Position below the floating crest (~120px tall) — dev strip adds another row
  const topOffset = devMode ? 'top-[8.5rem]' : 'top-[7.5rem]';
  const visibleBriefing = { ...commandBriefing, items: visibleItems };
  const criticalCount = visibleItems.filter((i) => i.severity === 'critical').length;
  const hasCritical = criticalCount > 0;

  return (
    <div
      data-awwv-counter-occluder="true"
      className={`fixed ${topOffset} left-1/2 w-[min(34rem,calc(100vw-48rem))] -translate-x-1/2 max-[1100px]:w-[min(34rem,calc(100vw-2rem))] z-20 pointer-events-none`}
    >
      <div
        data-testid="command-briefing-banner"
        className={`pointer-events-auto relative mt-2 rounded-md backdrop-blur-md shadow-2xl px-4 ${expanded ? 'py-4' : 'py-2.5'} ${
          hasCritical
            ? 'bg-red-950/95 border-2 border-red-500/70 alert-pulse'
            : 'bg-panel-bg/95 border border-panel-border'
        }`}
      >
        {/* Header line with persistent alert count */}
        <div className={`flex min-w-0 flex-wrap items-center gap-2.5 ${expanded ? 'mb-3' : ''}`}>
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-accent-gold">
            {t('commandBriefing.title')}
          </span>
          <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded-full bg-red-600 text-white text-xs font-bold tabular-nums">
            {visibleItems.length}
          </span>
          <span className="min-w-0 flex-1 text-xs font-mono font-semibold text-text-primary">
            {resolveCommandBriefingHeadline(visibleBriefing)}
          </span>
          <button
            type="button"
            data-testid="command-briefing-toggle"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="shrink-0 rounded border border-accent-gold/45 bg-black/25 px-2.5 py-1.5 text-xs font-mono font-bold uppercase tracking-wider text-accent-gold hover:bg-accent-gold/15"
          >
            {t(expanded ? 'commandBriefing.collapse' : 'commandBriefing.expand')}
          </button>
          <button
            type="button"
            data-testid="command-briefing-dismiss"
            aria-label={t('commandBriefing.dismiss')}
            title={t('commandBriefing.dismiss')}
            onClick={() => setDismissed(true)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-red-500/35 bg-red-950/50 text-[14px] font-bold leading-none text-red-300 hover:bg-red-900/60 hover:text-white"
          >
            &times;
          </button>
        </div>
        {/* Item cards — taller, severity-colored */}
        {expanded && (
        <div className="flex flex-col gap-2.5 max-h-[38vh] overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const copy = resolveCommandBriefingItemCopy(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleOpenItem(item)}
                className={`flex items-center gap-2.5 px-3.5 py-3 rounded-md border-l-[3px] ${SEVERITY_BORDER[item.severity]} ${SEVERITY_BG[item.severity]} hover:brightness-125 transition-all group min-h-[2.75rem]`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[item.severity]} ${item.severity === 'critical' ? 'animate-pulse' : ''}`} />
                <div className="flex flex-col items-start gap-0.5">
                  <span className={`text-[12px] font-semibold leading-tight ${SEVERITY_TEXT[item.severity]} group-hover:text-white transition-colors`}>
                    {copy.title}
                  </span>
                  {copy.actionLabel && (
                    <span className="text-xs font-mono uppercase text-accent-gold/60 group-hover:text-accent-gold transition-colors">
                      {copy.actionLabel}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        )}
      </div>
      {/* CSS animation for critical pulse */}
      <style>{`
        .alert-pulse {
          animation: briefing-pulse 2s ease-in-out infinite;
        }
        @keyframes briefing-pulse {
          0%, 100% { border-color: rgba(239, 68, 68, 0.25); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          50% { border-color: rgba(239, 68, 68, 0.55); box-shadow: 0 0 12px 2px rgba(239, 68, 68, 0.15); }
        }
      `}</style>
    </div>
  );
}

function officerTargetTab(focus: CommandBriefingItemView['target']['officerFocus']): ArmyHQTab {
  return focus === 'personnel' ? 'personnel' : 'briefing';
}
