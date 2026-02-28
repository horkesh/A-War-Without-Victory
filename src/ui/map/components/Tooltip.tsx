/**
 * Rich tooltip system (Phase C1). HOI spec §7, §9.2.
 * 300ms delay, warm palette, pointer-events: none so tooltips never block clicks.
 */
import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { getOsidDisplayName } from '../utils/osidDisplayName';
import { getByOsid } from '../utils/osidLookup';
import { FACTION_COLORS, FACTION_COLORS_SUBTLE } from '../utils/theme';

const TOOLTIP_DELAY_MS = 300;
const TOOLTIP_OFFSET = 12;

function num(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/** §7.1 Settlement: name, municipality, controller, pop, ethnicity bars, brigade present, terrain, strategic importance */
function SettlementTooltipContent({
  osid,
  osidDisplayNames,
  osidPropertiesMap,
  controlBySettlement,
  formations,
}: {
  osid: string;
  osidDisplayNames: Record<string, string> | null;
  osidPropertiesMap: Record<string, Record<string, unknown>> | null;
  controlBySettlement: Record<string, string | null> | undefined;
  formations: { id: string; name: string; faction: string }[] | undefined;
}) {
  const name = getOsidDisplayName(osid, osidDisplayNames);
  const props = osidPropertiesMap?.[osid] ?? {};
  const municipality = str(props.mun1990_name || props.mun1990_id);
  const controller = getByOsid(controlBySettlement, osid);
  const pop = num(props.population_total);
  const atOsid = formations ?? [];
  const ethnic = [
    { label: 'Bosniak', pct: pop ? (num(props.population_bosniaks) / pop) * 100 : 0 },
    { label: 'Serb', pct: pop ? (num(props.population_serbs) / pop) * 100 : 0 },
    { label: 'Croat', pct: pop ? (num(props.population_croats) / pop) * 100 : 0 },
    { label: 'Other', pct: pop ? (num(props.population_others) / pop) * 100 : 0 },
  ];
  const terrain = str(props.terrain || props.zone_type);
  const strategic = props.municipal_seat === true || props.strategic === true;

  return (
    <div className="min-w-[200px] max-w-[280px]">
      <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
        {name}
      </div>
      {municipality && (
        <div className="text-[11px] text-text-secondary mb-1">Municipality: {municipality}</div>
      )}
      {controller && (
        <div className="text-[11px] mb-1">
          <span className="text-text-secondary">Controller: </span>
          <span className={FACTION_COLORS_SUBTLE[controller] ?? 'text-text-primary'}>{controller}</span>
        </div>
      )}
      {pop > 0 && (
        <div className="text-[11px] text-text-secondary mb-2">Pop: {pop.toLocaleString()}</div>
      )}
      {(ethnic.some((e) => e.pct > 0) && (
        <div className="space-y-0.5 mb-2">
          {ethnic.filter((e) => e.pct > 0).map((e) => (
            <div key={e.label} className="flex items-center gap-2 text-[11px]">
              <span className="text-text-secondary w-14 shrink-0">{e.label}</span>
              <div className="flex-1 h-1.5 bg-panel-card rounded overflow-hidden">
                <div
                  className="h-full bg-panel-active rounded"
                  style={{ width: `${Math.min(100, e.pct)}%` }}
                />
              </div>
              <span className="tabular-nums w-8 text-right">{e.pct.toFixed(0)}%</span>
            </div>
          ))}
        </div>
      ))}
      {atOsid.length > 0 && (
        <div className="text-[11px] text-text-secondary border-t border-panel-border pt-1">
          Brigade: {atOsid.map((f) => `${f.name} (${f.faction})`).join(', ')}
        </div>
      )}
      {terrain && (
        <div className="text-[11px] text-text-secondary mt-1">Terrain: {terrain}</div>
      )}
      {strategic && (
        <div className="text-[11px] text-accent-gold mt-1">◆ Municipal Seat</div>
      )}
    </div>
  );
}

/** §7.2 Formation: name, corps, personnel, cohesion bar, posture, AoR summary, order */
function FormationTooltipContent({
  formationId,
  formations,
  attackOrders,
  osidDisplayNames,
}: {
  formationId: string;
  formations: { id: string; name: string; faction: string; corps_id?: string; personnel?: number; cohesion?: number; posture?: string; aorSettlementIds?: string[] }[] | undefined;
  attackOrders: { brigadeId: string; targetSettlementId: string }[] | undefined;
  osidDisplayNames: Record<string, string> | null;
}) {
  const formation = formations?.find((f) => f.id === formationId);
  if (!formation) return <div className="text-[11px] text-text-secondary">Unknown formation</div>;

  const corps = formations?.find((f) => f.id === formation.corps_id);
  const cohesion = Math.max(0, Math.min(100, formation.cohesion ?? 0));
  const filledSegments = Math.ceil(cohesion / 20);
  const aorIds = formation.aorSettlementIds ?? [];
  const frontCount = 0; // could derive from front-active OSIDs if we had that
  const aorSummary = frontCount > 0 ? `${aorIds.length} settlements (${frontCount} front)` : `${aorIds.length} settlements`;
  const attack = attackOrders?.find((o) => o.brigadeId === formationId);
  const orderLine = attack
    ? `→ Attack ${getOsidDisplayName(attack.targetSettlementId, osidDisplayNames)}`
    : '—';

  return (
    <div className="min-w-[220px] max-w-[300px]">
      <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
        {formation.name}
      </div>
      {corps && (
        <div className="text-[11px] text-text-secondary mb-1">
          {corps.name} {formation.corps_id !== '_ungrouped' ? `(${formation.corps_id})` : ''}
        </div>
      )}
      {formation.personnel != null && (
        <div className="text-[11px] text-text-secondary mb-1">
          Personnel: {formation.personnel.toLocaleString()}
        </div>
      )}
      <div className="flex items-center gap-2 text-[11px] mb-1">
        <span className="text-text-secondary">Cohesion:</span>
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, i) => (
            <span
              key={i}
              className={`block h-1.5 w-3 rounded-sm ${i < filledSegments ? 'bg-panel-active' : 'bg-panel-card'}`}
            />
          ))}
        </div>
        <span className="tabular-nums">{cohesion}</span>
      </div>
      {formation.posture && (
        <div className="text-[11px] text-text-secondary mb-1">Posture: {formation.posture}</div>
      )}
      <div className="text-[11px] text-text-secondary mb-1">AoR: {aorSummary}</div>
      <div className="text-[11px] text-text-secondary border-t border-panel-border pt-1">
        Order: {orderLine}
      </div>
      <div className="text-[11px] text-text-secondary mt-0.5">Status: Active</div>
    </div>
  );
}

