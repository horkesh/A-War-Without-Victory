import type { StartNewCampaignPayload } from '../desktop/types';

interface SidePickerOverlayProps {
  isOpen: boolean;
  starting: boolean;
  onClose: () => void;
  onSelectFaction: (faction: StartNewCampaignPayload['playerFaction']) => void;
}

const FACTIONS: StartNewCampaignPayload['playerFaction'][] = ['RBiH', 'RS', 'HRHB'];

export function SidePickerOverlay({
  isOpen,
  starting,
  onClose,
  onSelectFaction,
}: SidePickerOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="side-picker-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md mx-4 bg-panel-card border border-panel-border rounded-lg shadow-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-panel-border bg-panel-bg">
          <h2 id="side-picker-title" className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Choose your faction
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {FACTIONS.map((faction) => (
            <button
              key={faction}
              type="button"
              disabled={starting}
              onClick={() => onSelectFaction(faction)}
              className="w-full text-left px-3 py-2 rounded border border-panel-border bg-panel-bg hover:bg-panel-hover text-text-primary disabled:opacity-50"
            >
              {faction}
            </button>
          ))}
        </div>
        <div className="px-4 py-3 border-t border-panel-border bg-panel-bg flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-sans text-text-secondary hover:text-interactive hover:bg-panel-hover rounded border border-panel-border"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
