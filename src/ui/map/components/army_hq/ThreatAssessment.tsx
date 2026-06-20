/**
 * ThreatAssessment - synthesizes sector intel + hostile operations into
 * a prioritized threat picture for the Army HQ Nerve Center.
 */
import type { ThreatItem } from './generateThreatAssessment';
import { t, type MessageKey } from '../../i18n';
export { generateThreatAssessment } from './generateThreatAssessment';

const SEVERITY_STYLES = {
    offensive: { border: 'border-red-500/60', labelKey: 'threatAssessment.section.offensive', labelColor: 'text-red-400' },
    hardened: { border: 'border-emerald-500/40', labelKey: 'threatAssessment.section.hardened', labelColor: 'text-emerald-400' },
    gap: { border: 'border-amber-500/40', labelKey: 'threatAssessment.section.gap', labelColor: 'text-amber-400' },
} as const satisfies Record<'offensive' | 'hardened' | 'gap', { border: string; labelKey: MessageKey; labelColor: string }>;

interface ThreatAssessmentProps {
    items: ThreatItem[];
    onCorpsClick?: (corpsId: string) => void;
}

export function ThreatAssessment({ items, onCorpsClick }: ThreatAssessmentProps) {
    if (items.length === 0) return null;

    const activeItems = items.filter((i) => i.severity === 'offensive');
    const hardenedItems = items.filter((i) => i.severity === 'hardened');
    const gapItems = items.filter((i) => i.severity === 'gap');

    return (
        <div className="bg-panel-card border border-panel-border rounded p-4 mb-4">
            <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-text-secondary mb-3 pb-2 border-b border-panel-border">
                {t('threatAssessment.title')}
            </div>
            <div className="space-y-3">
                {activeItems.length > 0 && <ThreatSection severity="offensive" items={activeItems} onCorpsClick={onCorpsClick} />}
                {hardenedItems.length > 0 && <ThreatSection severity="hardened" items={hardenedItems} onCorpsClick={onCorpsClick} />}
                {gapItems.length > 0 && <ThreatSection severity="gap" items={gapItems} onCorpsClick={onCorpsClick} />}
            </div>
        </div>
    );
}

function ThreatSection({
    severity,
    items,
    onCorpsClick,
}: {
    severity: 'offensive' | 'hardened' | 'gap';
    items: ThreatItem[];
    onCorpsClick?: (corpsId: string) => void;
}) {
    const styles = SEVERITY_STYLES[severity];
    return (
        <div>
            <div className={`text-[10px] uppercase tracking-[0.25em] font-bold ${styles.labelColor} mb-1.5`}>
                {t(styles.labelKey)}
            </div>
            <div className="space-y-1">
                {items.map((item) => (
                    <div key={item.id} className={`flex items-start justify-between gap-3 border-l-2 ${styles.border} pl-2 py-1`}>
                        <div className="min-w-0 flex-1">
                            <div className="text-[12px] text-text-primary leading-snug font-bold">{item.title}</div>
                            <div className="text-[11px] text-text-secondary leading-snug">{item.detail}</div>
                        </div>
                        {(() => {
                            const friendlyCorpsId = item.friendlyCorpsId;
                            if (!friendlyCorpsId || !onCorpsClick) return null;
                            return (
                            <button
                                type="button"
                                onClick={() => onCorpsClick(friendlyCorpsId)}
                                className="text-amber-400 hover:underline cursor-pointer text-[11px] whitespace-nowrap shrink-0"
                            >
                                {t('threatAssessment.openFront')}
                            </button>
                            );
                        })()}
                    </div>
                ))}
            </div>
        </div>
    );
}
