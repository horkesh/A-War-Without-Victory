import type { InboxItem } from '../../data/inboxItems';
import { countActionableItems, deriveInboxItems, hasBlockingItems } from '../../data/inboxItems';
import type { LoadedGameState } from '../../data/types';
import { turnToDateString } from '../../utils/formatters';
import { ConsequenceStrip } from './ConsequenceStrip';
import { DeskPacket } from './DeskPacket';

export interface PresidentDeskShellProps {
  state: LoadedGameState | null;
  osidNameMap: Record<string, string> | null;
  onAction: (action: InboxItem['action'], itemId: string) => void;
  onAdvance: () => void;
  onOpenArmyHQ: () => void;
  onOpenMap: () => void;
  onOpenRecords: () => void;
}

function factionTitle(state: LoadedGameState | null): string {
  if (state?.player_faction === 'RS') return 'Republika Srpska';
  if (state?.player_faction === 'HRHB') return 'Herzeg-Bosna';
  if (state?.player_faction === 'RBiH') return 'Republic of Bosnia and Herzegovina';
  return 'Campaign';
}

export function PresidentDeskShell({
  state,
  osidNameMap,
  onAction,
  onAdvance,
  onOpenArmyHQ,
  onOpenMap,
  onOpenRecords,
}: PresidentDeskShellProps) {
  const items = deriveInboxItems(state, osidNameMap);
  const actionableCount = countActionableItems(items);
  const blocked = hasBlockingItems(items);

  return (
    <section
      role="region"
      aria-label="President desk"
      className="pointer-events-none absolute inset-x-3 top-16 bottom-16 z-[3] grid content-start gap-4 overflow-y-auto lg:grid-cols-[minmax(22rem,34rem)_minmax(18rem,26rem)] xl:left-10 xl:right-10"
    >
      <div className="pointer-events-auto self-start border border-panel-border/80 bg-panel-bg/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.52)] backdrop-blur-md">
        <DeskPacket items={items} onAction={onAction} />
      </div>

      <aside className="pointer-events-auto self-start border border-panel-border/80 bg-panel-bg/90 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.46)] backdrop-blur-md">
        <div className="border-b border-panel-border/70 pb-3">
          <div className="text-[8px] font-bold uppercase tracking-[0.22em] text-accent-gold">Strategic Situation</div>
          <h2 className="mt-1 text-[18px] font-bold leading-tight text-text-primary">{factionTitle(state)}</h2>
          <div className="mt-1 text-[11px] text-text-secondary">
            {state ? `${turnToDateString(state.turn)} - turn ${state.turn}` : 'No campaign loaded'}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="border border-panel-border/70 bg-black/20 px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Desk Items</div>
            <div className="mt-1 text-[18px] font-bold text-text-primary">{actionableCount}</div>
          </div>
          <div className="border border-panel-border/70 bg-black/20 px-2.5 py-2">
            <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-text-muted">Advance</div>
            <div className={`mt-1 text-[13px] font-bold ${blocked ? 'text-red-200' : 'text-green-200'}`}>
              {blocked ? 'Blocked' : 'Ready'}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenArmyHQ}
            className="border border-accent-gold/45 bg-accent-gold/12 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-accent-gold transition-colors hover:bg-accent-gold/20"
          >
            Call Army HQ
          </button>
          <button
            type="button"
            onClick={onOpenMap}
            className="border border-panel-border bg-black/20 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
          >
            War Map
          </button>
          <button
            type="button"
            onClick={onAdvance}
            className="border border-red-300/45 bg-red-500/12 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-red-100 transition-colors hover:bg-red-500/20"
          >
            Advance Clearance
          </button>
          <button
            type="button"
            onClick={onOpenRecords}
            className="border border-panel-border bg-black/20 px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-text-secondary transition-colors hover:border-accent-gold/45 hover:text-accent-gold"
          >
            Records
          </button>
        </div>

        <div className="mt-4">
          <ConsequenceStrip state={state} onOpenRecords={onOpenRecords} />
        </div>
      </aside>
    </section>
  );
}
