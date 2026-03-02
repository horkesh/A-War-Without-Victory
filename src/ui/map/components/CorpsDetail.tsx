/**
 * Corps detail panel (Phase D.1). Shows when a corps is selected via header click.
 * Displays corps identity, stance, personnel, sectors, subordinate brigades.
 */
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';
import { CombatSummaryPanel } from './CombatSummaryPanel';

export function CorpsDetail() {
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Hide when formation or sector panel would show (priority: Formation > Sector > Corps)
  if (selectedFormationId || selectedSectorId || !selectedCorpsId || !loadedGameState) return null;

  const corpsFormation = loadedGameState.formations.find(
    (f) => f.id === selectedCorpsId && (f.kind === 'corps' || f.kind === 'corps_asset')
  );
  if (!corpsFormation) return null;

  const corpsColorMap = loadedGameState.corpsFrontSectors
    ? buildCorpsColorMap(loadedGameState.corpsFrontSectors)
    : {};
  const corpsColor = corpsColorMap[selectedCorpsId] ?? '#888';

  const subordinates = loadedGameState.formations.filter(
    (f) => f.corps_id === selectedCorpsId && f.kind === 'brigade'
  );
  const totalPersonnel = subordinates.reduce((sum, f) => sum + (f.personnel ?? 0), 0);

  const corpsSectors = loadedGameState.corpsFrontSectors?.filter(
    (s) => s.corps_id === selectedCorpsId
  ) ?? [];

  // Active operations for this corps
  const corpsOps = loadedGameState.operations?.filter(
    (op) => op.corps_id === selectedCorpsId
  ) ?? [];

  return (
    <div
      className="flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={{
        position: 'absolute',
        right: '1rem',
        top: '3.5rem',
        bottom: '1rem',
        width: '20rem',
        zIndex: 50,
      }}
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
        <button
          onClick={() => setSelectedCorpsId(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-4 overflow-auto text-[12px]">
        {/* Identity */}
        <div className="mb-3">
          <div className="font-semibold text-text-primary text-[13px]">
            {corpsFormation.name}
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
                    d={s.density.toFixed(2)}
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
                  <div key={`${op.corps_id}-${op.name}`} className="rounded border border-panel-border bg-panel-card p-1.5">
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
    </div>
  );
}
