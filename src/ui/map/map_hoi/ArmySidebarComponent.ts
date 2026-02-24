/**
 * Army sidebar: tabs + corps list (Army tab shows CorpsCardComponents).
 */

import { BaseComponent } from './BaseComponent.js';
import { SidebarTabsComponent } from './SidebarTabsComponent.js';
import { CorpsCardComponent } from './CorpsCardComponent.js';
import type { HoICorpsCardData, HoISidebarTabId } from './types.js';

export interface ArmySidebarCallbacks {
  onTabChange?: (tab: HoISidebarTabId) => void;
  onStanceChange?: (corpsId: string, stance: string) => void;
  onPlanOperation?: (corpsId: string) => void;
  onFormOg?: (corpsId: string) => void;
}

export class ArmySidebarComponent extends BaseComponent {
  private activeTab: HoISidebarTabId = 'army';
  private corps: HoICorpsCardData[] = [];
  private callbacks: ArmySidebarCallbacks = {};
  private tabsComponent: SidebarTabsComponent | null = null;
  private corpsCards: CorpsCardComponent[] = [];

  constructor(container: HTMLElement, callbacks?: ArmySidebarCallbacks) {
    super(container, 'aside', 'hoi-sidebar', true);
    this.el.setAttribute('role', 'complementary');
    this.el.setAttribute('aria-label', 'Army management');
    this.callbacks = callbacks ?? {};
  }

  setActiveTab(tab: HoISidebarTabId): void {
    this.activeTab = tab;
  }

  setCorps(corps: HoICorpsCardData[]): void {
    this.corps = corps;
  }

  render(): void {
    this.tabsComponent?.destroy();
    this.tabsComponent = null;
    for (const card of this.corpsCards) card.destroy();
    this.corpsCards = [];
    this.el.innerHTML = '';

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'hoi-sidebar-tabs';
    this.el.appendChild(tabsContainer);
    this.tabsComponent = new SidebarTabsComponent(tabsContainer, (tab) => {
      this.activeTab = tab;
      this.callbacks.onTabChange?.(tab);
      this.render();
    });
    this.tabsComponent.setActiveTab(this.activeTab);
    this.tabsComponent.render();

    const content = document.createElement('div');
    content.className = 'hoi-sidebar-content';
    this.el.appendChild(content);

    if (this.activeTab === 'army') {
      for (const cardData of this.corps) {
        const card = new CorpsCardComponent(content, {
          onStanceChange: this.callbacks.onStanceChange,
          onPlanOperation: this.callbacks.onPlanOperation,
          onFormOg: this.callbacks.onFormOg,
        });
        card.setData(cardData);
        card.render();
        this.corpsCards.push(card);
      }
    } else {
      const placeholder = document.createElement('p');
      placeholder.className = 'hoi-sidebar-placeholder';
      placeholder.textContent = this.activeTab === 'war_status' ? 'War status content.' : this.activeTab === 'diplomacy' ? 'Diplomacy content.' : 'Logistics content.';
      content.appendChild(placeholder);
    }
  }

  override destroy(): void {
    this.tabsComponent?.destroy();
    this.tabsComponent = null;
    for (const card of this.corpsCards) card.destroy();
    this.corpsCards = [];
    super.destroy();
  }
}
