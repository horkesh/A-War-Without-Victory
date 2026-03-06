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

const OP_SECOND_WORDS: Record<string, string[]> = {
  RBiH: ['Uragan', 'Sana', 'Igman', 'Trebevic', 'Bosna', 'Drina'],
  RS: ['Stit', 'Breza', 'Zvezda', 'Romanija', 'Vrbas', 'Sava'],
  HRHB: ['Maestral', 'Cincar', 'Zima', 'Una', 'Neretva', 'JuzniPotez'],
};

function toOneWord(input: string): string {
  const cleaned = input.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const first = cleaned.split(/\s+/)[0] ?? '';
  return first;
}

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
  const [operationPrepOpen, setOperationPrepOpen] = useState(false);
  const [prepOperationType, setPrepOperationType] = useState('sector_attack');
  const [prepTargetWord, setPrepTargetWord] = useState('');
  const [prepSecondWord, setPrepSecondWord] = useState('');
  const [prepSectorId, setPrepSectorId] = useState('');
  const [savingOperation, setSavingOperation] = useState(false);
  const operationsPanelOpen = useGameStore((s) => s.isOperationsPanelOpen);
  const selectedCorpsId = useGameStore((s) => s.selectedCorpsId);
  const selectedFormationId = useGameStore((s) => s.selectedFormationId);
  const selectedSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);
  const setSelectedCorpsId = useGameStore((s) => s.setSelectedCorpsId);
  const setSelectedFormationId = useGameStore((s) => s.setSelectedFormationId);
  const setSelectedCorpsFrontSectorId = useGameStore((s) => s.setSelectedCorpsFrontSectorId);
  const setHoveredOsids = useGameStore((s) => s.setHoveredOsids);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const osidDisplayNames = useGameStore((s) => s.osidDisplayNames);

  // Derived values needed by hooks — computed unconditionally so hooks are always called in the same order
  const corpsFormation = loadedGameState?.formations.find(
    (f) => f.id === selectedCorpsId && (f.kind === 'corps' || f.kind === 'corps_asset')
  ) ?? null;
  const corpsFaction = corpsFormation?.faction ?? 'RBiH';
  const corpsSectors = useMemo(
    () => loadedGameState?.corpsFrontSectors?.filter((s) => s.corps_id === selectedCorpsId) ?? [],
    [loadedGameState?.corpsFrontSectors, selectedCorpsId]
  );
  const secondWordOptions = useMemo(
    () => OP_SECOND_WORDS[corpsFaction] ?? ['Bosna', 'Drina', 'Una'],
    [corpsFaction]
  );

  useEffect(() => {
    setOrdersPanelOpen(false);
    setOperationPrepOpen(false);
  }, [selectedCorpsId]);

  useEffect(() => {
    if (!corpsFormation) return;
    const candidateTarget = toOneWord(corpsSectors[0]?.display_name ?? corpsFormation.name);
    setPrepTargetWord(candidateTarget || 'Target');
    setPrepSecondWord(secondWordOptions[0] ?? 'Bosna');
    setPrepSectorId(corpsSectors[0]?.sector_id ?? '');
  }, [corpsFormation, corpsSectors, secondWordOptions]);

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

  const operationNamePreview = `${toOneWord(prepTargetWord) || 'Target'} ${prepSecondWord || 'Bosna'}`.trim();

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

  const resolveTargetOsid = (targetWord: string): string | null => {
    const needle = targetWord.trim().toLowerCase();
    if (!needle) return null;
    const allOsids = Object.keys(loadedGameState.controlBySettlement).sort((a, b) => a.localeCompare(b));
    for (const osid of allOsids) {
      const slug = (osid.split(':')[2] ?? '').toLowerCase();
      if (slug === needle || slug.startsWith(`${needle}-`) || slug.startsWith(needle)) return osid;
      const display = (osidDisplayNames?.[osid] ?? '').toLowerCase();
      const firstWord = display.split(/\s+/)[0] ?? '';
      if (firstWord === needle) return osid;
    }
    return null;
  };

  const handleSaveOperationDraft = async () => {
    if (!ipc.isAvailable) {
      setLoadError('Operation preparation is available in desktop mode only.');
      return;
    }
    const targetWord = toOneWord(prepTargetWord);
    const name = `${targetWord || 'Target'} ${prepSecondWord || 'Bosna'}`.trim();
    if (!name) {
      setLoadError('Operation name is required.');
      return;
    }
    const resolvedTargetOsid = resolveTargetOsid(targetWord);
    if (!resolvedTargetOsid && prepOperationType !== 'reorganization') {
      setLoadError(`Could not resolve target settlement "${targetWord}". Try a known map settlement name.`);
      return;
    }

    const participatingBrigades = subordinates
      .map((f) => f.id)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 6);

    setSavingOperation(true);
    const result = await ipc.stageCorpsOperationOrder({
      corpsId: selectedCorpsId,
      name,
      type: prepOperationType as 'general_offensive' | 'sector_attack' | 'strategic_defense' | 'reorganization',
      targetSettlements: resolvedTargetOsid ? [resolvedTargetOsid] : [],
      participatingBrigades,
      sectorId: prepOperationType === 'sector_attack' ? prepSectorId || undefined : undefined,
      objectives: prepOperationType === 'sector_attack' && resolvedTargetOsid ? [resolvedTargetOsid] : [],
      planningDuration: prepOperationType === 'sector_attack' ? 1 : undefined,
      stagingOsid: undefined,
    });
    setSavingOperation(false);

    if (!result.ok) {
      setLoadError(result.error ?? 'Failed to stage operation draft.');
      return;
    }
    setOperationPrepOpen(false);
    setOrdersPanelOpen(false);
    setLoadError(null);
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
                onClick={() => setOperationPrepOpen(true)}
                className="w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover"
              >
                Prepare operation
              </button>
            </div>
          </div>
        </div>
      )}
      {operationPrepOpen && (
        <div className="fixed inset-0 z-[90] bg-black/55 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-[min(92vw,1220px)] h-[min(88vh,860px)] bg-panel-bg border border-panel-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-panel-card border-b border-panel-border shrink-0">
              <div>
                <div className="font-sans text-sm text-accent-gold uppercase tracking-wide font-semibold">
                  Operation Preparation
                </div>
                <div className="text-[11px] text-text-secondary mt-0.5">
                  {corpsFormation.name} · {corpsFormation.faction}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOperationPrepOpen(false)}
                className="text-text-secondary hover:text-interactive text-sm leading-none"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-auto">
              <div className="col-span-5 rounded-lg border border-panel-border bg-panel-card/60 p-4 space-y-4">
                <div className="text-xs text-text-secondary uppercase tracking-wide">Draft</div>
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Operation type</label>
                  <select
                    value={prepOperationType}
                    onChange={(e) => setPrepOperationType(e.target.value)}
                    className="w-full px-2 py-1 text-xs bg-panel-card border border-panel-border rounded text-text-primary"
                  >
                    <option value="sector_attack">Sector attack</option>
                    <option value="general_offensive">General offensive</option>
                    <option value="strategic_defense">Strategic defense</option>
                    <option value="reorganization">Reorganization</option>
                  </select>
                </div>
                {prepOperationType === 'sector_attack' && corpsSectors.length > 0 && (
                  <div>
                    <label className="text-[11px] text-text-secondary block mb-1">Launch sector</label>
                    <select
                      value={prepSectorId}
                      onChange={(e) => setPrepSectorId(e.target.value)}
                      className="w-full px-2 py-1 text-xs bg-panel-card border border-panel-border rounded text-text-primary"
                    >
                      {corpsSectors.map((sector) => (
                        <option key={sector.sector_id} value={sector.sector_id}>
                          {sector.display_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Target settlement (one word)</label>
                  <input
                    value={prepTargetWord}
                    onChange={(e) => setPrepTargetWord(toOneWord(e.target.value))}
                    className="w-full px-2 py-1 text-xs bg-panel-card border border-panel-border rounded text-text-primary"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary block mb-1">Second word</label>
                  <div className="flex flex-wrap gap-1">
                    {secondWordOptions.map((word) => (
                      <button
                        key={word}
                        type="button"
                        onClick={() => setPrepSecondWord(word)}
                        className={`text-[11px] px-2 py-1 rounded border ${prepSecondWord === word ? 'bg-panel-active text-accent-gold' : 'text-text-primary hover:bg-panel-hover'} border-panel-border`}
                      >
                        {word}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-panel-border">
                  <div className="text-[11px] text-text-secondary mb-1">Proposed operation name</div>
                  <div className="font-mono text-sm text-text-primary">{operationNamePreview}</div>
                </div>
                <div className="pt-2 border-t border-panel-border">
                  <button
                    type="button"
                    onClick={() => void handleSaveOperationDraft()}
                    className="w-full text-xs font-sans px-2 py-2 rounded border border-panel-border text-interactive hover:bg-panel-hover disabled:opacity-50"
                    disabled={savingOperation}
                  >
                    {savingOperation ? 'Saving…' : 'Save draft'}
                  </button>
                </div>
              </div>
              <div className="col-span-7 rounded-lg border border-panel-border bg-panel-card/40 p-4 space-y-3 overflow-auto">
                <div className="text-xs text-text-secondary uppercase tracking-wide">Context</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="border border-panel-border rounded p-2">
                    <div className="text-text-secondary">Corps stance</div>
                    <div className="text-text-primary capitalize">{corpsFormation.corpsStance ?? 'unknown'}</div>
                  </div>
                  <div className="border border-panel-border rounded p-2">
                    <div className="text-text-secondary">Exhaustion</div>
                    <div className="text-text-primary">{corpsFormation.corpsExhaustion?.toFixed(1) ?? '—'}</div>
                  </div>
                </div>
                <div className="pt-2 border-t border-panel-border">
                  <div className="text-[11px] text-text-secondary mb-1">Sectors ({corpsSectors.length})</div>
                  <div className="space-y-1 max-h-[220px] overflow-auto">
                    {corpsSectors.map((sector) => (
                      <button
                        key={sector.sector_id}
                        type="button"
                        onClick={() => {
                          setSelectedCorpsFrontSectorId(sector.sector_id);
                          setPrepTargetWord(toOneWord(sector.display_name));
                        }}
                        className="w-full text-left rounded border border-panel-border bg-panel-card px-2 py-1 hover:bg-panel-hover"
                      >
                        <div className="text-text-primary text-xs truncate">{sector.display_name}</div>
                        <div className="text-[10px] text-text-secondary tabular-nums">
                          d={sector.density.toFixed(2)} · threat={sector.threat_ratio.toFixed(2)} · {sector.assigned_brigade_ids.length} assigned
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-panel-border">
                  <div className="text-[11px] text-text-secondary mb-1">Current active operations</div>
                  {corpsOps.length === 0 ? (
                    <div className="text-xs text-text-secondary italic">No active operations for this corps.</div>
                  ) : (
                    <div className="space-y-1">
                      {corpsOps.map((op) => (
                        <div key={getOperationId(op)} className="rounded border border-panel-border bg-panel-card px-2 py-1">
                          <div className="text-xs text-text-primary">{op.name}</div>
                          <div className="text-[10px] text-text-secondary">
                            {op.phase} · {op.participating_brigade_count} brigades · started T{op.started_turn}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
