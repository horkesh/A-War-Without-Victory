import type { StartNewCampaignPayload } from '../desktop/types';
import { getFactionFlag, getArmyName } from '../utils/factionAssets';
import { AWWV_APP_VERSION } from '../utils/appVersion';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';
import { Icon } from './icons/Icon';

interface SidePickerOverlayProps {
  isOpen: boolean;
  starting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSelectFaction: (faction: StartNewCampaignPayload['playerFaction']) => void;
}

const FACTIONS: StartNewCampaignPayload['playerFaction'][] = ['RBiH', 'RS', 'HRHB'];

export function SidePickerOverlay({
  isOpen,
  starting,
  errorMessage,
  onClose,
  onSelectFaction,
}: SidePickerOverlayProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.OVERLAY_LIGHT}
      ariaLabelledBy="side-picker-title"
      backdropClassName="bg-black/60"
      panelClassName="w-full max-w-md mx-4 bg-panel-card border border-panel-border rounded-lg shadow-xl overflow-hidden"
    >
      <>
        <div className="px-4 py-3 border-b border-panel-border bg-panel-bg">
          <h2 id="side-picker-title" className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Choose your faction
          </h2>
        </div>
        <div className="p-4 space-y-2">
          {errorMessage && (
            <div className="rounded border border-red-500/40 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {errorMessage}
            </div>
          )}
          {FACTIONS.map((faction) => (
            <button
              key={faction}
              type="button"
              disabled={starting}
              onClick={() => onSelectFaction(faction)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded border border-panel-border bg-panel-bg hover:bg-panel-hover text-text-primary disabled:opacity-50 group transition-all"
            >
              {getFactionFlag(faction) && (
                <img src={getFactionFlag(faction)} alt="" className="w-10 h-7 object-cover rounded border border-white/5 opacity-80 group-hover:opacity-100 transition-opacity shadow-sm" />
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-wide">{faction}</span>
                {getArmyName(faction) && (
                  <span className="text-[10px] text-text-secondary uppercase">{getArmyName(faction)} Forces</span>
                )}
              </div>
            </button>
          ))}
          <div className="pt-2 border-t border-panel-border mt-2">
            <input
              type="file"
              id="map-file-input"
              accept=".json"
              aria-label="Load save file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                  try {
                    const json = JSON.parse(event.target?.result as string);
                    // We need a way to pass this back to App.tsx
                    // I'll add onManualLoad to props
                    (window as any).handleManualSaveLoad?.(json);
                  } catch (err) {
                    console.error('Failed to parse save file:', err);
                  }
                };
                reader.readAsText(file);
              }}
            />
            <button
              type="button"
              disabled={starting}
              onClick={() => document.getElementById('map-file-input')?.click()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded border border-dashed border-panel-border bg-panel-bg hover:bg-panel-hover text-text-secondary hover:text-interactive transition-all text-xs uppercase tracking-wider font-semibold"
            >
              <Icon name="locked" size={13} />
              <span>Load Save from Disk</span>
            </button>
            <button
              type="button"
              disabled={starting}
              onClick={() => (window as any).handleContinueLastRun?.()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-2 rounded border border-interactive/30 bg-interactive/10 hover:bg-interactive/20 text-interactive transition-all text-xs uppercase tracking-wider font-semibold"
            >
              <Icon name="transit" size={13} />
              <span>Continue (Last Run)</span>
            </button>
          </div>
        </div>
        <div className="px-4 py-3 border-t border-panel-border bg-panel-bg flex justify-between items-center">
          <div className="text-[10px] text-text-secondary italic">
            {AWWV_APP_VERSION}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-sans text-text-secondary hover:text-interactive hover:bg-panel-hover rounded border border-panel-border"
          >
            Close
          </button>
        </div>
      </>
    </Modal>
  );
}
