/**
 * Generic accessible TabBar component.
 *
 * A11y LANE-NIGHTSHIFT-V093-A11Y-LANE-C — full WAI-ARIA tablist pattern:
 *   - role="tablist" on container, role="tab" on each button.
 *   - aria-selected reflects active tab; tabIndex roving (active = 0, others = -1).
 *   - ArrowLeft / ArrowRight cycle (with wrap-around). Home / End jump to first / last.
 *   - aria-controls / id wiring (callers must mount a matching role="tabpanel"
 *     with id={panelId(id)} aria-labelledby={tabId(id)}).
 *
 * Faction-symmetric: no faction-specific branches. Pure UI surface.
 */
import { useCallback, useRef } from 'react';

interface Tab<T extends string> {
  id: T;
  label: string;
  /** Show a count badge when > 0. */
  count?: number;
  /** Accessible count phrase when the badge has domain meaning, e.g. "34 brigades". */
  countLabel?: string;
}

interface TabBarProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
  /** Optional id namespace prefix; defaults to "tabbar". Used to derive tab + panel IDs. */
  idPrefix?: string;
  /** Accessible name for the tablist (announces the group purpose). */
  ariaLabel?: string;
}

/** Stable per-tab id, used for aria-labelledby on the matching tabpanel. */
export function tabId(prefix: string, id: string): string {
  return `${prefix}-tab-${id}`;
}

/** Stable per-panel id, used for aria-controls on the tab. */
export function tabPanelId(prefix: string, id: string): string {
  return `${prefix}-tabpanel-${id}`;
}

export function TabBar<T extends string>({
  tabs,
  activeTab,
  onTabChange,
  idPrefix = 'tabbar',
  ariaLabel,
}: TabBarProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, currentIdx: number) => {
      const len = tabs.length;
      if (len === 0) return;
      let nextIdx: number | null = null;
      if (e.key === 'ArrowRight') nextIdx = (currentIdx + 1) % len;
      else if (e.key === 'ArrowLeft') nextIdx = (currentIdx - 1 + len) % len;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = len - 1;
      if (nextIdx == null) return;
      e.preventDefault();
      const nextTab = tabs[nextIdx];
      onTabChange(nextTab.id);
      refs.current[nextTab.id]?.focus();
    },
    [tabs, onTabChange],
  );

  return (
    <div
      className="flex border-b border-panel-border bg-panel-bg/50 shrink-0"
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        const tabAriaLabel = tab.count != null && tab.count > 0
          ? `${tab.label}, ${tab.countLabel ?? tab.count}`
          : tab.label;
        return (
          <button
            key={tab.id}
            id={tabId(idPrefix, tab.id)}
            ref={(el) => {
              refs.current[tab.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={tabPanelId(idPrefix, tab.id)}
            aria-label={tabAriaLabel}
            title={tabAriaLabel}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? 'text-accent-gold border-b-2 border-accent-gold bg-panel-card/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span aria-hidden="true" className="ml-1 text-[9px] opacity-60">{` ${tab.count}`}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
