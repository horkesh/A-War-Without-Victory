import { useRef, useState } from 'react';
import type { CommandBriefingItemView, SummaryFocusSection } from '../data/types';
import { useGameStore } from '../store/gameStore';

interface CommandBriefingLayerProps {
  onOpenSummary: (focus?: SummaryFocusSection) => void;
  onOpenEnclaves: () => void;
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

  const devMode = useGameStore((state) => state.devMode);
  const topOffset = devMode ? 'top-[4.75rem]' : 'top-[3.25rem]';

  return (
    <div className={`fixed ${topOffset} left-[19rem] right-0 z-20 pointer-events-none`}>
      <div className="pointer-events-auto bg-[#0c0c18]/95 border-b border-white/8 px-3 py-1.5">
        {/* Header line */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-amber-400/80">
            BRIEFING
          </span>
          <span className="text-[9px] font-mono text-white/30">
            {commandBriefing.headline}
          </span>
          <button
            type="button"
            onClick={() => { lastDismissedTurn.current = turn ?? null; setDismissed(true); }}
            className="ml-auto text-[9px] font-mono uppercase tracking-wide text-white/30 hover:text-white/60 transition-colors"
          >
            DISMISS
          </button>
        </div>
        {/* Item rows */}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5">
          {commandBriefing.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenItem(item)}
              className="flex items-center gap-1.5 py-0.5 group"
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${SEVERITY_DOT[item.severity]}`} />
              <span className={`text-[11px] font-semibold ${SEVERITY_TEXT[item.severity]} group-hover:text-white transition-colors`}>
                {item.title}
              </span>
              {item.actionLabel && (
                <span className="text-[9px] font-mono uppercase text-amber-400/60 group-hover:text-amber-400 transition-colors">
                  {item.actionLabel}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
