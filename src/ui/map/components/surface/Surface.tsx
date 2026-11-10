/**
 * Surface — shared building blocks for the President's player surfaces
 * (owner redesign, 2026-11-10; first built for the Command Surface).
 *
 * The style, in one place:
 *   - one large opaque surface below the toolbar with a gold border (`SurfaceFrame`);
 *   - a fixed header: mono gold eyebrow, 26px title, key status, Close (`SurfaceHeader`);
 *   - columns that each scroll on their own (`SurfaceColumns`, `SurfaceRail`,
 *     `SurfaceContent`, `SurfaceDetail`), widths from `--interface-viewport-width`
 *     so the same surface reads at 1280×720 and on a 2293×960 ultrawide;
 *   - content grouped under mono gold section labels (`SurfaceSection`), matters as
 *     large cards (`SurfaceMatterCard`), a detail with art, explanation, "What to
 *     know" (`SurfaceDetailBody`) and an action footer that never scrolls away
 *     (`SurfaceDetailFooter`);
 *   - text 13–34px; big gold primary buttons (`SURFACE_PRIMARY_BUTTON`).
 *
 * Pure presentation: no store, no engine, no IPC. Callers pass data-testid and aria
 * attributes through, so every harness hook stays on the caller's element.
 *
 * Canonical owner: src/ui/map/components/surface/Surface.tsx
 */

import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';
import { t } from '../../i18n';

/** Bottom edge of Warroom surfaces: clears the Warroom status strip below them. */
export const SURFACE_WARROOM_BOTTOM = 'bottom-28';
/** Big gold primary action (56px). */
export const SURFACE_PRIMARY_BUTTON =
  'h-14 rounded-md bg-[#c9a75c] px-6 text-[18px] font-bold text-[#15120b] transition hover:bg-[#d8b86c] disabled:cursor-default disabled:opacity-45';
/** Gold primary action at the 48px size, for footers with several actions. */
export const SURFACE_PRIMARY_BUTTON_COMPACT =
  'h-12 rounded-md bg-[#c9a75c] px-5 text-[16px] font-bold text-[#15120b] transition hover:bg-[#d8b86c] disabled:cursor-default disabled:opacity-45';
/** Quiet secondary action (48px). */
export const SURFACE_SECONDARY_BUTTON =
  'h-12 rounded-md border border-[#3a4150] bg-[#1b2029] px-5 text-[16px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60 disabled:cursor-default disabled:opacity-45';
/** Header Close button. */
export const SURFACE_CLOSE_BUTTON =
  'h-11 shrink-0 rounded border border-[#3a4150] bg-[#1b2029] px-5 text-[16px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60 hover:text-accent-gold';
/** Mono gold label (section headings, eyebrows). */
export const SURFACE_LABEL = 'uppercase font-mono text-[13px] font-semibold tracking-[0.16em] text-[#e0c27a]';
/** Mono muted label (sub-headings). */
export const SURFACE_LABEL_MUTED = 'uppercase font-mono text-[13px] font-semibold tracking-[0.16em] text-[#b9ad94]';
/** Tone chips: one look for every surface. */
export const SURFACE_CHIP = 'whitespace-nowrap rounded border px-3 py-1.5 font-mono text-[14px] font-semibold';
export const SURFACE_TONE = {
  danger: 'border-red-400/50 text-red-200',
  warn: 'border-amber-400/45 text-amber-200',
  info: 'border-sky-400/40 text-sky-200',
  good: 'border-emerald-400/45 text-emerald-200',
  neutral: 'border-panel-border text-text-secondary',
} as const;
export type SurfaceTone = keyof typeof SURFACE_TONE;
/** Status boxes in the header (Advance readiness and the like). */
export const SURFACE_STATUS_TONE = {
  danger: 'border-red-400/50 bg-red-500/10 text-red-200',
  warn: 'border-amber-400/50 bg-amber-400/10 text-amber-100',
  good: 'border-emerald-400/45 bg-emerald-400/10 text-emerald-100',
  neutral: 'border-[#3a4150] bg-[#171b23] text-[#e2d6b8]',
} as const;

/**
 * For surfaces that keep the shared `<Modal>` wrapper (focus trap, Esc, z-index): the
 * panel and backdrop classes that make the Modal panel a surface frame. Children then
 * use `SurfaceHeader`, `SurfaceColumns` and the rest as usual.
 */
export const SURFACE_MODAL_BACKDROP = 'bg-[#05070a]/80 px-6';
export const SURFACE_MODAL_PANEL_FULL =
  'flex h-[calc(var(--interface-viewport-height,100vh)-6rem)] w-[min(110rem,calc(var(--interface-viewport-width,100vw)-3rem))] flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none';
