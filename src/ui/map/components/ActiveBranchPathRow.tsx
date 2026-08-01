import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { strictCompare } from '../../../state/validateGameState.js';
import { t } from '../i18n/index.js';

export interface ActiveBranchPath {
  id: string;
  label: string;
}

const TWO_CHIP_MIN_VIEWPORT_PX = 1600;

export function activeBranchVisibleLimit(viewportWidth: number): 1 | 2 {
  return viewportWidth >= TWO_CHIP_MIN_VIEWPORT_PX ? 2 : 1;
}

type ActiveBranchPathInput = string | ActiveBranchPath;

function normalizePaths(paths: readonly ActiveBranchPathInput[]): ActiveBranchPath[] {
  const byId = new Map<string, ActiveBranchPath>();
  for (const path of paths) {
    const entry = typeof path === 'string' ? { id: path, label: path } : path;
    const id = entry.id.trim();
    const label = entry.label.trim();
    if (!id || !label || byId.has(id)) continue;
    byId.set(id, { id, label });
  }
  return [...byId.values()].sort((left, right) => strictCompare(left.label, right.label) || strictCompare(left.id, right.id));
}

export function summarizeActiveBranchPaths(paths: readonly string[]): { visible: string[]; remainder: number } {
  const normalized = normalizePaths(paths);
  return {
    visible: normalized.slice(0, 2).map((entry) => entry.label),
    remainder: Math.max(0, normalized.length - 2),
  };
}

export function ActiveBranchPathRow({
  paths,
  faction,
}: {
  paths: readonly ActiveBranchPathInput[];
  faction?: string;
}) {
  const normalized = normalizePaths(paths);
  const [visibleLimit, setVisibleLimit] = useState<1 | 2>(() => (
    typeof window === 'undefined' ? 2 : activeBranchVisibleLimit(window.innerWidth)
  ));
  const visible = normalized.slice(0, visibleLimit);
  const remainder = Math.max(0, normalized.length - visible.length);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    popoverRef.current?.focus();
    const closeFromOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rowRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    };
    document.addEventListener('mousedown', closeFromOutside);
    return () => document.removeEventListener('mousedown', closeFromOutside);
  }, [open]);

  useEffect(() => {
    const updateVisibleLimit = () => setVisibleLimit(activeBranchVisibleLimit(window.innerWidth));
    window.addEventListener('resize', updateVisibleLimit);
    return () => window.removeEventListener('resize', updateVisibleLimit);
  }, []);

  if (normalized.length === 0) return null;
  const tooltip = t('statusStrip.activePaths.tooltip', {
    count: normalized.length,
    paths: normalized.map((entry) => entry.label).join(', '),
  });
  const closeAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const popover = open && typeof document !== 'undefined'
    ? createPortal(
      <div
        ref={popoverRef}
        role="dialog"
        aria-label={t('statusStrip.activePaths.dialogAria')}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') closeAndRestoreFocus();
        }}
        className="fixed bottom-12 right-4 z-[1000] max-h-64 min-w-64 overflow-y-auto rounded border border-panel-border bg-[#0c0c18]/98 p-2 shadow-xl"
      >
        <div className="mb-1 text-xs font-bold uppercase tracking-[0.1em] text-text-muted">
          {t('statusStrip.activePaths.dialogTitle')}
        </div>
        <ul className="space-y-1">
          {normalized.map(({ id, label }) => (
            <li key={id} className="rounded border border-panel-border/60 bg-panel-card px-2 py-1 text-xs text-text-secondary">
              {label}
            </li>
          ))}
        </ul>
      </div>,
      document.body,
    )
    : null;

  return (
    <>
    <div
      ref={rowRef}
      className="active-branch-path-row flex min-w-0 shrink-0 items-center gap-1.5"
      data-testid="branch-tag-badge-row"
      data-faction={faction}
      title={tooltip}
    >
      {visible.map(({ id, label }) => (
        <span
          key={id}
          className="shrink-0 whitespace-nowrap rounded-sm border border-panel-border bg-panel-card px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.06em] text-text-secondary"
          data-testid="branch-tag-chip"
          data-tag={id}
          title={label}
        >
          {label}
        </span>
      ))}
      {remainder > 0 && (
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((value) => !value)}
          className="shrink-0 rounded-sm border border-accent-gold/35 bg-accent-gold/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.08em] text-accent-gold"
        >
          {t('statusStrip.activePaths.more', { count: remainder })}
        </button>
      )}
    </div>
    {popover}
    </>
  );
}
