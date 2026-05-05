import { useEffect, useMemo, useState } from 'react';
import type { RecruitmentCatalogBrigade } from '../desktop/types';
import { Z } from '../../shared/zIndex';
import { Modal } from '../../shared/Modal';

interface RecruitmentModalProps {
  isOpen: boolean;
  loading: boolean;
  applying: boolean;
  playerFaction?: string | null;
  brigades: RecruitmentCatalogBrigade[];
  onClose: () => void;
  onRefresh: () => void;
  onApply: (brigadeId: string, equipmentClass: string) => void;
}

export function RecruitmentModal({
  isOpen,
  loading,
  applying,
  playerFaction,
  brigades,
  onClose,
  onRefresh,
  onApply,
}: RecruitmentModalProps) {
  const available = useMemo(
    () => brigades.filter((b) => !playerFaction || b.faction === playerFaction),
    [brigades, playerFaction]
  );

  const [selectedBrigadeId, setSelectedBrigadeId] = useState('');
  const [equipmentClass, setEquipmentClass] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const first = available[0];
    setSelectedBrigadeId(first?.id ?? '');
    setEquipmentClass(first?.default_equipment_class ?? 'light');
  }, [isOpen, available]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      zIndex={Z.OVERLAY_LIGHT}
      ariaLabelledBy="recruitment-title"
      backdropClassName="bg-black/60"
      panelClassName="w-full max-w-xl mx-4 bg-panel-card border border-panel-border rounded-lg shadow-xl overflow-hidden"
    >
      <>
        <div className="px-4 py-3 border-b border-panel-border bg-panel-bg flex items-center justify-between">
          <h2 id="recruitment-title" className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Recruitment
          </h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || applying}
            className="px-2 py-1 text-xs font-mono uppercase tracking-wide bg-panel-bg hover:bg-panel-hover text-text-primary border border-panel-border rounded disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
        <div className="p-4 space-y-3">
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 w-full bg-panel-card border border-panel-border rounded panel-shimmer" />
              <div className="h-10 w-full bg-panel-card border border-panel-border rounded panel-shimmer" />
            </div>
          ) : available.length === 0 ? (
            <p className="text-xs text-text-secondary">No brigades available for recruitment.</p>
          ) : (
            <>
              <label className="block text-xs text-text-secondary">
                Brigade
                <select
                  value={selectedBrigadeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedBrigadeId(id);
                    const selected = available.find((b) => b.id === id);
                    setEquipmentClass(selected?.default_equipment_class ?? 'light');
                  }}
                  className="mt-1 w-full px-2 py-1 bg-panel-bg border border-panel-border rounded text-text-primary"
                >
                  {available.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.faction}) - cap {b.capital_cost}, man {b.manpower_cost}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-text-secondary">
                Equipment class
                <input
                  value={equipmentClass}
                  onChange={(e) => setEquipmentClass(e.target.value)}
                  className="mt-1 w-full px-2 py-1 bg-panel-bg border border-panel-border rounded text-text-primary"
                />
              </label>
            </>
          )}
        </div>
        <div className="px-4 py-3 border-t border-panel-border bg-panel-bg flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-sans text-text-secondary hover:text-interactive hover:bg-panel-hover rounded border border-panel-border"
          >
            Close
          </button>
          <button
            type="button"
            disabled={loading || applying || !selectedBrigadeId || !equipmentClass.trim()}
            onClick={() => onApply(selectedBrigadeId, equipmentClass.trim())}
            className="px-3 py-1.5 text-xs font-sans bg-interactive text-white hover:bg-panel-hover rounded border border-panel-border disabled:opacity-50"
          >
            {applying ? 'Recruiting...' : 'Recruit'}
          </button>
        </div>
      </>
    </Modal>
  );
}