export const SURFACE_MODAL_PANEL_MEDIUM =
  'flex h-[min(52rem,calc(var(--interface-viewport-height,100vh)-6rem))] w-[min(76rem,calc(var(--interface-viewport-width,100vw)-3rem))] flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none';
/** A short notice: grows with its content up to the cap; columns still scroll on their own. */
export const SURFACE_MODAL_PANEL_COMPACT =
  'flex max-h-[min(46rem,calc(var(--interface-viewport-height,100vh)-6rem))] w-[min(64rem,calc(var(--interface-viewport-width,100vw)-3rem))] flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none';

/** Column templates. Widths follow the interface viewport so ultrawide gets room and 1280 still fits. */
const RAIL_WIDTH = 'clamp(17rem,calc(var(--interface-viewport-width,100vw)*0.19),21rem)';
const DETAIL_WIDTH = 'clamp(21rem,calc(var(--interface-viewport-width,100vw)*0.31),35rem)';
const WIDE_DETAIL_WIDTH = 'clamp(24rem,calc(var(--interface-viewport-width,100vw)*0.4),46rem)';
export const SURFACE_COLUMN_LAYOUTS = {
  /** list | content | detail (the Command Surface). */
  'rail-content-detail': `grid-cols-[clamp(17rem,calc(var(--interface-viewport-width,100vw)*0.19),21rem)_minmax(0,1fr)_clamp(21rem,calc(var(--interface-viewport-width,100vw)*0.31),35rem)]`,
  /** list | content. */
  'rail-content': `grid-cols-[clamp(17rem,calc(var(--interface-viewport-width,100vw)*0.19),21rem)_minmax(0,1fr)]`,
  /** content | detail. */
  'content-detail': `grid-cols-[minmax(0,1fr)_clamp(21rem,calc(var(--interface-viewport-width,100vw)*0.31),35rem)]`,
  /** content | wide detail (reading-heavy right column). */
  'content-wide-detail': `grid-cols-[minmax(0,1fr)_clamp(24rem,calc(var(--interface-viewport-width,100vw)*0.4),46rem)]`,
  /** one column. */
  single: 'grid-cols-1',
} as const;
export type SurfaceColumnLayout = keyof typeof SURFACE_COLUMN_LAYOUTS;
/** Exposed for tests and for surfaces that need the raw widths. */
export const SURFACE_WIDTHS = { rail: RAIL_WIDTH, detail: DETAIL_WIDTH, wideDetail: WIDE_DETAIL_WIDTH } as const;

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

export interface SurfaceFrameProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Where the surface sits. `warroom` (default): below the toolbar inside the Warroom scene.
   * `overlay`: a fixed full-window surface for blocking modals, with its own dimmed backdrop.
   */
  placement?: 'warroom' | 'overlay';
  /** Stacking layer class (default `z-[7]` in the Warroom, `z-[60]` for overlays). */
  layerClassName?: string;
  /** Narrower surface for short reading (a single decision, settings). */
  size?: 'full' | 'medium';
}

