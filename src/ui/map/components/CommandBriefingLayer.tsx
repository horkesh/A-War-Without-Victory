import { useRef, useState } from 'react';
import type { CommandBriefingItemView, SummaryFocusSection } from '../data/types';
import { useGameStore } from '../store/gameStore';

interface CommandBriefingLayerProps {
  onOpenSummary: (focus?: SummaryFocusSection) => void;
  onOpenEnclaves: () => void;
}

const SEVERITY_CLASSES: Record<CommandBriefingItemView['severity'], string> = {
  critical: 'border-red-500/60 bg-red-950/35',
  warning: 'border-amber-400/50 bg-amber-950/25',
  info: 'border-sky-400/40 bg-sky-950/20',
};

const SEVERITY_LABELS: Record<CommandBriefingItemView['severity'], string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
};

export function CommandBriefingLayer({ onOpenSummary, onOpenEnclaves }: CommandBriefingLayerProps) {
  const commandBriefing = useGameStore((state) => state.loadedGameState?.commandBriefing);
  const setSelectedOperationKey = useGameStore((state) => state.setSelectedOperationKey);
  const setSelectedCorpsFrontSectorId = useGameStore((state) => state.setSelectedCorpsFrontSectorId);
  const setSelectedOsid = useGameStore((state) => state.setSelectedOsid);
  const setIsOperationsPanelOpen = useGameStore((state) => state.setIsOperationsPanelOpen);
  const setSelectedArmyId = useGameStore((state) => state.setSelectedArmyId);
  const setArmyHQExpandedCorpsId = useGameStore((state) => state.setArmyHQExpandedCorpsId);
  const [dismissed, setDismissed] = useState(false);
  const turn = useGameStore((state) => state.loadedGameState?.turn);
  const lastDismissedTurn = useRef<number | null>(null);

  // Reset dismissed state when turn changes (new briefing after advance)
  if (turn != null && lastDismissedTurn.current !== turn && dismissed) {
    setDismissed(false);
  }

  if (!commandBriefing || commandBriefing.items.length === 0 || dismissed) return null;

  const handleOpenItem = (item: CommandBriefingItemView) => {
    switch (item.target.type) {
      case 'summary':
        onOpenSummary(item.target.summaryFocus);
        return;
      case 'enclaves':
        onOpenEnclaves();
        return;
      case 'operation':
        if (item.target.operationKey) {
          setSelectedOperationKey(item.target.operationKey);
          setIsOperationsPanelOpen(true);
        }
        return;
      case 'sector':
        if (item.target.sectorId) {
          setSelectedCorpsFrontSectorId(item.target.sectorId);
        }
        return;
      case 'settlement':
        if (item.target.osid) {
          setSelectedOsid(item.target.osid);
        }
        return;
      case 'corps': {
        const faction = useGameStore.getState().loadedGameState?.player_faction;
        if (faction) {
          setSelectedArmyId(faction);
          if (item.target.corpsId) setArmyHQExpandedCorpsId(item.target.corpsId);
        }
        return;
      }
      case 'officer_events': {
        const faction = useGameStore.getState().loadedGameState?.player_faction;
        if (faction) setSelectedArmyId(faction);
        return;
      }
      default:
        return;
    }
  };

  return (
    <div className="absolute top-14 left-[19rem] right-4 z-20 pointer-events-none">
      <section className="pointer-events-auto rounded-lg border border-panel-border bg-panel-bg/92 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-panel-border px-4 py-2.5">
          <div>
            <div className="font-sans text-[10px] uppercase tracking-[0.25em] text-accent-gold font-semibold">
              Command Briefing
            </div>
            <div className="text-sm text-text-primary font-semibold">
              {commandBriefing.headline}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wide text-text-secondary">
            <span className="rounded border border-panel-border bg-panel-card px-2 py-1">
              Critical {commandBriefing.criticalCount}
            </span>
            <span className="rounded border border-panel-border bg-panel-card px-2 py-1">
              Queue {commandBriefing.pendingCount}
            </span>
            <button
              type="button"
              onClick={() => { lastDismissedTurn.current = turn ?? null; setDismissed(true); }}
              className="ml-2 rounded border border-panel-border bg-panel-card px-2 py-1 text-text-secondary hover:text-text-primary hover:border-white/20 transition-colors"
            >
              DISMISS
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 p-3 xl:grid-cols-3">
          {commandBriefing.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenItem(item)}
              className={`rounded-lg border p-3 text-left transition-colors hover:bg-panel-hover ${SEVERITY_CLASSES[item.severity]}`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-secondary">
                  {SEVERITY_LABELS[item.severity]}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-accent-gold">
                  {item.actionLabel}
                </span>
              </div>
              <div className="text-sm font-semibold text-text-primary">
                {item.title}
              </div>
              <div className="mt-1 text-xs text-text-secondary">
                {item.detail}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
