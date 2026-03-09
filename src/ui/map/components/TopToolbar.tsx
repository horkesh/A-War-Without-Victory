import { useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { loadLatestRunSaveAsText, loadRunFinalSaveAsText } from '../data/DataLoader';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { formatTurnLabel } from '../utils/formatters';
import { getFactionFlag, getFactionCrest } from '../utils/factionAssets';
import type { LoadedGameState, SummaryFocusSection } from '../data/types';

const LOAD_TIMEOUT_MS = 25000;

const FACTION_BANNER_TINT: Record<string, string> = {
  RS: 'rgba(194, 64, 64, 0.35)',
  RBiH: 'rgba(74, 154, 85, 0.35)',
  HRHB: 'rgba(64, 128, 184, 0.35)',
};

const TOOLBAR_BUTTON_CLASS = 'px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-all disabled:opacity-50 hover:border-interactive/50 hover:shadow-[0_0_10px_rgba(180,160,130,0.15)]';
const SUMMARY_SHORTCUTS: Array<{ focus: SummaryFocusSection; label: string; getCount?: (state: LoadedGameState) => number | null }> = [
  {
    focus: 'ivp',
    label: 'IVP',
    getCount: (state) => state.internationalVisibilityPressure?.composite_ivp != null
      ? Math.round(state.internationalVisibilityPressure.composite_ivp * 100)
      : null,
  },
  {
    focus: 'convoys',
    label: 'Convoys',
    getCount: (state) => state.pendingConvoyDecisions?.length ?? 0,
  },
  {
    focus: 'overview',
    label: 'Briefing',
    getCount: (state) => state.commandBriefing?.pendingCount ?? 0,
  },
];

interface TopToolbarProps {
  onOpenRecruitment?: () => void;
  onOpenSidePicker?: () => void;
  onOpenSummary?: (focus?: SummaryFocusSection) => void;
  onOpenEnclaves?: () => void;
  onOpenAAR?: () => void;
  onOpenOpsHistory?: () => void;
}

export function TopToolbar({ onOpenRecruitment, onOpenSidePicker, onOpenSummary, onOpenEnclaves, onOpenAAR, onOpenOpsHistory }: TopToolbarProps) {
  const ipc = useIPC();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadSave = useGameStore((s) => s.loadSave);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const loadError = useGameStore((s) => s.loadError);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const clearStagedOrders = useGameStore((s) => s.clearStagedOrders);
  const [loading, setLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [runIdInput, setRunIdInput] = useState('');
  const playerFaction = loadedGameState?.player_faction ?? '';
  const hasVisibleEnclaveDashboard = Boolean(
    loadedGameState?.factionReserves &&
    loadedGameState?.enclaveResilience &&
    Object.values(loadedGameState.enclaveResilience).some((entry) => entry.isolation_turns > 0)
  );
  const flagUrl = getFactionFlag(playerFaction);
  const crestUrl = getFactionCrest(playerFaction);
  const leftTint = FACTION_BANNER_TINT[playerFaction] ?? 'rgba(196, 163, 90, 0.2)';
  const toolbarBackground = `linear-gradient(90deg, ${leftTint} 0%, rgba(28, 26, 23, 0.95) 42%, rgba(28, 26, 23, 0.95) 100%)`;
  const summaryShortcuts = loadedGameState
    ? SUMMARY_SHORTCUTS
      .map((shortcut) => ({
        ...shortcut,
        count: shortcut.getCount?.(loadedGameState) ?? null,
      }))
      .filter((shortcut) => shortcut.count == null || shortcut.count > 0)
    : [];

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setLoading(true);
      try {
        const text = await file.text();
        await new Promise((r) => setTimeout(r, 0));
        const json = JSON.parse(text);
        await Promise.race([
          loadSave(json),
          new Promise<void>((_, rej) =>
            setTimeout(() => rej(new Error('Load timed out. Save may be too large.')), LOAD_TIMEOUT_MS)
          ),
        ]);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setLoadError(message);
        console.error('Failed to load save file:', err);
      } finally {
        setLoading(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [loadSave, setLoadError]
  );

  const handleLoadLatest = useCallback(async () => {
    setLoading(true);
    try {
      const text = await loadLatestRunSaveAsText();
      await Promise.race([
        loadSave(text),
        new Promise<void>((_, rej) =>
          setTimeout(() => rej(new Error('Load timed out. Try "Load run" with a run ID or a smaller save.')), LOAD_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      console.error('Failed to load latest save:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSave, setLoadError]);

  const handleLoadRun = useCallback(async () => {
    const runId = runIdInput.trim();
    if (!runId) return;
    setLoading(true);
    try {
      const text = await loadRunFinalSaveAsText(runId);
      await Promise.race([
        loadSave(text),
        new Promise<void>((_, rej) =>
          setTimeout(() => rej(new Error('Load timed out. The save may be very large; try opening in a new tab.')), LOAD_TIMEOUT_MS)
        ),
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLoadError(message);
      console.error('Failed to load run save:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSave, setLoadError, runIdInput]);

  const handleAdvanceTurn = useCallback(async () => {
    if (!ipc.isAvailable) {
      setLoadError('Advance turn is available in desktop mode only.');
      return;
    }
    if (!loadedGameState) {
      setLoadError('Load or start a game before advancing turn.');
      return;
    }

    setAdvancing(true);
    await advanceTurnAndSync({
      ipc,
      loadSave,
      clearStagedOrders,
      setLoadError,
    });
    setAdvancing(false);
  }, [ipc, loadedGameState, loadSave, clearStagedOrders, setLoadError]);

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 flex items-center gap-4 px-4 py-2.5 backdrop-blur-sm border-b border-panel-border overflow-hidden"
      style={{ background: toolbarBackground }}
    >
      {flagUrl && (
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `url(${flagUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            maskImage: 'linear-gradient(to right, black 0%, transparent 50%)',
            WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 50%)',
            mixBlendMode: 'overlay',
          }}
        />
      )}
      <div className="flex items-center gap-2 shrink-0">
        {crestUrl && (
          <img src={crestUrl} alt="" className="w-6 h-6 object-contain drop-shadow-[0_0_3px_rgba(0,0,0,0.5)]" />
        )}
        <span className="font-sans text-sm text-accent-gold tracking-wider uppercase font-semibold glow-text">
          A War Without Victory
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleLoadClick}
          disabled={loading}
          className={TOOLBAR_BUTTON_CLASS}
        >
          {loading ? 'Loading...' : 'Load Save'}
        </button>
        <button
          onClick={handleLoadLatest}
          disabled={loading}
          className={TOOLBAR_BUTTON_CLASS}
        >
          {loading ? 'Loading...' : 'Load Latest'}
        </button>
        <span className="text-xs font-mono text-text-secondary">Run ID:</span>
        <input
          type="text"
          value={runIdInput}
          onChange={(e) => setRunIdInput(e.target.value)}
          placeholder="e.g. apr1992_definitive_40w__…"
          className="w-48 px-2 py-1 text-xs font-mono bg-panel-card border border-panel-border rounded text-text-primary placeholder:text-text-muted transition-colors focus:border-interactive/50 focus:outline-none focus:ring-1 focus:ring-interactive/20"
          onKeyDown={(e) => e.key === 'Enter' && handleLoadRun()}
        />
        <button
          onClick={handleLoadRun}
          disabled={loading || !runIdInput.trim()}
          className={TOOLBAR_BUTTON_CLASS}
        >
          Load run
        </button>
        <button
          onClick={handleAdvanceTurn}
          disabled={advancing || loading || !loadedGameState || !ipc.isAvailable}
          className={TOOLBAR_BUTTON_CLASS}
        >
          {advancing ? 'Advancing...' : 'Advance turn'}
        </button>
        <button
          onClick={() => onOpenSidePicker?.()}
          disabled={loading || advancing || !ipc.isAvailable}
          className={TOOLBAR_BUTTON_CLASS}
        >
          New campaign
        </button>
        <button
          onClick={() => onOpenRecruitment?.()}
          disabled={loading || advancing || !loadedGameState || !ipc.isAvailable}
          className={TOOLBAR_BUTTON_CLASS}
        >
          Recruitment
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {summaryShortcuts.map((shortcut) => (
          <button
            key={shortcut.label}
            type="button"
            onClick={() => onOpenSummary?.(shortcut.focus)}
            disabled={!loadedGameState}
            className={TOOLBAR_BUTTON_CLASS}
          >
            {shortcut.label} {shortcut.focus === 'ivp' ? `${shortcut.count}%` : shortcut.count}
          </button>
        ))}
        <button
          onClick={() => onOpenSummary?.('overview')}
          disabled={!loadedGameState}
          className={TOOLBAR_BUTTON_CLASS}
        >
          Summary
        </button>
        <button
          onClick={() => onOpenAAR?.()}
          disabled={!loadedGameState}
          className={TOOLBAR_BUTTON_CLASS}
        >
          AAR
        </button>
        <button
          onClick={() => onOpenOpsHistory?.()}
          disabled={!loadedGameState}
          className={TOOLBAR_BUTTON_CLASS}
        >
          Ops
        </button>
        <button
          onClick={() => onOpenEnclaves?.()}
          disabled={!hasVisibleEnclaveDashboard}
          className={TOOLBAR_BUTTON_CLASS}
        >
          Enclaves
        </button>
        {loadedGameState && (
          <span className="text-xs font-mono text-text-secondary glow-text whitespace-nowrap">
            {formatTurnLabel(loadedGameState.label)} - {loadedGameState.formations.length} formations - {loadedGameState.phase.toUpperCase()}
          </span>
        )}
      </div>

      {loadError && (
        <span className="text-xs font-mono text-red-400 max-w-md truncate" title={loadError}>
          Load failed: {loadError}
        </span>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
