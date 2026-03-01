import type { GameSave, FormationRecord } from './types';

export interface CommandHierarchyPanelOptions {
    onSelectFormation: (formationId: string) => void;
}

function sortById<T extends { id: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => a.id.localeCompare(b.id));
}

function buildParityWarnings(save: GameSave): string[] {
    const out: string[] = [];
    const formations = save.formations ?? {};
    const ids = Object.keys(formations).sort((a, b) => a.localeCompare(b));
    for (const id of ids) {
        const f = formations[id];
        if (!f || (f.kind ?? 'brigade') !== 'brigade') continue;
        if (!f.corps_id) {
            out.push(`Brigade ${id} missing corps_id`);
            continue;
        }
        const corps = formations[f.corps_id];
        if (!corps) out.push(`Brigade ${id} references missing corps ${f.corps_id}`);
    }
    return out;
}

export class CommandHierarchyPanel {
    private readonly root: HTMLDivElement;
    private readonly body: HTMLDivElement;
    private save: GameSave | null = null;
    private modeVisible = false;
    private readonly onSelectFormation: (formationId: string) => void;

    constructor(parent: HTMLElement, options: CommandHierarchyPanelOptions) {
        this.onSelectFormation = options.onSelectFormation;
        this.root = document.createElement('div');
        this.root.style.cssText = [
            'position:absolute',
            'left:12px',
            'top:72px',
            'z-index:18',
            'display:none',
            'width:310px',
            'max-height:70vh',
            'overflow:auto',
            'padding:10px 12px',
            'background:rgba(8,10,20,0.9)',
            'border:1px solid rgba(90,112,160,0.6)',
            'color:#cad7ef',
            'font:11px "IBM Plex Mono", monospace',
            'line-height:1.4',
        ].join(';');
        const title = document.createElement('div');
        title.textContent = 'COMMAND HIERARCHY';
        title.style.cssText = 'font-weight:700; letter-spacing:0.06em; margin-bottom:8px;';
        this.body = document.createElement('div');
        this.root.appendChild(title);
        this.root.appendChild(this.body);
        parent.appendChild(this.root);
    }

    setVisible(visible: boolean): void {
        this.modeVisible = visible;
        this.root.style.display = visible ? 'block' : 'none';
    }

    setSave(save: GameSave | null): void {
        this.save = save;
        this.render();
    }

    private render(): void {
        if (!this.save) {
            this.body.innerHTML = '<div style="opacity:0.8">No game state loaded.</div>';
            return;
        }
        const formations = this.save.formations ?? {};
        const all = Object.values(formations).filter(Boolean) as FormationRecord[];
        const armies = sortById(all.filter((f) => f.kind === 'army_hq'));
        const corps = sortById(all.filter((f) => f.kind === 'corps' || f.kind === 'corps_asset'));
        const brigades = sortById(all.filter((f) => f.kind === 'brigade'));
        const corpsByArmy = new Map<string, FormationRecord[]>();
        const brigadesByCorps = new Map<string, FormationRecord[]>();

        for (const c of corps) {
            const parentArmyId = c.corps_id ?? 'unassigned';
            if (!corpsByArmy.has(parentArmyId)) corpsByArmy.set(parentArmyId, []);
            corpsByArmy.get(parentArmyId)!.push(c);
        }
        for (const b of brigades) {
            const corpsId = b.corps_id ?? 'unassigned';
            if (!brigadesByCorps.has(corpsId)) brigadesByCorps.set(corpsId, []);
            brigadesByCorps.get(corpsId)!.push(b);
        }
        for (const arr of corpsByArmy.values()) arr.sort((a, b) => a.id.localeCompare(b.id));
        for (const arr of brigadesByCorps.values()) arr.sort((a, b) => a.id.localeCompare(b.id));

        const warnings = buildParityWarnings(this.save);
        const lines: string[] = [];
        lines.push(`<div style="margin-bottom:6px;opacity:0.9">OOB parity warnings: ${warnings.length}</div>`);
        if (warnings.length > 0) {
            lines.push('<div style="margin-bottom:8px;color:#f2c68f">');
            for (const w of warnings.slice(0, 6)) lines.push(`<div>• ${w}</div>`);
            if (warnings.length > 6) lines.push(`<div>… +${warnings.length - 6} more</div>`);
            lines.push('</div>');
        }

        const clickable = (id: string, label: string, indentPx: number): string =>
            `<button data-formation-id="${id}" style="display:block;width:100%;text-align:left;background:transparent;border:0;color:#d6e4ff;padding:2px 0 2px ${indentPx}px;cursor:pointer">${label}</button>`;

        for (const army of armies) {
            lines.push(clickable(army.id, `ARMY ${army.name} [${army.id}]`, 0));
            const armyCorps = corpsByArmy.get(army.id) ?? [];
            for (const c of armyCorps) {
                lines.push(clickable(c.id, `CORPS ${c.name} [${c.id}]`, 14));
                const subs = brigadesByCorps.get(c.id) ?? [];
                for (const b of subs) {
                    lines.push(clickable(b.id, `BRIGADE ${b.name} [${b.id}]`, 28));
                }
            }
        }

        // Corps not attached to army, then brigades without corps.
        const orphansCorps = corpsByArmy.get('unassigned') ?? [];
        if (orphansCorps.length > 0) {
            lines.push('<div style="margin-top:8px;opacity:0.8">UNASSIGNED CORPS</div>');
            for (const c of orphansCorps) {
                lines.push(clickable(c.id, `${c.name} [${c.id}]`, 14));
            }
        }
        const orphansBrigades = brigadesByCorps.get('unassigned') ?? [];
        if (orphansBrigades.length > 0) {
            lines.push('<div style="margin-top:8px;opacity:0.8">UNASSIGNED BRIGADES</div>');
            for (const b of orphansBrigades) {
                lines.push(clickable(b.id, `${b.name} [${b.id}]`, 14));
            }
        }

        this.body.innerHTML = lines.join('');
        this.body.querySelectorAll<HTMLButtonElement>('button[data-formation-id]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-formation-id');
                if (!id) return;
                this.onSelectFormation(id);
            });
        });
        this.root.style.display = this.modeVisible ? 'block' : 'none';
    }
}