/** §7.3 Front edge: factions, persistence, pressure, formations each side */
function FrontTooltipContent({
  edgeId,
  frontEdgesOsid,
  frontPressureByEdge,
  formations,
  assignableFrontSegments,
}: {
  edgeId: string;
  frontEdgesOsid: { edge_id: string; a: string; b: string; side_a: string | null; side_b: string | null }[] | undefined;
  frontPressureByEdge: Record<string, { value: number; max_abs: number }> | undefined;
  formations: { id: string; name: string; faction: string; posture?: string; aorSettlementIds?: string[] }[] | undefined;
  assignableFrontSegments: { front_id: string; edge_ids: string[]; side_a: string | null; side_b: string | null }[] | undefined;
}) {
  const edge = frontEdgesOsid?.find((e) => e.edge_id === edgeId);
  const sideA = edge?.side_a ?? '?';
  const sideB = edge?.side_b ?? '?';
  const pressure = frontPressureByEdge?.[edgeId];
  const pressureVal = pressure?.value ?? 0;
  const pressureLine =
    pressureVal > 0 ? `+${pressureVal.toFixed(1)} (${sideA} advantage)` : pressureVal < 0 ? `${pressureVal.toFixed(1)} (${sideB} advantage)` : 'Balanced';

  const formationsOnA = formations?.filter((f) => f.faction === sideA && (f.aorSettlementIds?.includes(edge?.a ?? '') || f.aorSettlementIds?.includes(edge?.b ?? ''))) ?? [];
  const formationsOnB = formations?.filter((f) => f.faction === sideB && (f.aorSettlementIds?.includes(edge?.a ?? '') || f.aorSettlementIds?.includes(edge?.b ?? ''))) ?? [];

  const segment = assignableFrontSegments?.find((s) => s.edge_ids.includes(edgeId));
  const persistenceLine = segment ? `${segment.edge_ids.length} edges (static)` : '—';

  return (
    <div className="min-w-[200px] max-w-[280px]">
      <div className="font-sans text-xs font-semibold text-accent-gold uppercase tracking-wide border-b border-panel-border pb-1 mb-2">
        Front: {sideA} — {sideB}
      </div>
      <div className="text-[11px] text-text-secondary mb-1">Persistence: {persistenceLine}</div>
      <div className="text-[11px] text-text-secondary mb-2">Pressure: {pressureLine}</div>
      {formationsOnA.length > 0 && (
        <div className="text-[11px] mb-1">
          <span className={FACTION_COLORS[sideA] ?? 'text-text-primary'}>{sideA}:</span>{' '}
          {formationsOnA.map((f) => `${f.name} (${f.posture ?? '—'})`).join(', ')}
        </div>
      )}
      {formationsOnB.length > 0 && (
        <div className="text-[11px] text-text-secondary border-t border-panel-border pt-1">
          <span className={FACTION_COLORS[sideB] ?? 'text-text-primary'}>{sideB}:</span>{' '}
          {formationsOnB.map((f) => `${f.name} (${f.posture ?? '—'})`).join(', ')}
        </div>
      )}
    </div>
  );
}

