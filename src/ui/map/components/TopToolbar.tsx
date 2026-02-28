import { useRef, useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { loadLatestRunSave } from '../data/DataLoader';

const FACTION_BANNER_TINT: Record<string, string> = {
  RS: 'rgba(194, 64, 64, 0.35)',
  RBiH: 'rgba(74, 154, 85, 0.35)',
  HRHB: 'rgba(64, 128, 184, 0.35)',
};

export function TopToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadSave = useGameStore((s) => s.loadSave);
  const loadedGameState = useGameStore((s) => s.loadedGameState);
  const [loading, setLoading] = useState(false);
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
      try {
        const text = await file.text();
        const json = JSON.parse(text);
        loadSave(json);
      } catch (err) {
        console.error('Failed to load save file:', err);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [loadSave]
  );

  const handleLoadLatest = useCallback(async () => {
    setLoading(true);
    try {
      loadSave(await loadLatestRunSave());
    } catch (err) {
      console.error('Failed to load latest save:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSave]);

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
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors"
      >
        Load Save
      </button>

      <button
        onClick={handleLoadLatest}
        disabled={loading}
        className="px-3 py-1 text-xs font-mono uppercase tracking-wide bg-panel-card hover:bg-panel-hover text-text-primary border border-panel-border rounded transition-colors disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Load Latest'}
      </button>

      {loadedGameState && (
        <span className="text-xs font-mono text-text-secondary">
          {loadedGameState.label} &mdash; {loadedGameState.formations.length} formations &mdash; {loadedGameState.phase.toUpperCase()}
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
