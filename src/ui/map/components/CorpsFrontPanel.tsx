import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { buildCorpsColorMap } from '../map/builders/buildCorpsFrontLinesGeoJSON';

export function CorpsFrontPanel() {
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  if (!selectedSectorId || !loadedGameState?.corpsFrontSectors) return null;

  const sector = loadedGameState.corpsFrontSectors.find((s) => s.sector_id === selectedSectorId);
  if (!sector) return null;

  const corpsFormation = loadedGameState.formations.find((f) => f.id === sector.corps_id);
  const corpsStance = corpsFormation?.corpsStance ?? 'unknown';
  const corpsColorMap = buildCorpsColorMap(loadedGameState.corpsFrontSectors);
  const corpsColor = corpsColorMap[sector.corps_id] ?? '#888';

  const assignedFormations = sector.assigned_brigade_ids
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

  const reserveFormations = sector.reserve_brigade_ids
    .map((id) => loadedGameState.formations.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => f != null);

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
            Corps Sector
          </span>
        </div>
        <button
          onClick={() => setSelectedSectorId(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-4 overflow-auto text-[12px]">
        {/* Corps identity */}
        <div className="mb-3">
          <div className="font-semibold text-text-primary text-[13px]">
            {sector.display_name}
          </div>
          <div className="text-text-secondary mt-0.5">
            <span className={FACTION_COLORS[sector.faction] ?? 'text-text-primary'}>
              {sector.faction}
            </span>
            {' · '}
            <span className="capitalize">{corpsStance}</span>
          </div>
        </div>

        {/* Metrics */}
        <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-text-secondary">Front length</span>
            <span className="text-text-primary tabular-nums">
              {sector.length_edges} edges · {sector.sub_segment_count} segment{sector.sub_segment_count !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Density</span>
            <span className="text-text-primary tabular-nums">
              {sector.density.toFixed(2)} ({sector.assigned_brigade_ids.length} / {sector.length_edges})
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Threat ratio</span>
            <span className="text-text-primary tabular-nums">{sector.threat_ratio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Def. power</span>
            <span className="text-text-primary tabular-nums">{Math.round(sector.defensive_power).toLocaleString()}</span>
          </div>
        </div>

        {/* Opposing */}
        {sector.opposing_factions.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <span className="text-text-secondary">Opposing: </span>
            {sector.opposing_factions.map((f, i) => (
              <span key={f}>
                {i > 0 && ', '}
                <span className={FACTION_COLORS[f] ?? 'text-text-primary'}>{f}</span>
              </span>
            ))}
          </div>
        )}

        {/* Assigned brigades */}
        {assignedFormations.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3">
            <div className="text-text-secondary mb-1">
              Assigned ({assignedFormations.length}):
            </div>
            <div className="space-y-0.5 max-h-[200px] overflow-auto">
              {assignedFormations.map((f) => (
                <div key={f.id} className="flex justify-between text-text-primary">
                  <span className="truncate mr-2">{f.name}</span>
                  <span className="text-text-secondary tabular-nums shrink-0">
                    {f.personnel != null ? f.personnel.toLocaleString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reserve brigades */}
        {reserveFormations.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="text-text-secondary mb-1">
              Reserve ({reserveFormations.length}):
            </div>
            <div className="space-y-0.5 max-h-[120px] overflow-auto">
              {reserveFormations.map((f) => (
                <div key={f.id} className="flex justify-between text-text-primary">
                  <span className="truncate mr-2">{f.name}</span>
                  <span className="text-text-secondary tabular-nums shrink-0">
                    {f.personnel != null ? f.personnel.toLocaleString() : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
