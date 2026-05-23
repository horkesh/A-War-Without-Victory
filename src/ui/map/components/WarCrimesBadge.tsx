import { t, type MessageKey } from '../i18n';

const VERDICT_STYLE: Record<string, { border: string; text: string; bg: string; iconKey: MessageKey }> = {
    convicted: { border: 'border-red-500/50', text: 'text-red-400', bg: 'bg-red-900/20', iconKey: 'warCrimes.convicted' },
    acquitted: { border: 'border-green-500/50', text: 'text-green-400', bg: 'bg-green-900/20', iconKey: 'warCrimes.acquitted' },
    indicted: { border: 'border-amber-500/50', text: 'text-amber-400', bg: 'bg-amber-900/20', iconKey: 'warCrimes.indicted' },
    died_before_trial: { border: 'border-neutral-500/50', text: 'text-neutral-400', bg: 'bg-neutral-800/30', iconKey: 'warCrimes.diedBeforeTrial' },
};

export interface WarCrimesRecord {
    court: string;
    verdict: string;
    sentence?: string;
    charges?: string;
    summary: string;
}

export function WarCrimesBadge({ record, className }: { record: WarCrimesRecord; className?: string }) {
    const style = VERDICT_STYLE[record.verdict] ?? VERDICT_STYLE.indicted;
    return (
        <div className={`text-[9px] px-1.5 py-1.5 rounded border ${style.border} ${style.bg} space-y-0.5${className ? ` ${className}` : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <span className={`font-bold uppercase tracking-wider ${style.text}`}>{t(style.iconKey)}</span>
            </div>
            <div className="text-text-secondary">
                <span className="font-semibold text-text-primary">{record.court}</span>
                {record.sentence && <span> - {record.sentence}</span>}
            </div>
            {record.charges && (
                <div className="text-text-secondary leading-tight"><span className="font-semibold">{t('warCrimes.charges')}:</span> {record.charges}</div>
            )}
            <div className="text-text-secondary leading-tight truncate" title={record.summary}>{record.summary}</div>
        </div>
    );
}
