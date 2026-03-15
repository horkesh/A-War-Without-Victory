interface Tab<T extends string> {
  id: T;
  label: string;
  /** Show a count badge when > 0. */
  count?: number;
}

interface TabBarProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onTabChange: (id: T) => void;
}

export function TabBar<T extends string>({ tabs, activeTab, onTabChange }: TabBarProps<T>) {
  return (
    <div className="flex border-b border-panel-border bg-panel-bg/50 shrink-0" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
            activeTab === tab.id
              ? 'text-accent-gold border-b-2 border-accent-gold bg-panel-card/40'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          {tab.label}
          {tab.count != null && tab.count > 0 && (
            <span className="ml-1 text-[9px] opacity-60">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
