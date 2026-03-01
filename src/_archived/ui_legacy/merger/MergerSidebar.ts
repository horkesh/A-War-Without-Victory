/**
 * Sidebar UI for the Settlement Merger tool.
 * Shows municipality filter, selection panel, merge groups, and export controls.
 */

import type { MergerState } from './MergerState.js';
import type { AggregatedStats, MergeGroup } from './types.js';

const GROUP_PALETTE = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4',
    '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990', '#dcbeff',
    '#9A6324', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075',
];

export class MergerSidebar {
    private container: HTMLElement;
    private state: MergerState;
    private onExport: () => void;
    private onMunChange: ((munId: string | null) => void) | null = null;
    private expandedGroup: string | null = null;

    constructor(container: HTMLElement, state: MergerState, onExport: () => void) {
        this.container = container;
        this.state = state;
        this.onExport = onExport;
    }

    setMunChangeCallback(cb: (munId: string | null) => void): void {
        this.onMunChange = cb;
    }

    /** Focus on a specific merge group — shows its details panel in the sidebar. */
    expandGroup(osid: string): void {
        this.expandedGroup = osid;
        this.state.setFocusedGroup(osid);
        // Explicitly re-render to ensure the focused group panel appears immediately
        this.render();
    }

    render(): void {
        const el = this.container;
        el.innerHTML = '';
        this.renderMunicipalityFilter(el);
        this.renderColorModeToggle(el);
        this.renderFocusedGroupPanel(el);
        this.renderSelectionPanel(el);
        this.renderMergeGroupsList(el);
        this.renderStatsFooter(el);
        this.renderSaveLoadExport(el);
    }

    // ── Municipality Filter ──

    private renderMunicipalityFilter(parent: HTMLElement): void {
        const section = this.makeSection(parent, 'Municipality');
        const select = document.createElement('select');
        select.className = 'ms-select';

        const counts = this.state.getMunicipalityCounts();
        const totalCount = this.state.features.size;

        // "All" option
        const optAll = document.createElement('option');
        optAll.value = '';
        optAll.textContent = `All municipalities (${totalCount})`;
        select.appendChild(optAll);

        // Sorted municipality list
        const munEntries = Array.from(this.state.municipalities.entries())
            .sort((a, b) => a[1].localeCompare(b[1]));
        for (const [munId, munName] of munEntries) {
            const count = counts.get(munId) || 0;
            const opt = document.createElement('option');
            opt.value = munId;
            opt.textContent = `${munName} (${count})`;
            if (munId === this.state.activeMunicipality) opt.selected = true;
            select.appendChild(opt);
        }

        select.addEventListener('change', () => {
            const munId = select.value || null;
            this.state.setMunicipality(munId);
            if (this.onMunChange) this.onMunChange(munId);
        });
        section.appendChild(select);

        // "Unmerge All in Municipality" button — only when a municipality is selected
        if (this.state.activeMunicipality) {
            const munId = this.state.activeMunicipality;
            // Count groups in this municipality
            let munGroupCount = 0;
            for (const group of this.state.mergeGroups.values()) {
                const f = this.state.features.get(group.memberSids[0]!);
                if (f && f.properties.mun1990_id === munId) munGroupCount++;
            }
            if (munGroupCount > 0) {
                const btnRow = document.createElement('div');
                btnRow.className = 'ms-btn-row';
                btnRow.style.marginTop = '6px';
                const unmergeAllBtn = document.createElement('button');
                unmergeAllBtn.className = 'ms-btn ms-btn-danger';
                unmergeAllBtn.textContent = `Unmerge All (${munGroupCount} groups)`;
                unmergeAllBtn.addEventListener('click', () => {
                    const removed = this.state.unmergeAllInMunicipality(munId);
                    console.log(`Unmerged ${removed} groups in ${munId}`);
                });
                btnRow.appendChild(unmergeAllBtn);
                section.appendChild(btnRow);
            }
        }
    }

    // ── Color Mode Toggle ──

