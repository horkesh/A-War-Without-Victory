/**
 * Army detail panel (Phase 3 remainder). Shows when a faction is selected via header click.
 * Displays faction-level summary: total personnel, corps, militia pools, casualties.
 */
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import { getFactionArmyCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { getPanelRailStyle } from './panelRail';

const FACTION_DISPLAY: Record<string, string> = {
  RS: 'Republika Srpska (VRS)',
  RBiH: 'Republic of Bosnia and Herzegovina (ARBiH)',
  HRHB: 'Croatian Republic of Herzeg-Bosnia (HVO)',
};

interface ArmyDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function ArmyDetail({ railSlot }: ArmyDetailProps) {
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  if (!selectedArmyId || !loadedGameState) return null;

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

  // Army HQ combat summary (faction-wide aggregate)
  const armyHq = formations.find((f) => f.kind === 'army_hq');
  const armyCombatSummary = armyHq?.combatSummary;

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl"
      style={getPanelRailStyle(railSlot, '20rem', 'left')}
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

        {/* Army Commander */}
        {(() => {
          const commander = getFactionArmyCommander(faction, loadedGameState);
          if (!commander) return null;
          return <OfficerProfile officer={commander} label="Army Commander" className="mb-4" />;
        })()}

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

        {/* Combat Summary */}
        {armyCombatSummary && (
          <CombatSummaryPanel
            summary={armyCombatSummary}
            formations={loadedGameState.formations}
            onSelectFormation={setSelectedFormationId}
          />
        )}

        {/* Corps list (clickable OOB) */}
        {corpsFormations.length > 0 && (
          <div className="border-t border-panel-border pt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-text-secondary text-xs">Order of Battle (Corps)</span>
              <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-text-primary flex items-center gap-1">
                <span>{corpsFormations.length} HQ</span>
              </span>
            </div>

            <div className="space-y-[1px] max-h-[250px] overflow-auto border-l border-panel-border/50 ml-1.5 pl-2 mt-2">
              {corpsFormations
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((f) => {
                  const corpsSubordinates = brigades.filter((b) => b.corps_id === f.id);
                  const corpsPersonnel = corpsSubordinates.reduce((sum, b) => sum + (b.personnel ?? 0), 0);
                  const cs = f.combatSummary;

                  // Simple corps readiness check based on subordinate exhaustion
                  let lightColor = '#55d48a'; // Green
                  if (f.corpsExhaustion != null && f.corpsExhaustion > 0.6) {
                    lightColor = '#d45555'; // Red
                  } else if (f.corpsExhaustion != null && f.corpsExhaustion > 0.3) {
                    lightColor = '#d4d455'; // Yellow
                  }

                  return (
                    <button
                      key={f.id}
                      type="button"
                      className="w-full relative flex flex-col py-1.5 px-1.5 hover:bg-panel-hover rounded group text-left transition-colors"
                      onClick={() => useGameStore.setState({
                        selectedArmyId,
                        selectedCorpsId: f.id,
                        selectedCorpsFrontSectorId: null,
                        selectedFormationId: null,
                        selectedOperationKey: null,
                        selectedOsid: null,
                      })}
                      onMouseEnter={() => {
                        const osids = corpsSubordinates
                          .map((b) => b.location_osid)
                          .filter((o): o is string => Boolean(o));
                        setHoveredOsids(osids);
                      }}
                      onMouseLeave={() => setHoveredOsids([])}
                    >
                      {/* Tree visual connector */}
                      <div className="absolute -left-2 top-3 w-2 h-[1px] bg-panel-border/50 group-hover:bg-panel-border transition-colors" />

                      <div className="flex justify-between w-full items-center">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <div
                            className="w-2 h-2 rounded-full shrink-0 border border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                            style={{ backgroundColor: lightColor }}
                          />
                          <span className="truncate text-text-primary text-[11px] font-medium group-hover:text-interactive transition-colors">{f.name}</span>
                        </div>
                        <span className="text-text-secondary tabular-nums text-[10px] shrink-0 font-mono">
                          {corpsSubordinates.length}b &middot; {corpsPersonnel.toLocaleString()}
                        </span>
                      </div>

                      {cs && cs.battles_fought > 0 && (
                        <div className="text-[9px] text-text-secondary tabular-nums ml-4 mt-1 flex gap-2">
                          <span>WR: {(cs.win_rate * 100).toFixed(0)}%</span>
                          <span>C: {(cs.total_casualties_taken / 1000).toFixed(1)}k</span>
                        </div>
                      )}
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
