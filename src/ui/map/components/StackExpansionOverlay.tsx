import React, { useEffect, useState, useRef } from 'react';
import type { FormationView } from '../data/types';
import { FACTION_HEX_COLORS } from '../utils/theme';
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
    playerFaction?: string | null;
    onClose: () => void;
    onSelect: (id: string) => void;
}

const STACK_VIEWPORT_MARGIN = 180;

function clampToViewport(value: number, viewportExtent: number): number {
    const min = Math.min(STACK_VIEWPORT_MARGIN, Math.max(0, viewportExtent / 2));
    const max = Math.max(min, viewportExtent - min);
    return Math.min(Math.max(value, min), max);
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

const EnemyContactGlyph: React.FC<{ faction: string; className?: string }> = ({ faction, className }) => {
    const factionColor = FACTION_HEX_COLORS[faction] ?? '#4b5563';
    return (
        <div
            data-contact-redacted="true"
            data-contact-faction-color={faction}
            aria-hidden="true"
            className={`flex items-center justify-center rounded border font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-white/85 shadow-lg ${className ?? ''}`}
            style={{
                width: '80px',
                height: '40px',
                backgroundColor: factionColor,
                borderColor: 'rgba(255,255,255,0.35)',
            }}
        >
            {t('tooltip.enemyContactTitle')}
        </div>
    );
};

/**
 * Premium animated overlay for fanning out a stack of formations.
 * Features backdrop-blur, radial fan-out animation, and high-quality selection.
 */
export const StackExpansionOverlay: React.FC<StackExpansionOverlayProps> = ({
    osid,
    anchorX,
    anchorY,
    formations,
    playerFaction,
    onClose,
    onSelect,
}) => {
    const [locale] = useLocale();
    const [isMounted, setIsMounted] = useState(false);
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

    /* Animation states */
    useEffect(() => {
        const t = setTimeout(() => setIsMounted(true), 20);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const focusTimer = window.setTimeout(() => {
            const firstButton = dialogRef.current?.querySelector<HTMLButtonElement>('[data-stack-focusable="true"]');
            firstButton?.focus();
        }, 0);
        return () => {
            window.clearTimeout(focusTimer);
            previouslyFocusedRef.current?.focus();
        };
    }, []);

    const handleDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            onClose();
            return;
        }
        if (event.key !== 'Tab') return;

        const focusable = Array.from(
            dialogRef.current?.querySelectorAll<HTMLElement>(
                '[data-stack-focusable="true"]',
            ) ?? [],
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const activeIndex = focusable.indexOf(active as HTMLElement);

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        } else {
            event.preventDefault();
            const fallbackIndex = event.shiftKey ? focusable.length : -1;
            const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
            const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
            focusable[Math.max(0, Math.min(focusable.length - 1, nextIndex))]?.focus();
        }
    };

    const total = formations.length;

    // If no formations (race condition?), close overlay.
    useEffect(() => {
        if (total === 0 && isMounted) {
            onClose();
        }
    }, [total, isMounted, onClose]);

    const viewportWidth = typeof window === 'undefined' ? anchorX : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? anchorY : window.innerHeight;
    const clampedAnchorX = clampToViewport(anchorX, viewportWidth);
    const clampedAnchorY = clampToViewport(anchorY, viewportHeight);

    return (
        <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('stackExpansion.dialogAria')}
            tabIndex={-1}
            className="fixed inset-0 flex items-center justify-center pointer-events-auto"
            style={{ perspective: '1000px', zIndex: Z.MODAL }}
            onKeyDown={handleDialogKeyDown}
        >
            {/* Backdrop with blur & darken */}
            <button
                type="button"
                className={`absolute inset-0 border-0 bg-black/40 p-0 backdrop-blur-md transition-opacity duration-500 ease-out ${isMounted ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
                aria-label={t('stackExpansion.closeAria')}
                tabIndex={-1}
            />

            {/* Orbital content */}
            <div
                className="absolute pointer-events-none"
                style={{
                    left: clampedAnchorX,
                    top: clampedAnchorY,
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
                    const isEnemyContact = Boolean(playerFaction && f.faction !== playerFaction);
                    const name = isEnemyContact ? t('tooltip.enemyContactTitle') : getLocalizedFormationName(f, locale);
                    const selectionId = isEnemyContact ? `enemy_contact:${f.location_osid ?? osid}:${i}` : f.id;
                    const glowColor = isEnemyContact
                        ? 'rgba(180, 190, 200, 0.18)'
                        : FACTION_HEX_COLORS[f.faction] ? `${FACTION_HEX_COLORS[f.faction]}22` : 'rgba(255,255,255,0.1)';

                    // Staggered delay for each unit
                    const delay = i * 60;

                    return (
                        <div
                            key={selectionId}
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
                                    onSelect(selectionId);
                                }}
                                aria-label={isEnemyContact
                                    ? t('stackExpansion.inspectEnemyContactAria')
                                    : t('stackExpansion.selectAria', { name })}
                                data-stack-focusable="true"
                            >
                                {/* Shield Glow */}
                                <div
                                    className="absolute -inset-4 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ backgroundColor: glowColor }}
                                />

                                {isEnemyContact ? (
                                    <EnemyContactGlyph faction={f.faction} className="group-hover:scale-110 transition-transform" />
                                ) : (
                                    <FormationIconCanvas
                                        formation={f}
                                        className="drop-shadow-lg group-hover:scale-110 transition-transform"
                                    />
                                )}

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
                        data-stack-focusable="true"
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
