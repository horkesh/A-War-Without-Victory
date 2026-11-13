/**
 * MapRail — the one frame for every tactical-map panel (owner review 2026-11-11, step 2).
 *
 * Built from the Command Surface parts (`Surface.tsx`), sized for a side rail:
 *   - `MapRailFrame`: the opaque plane with the gold border; the caller passes the
 *     placement style (`getMapRailStyle()` for entity panels, the sidebar's own column);
 *   - `MapRailHeader`: breadcrumb, mono gold eyebrow, 20px title, plain subtitle, chips, Close;
 *   - `MapRailBody`: the one scroll region, groups under `SurfaceSection` labels;
 *   - `MapRailStat`, `MapRailLink`, `MapRailNote`, `MapRailButton`: rows, links, notes, actions.
 * Type: sans for names and figures, mono only for gold labels and chips; floor 13px, body 15px.
 *
 * Pure presentation: no store, no engine, no IPC. Callers keep their data-testid and aria
 * attributes on their own elements.
 *
 * Canonical owner: src/ui/map/components/surface/MapRail.tsx
 */

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';
import { t } from '../../i18n';

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

/** The rail plane: opaque, gold border, surface shadow. */
export const MAP_RAIL_PLANE =
  'flex flex-col overflow-hidden rounded-lg border border-accent-gold/35 bg-[#11141b] text-text-primary shadow-[0_24px_70px_rgba(0,0,0,0.6)]';
/** Quiet rail action (40px). */
export const MAP_RAIL_BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-md border border-[#3a4150] bg-[#1b2029] px-4 py-2 text-[15px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60 hover:text-[#f1e6c8] disabled:cursor-not-allowed disabled:opacity-45';
/** Gold rail action (40px). */
export const MAP_RAIL_PRIMARY_BUTTON =
  'inline-flex min-h-10 items-center justify-center rounded-md bg-[#c9a75c] px-4 py-2 text-[15px] font-bold text-[#15120b] transition hover:bg-[#d8b86c] disabled:cursor-not-allowed disabled:opacity-45';
/** Header Close button. */
export const MAP_RAIL_CLOSE_BUTTON =
  'kbd-focus h-9 shrink-0 rounded border border-[#3a4150] bg-[#1b2029] px-3 text-[14px] font-semibold text-[#e8dcbc] transition hover:border-accent-gold/60 hover:text-accent-gold';
/** A selectable list row (brigades, sectors, operations). */
export const MAP_RAIL_ROW =
  'kbd-focus w-full rounded-md border border-[#2a303c] bg-[#161a22] px-3 py-2 text-left text-[15px] text-[#e8dcbc] transition hover:border-[#4a4436] hover:bg-[#1b2029]';
export const MAP_RAIL_ROW_SELECTED = 'border-[#c9a75c] bg-[#232936]';
/** Plain note text inside a rail. */
export const MAP_RAIL_NOTE = 'm-0 text-[15px] leading-relaxed text-[#c2b69c]';
/** Muted value ("Not reported yet"). */
export const MAP_RAIL_MUTED = 'text-[#9c917b]';

export interface MapRailFrameProps extends HTMLAttributes<HTMLDivElement> {
  style?: CSSProperties;
}

/** The rail plane. The caller supplies placement through `style` (see `getMapRailStyle`). */
export const MapRailFrame = forwardRef<HTMLDivElement, MapRailFrameProps>(function MapRailFrame(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx(MAP_RAIL_PLANE, className)} {...rest}>
      {children}
    </div>
  );
});

export interface MapRailHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Breadcrumb chips (PanelBreadcrumb), shown above the eyebrow when drilled in. */
  breadcrumb?: ReactNode;
  /** Small mark before the eyebrow (crest or colour swatch). */
  mark?: ReactNode;
  /** Chips on the title row (OPSEC, decorations). */
  chips?: ReactNode;
  /** The Close control, usually `<MapRailCloseButton data-testid="…" aria-label="…" />`. */
  close?: ReactNode;
  titleId?: string;
  className?: string;
}

/** Fixed rail header: breadcrumb, eyebrow, title, subtitle, Close. */
export function MapRailHeader({ eyebrow, title, subtitle, breadcrumb, mark, chips, close, titleId, className }: MapRailHeaderProps) {
  return (
    <header className={cx('flex shrink-0 flex-col gap-2 border-b border-[#262b35] bg-[#141821] px-5 pb-3.5 pt-3', className)}>
      {breadcrumb ? <div className="flex min-w-0 flex-wrap items-center gap-1.5">{breadcrumb}</div> : null}
      <div className="flex items-start gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2 font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-[#e0c27a]">
            {mark}
            <span className="truncate">{eyebrow}</span>
          </span>
          <h2 id={titleId} className="m-0 break-words text-[20px] font-semibold leading-tight text-[#f1e6c8]">{title}</h2>
          {subtitle ? <p className="m-0 text-[15px] leading-snug text-[#b9ad94]">{subtitle}</p> : null}
          {chips ? <div className="flex flex-wrap items-center gap-1.5 pt-1">{chips}</div> : null}
        </div>
        {close}
      </div>
    </header>
  );
}

/** Header Close button; label defaults to "Close". */
export function MapRailCloseButton({ children, className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={cx(MAP_RAIL_CLOSE_BUTTON, className)} {...rest}>
      {children ?? t('common.close')}
    </button>
  );
}

/** The rail's one scroll region. */
export const MapRailBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function MapRailBody(
  { className, children, ...rest },
  ref,
) {
  return (
    <div ref={ref} className={cx('flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-5 py-4 text-[15px]', className)} {...rest}>
      {children}
    </div>
  );
});

/** A label / value row for figures. */
export function MapRailStat({
  label,
  value,
  tone,
  title,
  testId,
}: {
  label: ReactNode;
  value: ReactNode;
  tone?: string;
  title?: string;
  testId?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#262b35] py-1.5 last:border-b-0" title={title}>
      <span className="min-w-0 text-[15px] text-[#b9ad94]">{label}</span>
      <span data-testid={testId} className={cx('min-w-0 text-right text-[15px] font-semibold tabular-nums', tone ?? 'text-[#f1e6c8]')}>{value}</span>
    </div>
  );
}

/** A group of stat rows in a quiet card. */
export function MapRailStats({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-1.5', className)} {...rest}>
      {children}
    </div>
  );
}

export interface MapRailLinkProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'value'> {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  hint?: string;
}

/** A link to a parent or related entity: label, value, chevron. */
export function MapRailLink({ label, value, detail, hint, className, type = 'button', ...rest }: MapRailLinkProps) {
  return (
    <button
      type={type}
      title={hint}
      className={cx(
        'kbd-focus group grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-[#2a303c] bg-[#161a22] px-4 py-2.5 text-left transition hover:border-[#c9a75c]/60 hover:bg-[#1b2029]',
        className,
      )}
      {...rest}
    >
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#b9ad94]">{label}</span>
        <span className="break-words text-[16px] font-semibold leading-snug text-[#f1e6c8] group-hover:text-[#f6ecd2]">{value}</span>
        {detail ? <span className="text-[14px] leading-snug text-[#b9ad94]">{detail}</span> : null}
      </span>
      <span aria-hidden="true" className="text-[18px] text-[#c9a75c]">›</span>
    </button>
  );
}

/** A plain note. */
export function MapRailNote({ className, children, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx(MAP_RAIL_NOTE, className)} {...rest}>
      {children}
    </p>
  );
}

/** Quiet action button. */
export function MapRailButton({ className, type = 'button', ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx(MAP_RAIL_BUTTON, className)} {...rest} />;
}
