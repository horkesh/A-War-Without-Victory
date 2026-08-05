import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readComponent(...segments: string[]): string {
  return readFileSync(join(process.cwd(), 'src', 'ui', 'map', 'components', ...segments), 'utf8');
}

function readWarroomStyle(file: string): string {
  return readFileSync(join(process.cwd(), 'src', 'ui', 'warroom', 'styles', file), 'utf8');
}

function readRepo(...segments: string[]): string {
  return readFileSync(join(process.cwd(), ...segments), 'utf8');
}

describe('RBiH v47 evidence-backed readability floor', () => {
  it('keeps Chronicle category chips readable with a compact line box', () => {
    const source = readComponent('chronicle', 'ChronicleCard.tsx');

    expect(source).toContain('rounded text-xs leading-none font-bold uppercase');
    expect(source).not.toContain('rounded text-[7px] font-bold uppercase');
    expect(source).not.toContain('text-[7px]');
    expect(source).toContain("entry.ghost ? 'text-amber-200/80 italic' : 'text-stone-300/90'");
  });

  it('keeps Army HQ trait labels and biography copy at the 12px floor', () => {
    const personnel = readComponent('army_hq', 'PersonnelContent.tsx');
    const briefing = readComponent('army_hq', 'ChiefOfStaffBriefing.tsx');

    expect(personnel).toContain('shrink-0 text-xs leading-none font-bold uppercase tracking-[0.12em]');
    expect(personnel).not.toContain('text-[7px] font-bold uppercase tracking-[0.12em] opacity-75');
    expect(personnel).not.toContain('min-w-0 truncate text-xs text-text-primary');
    expect(briefing).toContain('className="text-xs text-neutral-700 leading-relaxed italic"');
    expect(briefing).not.toContain('text-[9.5px]');
  });

  it('keeps the disabled front-visit action readable', () => {
    const source = readComponent('army_hq', 'FrontVisitSection.tsx');

    expect(source).toContain("'border-panel-border text-text-secondary bg-panel-bg/40 cursor-not-allowed'");
    expect(source).not.toContain('text-text-secondary/40');
  });

  it('keeps Records SVG axes and dates readable and high contrast', () => {
    const source = readComponent('TerritoryOverTimeChart.tsx');

    expect(source.match(/fontSize=\{12\}/g) ?? []).toHaveLength(2);
    expect(source).not.toContain('fontSize={9}');
    expect(source.match(/fill="rgba\(255,255,255,0\.65\)"/g) ?? []).toHaveLength(2);
    expect(source).toContain("textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}");
  });

  it('wraps the latest archived decision title instead of hiding it behind an ellipsis', () => {
    const source = readComponent('army_hq', 'RecordsContent.tsx');

    expect(source).toContain('max-w-[14rem] break-words text-xs leading-snug text-text-primary');
    expect(source).not.toContain('max-w-[14rem] truncate text-xs text-text-primary');
  });

  it('keeps the Codex Faced chip and adjacent unavailable states readable', () => {
    const source = readComponent('CodexPanel.tsx');
    const dilemmaSection = source.slice(
      source.indexOf('data-testid="codex-dilemma-faced-badge"'),
      source.indexOf('/* Distance-from-history v1'),
    );

    expect(dilemmaSection).toContain('rounded text-xs leading-none font-bold uppercase');
    expect(dilemmaSection).not.toContain('rounded text-[7px] font-bold uppercase');
    expect(dilemmaSection).toContain("'bg-neutral-500/15 text-neutral-400'");
    expect(dilemmaSection).not.toMatch(/text-neutral-(?:600|700)/);
    expect(source).not.toContain('text-neutral-700 text-xs max-w-[260px]');
    expect(source).not.toContain('text-neutral-600 text-[13px] mb-2');
  });

  it('keeps Chronicle chrome and chapter counts readable and grammatical', () => {
    const source = readComponent('chronicle', 'ChronicleOverlay.tsx');
    const english = readRepo('src', 'ui', 'map', 'i18n', 'messages.en.ts');
    const bcs = readRepo('src', 'ui', 'map', 'i18n', 'messages.bcs.ts');

    expect(source).not.toContain('text-stone-500');
    expect(source).not.toContain('text-stone-600');
    expect(source).toContain("chapterCount === 1 ? 'chronicle.chapterCount.one' : 'chronicle.chapterCount.many'");
    expect(source).toContain("recap.chapterCount === 1 ? 'chronicle.recapBody.one' : 'chronicle.recapBody.many'");
    expect(english).toContain("'chronicle.chapterCount.one': '{count} chapter'");
    expect(bcs).toContain("'chronicle.chapterCount.one': '{count} poglavlje'");
  });

  it('uses contrast-safe faction labels, paper notices, and primary actions', () => {
    const theme = readRepo('src', 'ui', 'map', 'tailwind.config.ts');
    const corpsFront = readComponent('CorpsFrontPanel.tsx');
    const recruitment = readComponent('RecruitmentModal.tsx');
    const attack = readComponent('AttackConfirmation.tsx');
    const warSummary = readComponent('army_hq', 'WarSummaryContent.tsx');

    expect(theme).toContain("'faction-rs': '#e08080'");
    expect(theme).toContain("'text-secondary': '#a89e90'");
    expect(corpsFront).toContain('!border-neutral-400 !bg-neutral-200/90 !text-neutral-700');
    expect(corpsFront).toContain('text-red-800 font-bold bg-red-100');
    expect(corpsFront).not.toContain('text-red-600 font-bold bg-red-100');
    expect(recruitment).toContain('bg-interactive text-neutral-950');
    expect(attack).toContain('bg-interactive text-neutral-950');
    expect(warSummary).toContain('FACTION_COLORS[f]');
    expect(warSummary).toContain('FACTION_COLORS[faction]');
    expect(warSummary).not.toContain('style={{ color: FACTION_HEX_COLORS');
  });

  it('uses dark text on saturated Presidential Inbox badges', () => {
    const inbox = readComponent('PresidentialInbox.tsx');

    expect(inbox).toContain("required: { badge: 'bg-red-500 text-neutral-950'");
    expect(inbox).toContain("monitor: { badge: 'bg-sky-600 text-neutral-950'");
    expect(inbox).not.toContain('bg-red-500 text-white');
    expect(inbox).not.toContain('bg-sky-600 text-white');
  });

  it('keeps the launch-screen phase label at the readable floor', () => {
    const source = readWarroomStyle('modals.css');
    const subtitleRule = source.slice(source.indexOf('.mm-subtitle {'), source.indexOf('.mm-buttons {'));

    expect(subtitleRule).toContain('font-size: calc(12px * var(--mm-scale));');
    expect(subtitleRule).toContain('color: #8ea0b5;');
    expect(subtitleRule).not.toContain('font-size: calc(11px * var(--mm-scale));');
  });

  it('keeps shared empty states, corps equipment, reserve names, and layer controls contrast-safe', () => {
    const emptyState = readComponent('EmptyState.tsx');
    const corpsCard = readComponent('CorpsCard.tsx');
    const oob = readComponent('OOBSidebar.tsx');
    const statusStrip = readComponent('BottomStatusStrip.tsx');

    expect(emptyState).toContain('text-xs uppercase tracking-[0.22em] text-text-secondary');
    expect(emptyState).not.toContain('text-text-secondary/70');
    expect(corpsCard).not.toContain('text-text-secondary/60 text-xs uppercase tracking-wide');
    expect(oob).not.toContain('text-xs text-accent-gold/70 truncate');
    expect(oob).not.toContain('text-text-secondary/80 text-xs truncate');
    expect(statusStrip).not.toContain("'text-text-secondary/50 hover:text-text-secondary'");
  });

  it('keeps sector-intelligence paper labels readable while marking blackout ink as intentional', () => {
    const source = readComponent('CorpsFrontPanel.tsx');
    const theme = readRepo('src', 'ui', 'map', 'utils', 'theme.ts');

    expect(source).toContain('data-readability-ignore="true"');
    expect(source).toContain('bg-[#f0e8d8] text-neutral-800');
    expect(source).not.toContain('bg-[#f0e8d8]/95 text-neutral-800');
    expect(source).toContain("FACTION_COLORS_ON_LIGHT[sector.faction] ?? 'text-neutral-800'");
    expect(theme).toContain("RS: 'text-[#a62d2d]'");
    expect(theme).toContain("RBiH: 'text-[#286a32]'");
    expect(theme).toContain("HRHB: 'text-[#285f94]'");
    expect(source).toContain('text-xs font-normal text-neutral-600 normal-case');
    expect(source).not.toContain('text-xs font-normal text-neutral-400 normal-case');
    expect(source).not.toContain('text-xs uppercase font-bold text-neutral-500');
  });

  it('suppresses duplicate map hover cards while an entity dossier is open', () => {
    const source = readComponent('Tooltip.tsx');

    expect(source).toContain('const selectedOsid = useGameStore((s) => s.selectedOsid);');
    expect(source).toContain('const selectedFormationId = useGameStore((s) => s.selectedFormationId);');
    expect(source).toContain('const selectedCorpsFrontSectorId = useGameStore((s) => s.selectedCorpsFrontSectorId);');
    expect(source).toContain('if (selectedOsid || selectedFormationId || selectedCorpsFrontSectorId) return null;');
  });

  it('fits all proposal actions without ellipsis truncation', () => {
    const source = readComponent('army_hq', 'DirectiveCard.tsx');

    expect(source).toContain("isReviewProposal || isEliteDeploy ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-[1fr_auto]'");
    expect(source).not.toContain("isReviewProposal ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-[1fr_auto]'");
    expect(source).not.toContain('min-w-0 truncate rounded border border-panel-border/60');
  });

  it('renders command autonomy above persistent tactical detail rails', () => {
    const source = readComponent('AutonomyPanel.tsx');

    expect(source).toContain("import { Z } from '../../shared/zIndex';");
    expect(source).toContain('zIndex={Z.OVERLAY_LIGHT}');
  });

  it('keeps Presidential Attention section headings at the contrast-safe secondary color', () => {
    const source = readComponent('army_hq', 'PresidentialAttentionPanel.tsx');

    expect(source).not.toContain('text-text-secondary/70');
    expect(source).toContain('tracking-[0.18em] text-text-secondary border-b');
  });
});
