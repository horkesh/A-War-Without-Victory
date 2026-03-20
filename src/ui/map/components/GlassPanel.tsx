/**
 * GlassPanel — shared glassmorphism floating panel component.
 *
 * Four position variants: left, right, overlay, bottom-tray.
 * Used by PeaceStatusPanel, EventLogPanel, EconomyPanel, CommandBriefing, etc.
 *
 * Visual spec: dark NATO ops center aesthetic matching CommandTopBar.
 */
import { useEffect, useRef, type ReactNode } from 'react';

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
    left: 'fixed left-0 top-16 bottom-0',
    right: 'fixed right-0 top-16 bottom-0',
    overlay: 'fixed inset-0 flex items-center justify-center',
    'bottom-tray': 'fixed bottom-0 left-0 right-0',
};

export function GlassPanel({
    position,
    title,
    width = '320px',
    onClose,
    children,
    className = '',
    zIndex = 40,
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
                onClick={(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}
            >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                {/* Panel */}
                <div
                    ref={panelRef}
                    className={`relative bg-panel-bg/95 backdrop-blur-md border border-[rgba(180,160,130,0.15)] shadow-xl rounded-lg overflow-hidden animate-slideUp ${className}`}
                    style={{ width, maxHeight: '80vh' }}
                >
                    <PanelHeader title={title} onClose={onClose} />
                    <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 48px)' }}>
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
                style={{ zIndex, maxHeight: '40vh' }}
            >
                <PanelHeader title={title} onClose={onClose} />
                <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(40vh - 48px)' }}>
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
            style={{ zIndex, width }}
        >
            <PanelHeader title={title} onClose={onClose} />
            <div className="overflow-y-auto p-4" style={{ height: 'calc(100% - 48px)' }}>
                {children}
            </div>
        </div>
    );
}

function PanelHeader({ title, onClose }: { title: string; onClose?: () => void }) {
    return (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(180,160,130,0.15)]">
            <h2
                className="text-accent-gold uppercase tracking-[0.3em] text-sm font-black"
                style={{ textShadow: '0 0 8px rgba(196,163,90,0.3)' }}
            >
                {title}
            </h2>
            {onClose && (
                <button
                    onClick={onClose}
                    className="text-text-secondary hover:text-accent-gold transition-colors text-lg leading-none"
                    aria-label="Close panel"
                >
                    &times;
                </button>
            )}
        </div>
    );
}

export default GlassPanel;
