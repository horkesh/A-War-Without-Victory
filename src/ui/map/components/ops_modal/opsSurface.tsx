/**
 * Shared presentation pieces for the operation-planning surface's detail column
 * (player-surface review step 3, 2026-11-12). Pure presentation: no store, no IPC.
 * Each phase renders `OpsPhaseBody` (scrolls) followed by a `SurfaceDetailFooter`
 * (never scrolls away), so the primary action of every phase sits in the same place.
 *
 * Canonical owner: src/ui/map/components/ops_modal/opsSurface.tsx
 */
import type { HTMLAttributes, ReactNode } from 'react';

function cx(...parts: Array<string | false | null | undefined>): string {
    return parts.filter(Boolean).join(' ');
}

/** The phase's scrolling body: padded stack of surface sections. */
export function OpsPhaseBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
    return (
        <div className="min-h-0 flex-1 overflow-y-auto" {...rest}>
            <div className={cx('flex flex-col gap-7 px-7 py-6', className)}>{children}</div>
        </div>
    );
}

/** Selectable option (operation type, tempo, tolerance, axis): one look everywhere. */
export function opsOptionClass(active: boolean, danger = false): string {
    if (active && danger) return 'border-red-400/70 bg-red-950/50 text-red-100';
    if (active) return 'border-[#c9a75c] bg-[#232936] text-[#f1e6c8]';
    return 'border-[#2a303c] bg-[#161a22] text-[#ddd1b3] hover:border-[#4a4436]';
}

/** Tone text for figures (good / warn / danger / muted). */
export const OPS_TONE_TEXT = {
    good: 'text-emerald-200',
    warn: 'text-amber-200',
    danger: 'text-red-200',
    muted: 'text-[#b9ad94]',
} as const;

/** A short inline notice inside the detail column. */
export function OpsNotice({ tone = 'info', children, role }: { tone?: 'info' | 'warn' | 'danger' | 'good'; children: ReactNode; role?: string }) {
    const toneClass = tone === 'danger'
        ? 'border-red-400/50 bg-red-950/40 text-red-100'
        : tone === 'warn'
            ? 'border-amber-300/45 bg-[#2a2416] text-amber-100'
            : tone === 'good'
                ? 'border-emerald-400/45 bg-emerald-950/40 text-emerald-100'
                : 'border-[#c9a75c]/45 bg-[#1b2029] text-[#f1e6c8]';
    return (
        <div role={role} className={cx('rounded-md border px-4 py-3 text-[16px] leading-relaxed', toneClass)}>
            {children}
        </div>
    );
}