/** The one large opaque surface with a gold border. */
export const SurfaceFrame = forwardRef<HTMLDivElement, SurfaceFrameProps>(function SurfaceFrame(
  { placement = 'warroom', layerClassName, size = 'full', className, children, role = 'dialog', tabIndex = -1, ...rest },
  ref,
) {
  const width = size === 'medium' ? 'w-[min(76rem,calc(100%-3rem))]' : 'w-[min(110rem,calc(100%-3rem))]';
  const frameClass = cx(
    'pointer-events-auto absolute left-1/2 top-[4.5rem] flex -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_30px_90px_rgba(0,0,0,0.65)] outline-none',
    width,
    // In the Warroom the surface stops above the status strip (bottom-[2%], up to a few
    // wrapped rows) so "Review Before Advance" and the docket stay visible (R8 shakedown
    // 2026-11-10). Static clearance on purpose — see PresidentDeskShell history.
    placement === 'warroom' ? SURFACE_WARROOM_BOTTOM : 'bottom-6',
    placement === 'warroom' ? layerClassName ?? 'z-[7]' : null,
    className,
  );
  if (placement === 'overlay') {
    return (
      <div className={cx('pointer-events-auto fixed inset-0 bg-[#05070a]/80', layerClassName ?? 'z-[60]')}>
        <div ref={ref} role={role} tabIndex={tabIndex} className={frameClass} {...rest}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div ref={ref} role={role} tabIndex={tabIndex} className={frameClass} {...rest}>
      {children}
    </div>
  );
});

export interface SurfaceHeaderProps {
  eyebrow: string;
  title: ReactNode;
  /** Key status (meters, readiness) shown between the title and Close. */
  children?: ReactNode;
  /** Status shown at the far right, before Close. */
  trailing?: ReactNode;
  /**
   * The Close control, usually a `<SurfaceCloseButton data-testid="…" />`. It stays a caller
   * element so the harness hooks (`data-testid="…"`) remain literal in the caller's source.
   */
  close?: ReactNode;
  titleId?: string;
}

/** Fixed header: mono gold eyebrow, 26px title, key status, Close. */
export function SurfaceHeader({ eyebrow, title, children, trailing, close, titleId }: SurfaceHeaderProps) {
  return (
    <header className="flex shrink-0 flex-wrap items-center gap-x-10 gap-y-3 border-b border-[#262b35] bg-[#141821] px-7 py-4">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-[13px] font-semibold uppercase tracking-[0.2em] text-[#e0c27a]">{eyebrow}</span>
        <h2 id={titleId} className="m-0 text-[26px] font-semibold leading-tight text-[#f1e6c8]">{title}</h2>
      </div>
      {children}
      <div className="flex-grow" />
      {trailing}
      {close}
    </header>
  );
}

/** The header's Close button; label defaults to "Close". */
export function SurfaceCloseButton({ children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cx(SURFACE_CLOSE_BUTTON, className)} {...rest}>
      {children ?? t('common.close')}
    </button>
  );
}

/** A labelled meter for the header (Authority and the like). */
export function SurfaceMeter({ label, value, max, valueLabel }: { label: string; value: number; max: number; valueLabel?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-[16px] text-[#b9ad94]">{label}</span>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-2.5 w-[clamp(8rem,calc(var(--interface-viewport-width,100vw)*0.1),14rem)] overflow-hidden rounded-full bg-[#262b35]"
      >
        <div className="h-full bg-[#c9a75c]" style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-[16px] font-semibold tabular-nums text-[#f1e6c8]">{valueLabel ?? `${value} / ${max}`}</span>
    </div>
  );
}

export interface SurfaceColumnsProps extends HTMLAttributes<HTMLDivElement> {
  layout: SurfaceColumnLayout;
}

/** The column grid under the header; each column scrolls on its own. */
export function SurfaceColumns({ layout, className, children, ...rest }: SurfaceColumnsProps) {
  return (
    <div className={cx('grid min-h-0 flex-1', SURFACE_COLUMN_LAYOUTS[layout], className)} {...rest}>
      {children}
    </div>
  );
}

export interface SurfaceRailProps extends HTMLAttributes<HTMLElement> {
  /** Render as <nav> (navigation between areas) or <div> (a plain list). */
  as?: 'nav' | 'div';
  heading?: string;
  footer?: ReactNode;
}

/** Left column: a list or navigation with art and plain status lines. */
export function SurfaceRail({ as = 'nav', heading, footer, className, children, ...rest }: SurfaceRailProps) {
  const Tag = as;
  return (
    <Tag className={cx('flex min-h-0 flex-col gap-2 overflow-y-auto border-r border-[#262b35] bg-[#0f1218] px-4 py-5', className)} {...rest}>
      {heading && <span className={cx('px-2 pb-1', SURFACE_LABEL_MUTED)}>{heading}</span>}
      {children}
      {footer !== undefined && (
        <>
          <div className="flex-grow" />
          {footer}
        </>
      )}
    </Tag>
  );
}

export interface SurfaceRailItemProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  status?: ReactNode;
  art?: string | null;
  /** Numeric badge; 0 hides it. */
  badge?: number;
  badgeTone?: 'danger' | 'gold';
  selected: boolean;
  disabled?: boolean;
}

/** One entry of the left rail. */
export function SurfaceRailItem({ title, status, art, badge = 0, badgeTone = 'gold', selected, disabled, className, ...rest }: SurfaceRailItemProps) {
  const withArt = art !== undefined;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cx(
        'grid w-full items-center gap-3 rounded-md border p-2.5 text-left transition disabled:cursor-default disabled:opacity-50',
        withArt
          ? 'grid-cols-[clamp(3rem,calc(var(--interface-viewport-width,100vw)*0.028),4rem)_minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)_auto] px-3.5',
        selected ? 'border-[#c9a75c] bg-[#232936]' : 'border-transparent hover:border-[#3a4150] hover:bg-[#171b23]',
        className,
      )}
      {...rest}
    >
      {withArt && (art
        ? <img src={art} alt="" className="aspect-square w-full rounded object-cover" />
        : <span aria-hidden="true" className="aspect-square w-full rounded bg-[#232936]" />)}
      <span className="flex min-w-0 flex-col gap-1">
        <span className="text-[18px] font-semibold leading-tight text-[#f1e6c8]">{title}</span>
        {status !== undefined && status !== null && <span className="text-[15px] leading-snug text-[#b9ad94]">{status}</span>}
      </span>
      {badge > 0 ? (
        <span className={cx('inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 font-mono text-[14px] font-semibold text-[#15120b]', badgeTone === 'danger' ? 'bg-red-300' : 'bg-[#e0b45a]')}>
          {badge}
        </span>
      ) : <span />}
    </button>
  );
}

