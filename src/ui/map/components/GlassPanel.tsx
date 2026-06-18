/**
 * GlassPanel — shared glassmorphism floating panel component.
 *
 * Four position variants: left, right, overlay, bottom-tray.
 * Used by PeaceStatusPanel, EconomyPanel, CommandBriefing, etc.
 *
 * Visual spec: dark NATO ops center aesthetic matching CommandTopBar.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Z } from '../../shared/zIndex';
import { t } from '../i18n';

export interface GlassPanelProps {
    position: 'left' | 'right' | 'overlay' | 'bottom-tray';
    title: string;
    width?: string;
    onClose?: () => void;
    children: ReactNode;
    className?: string;
    zIndex?: number;
}

const POSITION_CLASSES: Record<GlassPanelProps['position'], string> = {
    left: 'fixed left-0',
    right: 'fixed right-0',
    overlay: 'fixed inset-0 flex items-center justify-center',
    'bottom-tray': 'fixed bottom-0 left-0 right-0',
};

const SIDE_PANEL_FRAME_STYLE = {
    top: 'var(--awwv-toolbar-clearance, 5.5rem)',
    bottom: 'var(--awwv-bottom-bar-clearance, 2.5rem)',
};

export function GlassPanel({
    position,
    title,
    width = '320px',
    onClose,
    children,
    className = '',
    zIndex = Z.GLASS_PANEL_DEFAULT,
}: GlassPanelProps) {
    const panelRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        if (!onClose) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    if (position === 'overlay') {
        return (
            <div
                className={`${POSITION_CLASSES.overlay} animate-fadeIn`}
                style={{ zIndex }}
            >
                <button
                    type="button"
                    className="absolute inset-0 border-0 bg-black/50 p-0 backdrop-blur-sm"
                    onClick={onClose}
                    aria-hidden="true"
                    tabIndex={-1}
                    data-testid="glass-panel-backdrop"
                />
                {/* Panel */}
                <div
                    ref={panelRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={title}
                    className={`relative bg-panel-bg/95 backdrop-blur-md border border-[rgba(180,160,130,0.15)] shadow-xl rounded-lg overflow-hidden animate-slideUp ${className}`}
                    style={{ width, maxHeight: '84vh' }}
                >
                    <PanelHeader title={title} onClose={onClose} />
                    <div className="overflow-y-auto px-2.5 py-2" style={{ maxHeight: 'calc(84vh - 38px)' }}>
                        {children}
                    </div>
                </div>
            </div>
        );
    }

    if (position === 'bottom-tray') {
        return (
            <div
                ref={panelRef}
                className={`${POSITION_CLASSES['bottom-tray']} bg-panel-bg/95 backdrop-blur-md border-t border-[rgba(180,160,130,0.15)] shadow-xl animate-slideUp ${className}`}
                style={{ zIndex, maxHeight: '44vh' }}
            >
                <PanelHeader title={title} onClose={onClose} />
                <div className="overflow-y-auto px-2.5 py-2" style={{ maxHeight: 'calc(44vh - 38px)' }}>
                    {children}
                </div>
            </div>
        );
    }

    // Left or right panel
    return (
        <div
            ref={panelRef}
            className={`${POSITION_CLASSES[position]} bg-panel-bg/90 backdrop-blur-md border-${position === 'left' ? 'r' : 'l'} border-[rgba(180,160,130,0.15)] shadow-xl overflow-hidden animate-fadeIn ${className}`}
            style={{ zIndex, width, ...SIDE_PANEL_FRAME_STYLE }}
        >
            <PanelHeader title={title} onClose={onClose} />
            <div className="overflow-y-auto px-2.5 py-2" style={{ height: 'calc(100% - 38px)' }}>
                {children}
            </div>
        </div>
    );
}

function PanelHeader({ title, onClose }: { title: string; onClose?: () => void }) {
    return (
        <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-[rgba(180,160,130,0.15)]">
            <h2
                className="text-accent-gold uppercase tracking-[0.22em] text-[12px] font-black leading-none"
                style={{ textShadow: '0 0 8px rgba(196,163,90,0.3)' }}
            >
                {title}
            </h2>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-accent-gold transition-colors text-base leading-none"
                    aria-label={t('common.close')}
                >
                    &times;
                </button>
            )}
        </div>
    );
}

export default GlassPanel;
