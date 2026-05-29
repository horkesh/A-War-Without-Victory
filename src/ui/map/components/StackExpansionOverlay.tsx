import React, { useEffect, useState, useRef } from 'react';
import type { FormationView } from '../data/types';
import { FACTION_COLORS } from '../utils/theme';
import { drawFormationIcon, ICON_WIDTH, ICON_HEIGHT } from '../map/formationIcons';
import { formationIconId } from '../map/builders/buildFormationsGeoJSON';
import { Z } from '../../shared/zIndex';
import { t, useLocale } from '../i18n';
import { getFormationUnitType, getLocalizedFormationName } from '../data/formationNameLocalizations';

interface StackExpansionOverlayProps {
    osid: string;
    anchorX: number;
    anchorY: number;
    formations: FormationView[];
    onClose: () => void;
    onSelect: (id: string) => void;
}

/** Component to render a formation icon onto a canvas. */
const FormationIconCanvas: React.FC<{ formation: FormationView; className?: string }> = ({ formation, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const iconId = formationIconId(
            formation.kind === 'corps' || formation.kind === 'army_hq' || formation.kind === 'corps_asset'
                ? formation.kind
                : getFormationUnitType(formation) === 'mountain' ? 'mountain' : 'brigade',
            formation.faction,
            formation.posture
        );

        drawFormationIcon(ctx, iconId);
    }, [formation]);

    return (
        <canvas
            ref={canvasRef}
            width={ICON_WIDTH}
            height={ICON_HEIGHT}
            className={className}
            style={{ width: '80px', height: '40px' }}
        />
    );
};

/**
 * Premium animated overlay for fanning out a stack of formations.
 * Features backdrop-blur, radial fan-out animation, and high-quality selection.
 */
export const StackExpansionOverlay: React.FC<StackExpansionOverlayProps> = ({
    anchorX,
    anchorY,
    formations,
    onClose,
    onSelect,
}) => {
    const [locale] = useLocale();
    const [isMounted, setIsMounted] = useState(false);

    /* Animation states */
    useEffect(() => {
        const t = setTimeout(() => setIsMounted(true), 20);
        return () => clearTimeout(t);
    }, []);

    const total = formations.length;

    // If no formations (race condition?), close overlay.
    useEffect(() => {
        if (total === 0 && isMounted) {
            onClose();
        }
    }, [total, isMounted, onClose]);

    return (
        <div
            className="fixed inset-0 flex items-center justify-center pointer-events-auto"
            style={{ perspective: '1000px', zIndex: Z.MODAL }}
        >
            {/* Backdrop with blur & darken */}
            <button
                type="button"
                className={`absolute inset-0 border-0 bg-black/40 p-0 backdrop-blur-md transition-opacity duration-500 ease-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-label={t('stackExpansion.closeAria')}
            />

            {/* Orbital content */}
            <div
                className="absolute pointer-events-none"
                style={{
                    left: anchorX,
                    top: anchorY,
                }}
            >
                {/* Central "Origin" indicator */}
                <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-accent-gold/50 animate-ping opacity-30"
                    style={{ transform: `scale(${isMounted ? 1 : 0})` }}
                />

                {formations.map((f, i) => {
                    // Angle calculation (start from top)
                    const angle = total === 1 ? 0 : (i / total) * Math.PI * 2 - Math.PI / 2;
                    const baseRadius = total === 1 ? 0 : 140;
                    const radius = Math.min(300, baseRadius + total * 12);
                    const tx = Math.cos(angle) * radius;
                    const ty = Math.sin(angle) * radius;
                    const name = getLocalizedFormationName(f, locale);

                    // Staggered delay for each unit
                    const delay = i * 60;

                    return (
                        <div
                            key={f.id}
                            className="absolute pointer-events-auto transition-all duration-500"
                            style={{
                                transform: `translate(calc(${tx}px - 50%), calc(${ty}px - 50%)) scale(${isMounted ? 1 : 0.2})`,
                                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                                transitionDelay: `${delay}ms`,
                                opacity: isMounted ? 1 : 0,
                            }}
                        >
                            <button
                                type="button"
                                className="group relative flex flex-col items-center gap-2 cursor-pointer border-0 bg-transparent p-0"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(f.id);
                                }}
                                aria-label={t('stackExpansion.selectAria', { name })}
                            >
                                {/* Shield Glow */}
                                <div
                                    className="absolute -inset-4 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: FACTION_COLORS[f.faction] ? `${FACTION_COLORS[f.faction]}22` : 'rgba(255,255,255,0.1)' }}
                                />

                                <FormationIconCanvas
                                    formation={f}
                                    className="drop-shadow-lg group-hover:scale-110 transition-transform"
                                />

                                <div className="bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[10px] font-mono text-white whitespace-nowrap shadow-xl group-hover:bg-accent-gold group-hover:text-black transition-colors">
                                    {name}
                                </div>
                            </button>
                        </div>
                    );
                })}

                {/* Close Button UI */}
                {total > 0 && (
                    <button
                        type="button"
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-auto group mt-4 flex border-0 bg-transparent p-0"
                        style={{
                            top: total === 1 ? 60 : 24, // Position relative to origin
                            opacity: isMounted ? 1 : 0,
                            transition: 'opacity 0.3s 0.5s'
                        }}
                        onClick={onClose}
                        aria-label={t('stackExpansion.dismissAria')}
                    >
                        <div className="bg-black/80 border border-white/20 hover:border-accent-gold/50 px-3 py-1 rounded-full text-[9px] text-white/60 tracking-widest font-bold uppercase transition-all hover:scale-105 active:scale-95 whitespace-nowrap shadow-2xl">
                            {t('stackExpansion.dismiss')}
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}