/** Middle column: scrolls on its own. */
export function SurfaceContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex min-h-0 flex-col overflow-y-auto', className)} {...rest}>
      {children}
    </div>
  );
}

/** Art banner at the top of the middle column, with a 34px title and an 18px blurb. */
export function SurfaceBanner({ art, title, blurb, children }: { art?: string | null; title: ReactNode; blurb?: ReactNode; children?: ReactNode }) {
  return (
    <div className="relative h-44 shrink-0">
      {art && <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className={cx('absolute inset-0', art ? 'bg-gradient-to-r from-[#0a0c10]/75 via-[#0a0c10]/50 to-[#0a0c10]/35' : 'bg-[#141821]')} />
      <div className="absolute inset-x-8 bottom-6 flex flex-col gap-1.5">
        <h3 className="m-0 text-[34px] font-semibold leading-tight text-[#f6ecd2]">{title}</h3>
        {blurb && <p className="m-0 text-[18px] text-[#e2d6b8]">{blurb}</p>}
        {children}
      </div>
    </div>
  );
}

/** Padded stack for the middle column's sections. */
export function SurfaceSections({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex flex-col gap-7 px-8 pb-8 pt-6', className)} {...rest}>
      {children}
    </div>
  );
}

export interface SurfaceSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  label: string;
  /** Right-aligned control on the label row. */
  action?: ReactNode;
}

