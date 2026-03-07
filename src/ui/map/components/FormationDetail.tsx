import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { FACTION_COLORS_SUBTLE } from '../utils/theme';
import { useIPC } from '../desktop/useIPC';
import { stagePostureOrderAction } from '../desktop/orderActions';
import { getPanelRailStyle, SECONDARY_PANEL_STYLE } from './panelRail';
import { turnToDateString, formatCombatOutcome, formatPosture, toTitleCase } from '../utils/formatters';
import { getArmyCrest } from '../utils/factionAssets';
import { getFormationCommander } from '../utils/officerUtils';
import { OfficerProfile } from './OfficerProfile';

const POSTURE_TOOLTIPS: Record<string, string> = {
  hold: '1.00x defense. No extra cohesion cost. Baseline holding posture.',
  defend: '1.25x defense. Moderate cohesion cost. Standard defensive stance.',
  defend_at_all_costs: '1.60x defense. High cohesion cost. Brigade fights to destruction.',
  elastic_defense: '1.10x defense. Preserves cohesion by yielding ground when needed.',
  counterattack: 'Defensive stance with local offensive bias after enemy contact.',
  dig_in: '1.35x defense when prepared. Builds fortifications over time.',
  attack: 'Offensive stance. Lower defense, higher attack willingness.',
  assault: 'Maximum offensive commitment. Highest casualties and cohesion burn.',
};


/**
 * Right panel when a formation marker is clicked: name, kind, faction, strength, fatigue, orders.
 */
interface FormationDetailProps {
  railSlot: 'primary' | 'secondary';
}

