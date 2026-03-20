/**
 * Army detail panel. Shows when a faction is selected via header click.
 * Tabs: Overview · Forces · Manpower · Combat
 */
import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FACTION_COLORS } from '../utils/theme';
import { CombatSummaryPanel } from './CombatSummaryPanel';
import { getFactionArmyCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';
import { getPanelRailStyle } from './panelRail';
import { TabBar } from './TabBar';
import { aggregateEffectiveness } from '../utils/combatEffectiveness';
import { Icon } from './icons/Icon';

type ArmyTab = 'overview' | 'forces' | 'manpower' | 'combat';

const FACTION_DISPLAY: Record<string, string> = {
  RS:   'Republika Srpska (VRS)',
  RBiH: 'Republic of Bosnia and Herzegovina (ARBiH)',
  HRHB: 'Croatian Republic of Herzeg-Bosnia (HVO)',
};

interface ArmyDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function ArmyDetail({ railSlot }: ArmyDetailProps) {
  const [activeTab, setActiveTab] = useState<ArmyTab>('overview');
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const setSelectedArmyId = useGameStore((s) => s.setSelectedArmyId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  const faction = selectedArmyId;

  const formations = useMemo(
    () => (faction && loadedGameState ? loadedGameState.formations.filter((f) => f.faction === faction) : []),
    [faction, loadedGameState],
  );
  const brigades = useMemo(() => formations.filter((f) => f.kind === 'brigade'), [formations]);
  const corpsFormations = useMemo(
    () => formations.filter((f) => f.kind === 'corps' || f.kind === 'corps_asset'),
    [formations],
  );
  const brigadesByCorps = useMemo(
    () => brigades.reduce<Map<string, typeof brigades>>((m, b) => {
      if (b.corps_id) {
        if (!m.has(b.corps_id)) m.set(b.corps_id, []);
        m.get(b.corps_id)!.push(b);
      }
      return m;
    }, new Map()),
    [brigades],
  );
  // HQ-level brigades (subordinated to army_hq, not a corps)
  const armyHqIds = useMemo(
    () => new Set(formations.filter(f => f.kind === 'army_hq').map(f => f.id)),
    [formations],
  );
  const hqBrigades = useMemo(
    () => brigades.filter(b => b.corps_id && armyHqIds.has(b.corps_id)),
    [brigades, armyHqIds],
  );

  if (!faction || !loadedGameState) return null;

  const totalPersonnel = brigades.reduce((sum, f) => sum + (f.personnel ?? 0), 0);

  const pools = loadedGameState.militiaPools?.filter((p) => p.faction === faction) ?? [];
  const totalPoolAvailable = pools.reduce((sum, p) => sum + p.available, 0);
  const totalPoolCommitted = pools.reduce((sum, p) => sum + p.committed, 0);
  const totalPoolExhausted = pools.reduce((sum, p) => sum + p.exhausted, 0);

  const sectors = loadedGameState.corpsFrontSectors?.filter((s) => s.faction === faction) ?? [];

  const factionFormationIds = new Set(formations.map((f) => f.id));
  const casualtyEntries = loadedGameState.casualtyLedger
    ? Object.entries(loadedGameState.casualtyLedger)
        .filter(([id]) => factionFormationIds.has(id))
        .map(([, v]) => v)
    : [];
  const totalKIA = casualtyEntries.reduce((sum, c) => sum + (c.killed ?? 0), 0);
  const totalWIA = casualtyEntries.reduce((sum, c) => sum + (c.wounded ?? 0), 0);

  const exhaustionValues = loadedGameState.warPhaseExhaustion?.[faction];
  const exhaustionDisplay = exhaustionValues != null
    ? (typeof exhaustionValues === 'number' ? exhaustionValues.toFixed(1) : '—')
    : '—';

  const stance = loadedGameState.armyStance?.[faction] ?? 'unknown';
  // Aggregate combat summary from all subordinate corps (army HQs don't fight)
  const armyCombatSummary = useMemo(() => {
    const corpsSummaries = corpsFormations
      .map((c) => c.combatSummary)
      .filter((s): s is NonNullable<typeof s> => !!s && s.battles_fought > 0);
    if (corpsSummaries.length === 0) return undefined;
    const agg = {
      battles_fought: 0, victories: 0, defeats: 0, stalemates: 0,
      battles_as_attacker: 0, battles_as_defender: 0,
      total_casualties_taken: 0, total_casualties_inflicted: 0,
      total_osids_captured: 0, total_osids_lost: 0,
      win_rate: 0, casualty_exchange_ratio: 0,
      current_personnel: 0, peak_aggregate_personnel: 0, nadir_aggregate_personnel: 0,
      arc_distribution: {} as Record<string, number>,
      brigade_count: 0, active_brigade_count: 0,
      most_casualties_brigade_id: null as string | null,
      most_victories_brigade_id: null as string | null,
    };
    for (const s of corpsSummaries) {
      agg.battles_fought += s.battles_fought;
      agg.victories += s.victories;
      agg.defeats += s.defeats;
      agg.stalemates += s.stalemates;
      agg.battles_as_attacker += s.battles_as_attacker;
      agg.battles_as_defender += s.battles_as_defender;
      agg.total_casualties_taken += s.total_casualties_taken;
      agg.total_casualties_inflicted += s.total_casualties_inflicted;
      agg.total_osids_captured += s.total_osids_captured;
      agg.total_osids_lost += s.total_osids_lost;
      agg.current_personnel += s.current_personnel;
      agg.peak_aggregate_personnel += s.peak_aggregate_personnel;
      agg.nadir_aggregate_personnel += s.nadir_aggregate_personnel;
      agg.brigade_count += s.brigade_count;
      agg.active_brigade_count += s.active_brigade_count;
      for (const [arc, count] of Object.entries(s.arc_distribution)) {
        agg.arc_distribution[arc] = (agg.arc_distribution[arc] ?? 0) + count;
      }
    }
    agg.win_rate = agg.battles_fought > 0 ? agg.victories / agg.battles_fought : 0;
    agg.casualty_exchange_ratio = agg.total_casualties_inflicted > 0
      ? agg.total_casualties_taken / agg.total_casualties_inflicted : 0;
    // Pick most_casualties/most_victories from first corps that has them
    for (const s of corpsSummaries) {
      if (!agg.most_casualties_brigade_id && s.most_casualties_brigade_id) agg.most_casualties_brigade_id = s.most_casualties_brigade_id;
      if (!agg.most_victories_brigade_id && s.most_victories_brigade_id) agg.most_victories_brigade_id = s.most_victories_brigade_id;
    }
    return agg;
  }, [corpsFormations]);

  const tabs = [
    { id: 'overview'  as const, label: 'Overview' },
    { id: 'forces'    as const, label: 'Forces',   count: corpsFormations.length },
    { id: 'manpower'  as const, label: 'Manpower' },
    { id: 'combat'    as const, label: 'Combat' },
  ];

  return (
    <div
      className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
      style={getPanelRailStyle(railSlot, '20rem', 'left')}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`font-sans text-xs uppercase tracking-wide font-semibold ${FACTION_COLORS[faction] ?? 'text-accent-gold'}`}>
            {faction}
          </span>
          <span className="text-text-secondary text-[10px] truncate hidden sm:inline">
            {FACTION_DISPLAY[faction] ?? faction}
          </span>
        </div>
        <button
          onClick={() => setSelectedArmyId(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none shrink-0 ml-2"
        >
          &#x2715;
        </button>
      </div>

      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab content */}
      <div className="flex-1 overflow-auto min-h-0 text-[12px]">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="p-4 space-y-4">
            {/* Identity */}
            <div>
              <div className="text-text-secondary text-[11px]">
                {FACTION_DISPLAY[faction] ?? faction}
              </div>
              <div className="text-text-secondary mt-1">
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
              return <OfficerProfile officer={commander} label="Army Commander" />;
            })()}

            {/* Metrics */}
            <div className="border-t border-panel-border pt-3 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-text-secondary flex items-center gap-1"><Icon name="personnel" size={12} /> Personnel</span>
                <span className="text-text-primary tabular-nums">{totalPersonnel.toLocaleString()}</span>
              </div>
              {(() => {
                const agg = aggregateEffectiveness(brigades);
                if (agg.brigadeCount === 0) return null;
                const gradeColor = agg.grade === 'A' ? '#56d364' : agg.grade === 'B' ? '#e8c56d' : agg.grade === 'C' ? '#e8a838' : '#f47068';
                return (
                  <div className="flex justify-between">
                    <span className="text-text-secondary flex items-center gap-1"><Icon name="star" size={12} /> Combat Eff.</span>
                    <span className="tabular-nums">
                      <span className="text-text-primary">{agg.totalEffectiveness.toLocaleString()}</span>
                      <span className="text-[10px] ml-1 font-bold" style={{ color: gradeColor }}>{agg.grade}</span>
                      {agg.ineffectiveCount > 0 && (
                        <span className="text-[9px] text-red-400 ml-1">({agg.ineffectiveCount} weak)</span>
                      )}
                      {agg.disruptedCount > 0 && (
                        <span className="text-[9px] text-amber-400 ml-1">({agg.disruptedCount} disrupted)</span>
                      )}
                    </span>
                  </div>
                );
              })()}
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
          </div>
        )}

        {/* ── FORCES ── */}
        {activeTab === 'forces' && (
          <div className="p-4 space-y-4">
            {/* HQ Units */}
            {hqBrigades.length > 0 && (
              <div>
                <div className="text-[9px] uppercase font-bold text-text-secondary tracking-wider mb-1.5 border-b border-panel-border pb-1">
                  HQ Reserve Units ({hqBrigades.length})
                </div>
                <div className="space-y-[1px]">
                  {hqBrigades.sort((a, b) => a.name.localeCompare(b.name)).map(b => {
                    const loanState = b.eliteLoanState;
                    const isOnLoan = loanState?.on_loan;
                    const loanedCorps = isOnLoan && loanState?.loaned_to_corps
                      ? formations.find(f => f.id === loanState.loaned_to_corps)
                      : null;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        className="w-full flex items-center justify-between py-1 px-1.5 rounded hover:bg-panel-hover transition-colors text-left text-[11px]"
                        onClick={() => useGameStore.setState({
                          selectedArmyId,
                          selectedCorpsId: null,
                          selectedFormationId: b.id,
                          selectedOperationKey: null,
                          selectedOsid: null,
                          selectedCorpsFrontSectorId: null,
                        })}
                        onMouseEnter={() => b.location_osid && setHoveredOsids([b.location_osid])}
                        onMouseLeave={() => setHoveredOsids([])}
                      >
                        <span className="font-medium text-text-primary truncate">{b.name}</span>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isOnLoan && loanedCorps && (
                            <span className="text-[9px] text-accent-gold bg-accent-gold/10 px-1 rounded border border-accent-gold/20">
                              → {loanedCorps.name}
                            </span>
                          )}
                          {!isOnLoan && (
                            <span className="text-[9px] text-text-secondary italic">Available</span>
                          )}
                          <span className="text-text-secondary tabular-nums text-[10px]">
                            {b.personnel?.toLocaleString() ?? '—'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Corps */}
            {corpsFormations.length === 0 && hqBrigades.length === 0 ? (
              <div className="text-text-secondary italic text-xs">No formations.</div>
            ) : corpsFormations.length === 0 ? null : (
              <div className="space-y-[1px] border-l border-panel-border/50 ml-1.5 pl-2">
                {[...corpsFormations]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((f) => {
                    const corpsSubordinates = brigadesByCorps.get(f.id) ?? [];
                    const corpsPersonnel = corpsSubordinates.reduce((sum, b) => sum + (b.personnel ?? 0), 0);
                    const cs = f.combatSummary;

                    let lightColor = '#55d48a';
                    if (f.corpsExhaustion != null && f.corpsExhaustion > 0.6) {
                      lightColor = '#d45555';
                    } else if (f.corpsExhaustion != null && f.corpsExhaustion > 0.3) {
                      lightColor = '#d4d455';
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
                        <div className="absolute -left-2 top-3 w-2 h-[1px] bg-panel-border/50 group-hover:bg-panel-border transition-colors" />
                        <div className="flex justify-between w-full items-center">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div
                              className="w-2 h-2 rounded-full shrink-0 border border-black/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]"
                              style={{ backgroundColor: lightColor }}
                            />
                            <span className="truncate text-text-primary text-[11px] font-medium group-hover:text-interactive transition-colors">
                              {f.name}
                            </span>
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
            )}
          </div>
        )}

        {/* ── MANPOWER ── */}
        {activeTab === 'manpower' && (
          <div className="p-4 space-y-4">
            {/* Militia Pools */}
            {pools.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-2">
                  Militia Pools
                </div>
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

            {/* Exhaustion */}
            {exhaustionDisplay !== '—' && (
              <div className="border-t border-panel-border pt-3 space-y-1.5">
                <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-2">
                  War Exhaustion
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Index</span>
                  <span className="text-text-primary tabular-nums">{exhaustionDisplay}</span>
                </div>
              </div>
            )}

            {/* Casualties */}
            {(totalKIA > 0 || totalWIA > 0) && (
              <div className="border-t border-panel-border pt-3 space-y-1.5">
                <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold mb-2">
                  Casualties
                </div>
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

            {pools.length === 0 && exhaustionDisplay === '—' && totalKIA === 0 && totalWIA === 0 && (
              <div className="text-text-secondary italic text-xs">No manpower data available.</div>
            )}
          </div>
        )}

        {/* ── COMBAT ── */}
        {activeTab === 'combat' && (
          <div className="p-4">
            {armyCombatSummary ? (
              <CombatSummaryPanel
                summary={armyCombatSummary}
                formations={loadedGameState.formations}
                onSelectFormation={setSelectedFormationId}
              />
            ) : (
              <div className="text-text-secondary italic text-xs">No combat record yet.</div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
