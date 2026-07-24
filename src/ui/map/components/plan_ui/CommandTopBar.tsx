import { t } from '../../i18n';

interface CommandTopBarProps {
    opName: string;
    onNameChange: (val: string) => void;
    onClose: () => void;
    sectorName: string;
    commanderId?: string | null;
    commanderName?: string;
    onCommanderClick?: () => void;
    onAuthorize?: () => void;
    isSubmitting?: boolean;
    statusMessage?: string | null;
    crestSrc?: string;
    corpsDisplayName?: string;
    factionColor?: string;
}

export function CommandTopBar({
    opName,
    onNameChange,
    onClose,
    sectorName,
    commanderId,
    commanderName,
    onCommanderClick,
    onAuthorize,
    isSubmitting,
    statusMessage,
    crestSrc,
    corpsDisplayName,
    factionColor,
}: CommandTopBarProps) {
    const commanderLabel = commanderId
        ? ((commanderName ?? '').trim() || t('planUi.unassignedCommander'))
        : t('planUi.selectCommander');

    return (
        <div className="h-16 flex items-center justify-between px-6 bg-[#16191f]/90 border-b border-white/10 relative z-30 shadow-xl backdrop-blur-md" style={{ borderLeft: `3px solid ${factionColor ?? '#c4a35a'}` }}>
            <div className="flex items-center gap-10">
                <div className="flex items-center gap-3">
                    {crestSrc && (
                        <img src={crestSrc} alt="" className="w-9 h-9 drop-shadow-[0_0_6px_rgba(196,163,90,0.3)]" />
                    )}
                    <div className="flex flex-col">
                        <h2 className="text-xs font-bold text-accent-gold uppercase tracking-[0.3em] drop-shadow-[0_0_8px_rgba(200,165,110,0.4)]">
                            {corpsDisplayName ?? t('planUi.operationsCommand')}
                        </h2>
                        <span className="text-xs text-text-secondary font-bold uppercase tracking-wider">
                            {t('formationDetail.sector')} {sectorName}
                        </span>
                    </div>
                </div>

                <div className="h-8 w-px bg-white/10" />

                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="command-topbar-directive-name" className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('planUi.directiveName')}</label>
                        <input
                            id="command-topbar-directive-name"
                            type="text"
                            value={opName}
                            onChange={(e) => onNameChange(e.target.value)}
                            placeholder={t('planUi.unnamedDirective')}
                            className="bg-black/40 border border-white/10 rounded px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:border-accent-gold focus:outline-none transition-all w-[240px]"
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('planUi.operationsCommander')}</label>
                        <button
                            onClick={onCommanderClick}
                            className="h-[31px] min-w-[180px] bg-black/40 border border-white/10 rounded px-3 flex items-center justify-between hover:border-accent-gold transition-all group"
                        >
                            <span className="text-xs font-bold text-slate-300 group-hover:text-white">
                                {commanderLabel}
                            </span>
                            <span className="text-xs text-accent-gold opacity-50">&#9660;</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {statusMessage && (
                    <div className="text-xs font-bold text-accent-gold bg-accent-gold/5 border border-accent-gold/20 px-3 py-1.5 rounded animate-pulse">
                        {statusMessage}
                    </div>
                )}
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                    {t('planUi.discardDirective')}
                </button>
                <button
                    disabled={isSubmitting}
                    onClick={onAuthorize}
                    className="px-6 py-2 bg-accent-gold text-black text-xs font-black uppercase tracking-widest rounded shadow-[0_0_20px_rgba(200,165,110,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                    {isSubmitting ? t('planUi.authorizingDirective') : t('planUi.authorizeDirective')}
                </button>
            </div>
        </div>
    );
}