export function FormationDetail({ railSlot }: FormationDetailProps) {
  const ipc = useIPC();
  const [ordersPanelOpen, setOrdersPanelOpen] = useState(false);
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedArmyId = useGameStore((s) => s.selectedArmyId);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setOrderModeForFormation = useGameStore((s) => s.setOrderModeForFormation);
  const orderModeForFormation = useGameStore((s) => s.orderModeForFormation);
  const addStagedOrder = useGameStore((s) => s.addStagedOrder);
  const setLoadError = useGameStore((s) => s.setLoadError);

  useEffect(() => {
    setOrdersPanelOpen(false);
  }, [selectedFormationId]);

  if (operationsPanelOpen || !selectedFormationId) return null;

  const formation = loadedGameState?.formations.find((f) => f.id === selectedFormationId) ?? null;

  if (!loadedGameState || !formation) {
    return (
      <div
        className="panel-slide-in-right flex flex-col bg-panel-bg/95 backdrop-blur-sm border border-panel-border rounded-lg shadow-xl overflow-hidden"
        style={getPanelRailStyle(railSlot, '24rem')}
      >
        <div className="h-10 bg-panel-card border-b border-panel-border panel-shimmer" />
        <div className="p-4 space-y-4">
          <div className="h-4 w-1/2 bg-panel-card rounded panel-shimmer" />
          <div className="h-6 w-3/4 bg-panel-card rounded panel-shimmer" />
          <div className="space-y-2">
            <div className="h-3 w-full bg-panel-card rounded panel-shimmer" />
            <div className="h-3 w-full bg-panel-card rounded panel-shimmer" />
          </div>
          <div className="h-24 w-full bg-panel-card rounded panel-shimmer" />
        </div>
      </div>
    );
  }
  const operationOwningFormation = loadedGameState?.operations?.find(
    (operation) => operation.participating_brigade_ids?.includes(selectedFormationId)
  );
  const operationOwnershipOverridesHomeDefense = !!operationOwningFormation;
  // Per-formation casualty data is not available in LoadedGameState (ledger is per-faction).
  const attackOrder = loadedGameState?.attackOrders?.find(
    (o) => o.brigadeId === selectedFormationId
  );

  return (
    <div
      className="panel-power-on weathered-panel panel-slide-in-right flex flex-col rounded-lg shadow-xl overflow-hidden"
      style={getPanelRailStyle(railSlot, '24rem')}
    >
      <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
        <div className="flex items-center gap-2">
          {getArmyCrest(formation.faction) && (
            <img src={getArmyCrest(formation.faction)} alt="" className="w-4 h-4 object-contain" />
          )}
          <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
            Formation
          </span>
        </div>
        <button
          onClick={() => setSelectedFormationId(null)}
          className="text-text-secondary hover:text-interactive text-sm leading-none"
        >
          ✕
        </button>
      </div>

      <div className="p-4 flex-1 space-y-3 overflow-auto min-h-0 min-w-0 relative">
        {getArmyCrest(formation.faction) && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url(${getArmyCrest(formation.faction)})`,
              backgroundSize: 'contain',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              width: '180px',
              height: '180px',
            }}
          />
        )}
        {!formation ? (
          <p className="text-xs text-text-secondary italic">Formation not found.</p>
        ) : (
          <>
            <div className={`font-mono text-sm font-medium ${FACTION_COLORS_SUBTLE[formation.faction] ?? 'text-text-primary'}`}>
              {formation.name}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs px-2 py-1 bg-black/20 rounded border border-panel-border/30">
              <span className="text-text-secondary">Posture:</span>
              <span className="text-text-primary font-semibold">{formatPosture(formation.posture ?? 'hold')}</span>
              <span className="text-text-secondary ml-1">Readiness:</span>
              <span className="text-text-primary">{toTitleCase(formation.readiness)}</span>
            </div>

            {/* Officer info */}
            {(() => {
              const commander = getFormationCommander(formation, loadedGameState);
              if (commander) {
                const isArmy = formation.kind === 'army_hq' || formation.kind === 'army';
                const label = isArmy ? 'Army Commander' : 'Corps Commander';
                return (
                  <div className="pt-2 border-t border-panel-border">
                    <OfficerProfile officer={commander} label={label} compact emphasis={isArmy ? 'defense' : 'aggression'} />
                  </div>
                );
              }

              if (formation.kind === 'brigade' && formation.officer_quality != null) {
                return (
                  <div className="pt-2 border-t border-panel-border flex items-center justify-between text-xs">
                    <span className="text-text-secondary">Officer Cadre Quality</span>
                    <span className="text-text-primary font-mono bg-black/30 px-1.5 py-0.5 rounded border border-panel-border/50">
                      {Math.round(formation.officer_quality * 100)}%
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {formation.decorations && formation.decorations.length > 0 && (
              <div className="pt-2 border-t border-panel-border space-y-1">
                <div className="text-xs text-text-secondary">Unit Honors & Decorations</div>
                <div className="flex flex-wrap gap-1">
                  {formation.decorations.map((dec, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold text-[10px] font-semibold uppercase tracking-wider rounded border border-accent-gold/30" title={dec.notes}>
                      {dec.tier} / {dec.type}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {formation.honor && (
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-text-secondary">Historical Honor</span>
                <span className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold text-[10px] font-semibold uppercase tracking-wider rounded border border-accent-gold/30">
                  {formation.honor}
                </span>
              </div>
            )}

            {/* TO&E (Table of Organization and Equipment) */}
            {formation.composition && (
              <div className="pt-2 border-t border-panel-border space-y-2">
                <div className="text-xs text-text-secondary">TO&E (Equipment)</div>
                <div className="space-y-1.5 text-xs">
                  {formation.composition.tanks > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">Tanks</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/40 rounded flex overflow-hidden">
                          <div style={{ width: `${formation.composition.tank_condition.operational * 100}%` }} className="bg-[#55d48a]" title={`${Math.round(formation.composition.tank_condition.operational * 100)}% Operational`} />
                          <div style={{ width: `${formation.composition.tank_condition.degraded * 100}%` }} className="bg-[#d4d455]" title={`${Math.round(formation.composition.tank_condition.degraded * 100)}% Degraded`} />
                          <div style={{ width: `${formation.composition.tank_condition.non_operational * 100}%` }} className="bg-[#d45555]" title={`${Math.round(formation.composition.tank_condition.non_operational * 100)}% Non-Operational`} />
                        </div>
                        <span className="text-text-primary tabular-nums w-6 text-right font-mono">{formation.composition.tanks}</span>
                      </div>
                    </div>
                  )}
                  {formation.composition.artillery > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">Artillery</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/40 rounded flex overflow-hidden">
                          <div style={{ width: `${formation.composition.artillery_condition.operational * 100}%` }} className="bg-[#55d48a]" title={`${Math.round(formation.composition.artillery_condition.operational * 100)}% Operational`} />
                          <div style={{ width: `${formation.composition.artillery_condition.degraded * 100}%` }} className="bg-[#d4d455]" title={`${Math.round(formation.composition.artillery_condition.degraded * 100)}% Degraded`} />
                          <div style={{ width: `${formation.composition.artillery_condition.non_operational * 100}%` }} className="bg-[#d45555]" title={`${Math.round(formation.composition.artillery_condition.non_operational * 100)}% Non-Operational`} />
                        </div>
                        <span className="text-text-primary tabular-nums w-6 text-right font-mono">{formation.composition.artillery}</span>
                      </div>
                    </div>
                  )}
                  {formation.composition.aa_systems > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-text-secondary w-16">AA Sys</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-black/40 rounded flex overflow-hidden">
                          <div style={{ width: '100%' }} className="bg-[#55d48a]" title="100% Operational (Abstracted)" />
                        </div>
                        <span className="text-text-primary tabular-nums w-6 text-right font-mono">{formation.composition.aa_systems}</span>
                      </div>
                    </div>
                  )}
                  {formation.equipment_decay != null && (
                    <div className="flex justify-between items-center text-[11px] pt-1">
                      <span className="text-text-secondary">Overall VRS Supply Effectiveness</span>
                      <span className="text-text-primary font-mono">{Math.round(formation.equipment_decay * 100)}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-2 py-1 bg-black/10 rounded">
              <span className="text-text-secondary">Cohesion</span>
              <span className="text-text-primary tabular-nums flex items-center gap-1">
                {(() => {
                  const c = formation.cohesion;
                  const blocks = 10;
                  const filled = Math.round((c / 100) * blocks);
                  const color = c >= 70 ? '#d4a055' : c >= 40 ? '#d48a55' : '#d45555';
                  return (
                    <>
                      <span style={{ color, letterSpacing: '1px', fontSize: '10px' }}>
                        {'■'.repeat(filled)}<span style={{ opacity: 0.2 }}>{'■'.repeat(blocks - filled)}</span>
                      </span>
                      <span className="text-text-secondary text-[10px]">{c}</span>
                    </>
                  );
                })()}
              </span>
              {formation.morale != null && (
                <>
                  <span className="text-text-secondary">Morale</span>
                  <span className="text-text-primary tabular-nums flex items-center gap-1">
                    {(() => {
                      const m = formation.morale!;
                      const blocks = 10;
                      const filled = Math.round((m / 100) * blocks);
                      const color = m >= 70 ? '#55d48a' : m >= 40 ? '#d4d455' : '#d45555';
                      return (
                        <>
                          <span style={{ color, letterSpacing: '1px', fontSize: '10px' }}>
                            {'■'.repeat(filled)}<span style={{ opacity: 0.2 }}>{'■'.repeat(blocks - filled)}</span>
                          </span>
                          <span className="text-text-secondary text-[10px]">{m}</span>
                        </>
                      );
                    })()}
                  </span>
                </>
              )}
              <span className="text-text-secondary">Fatigue</span>
              <span className="text-text-primary tabular-nums">{formation.fatigue}</span>
              {formation.personnel != null && (
                <>
                  <span className="text-text-secondary">Personnel</span>
                  <span className="text-text-primary tabular-nums">{formation.personnel.toLocaleString()} men</span>
                </>
              )}
              {formation.entrenchment_turns != null && formation.entrenchment_turns > 0 && (
                <>
                  <span className="text-text-secondary">Entrenchment</span>
                  <span className="text-text-primary tabular-nums">{formation.entrenchment_turns} turns</span>
                </>
              )}
              {formation.dig_in_progress != null && formation.dig_in_progress > 0 && (
                <>
                  <span className="text-text-secondary">Dig-in Progress</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.dig_in_progress * 100)}%</span>
                </>
              )}
              {formation.disrupted_turns != null && formation.disrupted_turns > 0 && (
                <>
                  <span className="text-text-secondary">Disrupted</span>
                  <span className="text-text-primary tabular-nums" style={{ color: '#d45555' }}>
                    {formation.disrupted_turns} turns
                  </span>
                </>
              )}
              {formation.kind === 'corps' && formation.corpsExhaustion != null && (
                <>
                  <span className="text-text-secondary">Exhaustion</span>
                  <span className="text-text-primary tabular-nums">{Math.round(formation.corpsExhaustion * 100)}%</span>
                </>
              )}
              {formation.kind === 'corps' && formation.corpsCommandSpan != null && (
                <>
                  <span className="text-text-secondary">Command Span</span>
                  <span className="text-text-primary tabular-nums">{formation.corpsCommandSpan.toFixed(1)}x</span>
                </>
              )}
            </div>

            {(formation.movementStatus && formation.movementStatus !== 'deployed') && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span className="text-text-secondary">Movement:</span>
                <span className="text-interactive px-1.5 py-0.5 bg-interactive/10 rounded border border-interactive/30">{toTitleCase(formation.movementStatus)}</span>
                {formation.movementStance && (
                  <span className="text-text-secondary lowercase italic">({formation.movementStance} march)</span>
                )}
              </div>
            )}

            {formation.location_osid && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">Location: </span>
                <span className="font-mono text-text-primary break-all" title={formation.location_osid}>
                  {getOsidDisplayName(formation.location_osid, osidDisplayNames)}
                </span>
              </div>
            )}

            {formation.kind === 'brigade' && (
              <div className="text-xs min-w-0">
                <span className="text-text-secondary">Home municipality: </span>
                <span
                  className="font-mono text-text-primary break-all"
                  title={formation.municipalityId ?? '—'}
                >
                  {formation.municipalityId ? toTitleCase(formation.municipalityId) : '—'}
                </span>
              </div>
            )}

            {formation.last_repulsed_from && (
              <div className="text-[11px] text-text-secondary min-w-0">
                <span>Last repulsed from: </span>
                <span className="font-mono text-text-primary break-all" title={formation.last_repulsed_from.osid}>
                  {getOsidDisplayName(formation.last_repulsed_from.osid, osidDisplayNames)}
                </span>
                <span> (wk {formation.last_repulsed_from.turn})</span>
              </div>
            )}
            {formation.last_retreat_from && (
              <div className="text-[11px] text-text-secondary min-w-0">
                <span>Retreated from: </span>
                <span className="font-mono text-text-primary break-all" title={formation.last_retreat_from.osid}>
                  {getOsidDisplayName(formation.last_retreat_from.osid, osidDisplayNames)}
                </span>
                <span> (wk {formation.last_retreat_from.turn})</span>
              </div>
            )}


            {formation.kind === 'brigade' && formation.combatSummary && (
              <div className="pt-2 border-t border-panel-border space-y-2 pb-1">
                <div className="text-xs text-text-secondary">Service Record</div>

                {/* Win Rate & K/D Header */}
                <div className="flex gap-4 p-2 bg-black/20 rounded border border-panel-border/30">
                  <div className="flex-1 flex flex-col items-center justify-center border-r border-panel-border/30 pr-4">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">Win Rate</span>
                    <div className="relative w-10 h-10 rounded-full border border-panel-border/50 flex items-center justify-center font-bold font-mono text-xs text-text-primary"
                      style={{
                        background: `conic-gradient(#d4a055 ${Math.round(formation.combatSummary.win_rate * 100)}%, transparent 0)`
                      }}>
                      {Math.round(formation.combatSummary.win_rate * 100)}%
                    </div>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider mb-1">K/D Ratio</span>
                    <span className="text-lg font-mono text-accent-goldtabular-nums">
                      {formation.combatSummary.casualty_exchange_ratio.toFixed(2)}
                    </span>
                    <span className="text-[9px] text-text-secondary italic mt-0.5">Inflicted / Taken</span>
                  </div>
                </div>

                {/* Stat Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-1">
                  <span className="text-text-secondary">Battles Fought</span>
                  <span className="text-text-primary tabular-nums">{formation.combatSummary.battles_fought.toLocaleString()}</span>

                  <span className="text-text-secondary">Casualties Taken</span>
                  <span className="text-text-primary tabular-nums">{formation.combatSummary.total_casualties_taken.toLocaleString()}</span>

                  <span className="text-text-secondary">Casualties Inflicted</span>
                  <span className="text-text-primary tabular-nums">{formation.combatSummary.total_casualties_inflicted.toLocaleString()}</span>

                  <span className="text-text-secondary text-[10px] pl-2">— KIA (est.)</span>
                  <span className="text-[#d45555] tabular-nums text-[10px]">{Math.round(formation.combatSummary.total_casualties_taken * 0.30).toLocaleString()}</span>

                  <span className="text-text-secondary text-[10px] pl-2">— WIA (est.)</span>
                  <span className="text-[#d4d455] tabular-nums text-[10px]">{Math.round(formation.combatSummary.total_casualties_taken * 0.55).toLocaleString()}</span>

                  <span className="text-text-secondary">OSIDs Captured</span>
                  <span className="text-[#55d48a] tabular-nums font-semibold">{formation.combatSummary.total_osids_captured.toLocaleString()}</span>

                  <span className="text-text-secondary">OSIDs Lost</span>
                  <span className="text-[#d45555] tabular-nums">{formation.combatSummary.total_osids_lost.toLocaleString()}</span>

                  {formation.brigade_history && (
                    <>
                      {formation.brigade_history.longest_victory_streak > 0 && (
                        <>
                          <span className="text-text-secondary">Highest Win-Streak</span>
                          <span className="text-accent-gold tabular-nums font-semibold">{formation.brigade_history.longest_victory_streak}</span>
                        </>
                      )}
                      {formation.brigade_history.turns_under_siege > 0 && (
                        <>
                          <span className="text-text-secondary">Turns Under Siege</span>
                          <span className="text-text-primary tabular-nums">{formation.brigade_history.turns_under_siege}</span>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Equipment Brag Board */}
                {formation.brigade_history?.total_equipment_destroyed &&
                  (formation.brigade_history.total_equipment_destroyed.tanks > 0 ||
                    formation.brigade_history.total_equipment_destroyed.artillery > 0) && (
                    <div className="mt-2 p-1.5 border border-dashed border-[#55d48a]/30 bg-[#55d48a]/5 rounded flex justify-between items-center">
                      <span className="text-[10px] text-[#55d48a] uppercase font-semibold">Equipment Destroyed</span>
                      <div className="flex gap-2 text-xs font-mono">
                        {formation.brigade_history.total_equipment_destroyed.tanks > 0 && (
                          <span title="Tanks/APCs Knocked Out">🛻 {formation.brigade_history.total_equipment_destroyed.tanks}</span>
                        )}
                        {formation.brigade_history.total_equipment_destroyed.artillery > 0 && (
                          <span title="Artillery Destroyed">💥 {formation.brigade_history.total_equipment_destroyed.artillery}</span>
                        )}
                        {formation.brigade_history.total_equipment_destroyed.aa_systems > 0 && (
                          <span title="AA Systems Destroyed">🎯 {formation.brigade_history.total_equipment_destroyed.aa_systems}</span>
                        )}
                      </div>
                    </div>
                  )}

                {formation.recent_engagements && formation.recent_engagements.length > 0 && (
                  <div className="pt-2">
                    <div className="text-xs text-text-secondary mb-1">Recent engagements</div>
                    <div className="space-y-1">
                      {[...formation.recent_engagements].reverse().map((engagement, idx) => (
                        <div key={`${engagement.turn}-${engagement.osid}-${engagement.role}-${idx}`} className="text-[11px] leading-4 border-l-2 pl-1.5 border-panel-border/30">
                          <span className="text-text-secondary">{turnToDateString(engagement.turn)} </span>
                          <span className="text-text-primary">{formatCombatOutcome(engagement.outcome)}</span>
                          <span className="text-text-secondary"> as {engagement.role} @ </span>
                          <span className="font-mono text-text-primary">{getOsidDisplayName(engagement.osid, osidDisplayNames)}</span>
                          {engagement.territory_flipped && <span className="text-accent-gold ml-1">⚑</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {formation.narrativeArc && (
              <div className="pt-2 border-t border-panel-border space-y-1 min-w-0">
                <div className="text-xs text-text-secondary">War story</div>
                <div className="text-xs font-semibold text-accent-gold capitalize break-words">{formation.narrativeArc}</div>
                {formation.warNarrative && (
                  <div className="text-[11px] text-text-primary leading-4 italic whitespace-pre-wrap break-words">{formation.warNarrative}</div>
                )}
                {formation.notableMoments && formation.notableMoments.length > 0 && (
                  <div className="space-y-0.5 pt-1 min-w-0">
                    {formation.notableMoments.map((m, i) => (
                      <div key={i} className="text-[11px] text-text-secondary break-words">
                        <span className="text-text-primary">{turnToDateString(m.turn)}:</span> {m.description.replace(/op:[a-z0-9_]+:[a-z0-9_]+/gi, (match) => getOsidDisplayName(match, osidDisplayNames))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {(() => {
              if (!loadedGameState?.corpsFrontSectors) return null;
              const sectors = loadedGameState.corpsFrontSectors;

              // Corps/corps_asset: show all sectors belonging to this corps
              if (formation.kind === 'corps' || formation.kind === 'corps_asset') {
                const corpsSectors = sectors.filter((s) => s.corps_id === formation.id);
                if (corpsSectors.length === 0) return null;
                return (
                  <div className="pt-2 border-t border-panel-border text-xs min-w-0">
                    <div className="text-text-secondary mb-1">Sectors ({corpsSectors.length}):</div>
                    <div className="space-y-0.5">
                      {corpsSectors.map((s) => (
                        <button
                          key={s.sector_id}
                          type="button"
                          onClick={() => useGameStore.setState({
                            selectedArmyId,
                            selectedCorpsId: selectedCorpsId ?? formation.id,
                            selectedCorpsFrontSectorId: s.sector_id,
                            selectedFormationId,
                            selectedOperationKey: null,
                            selectedOsid: null,
                          })}
                          className="block w-full text-left text-interactive hover:underline truncate"
                          title={s.sector_id}
                        >
                          {s.display_name}
                          <span className="text-text-secondary ml-1">
                            ({s.assigned_brigade_ids.length} Frontline / {s.reserve_brigade_ids.length} Reserve)
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              // Brigade: show the single sector it belongs to
              if (!formation.corps_id) return null;
              const sector = sectors.find(
                (s) => s.corps_id === formation.corps_id &&
                  (s.assigned_brigade_ids.includes(formation.id) || s.reserve_brigade_ids.includes(formation.id))
              );
              if (!sector) return null;
              return (
                <div className="text-xs min-w-0">
                  <span className="text-text-secondary">Sector: </span>
                  <button
                    type="button"
                    onClick={() => useGameStore.setState({
                      selectedArmyId,
                      selectedCorpsId: selectedCorpsId ?? formation.corps_id ?? null,
                      selectedCorpsFrontSectorId: sector.sector_id,
                      selectedFormationId,
                      selectedOperationKey: null,
                      selectedOsid: null,
                    })}
                    className="text-interactive hover:underline"
                    title={sector.sector_id}
                  >
                    {sector.display_name}
                  </button>
                </div>
              );
            })()}

            {attackOrder && (
              <div className="pt-2 border-t border-panel-border min-w-0">
                <span className="text-xs text-text-secondary">Attack order: </span>
                <span className="text-xs text-text-primary font-mono break-all" title={attackOrder.targetSettlementId}>
                  {getOsidDisplayName(attackOrder.targetSettlementId, osidDisplayNames)}
                </span>
              </div>
            )}

            {/* Phase C4: Attack/Move target selection — click map OSID */}
            {formation.kind === 'brigade' && (
              <div className="pt-2 border-t border-panel-border">
                <button
                  type="button"
                  onClick={() => setOrdersPanelOpen((v) => !v)}
                  className="text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover"
                >
                  {ordersPanelOpen ? 'Hide orders' : 'Order'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      {formation?.kind === 'brigade' && ordersPanelOpen && (
        <div
          className="panel-power-on weathered-panel flex flex-col rounded-lg shadow-xl overflow-hidden"
          style={{ ...SECONDARY_PANEL_STYLE, width: '22rem' }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 bg-panel-card rounded-t-lg border-b border-panel-border shrink-0">
            <span className="font-sans text-xs text-accent-gold uppercase tracking-wide font-semibold">
              Orders
            </span>
            <button
              onClick={() => setOrdersPanelOpen(false)}
              className="text-text-secondary hover:text-interactive text-sm leading-none"
            >
              ✕
            </button>
          </div>
          <div className="p-3 space-y-3 overflow-auto">
            <div className="text-[11px] text-text-secondary">
              {formation.name}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOrderModeForFormation(orderModeForFormation === 'attack' ? null : 'attack')}
                className={`text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover ${orderModeForFormation === 'attack' ? 'ring-1 ring-accent-gold bg-panel-active' : ''}`}
              >
                {orderModeForFormation === 'attack' ? 'Click target…' : 'Attack'}
              </button>
              <button
                type="button"
                onClick={() => setOrderModeForFormation(orderModeForFormation === 'move' ? null : 'move')}
                className={`text-xs font-sans px-2 py-1 rounded border border-panel-border text-interactive hover:bg-panel-hover ${orderModeForFormation === 'move' ? 'ring-1 ring-green-500 bg-panel-active' : ''}`}
              >
                {orderModeForFormation === 'move' ? 'Click destination…' : 'Move'}
              </button>
            </div>
            <div className="pt-1 border-t border-panel-border">
              <div className="text-[11px] text-text-secondary mb-1">Posture</div>
              <div className="flex flex-wrap gap-1">
                {(['hold', 'defend', 'defend_at_all_costs', 'elastic_defense', 'counterattack', 'dig_in', 'attack', 'assault'] as const).map((posture) => {
                  const isOffensive = posture === 'attack' || posture === 'assault';
                  const blocked = isOffensive
                    && (formation.home_defense_active ?? false)
                    && !operationOwnershipOverridesHomeDefense;
                  return (
                    <button
                      key={posture}
                      type="button"
                      disabled={blocked}
                      onClick={() => void stagePostureOrderAction(
                        {
                          ipc,
                          addStagedOrder,
                          setLoadError,
                        },
                        formation.id,
                        posture
                      )}
                      title={blocked
                        ? 'Blocked: home defense active'
                        : operationOwnershipOverridesHomeDefense
                          ? `Operation-owned: ${operationOwningFormation?.name}. ${POSTURE_TOOLTIPS[posture]}`
                          : POSTURE_TOOLTIPS[posture]}
                      className={`text-[11px] font-sans px-2 py-1 rounded border border-panel-border ${blocked ? 'opacity-40 cursor-not-allowed text-text-secondary' : 'text-interactive hover:bg-panel-hover'}`}
                    >
                      {formatPosture(posture)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
