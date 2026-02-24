/**
 * Sidebar tabs: Army | War Status | Diplomacy | Logistics.
 */

import { BaseComponent } from './BaseComponent.js';
import type { HoISidebarTabId } from './types.js';

const TABS: { id: HoISidebarTabId; label: string }[] = [
  { id: 'army', label: 'Army' },
  { id: 'war_status', label: 'War Status' },
  { id: 'diplomacy', label: 'Diplomacy' },
  { id: 'logistics', label: 'Logistics' },
];

export class SidebarTabsComponent extends BaseComponent {
  private activeTab: HoISidebarTabId = 'army';
  private onTabChange: (tab: HoISidebarTabId) => void = () => {};

  constructor(container: HTMLElement, onTabChange?: (tab: HoISidebarTabId) => void) {
    super(container, 'div', 'hoi-sidebar-tabs');
    if (onTabChange) this.onTabChange = onTabChange;
  }

  setActiveTab(tab: HoISidebarTabId): void {
    this.activeTab = tab;
  }

  render(): void {
    this.el.innerHTML = '';
    for (const { id, label } of TABS) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'hoi-tab-btn' + (this.activeTab === id ? ' active' : '');
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.activeTab = id;
        this.onTabChange(id);
        this.render();
      });
      this.el.appendChild(btn);
    }
  }
}
