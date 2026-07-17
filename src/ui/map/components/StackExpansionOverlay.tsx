import React, { useEffect, useRef } from 'react';
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
            className={`flex items-center justify-center rounded border font-mono text-xs font-bold uppercase tracking-[0.08em] text-white shadow-lg ${className ?? ''}`}
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

/** Bounded modal picker for every player-visible formation at an OSID. */
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
    const dialogRef = useRef<HTMLDivElement>(null);
    const previouslyFocusedRef = useRef<HTMLElement | null>(null);

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
        if (total === 0) {
            onClose();
        }
    }, [total, onClose]);

    const viewportWidth = typeof window === 'undefined' ? Math.max(1, anchorX * 2) : window.innerWidth;
    const viewportHeight = typeof window === 'undefined' ? Math.max(1, anchorY * 2) : window.innerHeight;
    const clampedAnchorX = viewportWidth / 2;
    const clampedAnchorY = viewportHeight / 2;

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
                className="absolute inset-0 border-0 bg-black/40 p-0 backdrop-blur-md opacity-100"
                onClick={onClose}
                aria-label={t('stackExpansion.closeAria')}
                tabIndex={-1}
            />

            {/* Keep the picker anchored near the clicked stack while clamping the
                whole interaction region away from viewport edges. */}
            <div
                className="absolute pointer-events-none"
                style={{
                    left: clampedAnchorX,
                    top: clampedAnchorY,
                }}
            >
                <div
                    data-stack-picker-panel="true"
                    className="pointer-events-auto flex max-h-[calc(100vh-2rem)] w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 scale-100 flex-col overflow-hidden rounded border border-accent-gold/45 bg-panel-bg p-3 opacity-100 shadow-2xl"
                >
                    <div className="mb-2 flex items-center justify-between gap-3 border-b border-panel-border pb-2">
                        <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-text-primary">
                            {t('stackExpansion.dialogAria')}
                        </div>
                        <span className="rounded border border-accent-gold/45 bg-panel-card px-2 py-0.5 text-[12px] font-bold tabular-nums text-accent-gold">
                            {total}
                        </span>
                    </div>

                    <div
                        data-stack-member-list="true"
                        className="grid min-h-0 max-h-[min(70vh,36rem)] flex-1 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2"
                    >
                        {formations.map((formation, index) => {
                            const isEnemyContact = Boolean(playerFaction && formation.faction !== playerFaction);
                            const name = isEnemyContact
                                ? t('tooltip.enemyContactTitle')
                                : getLocalizedFormationName(formation, locale);
                            const selectionId = isEnemyContact
                                ? `enemy_contact:${formation.location_osid ?? osid}:${index}`
                                : formation.id;

                            return (
                                <button
                                    key={selectionId}
                                    type="button"
                                    className="group flex min-h-14 min-w-0 items-center gap-3 rounded border border-panel-border bg-panel-card px-2 py-2 text-left transition-colors hover:border-accent-gold/55 hover:bg-panel-hover focus-visible:border-accent-gold"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        onSelect(selectionId);
                                    }}
                                    aria-label={isEnemyContact
                                        ? t('stackExpansion.inspectEnemyContactAria')
                                        : t('stackExpansion.selectAria', { name })}
                                    data-stack-focusable="true"
                                    data-stack-selection-id={selectionId}
                                >
                                    <span className="shrink-0" aria-hidden="true">
                                        {isEnemyContact ? (
                                            <EnemyContactGlyph faction={formation.faction} />
                                        ) : (
                                            <FormationIconCanvas formation={formation} className="drop-shadow-lg" />
                                        )}
                                    </span>
                                    <span className="min-w-0 break-words text-[12px] font-mono font-semibold leading-snug text-text-primary">
                                        {name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        className="mt-3 w-full rounded border border-panel-border bg-black/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-text-secondary transition-colors hover:border-accent-gold/50 hover:text-accent-gold"
                        onClick={onClose}
                        aria-label={t('stackExpansion.dismissAria')}
                        data-stack-focusable="true"
                    >
                        {t('stackExpansion.dismiss')}
                    </button>
                </div>
            </div>
        </div>
    );
}
