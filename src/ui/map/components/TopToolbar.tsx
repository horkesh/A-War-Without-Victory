import { useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { loadLatestRunSaveAsText, loadRunFinalSaveAsText } from '../data/DataLoader';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';
import { formatTurnLabel } from '../utils/formatters';
import { getFactionCrest } from '../utils/factionAssets';
import { OfficerEventBadge } from './OfficerEventBadge';
import type { LoadedGameState, SummaryFocusSection } from '../data/types';

const LOAD_TIMEOUT_MS = 25000;


const TOOLBAR_BUTTON_CLASS = 'px-3 py-1 text-[10px] font-mono uppercase tracking-[0.15em] bg-black/40 hover:bg-interactive/20 text-text-primary border border-white/10 rounded transition-all disabled:opacity-30 hover:border-interactive/40 hover:shadow-glow-sm hover:text-interactive active:scale-95';
const MODULAR_SECTION_CLASS = 'flex items-center gap-2 px-3 py-1 bg-black/20 border border-white/5 rounded-md relative overflow-hidden group';
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

/** True when loaded inside the warroom iframe (?embedded=1). */
const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === '1';

export function TopToolbar({ onOpenRecruitment, onOpenSidePicker, onOpenSummary, onOpenEnclaves, onOpenAAR, onOpenOpsHistory }: TopToolbarProps) {
  const ipc = useIPC();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const devMode = useGameStore((s) => s.devMode);
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
  const crestUrl = getFactionCrest(playerFaction);
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
      className="absolute top-0 left-0 right-0 z-10 flex items-center gap-4 px-4 py-2 bg-glass border-b border-white/10 shadow-2xl group/toolbar text-text-primary"
    >
      <div className="absolute inset-0 scanline-texture opacity-[0.03] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-accent-gold/5 via-transparent to-transparent pointer-events-none" />

      {/* 0. BACK TO HQ (embedded mode only) */}
      {isEmbedded && (
        <button
          id="btn-back-to-hq"
          className={TOOLBAR_BUTTON_CLASS}
          title="Return to warroom HQ"
          onClick={() => window.parent.postMessage({ type: 'awwv-back-to-hq' }, '*')}
        >
          ◀ HQ
        </button>
      )}

      {/* 1. BRANDING / COMMAND CONSOLE */}
      <div className="flex items-center gap-3 shrink-0 relative">
        <div className="absolute -left-4 top-0 bottom-0 w-1 bg-accent-gold shadow-glow-gold opacity-80" />
        {crestUrl && (
          <img src={crestUrl} alt="" className="w-7 h-7 object-contain drop-shadow-glow-gold brightness-125" />
        )}
        <div className="flex flex-col">
          <span className="font-sans text-[11px] text-accent-gold tracking-[0.2em] uppercase font-bold glow-text leading-tight">
            Warroom Console
          </span>
          <span className="font-mono text-[9px] text-text-secondary uppercase tracking-widest opacity-60">
            A War Without Victory v0.6.1
          </span>
        </div>
        {devMode && (
          <span className="ml-1 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-[0.3em] bg-amber-900/40 text-amber-500 border border-amber-500/30 rounded-full shadow-inner">
            D_MODE
          </span>
        )}
      </div>

      <div className="h-8 w-px bg-white/5 mx-1" />

      {/* 2. COMMAND & SYSTEMS MODULE (Logistics) */}
      <div className={MODULAR_SECTION_CLASS}>
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="module-header">Systems</div>
        {devMode && (
          <div className="flex items-center gap-1.5">
            <button onClick={handleLoadClick} disabled={loading} className={TOOLBAR_BUTTON_CLASS} title="Select save file">LOAD</button>
            <button onClick={handleLoadLatest} disabled={loading} className={TOOLBAR_BUTTON_CLASS} title="Load most recent session">LATEST</button>
            <div className="flex items-center gap-1 ml-1">
              <input
                type="text"
                value={runIdInput}
                onChange={(e) => setRunIdInput(e.target.value)}
                placeholder="RUN_ID"
                className="w-20 px-1 py-0.5 text-[9px] font-mono bg-black/40 border border-white/10 rounded text-text-primary focus:border-interactive/40 focus:outline-none transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleLoadRun()}
              />
              <button onClick={handleLoadRun} disabled={loading || !runIdInput.trim()} className={TOOLBAR_BUTTON_CLASS}>SYNC</button>
            </div>
          </div>
        )}
        <button
          onClick={handleAdvanceTurn}
          disabled={advancing || loading || !loadedGameState || !ipc.isAvailable}
          className={`${TOOLBAR_BUTTON_CLASS} border-accent-gold/30 text-accent-gold hover:bg-accent-gold/10`}
        >
          {advancing ? 'ADVANCING...' : 'ADVANCE TURN'}
        </button>
        <button
          onClick={() => onOpenSidePicker?.()}
          disabled={loading || advancing || !ipc.isAvailable}
          className={TOOLBAR_BUTTON_CLASS}
        >
          CAMPAIGN
        </button>
      </div>

      {/* 3. TACTICAL ASSETS MODULE */}
      <div className={MODULAR_SECTION_CLASS}>
        <div className="module-header">Personnel</div>
        <OfficerEventBadge />
        <button
          onClick={() => onOpenRecruitment?.()}
          disabled={loading || advancing || !loadedGameState || !ipc.isAvailable}
          className={TOOLBAR_BUTTON_CLASS}
        >
          RECRUIT
        </button>
        {hasVisibleEnclaveDashboard && (
          <button
            onClick={() => onOpenEnclaves?.()}
            className={`${TOOLBAR_BUTTON_CLASS} text-amber-400 border-amber-400/20 hover:bg-amber-400/10`}
          >
            ENCLAVES
          </button>
        )}
      </div>

      {/* 4. INTELLIGENCE MODULE */}
      <div className={MODULAR_SECTION_CLASS}>
        <div className="module-header">Intel</div>
        <div className="flex items-center gap-1">
          {summaryShortcuts.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              onClick={() => onOpenSummary?.(shortcut.focus)}
              disabled={!loadedGameState}
              className={`${TOOLBAR_BUTTON_CLASS} border-transparent bg-transparent hover:bg-white/5 normal-case tracking-wider`}
            >
              {shortcut.label}: <span className="text-interactive tabular-nums">{shortcut.focus === 'ivp' ? `${shortcut.count}%` : shortcut.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. OPERATIONAL RECORD MODULE */}
      <div className="ml-auto flex items-center gap-2">
        <div className={MODULAR_SECTION_CLASS}>
          <div className="module-header">History</div>
          <div className="flex gap-1.5">
            <button onClick={() => onOpenSummary?.('overview')} disabled={!loadedGameState} className={TOOLBAR_BUTTON_CLASS}>SUMMARY</button>
            <button onClick={() => onOpenAAR?.()} disabled={!loadedGameState} className={TOOLBAR_BUTTON_CLASS}>AAR</button>
            <button onClick={() => onOpenOpsHistory?.()} disabled={!loadedGameState} className={TOOLBAR_BUTTON_CLASS}>OPS</button>
          </div>
        </div>

        {/* 6. TELEMETRY DISPLAY */}
        <div className="flex flex-col items-end justify-center min-w-[140px] px-3 py-1 border-l border-white/10 bg-black/10">
          {loadedGameState ? (
            <>
              <div className="text-[11px] font-mono text-text-primary tracking-wider glow-text uppercase">
                {formatTurnLabel(loadedGameState.label)}
              </div>
              <div className="flex items-center gap-2 text-[8px] font-mono text-text-secondary uppercase tracking-[0.2em] opacity-80">
                <span>{loadedGameState.phase}</span>
                <span className="w-1 h-1 rounded-full bg-interactive animate-pulse" />
                <span>{loadedGameState.formations.length} FORMATIONS</span>
              </div>
            </>
          ) : (
            <span className="text-[10px] font-mono text-text-muted italic">NO TELEMETRY</span>
          )}
        </div>
      </div>

      {loadError && (
        <div className="absolute top-full left-0 right-0 bg-red-900/60 backdrop-blur-md border-b border-red-500/30 px-4 py-1 flex items-center justify-between z-0">
          <span className="text-[10px] font-mono text-red-200 uppercase tracking-widest animate-pulse">
            SYSTEM_ERROR: {loadError}
          </span>
          <button onClick={() => setLoadError(null)} className="text-red-200/50 hover:text-red-200 text-[10px]">ACKNOWLEDGE</button>
        </div>
      )}

      {devMode && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
}
