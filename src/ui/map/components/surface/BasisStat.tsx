import type { ReactNode } from 'react';

/**
 * A stat row with its basis under the label (R8 council fix 1, B6/B7): what the figure
 * counts, so two figures on one screen never read as contradicting totals. `basis` is
 * required. `data-awwv-figure-kind` / `data-awwv-figure-basis` let tests check that every
 * casualty, displacement and territory figure on the ending carries one.
 */
export function BasisStat({ label, value, basis, kind }: {
    label: ReactNode;
    value: ReactNode;
    basis: string;
    kind: 'territory' | 'casualty' | 'displacement' | 'force' | 'record';
}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-b border-[#262b35] py-2 last:border-b-0"
             data-awwv-figure-kind={kind}
             data-awwv-figure-basis={basis}>
            <span className="flex min-w-0 flex-col">
                <span className="text-[16px] text-[#b9ad94]">{label}</span>
                <span className="text-[14px] leading-snug text-[#9c917b]">{basis}</span>
            </span>
            <span className="shrink-0 text-right font-mono text-[16px] font-semibold tabular-nums text-[#f1e6c8]">{value}</span>
        </div>
    );
}
