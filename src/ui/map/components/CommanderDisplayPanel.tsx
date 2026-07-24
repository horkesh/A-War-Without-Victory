import type { CommanderDisplay } from '../utils/officerUtils';
import { t } from '../i18n';

interface CommanderDisplayPanelProps {
    display: CommanderDisplay;
    label: string;
    compact?: boolean;
    className?: string;
}

export function CommanderDisplayPanel({
    display,
    label,
    compact = false,
    className,
}: CommanderDisplayPanelProps) {
    const statusLabel = display.source === 'synthetic'
        ? t('commanderDisplay.commandStaff')
        : t('commanderDisplay.openingCommand');
    const statusHelp = display.source === 'synthetic'
        ? t('commanderDisplay.commandStaffHelp')
        : t('commanderDisplay.openingCommandHelp');

    return (
        <div className={`p-2 bg-black/20 rounded border border-panel-border/30 space-y-1.5${className ? ` ${className}` : ''}`}>
            <div className="flex items-center justify-between gap-2">
                <div className="text-xs uppercase text-text-secondary tracking-wider font-semibold">{label}</div>
                <span className="text-xs uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-black/30 border border-panel-border/30 text-amber-300">
                    {statusLabel}
                </span>
            </div>
            <div className="text-xs font-bold text-accent-gold truncate">
                {display.name}
                {display.acting && <span className="text-xs text-text-secondary ml-1 font-normal">{t('officerProfile.acting')}</span>}
            </div>
            {!compact && (
                <div className="text-xs text-text-secondary leading-4">
                    {statusHelp}
                </div>
            )}
        </div>
    );
}
