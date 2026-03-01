/**
 * Army sidebar: tabs + corps list (Army tab shows CorpsCardComponents).
 */

import { BaseComponent } from './BaseComponent.js';
import { SidebarTabsComponent } from './SidebarTabsComponent.js';
import { CorpsCardComponent } from './CorpsCardComponent.js';
import { WarStatusTabComponent } from './WarStatusTabComponent.js';
import { DiplomacyTabComponent } from './DiplomacyTabComponent.js';
import { LogisticsTabComponent } from './LogisticsTabComponent.js';
import type { HoICorpsCardData, HoISidebarTabId, HoIWarStatusData, HoIDiplomacyData, HoILogisticsData } from './types.js';

export interface ArmySidebarCallbacks {
  onTabChange?: (tab: HoISidebarTabId) => void;
  onBrigadeClick?: (brigadeId: string) => void;
  onCorpsClick?: (corpsId: string) => void;
  onStanceChange?: (corpsId: string, stance: string) => void;
  onPlanOperation?: (corpsId: string) => void;
  onFormOg?: (corpsId: string) => void;
}

export class ArmySidebarComponent extends BaseComponent {
  private activeTab: HoISidebarTabId = 'army';
  private corps: HoICorpsCardData[] = [];
  private warStatus: HoIWarStatusData | null = null;
  private diplomacy: HoIDiplomacyData | null = null;
  private logistics: HoILogisticsData | null = null;
  private callbacks: ArmySidebarCallbacks = {};
  private tabsComponent: SidebarTabsComponent | null = null;
  private corpsCards: CorpsCardComponent[] = [];
  private tabContentComponent: WarStatusTabComponent | DiplomacyTabComponent | LogisticsTabComponent | null = null;

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

  setWarStatus(data: HoIWarStatusData | null): void {
    this.warStatus = data;
  }

  setDiplomacy(data: HoIDiplomacyData | null): void {
    this.diplomacy = data;
  }

  setLogistics(data: HoILogisticsData | null): void {
    this.logistics = data;
  }

  render(): void {
    this.tabsComponent?.destroy();
    this.tabsComponent = null;
    for (const card of this.corpsCards) card.destroy();
    this.corpsCards = [];
    this.tabContentComponent?.destroy();
    this.tabContentComponent = null;
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
          onCorpsClick: this.callbacks.onCorpsClick,
          onBrigadeClick: this.callbacks.onBrigadeClick,
          onStanceChange: this.callbacks.onStanceChange,
          onPlanOperation: this.callbacks.onPlanOperation,
          onFormOg: this.callbacks.onFormOg,
        });
        card.setData(cardData);
        card.render();
        this.corpsCards.push(card);
      }
    } else if (this.activeTab === 'war_status') {
      this.tabContentComponent = new WarStatusTabComponent(content);
      this.tabContentComponent.setData(this.warStatus);
      this.tabContentComponent.render();
    } else if (this.activeTab === 'diplomacy') {
      this.tabContentComponent = new DiplomacyTabComponent(content);
      this.tabContentComponent.setData(this.diplomacy);
      this.tabContentComponent.render();
    } else if (this.activeTab === 'logistics') {
      this.tabContentComponent = new LogisticsTabComponent(content);
      this.tabContentComponent.setData(this.logistics);
      this.tabContentComponent.render();
    } else {
      const placeholder = document.createElement('p');
      placeholder.className = 'hoi-sidebar-placeholder';
      placeholder.textContent = 'No content.';
      content.appendChild(placeholder);
    }
  }

  override destroy(): void {
    this.tabsComponent?.destroy();
    this.tabsComponent = null;
    for (const card of this.corpsCards) card.destroy();
    this.corpsCards = [];
    this.tabContentComponent?.destroy();
    this.tabContentComponent = null;
    super.destroy();
  }
}
