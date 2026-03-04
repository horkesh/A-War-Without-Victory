import { useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { loadLatestRunSaveAsText, loadRunFinalSaveAsText } from '../data/DataLoader';
import { useIPC } from '../desktop/useIPC';
import { advanceTurnAndSync } from '../desktop/orderActions';

const LOAD_TIMEOUT_MS = 25000;

const FACTION_BANNER_TINT: Record<string, string> = {
  RS: 'rgba(194, 64, 64, 0.35)',
  RBiH: 'rgba(74, 154, 85, 0.35)',
  HRHB: 'rgba(64, 128, 184, 0.35)',
};

interface TopToolbarProps {
  onOpenRecruitment?: () => void;
  onOpenSidePicker?: () => void;
  onOpenSummary?: () => void;
}

export function TopToolbar({ onOpenRecruitment, onOpenSidePicker, onOpenSummary }: TopToolbarProps) {
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
  const leftTint = FACTION_BANNER_TINT[playerFaction] ?? 'rgba(196, 163, 90, 0.2)';
  const toolbarBackground = `linear-gradient(90deg, ${leftTint} 0%, rgba(28, 26, 23, 0.95) 42%, rgba(28, 26, 23, 0.95) 100%)`;

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
      className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-2.5 backdrop-blur-sm border-b border-panel-border"
      style={{ background: toolbarBackground }}
    >
      <span className="font-sans text-sm text-accent-gold tracking-wider uppercase font-semibold">
        A War Without Victory
      </span>

      <button
        onClick={handleLoadClick}
        disabled={loading}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load Save'}
      </button>

      <button
        onClick={handleLoadLatest}
        disabled={loading}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load Latest'}
      </button>

      <span className="text-xs font-mono text-text-secondary">Run ID:</span>
      <input
        type="text"
        value={runIdInput}
        onChange={(e) => setRunIdInput(e.target.value)}
        placeholder="e.g. apr1992_definitive_40w__…"
        className="w-48 px-2 py-1 text-xs font-mono bg-panel-card border border-panel-border rounded text-text-primary placeholder:text-text-muted"
        onKeyDown={(e) => e.key === 'Enter' && handleLoadRun()}
      />
      <button
        onClick={handleLoadRun}
        disabled={loading || !runIdInput.trim()}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        Load run
      </button>
      <button
        onClick={handleAdvanceTurn}
        disabled={advancing || loading || !loadedGameState || !ipc.isAvailable}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        {advancing ? 'Advancing...' : 'Advance turn'}
      </button>
      <button
        onClick={() => onOpenSidePicker?.()}
        disabled={loading || advancing || !ipc.isAvailable}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        New campaign
      </button>
      <button
        onClick={() => onOpenRecruitment?.()}
        disabled={loading || advancing || !loadedGameState || !ipc.isAvailable}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        Recruitment
      </button>
      <button
        onClick={() => onOpenSummary?.()}
        disabled={!loadedGameState}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        Summary
      </button>

      {loadedGameState && (
        <span className="text-xs font-mono text-text-secondary">
          {loadedGameState.label} &mdash; {loadedGameState.formations.length} formations &mdash; {loadedGameState.phase.toUpperCase()}
        </span>
      )}

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