    private renderColorModeToggle(parent: HTMLElement): void {
        const section = this.makeSection(parent, 'Display');
        const group = document.createElement('div');
        group.className = 'ms-radio-group';

        const modes: { value: 'ethnic' | 'merge_group' | 'group_ethnic'; label: string }[] = [
            { value: 'ethnic', label: 'Ethnic' },
            { value: 'group_ethnic', label: 'Group Ethnic' },
            { value: 'merge_group', label: 'Merge Groups' },
        ];
        for (const mode of modes) {
            const label = document.createElement('label');
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = 'colorMode';
            radio.value = mode.value;
            radio.checked = this.state.colorMode === mode.value;
            radio.addEventListener('change', () => {
                if (radio.checked) this.state.setColorMode(mode.value);
            });
            label.appendChild(radio);
            label.appendChild(document.createTextNode(` ${mode.label}`));
            group.appendChild(label);
        }
        section.appendChild(group);
    }

    // ── Focused Group Panel (shown when clicking a merged settlement) ──

    private renderFocusedGroupPanel(parent: HTMLElement): void {
        const osid = this.state.focusedGroupOsid;
        if (!osid) return;
        const group = this.state.mergeGroups.get(osid);
        if (!group) return;

        const section = this.makeSection(parent, `Merge Group: ${group.label}`);

        // OSID
        const osidLine = document.createElement('div');
        osidLine.className = 'ms-stats-row';
        osidLine.innerHTML = `<span class="ms-stats-label">OSID</span><span class="ms-stats-value" style="font-size:10px">${group.osid}</span>`;
        section.appendChild(osidLine);

        // Aggregated stats with ethnic bar
        const stats = this.state.getAggregatedStats(group.memberSids);
        this.renderStatsBox(section, stats);

        // Member list with per-member remove buttons
        const members = document.createElement('div');
        members.className = 'ms-group-members';
        for (const sid of group.memberSids) {
            const f = this.state.features.get(sid);
            const memberDiv = document.createElement('div');
            memberDiv.className = 'ms-group-member-row';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = f ? `${f.properties.settlement_name} (${f.properties.population_total})` : sid;
            nameSpan.title = sid;
            memberDiv.appendChild(nameSpan);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'ms-sel-remove';
            removeBtn.textContent = '\u00d7';
            removeBtn.title = `Remove ${sid} from group`;
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.removeFromGroup(group.osid, sid);
                // If group still exists, stay focused; otherwise close
                if (!this.state.mergeGroups.has(group.osid)) {
                    this.expandedGroup = null;
                }
                this.render();
            });
            memberDiv.appendChild(removeBtn);
            members.appendChild(memberDiv);
        }
        section.appendChild(members);

        // Contiguity warning (uses cached validation)
        const focusedValidation = this.state.getGroupValidation(osid);
        if (!focusedValidation.connected) {
            const warn = document.createElement('div');
            warn.className = 'ms-warning';
            warn.textContent = '\u26a0 Graph adjacency: not all members connected (may be OK if visually contiguous)';
            section.appendChild(warn);
        }

        // Cross-municipality warning (red, prominent)
        if (focusedValidation.crossMun) {
            const muns = new Set<string>();
            for (const sid of group.memberSids) {
                const f = this.state.features.get(sid);
                if (f) {
                    const name = this.state.municipalities.get(f.properties.mun1990_id) ?? f.properties.mun1990_id;
                    muns.add(name);
                }
            }
            const warn = document.createElement('div');
            warn.className = 'ms-warning-crossmun';
            warn.textContent = `\u2716 CROSS-MUNICIPALITY: ${[...muns].join(' + ')}`;
            section.appendChild(warn);
        }

        // Hint: click to add
        const hint = document.createElement('div');
        hint.className = 'ms-hint';
        hint.textContent = '\u21b3 Click an unmerged settlement on the map to add it to this group';
        section.appendChild(hint);

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'ms-btn-row';
        btnRow.style.marginTop = '6px';

        const undoBtn = document.createElement('button');
        undoBtn.className = 'ms-btn ms-btn-danger';
        undoBtn.textContent = 'Undo Merge';
        undoBtn.addEventListener('click', () => {
            this.expandedGroup = null;
            this.state.setFocusedGroup(null);
            this.state.undoMerge(group.osid);
        });
        btnRow.appendChild(undoBtn);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'ms-btn';
        closeBtn.textContent = 'Close';
        closeBtn.addEventListener('click', () => {
            this.expandedGroup = null;
            this.state.setFocusedGroup(null);
        });
        btnRow.appendChild(closeBtn);

        section.appendChild(btnRow);
    }

    // ── Selection Panel ──

    private renderSelectionPanel(parent: HTMLElement): void {
        const sel = this.state.selectedSids;
        if (sel.size === 0) return;

        const section = this.makeSection(parent, `Selected: ${sel.size} settlement${sel.size > 1 ? 's' : ''}`);

        // List
        const list = document.createElement('div');
        list.className = 'ms-sel-list';
        for (const sid of sel) {
            const f = this.state.features.get(sid);
            const item = document.createElement('div');
            item.className = 'ms-sel-item';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'ms-sel-item-name';
            nameSpan.textContent = f ? `${f.properties.settlement_name} (${f.properties.population_total})` : sid;
            nameSpan.title = sid;
            item.appendChild(nameSpan);

            const btn = document.createElement('button');
            btn.className = 'ms-sel-remove';
            btn.textContent = '\u00d7';
            btn.title = 'Remove from selection';
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.state.toggleSelection(sid);
            });
            item.appendChild(btn);
            list.appendChild(item);
        }
        section.appendChild(list);

        // Aggregated stats
        const stats = this.state.getAggregatedStats(sel);
        this.renderStatsBox(section, stats);

        // Contiguity warning
        if (sel.size >= 2 && !this.state.isConnected(sel)) {
            const warn = document.createElement('div');
            warn.className = 'ms-warning';
            warn.textContent = '\u26a0 Selection is not contiguous (settlements are not all adjacent)';
            section.appendChild(warn);
        }

        // Buttons
        const btnRow = document.createElement('div');
        btnRow.className = 'ms-btn-row';

        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'ms-btn ms-btn-primary';
        confirmBtn.textContent = 'Confirm Merge';
        confirmBtn.disabled = sel.size < 2;
        confirmBtn.addEventListener('click', () => this.state.confirmMerge());
        btnRow.appendChild(confirmBtn);

        const clearBtn = document.createElement('button');
        clearBtn.className = 'ms-btn';
        clearBtn.textContent = 'Clear';
        clearBtn.addEventListener('click', () => this.state.clearSelection());
        btnRow.appendChild(clearBtn);

        section.appendChild(btnRow);
    }

    // ── Merge Groups List ──

    private renderMergeGroupsList(parent: HTMLElement): void {
        const groups = this.state.mergeGroups;
        if (groups.size === 0) return;

        // Filter groups by active municipality if set
        const activeMun = this.state.activeMunicipality;
        let filteredGroups = Array.from(groups.values());
        if (activeMun) {
            filteredGroups = filteredGroups.filter(g => {
                const f = this.state.features.get(g.memberSids[0]!);
                return f && f.properties.mun1990_id === activeMun;
            });
        }

        const totalLabel = activeMun
            ? `Merge Groups (${filteredGroups.length} of ${groups.size})`
            : `Merge Groups (${groups.size})`;
        const section = this.makeSection(parent, totalLabel);
        const scroll = document.createElement('div');
        scroll.className = 'ms-groups-scroll';

        const sortedGroups = filteredGroups
            .sort((a, b) => a.osid.localeCompare(b.osid));

        for (const group of sortedGroups) {
            const validation = this.state.getGroupValidation(group.osid);
            const isDisconnected = !validation.connected;
            const isCrossMun = validation.crossMun;

            const card = document.createElement('div');
            let cardClass = 'ms-group-card';
            if (this.expandedGroup === group.osid) cardClass += ' expanded';
            if (isCrossMun) cardClass += ' ms-crossmun';
            card.className = cardClass;

            // Header
            const header = document.createElement('div');
            header.className = 'ms-group-header';

            const dot = document.createElement('div');
            dot.className = 'ms-group-dot';
            dot.style.background = GROUP_PALETTE[group.colorIndex % GROUP_PALETTE.length]!;
            header.appendChild(dot);

            // Cross-municipality: red alert icon before the label
            if (isCrossMun) {
                const crossIcon = document.createElement('span');
                crossIcon.className = 'ms-group-warn-crossmun';
                crossIcon.textContent = '\u2716'; // ✖
                crossIcon.title = 'CROSS-MUNICIPALITY — members span different municipalities';
                header.appendChild(crossIcon);
            }

            const label = document.createElement('span');
            label.className = 'ms-group-label';
            label.textContent = group.label;
            label.title = group.osid;
            header.appendChild(label);

            const stats = this.state.getAggregatedStats(group.memberSids);

            // Disconnected warning icon (yellow, less severe)
            if (isDisconnected && !isCrossMun) {
                const warnIcon = document.createElement('span');
                warnIcon.className = 'ms-group-warn';
                warnIcon.textContent = '\u26a0';
                warnIcon.title = 'Not graph-connected (may be OK if visually contiguous)';
                header.appendChild(warnIcon);
            }

            const pop = document.createElement('span');
            pop.className = 'ms-group-pop';
            pop.textContent = `${stats.total.toLocaleString()} · ${stats.ethnicKey}`;
            header.appendChild(pop);

            card.appendChild(header);

            // Detail (expandable)
            const detail = document.createElement('div');
            detail.className = 'ms-group-detail';

            const osidLine = document.createElement('div');
            osidLine.textContent = `OSID: ${group.osid}`;
            detail.appendChild(osidLine);

            this.renderStatsBox(detail, stats);

            const members = document.createElement('div');
            members.className = 'ms-group-members';
            for (const sid of group.memberSids) {
                const f = this.state.features.get(sid);
                const memberDiv = document.createElement('div');
                memberDiv.textContent = f ? `${sid} — ${f.properties.settlement_name}` : sid;
                members.appendChild(memberDiv);
            }
            detail.appendChild(members);

            const undoBtn = document.createElement('button');
            undoBtn.className = 'ms-btn ms-btn-danger';
            undoBtn.textContent = 'Undo Merge';
            undoBtn.style.marginTop = '4px';
            undoBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.expandedGroup = null;
                this.state.setFocusedGroup(null);
                this.state.undoMerge(group.osid);
            });
            detail.appendChild(undoBtn);

            card.appendChild(detail);

            // Toggle expand
            header.addEventListener('click', () => {
                this.expandedGroup = this.expandedGroup === group.osid ? null : group.osid;
                this.state.setFocusedGroup(this.expandedGroup);
                this.render();
            });

            scroll.appendChild(card);
        }
        section.appendChild(scroll);
    }

    // ── Stats footer ──

    private renderStatsFooter(parent: HTMLElement): void {
        const section = this.makeSection(parent, 'Summary');
        const total = this.state.features.size;
        const mergedSids = this.state.sidToOsid.size;
        const groups = this.state.mergeGroups.size;
        const unmerged = total - mergedSids;

        // Count flagged groups (uses cached validation)
        let flaggedDisconnected = 0;
        let flaggedCrossMun = 0;
        for (const [osid] of this.state.mergeGroups) {
            const v = this.state.getGroupValidation(osid);
            if (!v.connected) flaggedDisconnected++;
            if (v.crossMun) flaggedCrossMun++;
        }

        const div = document.createElement('div');
        div.className = 'ms-footer-stats';
        let html = `
            <span>Total: <strong>${total}</strong></span>
            <span>Groups: <strong>${groups}</strong></span>
            <span>Merged: <strong>${mergedSids}</strong></span>
            <span>Unmerged: <strong>${unmerged}</strong></span>
        `;
        if (flaggedDisconnected > 0) {
            html += `<span class="ms-footer-warn">\u26a0 ${flaggedDisconnected} disconnected</span>`;
        }
        if (flaggedCrossMun > 0) {
            html += `<span class="ms-footer-warn-crossmun">\u2716 ${flaggedCrossMun} cross-mun</span>`;
        }
        div.innerHTML = html;
        section.appendChild(div);
    }

    // ── Save / Load / Export ──

    private renderSaveLoadExport(parent: HTMLElement): void {
        const section = this.makeSection(parent, 'Actions');

        const btnRow1 = document.createElement('div');
        btnRow1.className = 'ms-btn-row';

        const saveBtn = document.createElement('button');
        saveBtn.className = 'ms-btn';
        saveBtn.textContent = 'Save Progress';
        saveBtn.addEventListener('click', () => {
            const json = this.state.exportMergeState();
            downloadString(json, 'merge_progress.json', 'application/json');
        });
        btnRow1.appendChild(saveBtn);

        const loadBtn = document.createElement('button');
        loadBtn.className = 'ms-btn';
        loadBtn.textContent = 'Load Progress';
        loadBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.addEventListener('change', () => {
                const file = input.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        this.state.importMergeState(reader.result as string);
                    } catch (e) {
                        console.error('Failed to load merge state:', e);
                        alert('Failed to load merge state file.');
                    }
                };
                reader.readAsText(file);
            });
            input.click();
        });
        btnRow1.appendChild(loadBtn);
        section.appendChild(btnRow1);

        const btnRow2 = document.createElement('div');
        btnRow2.className = 'ms-btn-row';
        btnRow2.style.marginTop = '4px';

        const exportBtn = document.createElement('button');
        exportBtn.className = 'ms-btn ms-btn-primary';
        exportBtn.textContent = 'Export All';
        exportBtn.style.flex = '1';
        exportBtn.addEventListener('click', () => this.onExport());
        btnRow2.appendChild(exportBtn);

        section.appendChild(btnRow2);
    }

    // ── Helpers ──

    private makeSection(parent: HTMLElement, title: string): HTMLElement {
        const section = document.createElement('div');
        section.className = 'ms-section';
        const titleEl = document.createElement('div');
        titleEl.className = 'ms-section-title';
        titleEl.textContent = title;
        section.appendChild(titleEl);
        parent.appendChild(section);
        return section;
    }

    private renderStatsBox(parent: HTMLElement, stats: AggregatedStats): void {
        // Population row
        const popRow = document.createElement('div');
        popRow.className = 'ms-stats-row';
        popRow.innerHTML = `<span class="ms-stats-label">Population</span><span class="ms-stats-value">${stats.total.toLocaleString()}</span>`;
        parent.appendChild(popRow);

        // Ethnic bar
        if (stats.total > 0) {
            const bar = document.createElement('div');
            bar.className = 'ms-ethnic-bar';

            if (stats.pctB > 0) {
                const seg = document.createElement('div');
                seg.className = 'eb-b';
                seg.style.width = `${stats.pctB}%`;
                seg.textContent = stats.pctB >= 8 ? `B ${stats.pctB.toFixed(0)}%` : '';
                bar.appendChild(seg);
            }
            if (stats.pctC > 0) {
                const seg = document.createElement('div');
                seg.className = 'eb-c';
                seg.style.width = `${stats.pctC}%`;
                seg.textContent = stats.pctC >= 8 ? `C ${stats.pctC.toFixed(0)}%` : '';
                bar.appendChild(seg);
            }
            if (stats.pctS > 0) {
                const seg = document.createElement('div');
                seg.className = 'eb-s';
                seg.style.width = `${stats.pctS}%`;
                seg.textContent = stats.pctS >= 8 ? `S ${stats.pctS.toFixed(0)}%` : '';
                bar.appendChild(seg);
            }
            if (stats.pctO > 0) {
                const seg = document.createElement('div');
                seg.className = 'eb-o';
                seg.style.width = `${stats.pctO}%`;
                seg.textContent = stats.pctO >= 8 ? `O ${stats.pctO.toFixed(0)}%` : '';
                bar.appendChild(seg);
            }
            parent.appendChild(bar);
        }

        // Ethnic key badge
        const badgeRow = document.createElement('div');
        badgeRow.className = 'ms-stats-row';
        badgeRow.innerHTML = `<span class="ms-stats-label">Ethnic key</span>`;
        const badge = document.createElement('span');
        badge.className = `ms-ethnic-badge eb-${stats.ethnicKey}`;
        badge.textContent = stats.ethnicKey;
        badgeRow.appendChild(badge);
        parent.appendChild(badgeRow);

        // Detailed breakdown
        const detailRows = [
            ['Bosniaks', stats.bosniaks, stats.pctB],
            ['Croats', stats.croats, stats.pctC],
            ['Serbs', stats.serbs, stats.pctS],
            ['Others', stats.others, stats.pctO],
        ] as const;
        for (const [label, count, pct] of detailRows) {
            if (count === 0) continue;
            const row = document.createElement('div');
            row.className = 'ms-stats-row';
            row.innerHTML = `<span class="ms-stats-label">${label}</span><span class="ms-stats-value">${count.toLocaleString()} (${pct.toFixed(1)}%)</span>`;
            parent.appendChild(row);
        }
    }
}

function downloadString(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