/** A group under a mono gold section label. */
export function SurfaceSection({ label, action, className, children, ...rest }: SurfaceSectionProps) {
  return (
    <section className={cx('flex flex-col gap-2.5', className)} aria-label={label} {...rest}>
      <div className="flex items-center justify-between gap-3">
        <h4 className={cx('m-0', SURFACE_LABEL)}>{label}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

export interface SurfaceMatterCardProps extends Omit<HTMLAttributes<HTMLButtonElement>, 'title'> {
  title: ReactNode;
  explanation?: ReactNode;
  chip?: { label: string; className: string } | null;
  selected: boolean;
  disabled?: boolean;
  /** Extra line under the explanation (small facts). */
  meta?: ReactNode;
}

/** A matter in the middle column: title, two-line explanation, one chip. */
export function SurfaceMatterCard({ title, explanation, chip, selected, disabled, meta, className, ...rest }: SurfaceMatterCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      className={cx(
        'grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-6 rounded-md border px-5 py-4 text-left transition disabled:cursor-default disabled:opacity-50',
        selected ? 'border-[#c9a75c] bg-[#232936]' : 'border-[#2a303c] bg-[#161a22] hover:border-[#4a4436]',
        className,
      )}
      {...rest}
    >
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-[19px] font-semibold leading-snug text-[#f1e6c8]">{title}</span>
        {explanation && <span className="text-[16px] leading-relaxed text-[#c2b69c]">{explanation}</span>}
        {meta && <span className="text-[15px] leading-snug text-[#9c917b]">{meta}</span>}
      </span>
      {chip ? <span className={cx(SURFACE_CHIP, chip.className)}>{chip.label}</span> : <span />}
    </button>
  );
}

/** A plain reading block in the middle column (not selectable). */
export function SurfacePanel({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-md border border-[#2a303c] bg-[#161a22] px-5 py-4', className)} {...rest}>
      {children}
    </div>
  );
}

/** Right column: the selected item's detail. */
export function SurfaceDetail({ className, children, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <aside className={cx('flex min-h-0 flex-col border-l border-[#262b35] bg-[#0f1218]', className)} {...rest}>
      {children}
    </aside>
  );
}

export interface SurfaceDetailBodyProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  art?: string | null;
  eyebrow?: string;
  title?: ReactNode;
  explanation?: ReactNode;
  /** "What to know" bullets. */
  facts?: readonly string[];
  factsLabel?: string;
}

/** The detail's scrolling body: art, eyebrow, 28px title, explanation, "What to know", extra content. */
export const SurfaceDetailBody = forwardRef<HTMLDivElement, SurfaceDetailBodyProps>(function SurfaceDetailBody(
  { art, eyebrow, title, explanation, facts, factsLabel, className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('min-h-0 flex-1 overflow-y-auto', className)} {...rest}>
      {art && <img src={art} alt="" className="block h-52 w-full object-cover" />}
      <div className="flex flex-col gap-4 px-7 py-6">
        {eyebrow && <span className={SURFACE_LABEL}>{eyebrow}</span>}
        {title && <h3 className="m-0 text-[28px] font-semibold leading-tight text-[#f6ecd2]">{title}</h3>}
        {explanation && <p className="m-0 text-[18px] leading-relaxed text-[#ddd1b3]">{explanation}</p>}
        {facts && facts.length > 0 && <SurfaceFacts label={factsLabel ?? t('commandSurface.whatToKnow')} facts={facts} />}
        {children}
      </div>
    </div>
  );
});

/** A "What to know" list. */
export function SurfaceFacts({ label, facts }: { label: string; facts: readonly ReactNode[] }) {
  return (
    <div className="flex flex-col gap-2 pt-1">
      <span className={SURFACE_LABEL_MUTED}>{label}</span>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {facts.map((entry, index) => (
          <li key={typeof entry === 'string' ? entry : index} className="grid grid-cols-[0.875rem_minmax(0,1fr)] gap-2.5 text-[17px] leading-relaxed text-[#ddd1b3]">
            <span aria-hidden="true" className="text-[#c9a75c]">•</span>
            <span>{entry}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** A label / value row for figures (stat lists). */
export function SurfaceStat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#262b35] py-2 last:border-b-0">
      <span className="text-[16px] text-[#b9ad94]">{label}</span>
      <span className={cx('text-right font-mono text-[16px] font-semibold tabular-nums', tone ?? 'text-[#f1e6c8]')}>{value}</span>
    </div>
  );
}

/** A figure tile: plain label over a large value (decision modals, summaries). */
export function SurfaceFigure({ label, value, tone, className }: { label: ReactNode; value: ReactNode; tone?: string; className?: string }) {
  return (
    <div className={cx('flex min-w-0 flex-col gap-1 rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-3', className)}>
      <span className="text-[15px] leading-snug text-[#b9ad94]">{label}</span>
      <span className={cx('break-words text-[19px] font-semibold leading-snug', tone ?? 'text-[#f1e6c8]')}>{value}</span>
    </div>
  );
}

/** Scrolling body of a compact/medium modal surface. */
export function SurfaceModalBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-8 py-6', className)} {...rest}>
      {children}
    </div>
  );
}

/** Fixed action footer of a compact/medium modal surface (actions right-aligned). */
export function SurfaceModalFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[#262b35] bg-[#12161e] px-8 pb-6 pt-5', className)} {...rest}>
      {children}
    </div>
  );
}

/** The detail's action footer: never scrolls away. */
export function SurfaceDetailFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('flex shrink-0 flex-col gap-3 border-t border-[#262b35] bg-[#12161e] px-7 pb-6 pt-5', className)} {...rest}>
      {children}
    </div>
  );
}

/** Empty or "choose something" state. */
export function SurfaceEmpty({ title, body, centered = false, children }: { title: ReactNode; body?: ReactNode; centered?: boolean; children?: ReactNode }) {
  return (
    <div className={cx('flex flex-col gap-2.5', centered ? 'flex-1 justify-center p-10' : 'items-start px-8 py-10')}>
      <p className="m-0 text-[22px] font-semibold text-[#f1e6c8]">{title}</p>
      {body && <p className="m-0 max-w-[40rem] text-[17px] leading-relaxed text-[#c2b69c]">{body}</p>}
      {children}
    </div>
  );
}

/** Receipt line at the top of a detail column. */
export interface SurfaceReceiptProps extends HTMLAttributes<HTMLDivElement> {
  kind: 'success' | 'error' | 'cancelled';
  message: ReactNode;
  onDismiss: () => void;
}

export function SurfaceReceipt({ kind, message, onDismiss, className, ...rest }: SurfaceReceiptProps) {
  return (
    <div
      {...rest}
      className={cx(
        className,
        'flex shrink-0 items-start justify-between gap-3 border-b px-6 py-3 text-[15px]',
        kind === 'error'
          ? 'border-red-500/45 bg-red-500/10 text-red-100'
          : kind === 'cancelled'
            ? 'border-[#262b35] bg-[#141821] text-text-secondary'
            : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-50',
      )}
    >
      <span role="status" aria-live="polite">{message}</span>
      <button type="button" onClick={onDismiss} className="shrink-0 text-[14px] font-semibold underline-offset-2 hover:underline">
        {t('common.close')}
      </button>
    </div>
  );
}