export function Tooltip() {
  const tooltipTarget = useGameStore((s) => s.tooltipTarget);
  const tooltipPosition = useGameStore((s) => s.tooltipPosition);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);
  const osidPropertiesMap = useGameStore((s) => s.osidPropertiesMap);
  const loadedGameState = useGameStore((s) => s.loadedGameState);

  const [visible, setVisible] = useState(false);
  const [delayedTarget, setDelayedTarget] = useState<typeof tooltipTarget>(null);

  useEffect(() => {
    if (!tooltipTarget) {
      setDelayedTarget(null);
      setVisible(false);
      return;
    }
    setDelayedTarget(tooltipTarget);
    const t = setTimeout(() => setVisible(true), TOOLTIP_DELAY_MS);
    return () => clearTimeout(t);
  }, [tooltipTarget]);

  useEffect(() => {
    if (!visible || !tooltipTarget) return;
    setDelayedTarget(tooltipTarget);
  }, [visible, tooltipTarget]);

  if (!delayedTarget || !visible) return null;

  const position = tooltipPosition ?? { x: 24, y: 24 };
  const style: React.CSSProperties = {
    position: 'fixed',
    left: position.x + TOOLTIP_OFFSET,
    top: position.y + TOOLTIP_OFFSET,
    zIndex: 9999,
    pointerEvents: 'none',
  };

  return (
    <div
      className="bg-panel-bg border border-panel-border rounded-lg shadow-xl p-3 text-text-primary font-sans"
      style={style}
    >
      {delayedTarget.type === 'osid' && (
        <SettlementTooltipContent
          osid={delayedTarget.id}
          osidDisplayNames={osidDisplayNames}
          osidPropertiesMap={osidPropertiesMap}
          controlBySettlement={loadedGameState?.controlBySettlement}
          formations={loadedGameState?.formations?.map((f) => ({ id: f.id, name: f.name, faction: f.faction }))}
        />
      )}
      {delayedTarget.type === 'formation' && (
        <FormationTooltipContent
          formationId={delayedTarget.id}
          formations={loadedGameState?.formations}
          attackOrders={loadedGameState?.attackOrders}
          osidDisplayNames={osidDisplayNames}
        />
      )}
      {delayedTarget.type === 'front' && (
        <FrontTooltipContent
          edgeId={delayedTarget.id}
          frontEdgesOsid={loadedGameState?.frontEdgesOsid}
          frontPressureByEdge={loadedGameState?.frontPressureByEdge}
          formations={loadedGameState?.formations}
          assignableFrontSegments={loadedGameState?.assignableFrontSegments}
        />
      )}
    </div>
  );
}
