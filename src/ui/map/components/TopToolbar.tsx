import { useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { loadLatestRunSaveAsText, loadRunFinalSaveAsText } from '../data/DataLoader';

const LOAD_TIMEOUT_MS = 25000;

const FACTION_BANNER_TINT: Record<string, string> = {
  RS: 'rgba(194, 64, 64, 0.35)',
  RBiH: 'rgba(74, 154, 85, 0.35)',
  HRHB: 'rgba(64, 128, 184, 0.35)',
};

const isEmbedded = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embedded') === '1';

export function TopToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadSave = useGameStore((s) => s.loadSave);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const loadError = useGameStore((s) => s.loadError);
  const setLoadError = useGameStore((s) => s.setLoadError);
  const [loading, setLoading] = useState(false);
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

  return (
    <div
      className="absolute top-0 left-0 right-0 z-10 flex items-center gap-3 px-4 py-2.5 backdrop-blur-sm border-b border-panel-border"
      style={{ background: toolbarBackground }}
    >
      {isEmbedded && (
        <button
          onClick={() => window.parent.postMessage({ type: 'awwv-back-to-hq' }, '*')}
          className="px-3 py-1 text-xs font-mono uppercase tracking-wide font-semibold rounded transition-colors"
          style={{ background: 'rgba(0,232,120,0.12)', color: '#00e878', border: '1px solid rgba(0,232,120,0.3)' }}
        >
          &#9664; HQ
        </button>
      )}

      <span className="font-sans text-sm text-accent-gold tracking-wider uppercase font-semibold">
        A War Without Victory
      </span>
      {/* Build badge: confirms which bundle is running in desktop iframe (remove once verified). */}
      {isEmbedded && typeof __MAP_BUILD_TIME__ !== 'undefined' && (
        <span
          className="text-[10px] font-mono text-text-muted px-1.5 py-0.5 rounded border border-panel-border"
          title={`Map bundle: ${__MAP_BUILD_TIME__}`}
        >
          map {typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'dev' : new Date(__MAP_BUILD_TIME__).toLocaleTimeString()}
        </span>
      )}

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
