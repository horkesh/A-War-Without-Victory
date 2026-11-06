/**
 * DossierPaper — the one owner of the "paper" material for prose surfaces.
 *
 * Army HQ is a dark panel; its prose (the Chief of Staff missive, the situation
 * briefing, dossier excerpts) reads as a document laid on that panel. Before
 * this component the paper existed twice with different colours: the Codex
 * essay card on the `paper` token and the Chief of Staff missive on its own hex
 * literal. Both now take their material from here, so a change to the paper is
 * one edit.
 *
 * Material: the `paper` token (`#ebe1cd`, tailwind.config.ts) with the
 * `paper-grain` noise, a neutral rule, header/footer bands a shade darker than
 * the sheet, and ink in the neutral range. Prose on paper is set in the command
 * face; figures stay in the data face (dossier_type_contract).
 *
 * Pure presentation: no state, no IPC, no Math.random/Date.now.
 */
import type { ReactNode } from 'react';

/** The sheet. */
export const DOSSIER_PAPER_CLASS =
    'bg-paper paper-grain relative overflow-hidden rounded-lg border border-neutral-400/60 shadow-md';
/** A band across the sheet (header or footer): a shade darker than the paper. */
export const DOSSIER_BAND_CLASS = 'bg-black/5 border-neutral-500/30';
/** Ink on paper. */
export const DOSSIER_INK = Object.freeze({
    heading: 'text-neutral-800',
    body: 'text-neutral-700',
    muted: 'text-neutral-600',
    faint: 'text-neutral-500',
    rule: 'border-neutral-400/50',
    link: 'text-amber-900 hover:text-amber-700 underline decoration-amber-700/40 hover:decoration-amber-700',
});
/** The faint rotated stamp some sheets carry in a corner. */
export const DOSSIER_STAMP_CLASS =
    'pointer-events-none absolute top-2 right-3 select-none font-black uppercase text-neutral-800 opacity-[0.08] -rotate-12';

export interface DossierPaperProps {
    children: ReactNode;
    /** Extra classes on the sheet (sizing, margins). */
    className?: string;
    /** Rendered inside the sheet, before the children (a header band usually). */
    header?: ReactNode;
    /** Rendered after the children (a signature line usually). */
    footer?: ReactNode;
    /** A faint corner stamp. */
    stamp?: string;
    testId?: string;
}

export function DossierPaper({ children, className, header, footer, stamp, testId }: DossierPaperProps) {
    return (
        <div data-material="paper" data-testid={testId} className={`${DOSSIER_PAPER_CLASS} ${className ?? ''}`.trim()}>
            {stamp && <div className={`${DOSSIER_STAMP_CLASS} text-xl`}>{stamp}</div>}
            {header && <div className={`border-b px-3 py-1.5 ${DOSSIER_BAND_CLASS}`}>{header}</div>}
            {children}
            {footer && <div className={`border-t px-3 py-1 ${DOSSIER_BAND_CLASS}`}>{footer}</div>}
        </div>
    );
}
