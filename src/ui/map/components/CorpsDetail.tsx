/**
 * Corps detail panel (Phase D.1). Shows when a corps is selected via header click.
 * Displays corps identity, stance, personnel, sectors, subordinate brigades.
 */
import { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { getOperationId } from '../utils/operations';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { useIPC } from '../desktop/useIPC';
import { DETAIL_PANEL_STYLE, SECONDARY_PANEL_STYLE } from './panelRail';
import { CombatSummaryPanel } from './CombatSummaryPanel';

function formatRawId(id: string): string {
  if (!id) return '';
  return id
    .replace(/^(RS|RBiH|HRHB)_/i, '')
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function CorpsDetail() {
  const ipc = useIPC();
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setOpsPlanningModalOpen = useGameStore((s) => s.setOpsPlanningModalOpen);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Derived values needed by hooks — computed unconditionally so hooks are always called in the same order
  const corpsFormation = loadedGameState?.formations.find(
    (f) => f.id === selectedCorpsId && (f.kind === 'corps' || f.kind === 'corps_asset')
  ) ?? null;
  const corpsSectors = useMemo(
    () => loadedGameState?.corpsFrontSectors?.filter((s) => s.corps_id === selectedCorpsId) ?? [],
    [loadedGameState?.corpsFrontSectors, selectedCorpsId]
  );


  useEffect(() => {
    setOrdersPanelOpen(false);
  }, [selectedCorpsId]);

  // Hide when formation or sector panel would show (priority: Formation > Sector > Corps)
  if (operationsPanelOpen || selectedFormationId || selectedSectorId || !selectedCorpsId) return null;

  if (!loadedGameState || !corpsFormation) {
    return (
      <div
        className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
        style={DETAIL_PANEL_STYLE}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="p-4 space-y-4">
          <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
          <div className="space-y-2">
            <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-4 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-4 w-2/3 bg-panel-card rounded panel-shimmer" />
          </div>
          <div className="h-32 w-full bg-panel-card rounded panel-shimmer" />
        </div>
      </div>
    );
  }

  const corpsColorMap = loadedGameState.corpsFrontSectors
    ? buildCorpsColorMap(loadedGameState.corpsFrontSectors)
    : {};
  const corpsColor = corpsColorMap[selectedCorpsId] ?? '#888';

  const subordinates = loadedGameState.formations.filter(
    (f) => f.corps_id === selectedCorpsId && f.kind === 'brigade'
  );
  const totalPersonnel = subordinates.reduce((sum, f) => sum + (f.personnel ?? 0), 0);

  // Active operations for this corps
  const corpsOps = loadedGameState.operations?.filter(
    (op) => op.corps_id === selectedCorpsId
  ) ?? [];

  const handleOpenOpsPlanning = () => {
    const primarySector = corpsSectors[0];
    if (primarySector) {
      setSelectedCorpsFrontSectorId(primarySector.sector_id);
      setOpsPlanningModalOpen(true);
    } else {
      setLoadError('Ops Planning requires the Corps to be assigned to a front sector.');
    }
  };

  const stageCorpsStance = async (stance: string) => {
    if (!ipc.isAvailable) {
      setLoadError('Corps orders are available in desktop mode only.');
      return;
    }
    const result = await ipc.stageCorpsStanceOrder(selectedCorpsId, stance);
    if (!result.ok) {
      setLoadError(result.error ?? 'Failed to stage corps stance order.');
    }
  };

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={DETAIL_PANEL_STYLE}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: corpsColor }}
          />
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Corps
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setOrdersPanelOpen((v) => !v)}
            className="text-[11px] font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
          >
            {ordersPanelOpen ? 'Hide orders' : 'Orders'}
          </button>
          <button
            onClick={() => setSelectedCorpsId(null)}
            className="text-text-secondary hover:text-interactive text-sm leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-4 overflow-auto text-[12px]">
        {/* Identity */}
        <div className="mb-3">
          <div className="font-semibold text-text-primary text-[13px]">
            {corpsFormation.name === corpsFormation.id ? formatRawId(corpsFormation.name) : corpsFormation.name}
          </div>
          <div className="text-text-secondary mt-0.5">
            <span className={FACTION_COLORS[corpsFormation.faction] ?? 'text-text-primary'}>
              {corpsFormation.faction}
            </span>
            {' · '}
            <span className="capitalize">{corpsFormation.corpsStance ?? 'unknown'}</span>
            {corpsFormation.corpsExhaustion != null && (
              <span className="text-text-secondary"> · Exhaustion: {corpsFormation.corpsExhaustion.toFixed(1)}</span>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">Personnel</span>
            <span className="text-text-primary tabular-nums">{totalPersonnel.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Brigades</span>
            <span className="text-text-primary tabular-nums">{subordinates.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Sectors</span>
            <span className="text-text-primary tabular-nums">{corpsSectors.length}</span>
          </div>
          {corpsFormation.corpsOgSlots != null && (
            <div className="flex justify-between">
              <span className="text-text-secondary">OG Slots</span>
              <span className="text-text-primary tabular-nums">
                {corpsFormation.corpsActiveOgIds?.length ?? 0}/{corpsFormation.corpsOgSlots}
              </span>
            </div>
          )}
        </div>

        {/* Combat Summary */}
        {corpsFormation.combatSummary && (
          <CombatSummaryPanel
            summary={corpsFormation.combatSummary}
            formations={loadedGameState.formations}
            onSelectFormation={setSelectedFormationId}
          />
        )}

        {/* Sectors */}
        {corpsSectors.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <div className="text-text-secondary mb-1">Sectors ({corpsSectors.length}):</div>
            <div className="space-y-0.5 max-h-[150px] overflow-auto">
              {corpsSectors.map((s) => (
                <button
                  key={s.sector_id}
                  type="button"
                  onClick={() => setSelectedCorpsFrontSectorId(s.sector_id)}
                  className="w-full flex justify-between text-interactive hover:underline text-left"
                >
                  <span className="truncate mr-2">{s.display_name}</span>
                  <span className="text-text-secondary tabular-nums shrink-0">
                    Density: {s.density.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Operations */}
        {corpsOps.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <div className="text-text-secondary mb-1">Operations ({corpsOps.length}):</div>
            <div className="space-y-1">
              {corpsOps.map((op) => {
                const phaseBg = op.phase === 'execution' ? 'bg-red-800/60' : op.phase === 'planning' ? 'bg-yellow-700/60' : 'bg-neutral-600/60';
                return (
                  <div key={getOperationId(op)} className="rounded border border-panel-border bg-panel-card p-1.5">
                    <div className="font-semibold text-text-primary text-[11px]">{op.name}</div>
                    <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                      <span className={`px-1 py-0.5 rounded text-white uppercase font-semibold ${phaseBg}`}>
                        {op.phase}
                      </span>
                      <span className="text-text-secondary">{op.participating_brigade_count} brigades</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Subordinate Brigades */}
        {subordinates.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="text-text-secondary mb-1">Brigades ({subordinates.length}):</div>
            <div className="space-y-0.5 max-h-[200px] overflow-auto">
              {subordinates.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="w-full flex justify-between text-text-primary hover:text-interactive transition-colors text-left"
                  onClick={() => setSelectedFormationId(f.id)}
                  onMouseEnter={() => f.location_osid && setHoveredOsids([f.location_osid])}
                  onMouseLeave={() => setHoveredOsids([])}
                >
                  <span className="truncate mr-2">{f.name}</span>
                  <span className="text-text-secondary tabular-nums shrink-0">
                    {f.personnel != null ? f.personnel.toLocaleString() : '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {ordersPanelOpen && (
        <div
          className="panel-slide-in-right flex flex-col bg-panel-bg/96 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
          style={SECONDARY_PANEL_STYLE}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
            <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
              Corps Orders
            </span>
            <button
              onClick={() => setOrdersPanelOpen(false)}
              className="text-text-secondary hover:text-interactive text-sm leading-none"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-3 overflow-auto">
            <div className="text-[11px] text-text-secondary">{corpsFormation.name}</div>
            <div className="pt-1 border-t border-panel-border">
              <div className="text-[11px] text-text-secondary mb-1">Stance</div>
              <div className="flex flex-wrap gap-1">
                {['defensive', 'balanced', 'offensive', 'reorganize'].map((stance) => (
                  <button
                    key={stance}
                    type="button"
                    onClick={() => void stageCorpsStance(stance)}
                    className="text-[11px] font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                  >
                    {stance}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-1 border-t border-panel-border">
              <button
                type="button"
                onClick={handleOpenOpsPlanning}
                className="w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover"
              >
                Prepare operation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
