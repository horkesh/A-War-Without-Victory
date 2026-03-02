/**
 * Army detail panel (Phase 3 remainder). Shows when a faction is selected via header click.
 * Displays faction-level summary: total personnel, corps, militia pools, casualties.
 */
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';

const FACTION_DISPLAY: Record<string, string> = {
  RS: 'Republika Srpska (VRS)',
  RBiH: 'Republic of Bosnia and Herzegovina (ARBiH)',
  HRHB: 'Croatian Republic of Herzeg-Bosnia (HVO)',
};

export function ArmyDetail() {
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  // Priority: Formation > Sector > Corps > Army
  if (selectedFormationId || selectedSectorId || selectedCorpsId || !selectedArmyId || !loadedGameState) return null;

  const faction = selectedArmyId;
  const formations = loadedGameState.formations.filter((f) => f.faction === faction);
  const brigades = formations.filter((f) => f.kind === 'brigade');
  const corpsFormations = formations.filter((f) => f.kind === 'corps' || f.kind === 'corps_asset');
  const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);

  // Militia pools
  const pools = loadedGameState.militiaPools?.filter((p) => p.faction === faction) ?? [];
  const totalPoolAvailable = pools.reduce((sum, p) => sum + p.available, 0);
  const totalPoolCommitted = pools.reduce((sum, p) => sum + p.committed, 0);
  const totalPoolExhausted = pools.reduce((sum, p) => sum + p.exhausted, 0);

  // Sectors
  const sectors = loadedGameState.corpsFrontSectors?.filter((s) => s.faction === faction) ?? [];

  // Casualties — ledger keyed by formation ID; match via faction's formation IDs
  const factionFormationIds = new Set(formations.map((f) => f.id));
  const casualtyEntries = loadedGameState.casualtyLedger
    ? Object.entries(loadedGameState.casualtyLedger).filter(([id]) => factionFormationIds.has(id)).map(([, v]) => v)
    : [];
  const totalKIA = casualtyEntries.reduce((sum, c) => sum + (c.killed ?? 0), 0);
  const totalWIA = casualtyEntries.reduce((sum, c) => sum + (c.wounded ?? 0), 0);

  // Exhaustion (faction average)
  const exhaustionValues = loadedGameState.phaseIiExhaustion?.[faction];
  const exhaustionDisplay = exhaustionValues != null
    ? (typeof exhaustionValues === 'number' ? exhaustionValues.toFixed(1) : '—')
    : '—';

  // Army stance
  const stance = loadedGameState.armyStance?.[faction] ?? 'unknown';

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
        <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
          Army
        </span>
        <button
          onClick={() => setSelectedArmyId(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          &#x2715;
        </button>
      </div>

      <div className="p-4 overflow-auto text-[12px]">
        {/* Identity */}
        <div className="mb-3">
          <div className={`font-semibold text-[13px] ${FACTION_COLORS[faction] ?? 'text-text-primary'}`}>
            {faction}
          </div>
          <div className="text-text-secondary mt-0.5 text-[11px]">
            {FACTION_DISPLAY[faction] ?? faction}
          </div>
          <div className="text-text-secondary mt-0.5">
            <span className="capitalize">{stance}</span>
            {exhaustionDisplay !== '—' && (
              <span> &middot; Exhaustion: {exhaustionDisplay}</span>
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
            <span className="text-text-primary tabular-nums">{brigades.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Corps</span>
            <span className="text-text-primary tabular-nums">{corpsFormations.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Sectors</span>
            <span className="text-text-primary tabular-nums">{sectors.length}</span>
          </div>
        </div>

        {/* Militia Pools */}
        {pools.length > 0 && (
          <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
            <div className="text-text-secondary mb-1">Militia Pools:</div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Available</span>
              <span className="text-text-primary tabular-nums">{totalPoolAvailable.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Committed</span>
              <span className="text-text-primary tabular-nums">{totalPoolCommitted.toLocaleString()}</span>
            </div>
            {totalPoolExhausted > 0 && (
              <div className="flex justify-between">
                <span className="text-text-secondary">Exhausted</span>
                <span className="text-red-400 tabular-nums">{totalPoolExhausted.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}

        {/* Casualties */}
        {(totalKIA > 0 || totalWIA > 0) && (
          <div className="border-t border-panel-border pt-2 mb-3 space-y-1">
            <div className="text-text-secondary mb-1">Casualties:</div>
            <div className="flex justify-between">
              <span className="text-text-secondary">KIA</span>
              <span className="text-red-400 tabular-nums">{totalKIA.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">WIA</span>
              <span className="text-amber-300 tabular-nums">{totalWIA.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Corps list (clickable) */}
        {corpsFormations.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="text-text-secondary mb-1">Corps ({corpsFormations.length}):</div>
            <div className="space-y-0.5 max-h-[250px] overflow-auto">
              {corpsFormations
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((f) => {
                  const corpsSubordinates = brigades.filter((b) => b.corps_id === f.id);
                  const corpsPersonnel = corpsSubordinates.reduce((sum, b) => sum + (b.personnel ?? 0), 0);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full flex justify-between text-text-primary hover:text-interactive transition-colors text-left"
                      onClick={() => setSelectedCorpsId(f.id)}
                      onMouseEnter={() => {
                        const osids = corpsSubordinates
                          .map((b) => b.location_osid)
                          .filter((o): o is string => Boolean(o));
                        setHoveredOsids(osids);
                      }}
                      onMouseLeave={() => setHoveredOsids([])}
                    >
                      <span className="truncate mr-2">{f.name}</span>
                      <span className="text-text-secondary tabular-nums shrink-0">
                        {corpsSubordinates.length}b &middot; {corpsPersonnel.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
