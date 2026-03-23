import React from 'react';
import { SpiderChart } from './SpiderChart.js';
import type { WrappedSlide as WrappedSlideType } from './generateWrappedSlides.js';

const FACTION_TINTS: Record<string, string> = {
    RBiH: 'rgba(74, 154, 85, 0.15)',
    RS: 'rgba(194, 64, 64, 0.15)',
    HRHB: 'rgba(64, 128, 184, 0.15)',
};

const FACTION_ACCENT: Record<string, string> = {
    RBiH: '#4a9a55',
    RS: '#c24040',
    HRHB: '#4080b8',
};

interface WrappedSlideProps {
    slide: WrappedSlideType;
    index: number;
    total: number;
    faction?: string;
}

export const WrappedSlideComponent = React.memo(function WrappedSlideComponent({
    slide,
    index,
    total,
    faction = 'RBiH',
}: WrappedSlideProps) {
    const tint = FACTION_TINTS[faction] ?? 'rgba(196, 163, 90, 0.10)';
    const accent = FACTION_ACCENT[faction] ?? '#c4a35a';

    return (
        <div
            className="w-full h-full flex flex-col items-center justify-center select-none"
            style={{
                background: `radial-gradient(ellipse at center, ${tint} 0%, rgba(0,0,0,0.95) 70%, #000 100%)`,
            }}
        >
            {/* Slide counter */}
            <div className="absolute top-6 right-8 text-[10px] font-mono text-white/25 tracking-wider">
                {index + 1} / {total}
            </div>

            {/* Content area */}
            <div className="flex flex-col items-center gap-6 max-w-lg px-8 text-center">
                {/* Title */}
                <h2
                    className="text-2xl font-bold uppercase tracking-[0.15em] leading-tight"
                    style={{ color: accent }}
                >
                    {slide.title}
                </h2>

                {/* Variant-specific hero content */}
                {renderHeroContent(slide, accent, faction)}

                {/* Subtitle */}
                <p className="text-sm text-white/60 leading-relaxed max-w-md">
                    {slide.subtitle}
                </p>

                {/* Detail */}
                {slide.detail && (
                    <p className="text-[10px] font-mono text-white/30 tracking-wider uppercase">
                        {slide.detail}
                    </p>
                )}
            </div>

            {/* Navigation hint */}
            <div className="absolute bottom-8 text-[9px] font-mono text-white/15 tracking-wider uppercase">
                {index < total - 1 ? 'click or arrow key to continue' : 'press ESC to close'}
            </div>
        </div>
    );
});

function renderHeroContent(slide: WrappedSlideType, accent: string, faction: string): React.ReactNode {
    switch (slide.id) {
        case 'another_such_victory': {
            const values = slide.data ?? {};
            const numericValues: Record<string, number> = {};
            for (const [key, val] of Object.entries(values)) {
                numericValues[key] = typeof val === 'number' ? val : 0;
            }
            return (
                <div className="flex flex-col items-center gap-4">
                    <SpiderChart
                        values={numericValues}
                        color={accent}
                        size={240}
                    />
                    {slide.heroValue && slide.heroValue !== '-' && (
                        <div className="text-[40px] font-bold tabular-nums leading-none" style={{ color: accent }}>
                            {slide.heroValue}
                        </div>
                    )}
                    {slide.heroLabel && (
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
                            {slide.heroLabel}
                        </div>
                    )}
                </div>
            );
        }

        case 'bloodiest_week': {
            const casualties = slide.data?.bloodiestCasualties as number | undefined;
            return (
                <div className="flex flex-col items-center gap-2">
                    <div
                        className="text-[72px] font-bold tabular-nums leading-none"
                        style={{ color: '#c24040', textShadow: '0 0 40px rgba(194, 64, 64, 0.4)' }}
                    >
                        {slide.heroValue ?? '0'}
                    </div>
                    <div className="text-[11px] font-mono text-red-400/60 uppercase tracking-wider">
                        {slide.heroLabel ?? 'casualties'}
                    </div>
                    {(casualties ?? 0) > 500 && (
                        <div className="text-[9px] text-red-400/30 italic mt-1">
                            A week the survivors will never forget
                        </div>
                    )}
                </div>
            );
        }

        case 'what_it_cost': {
            const totalCasualties = slide.data?.totalCasualties as number | undefined;
            const totalDisplaced = slide.data?.totalDisplaced as number | undefined;
            return (
                <div className="flex flex-col items-center gap-4">
                    <div
                        className="text-[64px] font-bold tabular-nums leading-none"
                        style={{ color: '#c24040', opacity: 0.85, textShadow: '0 0 30px rgba(194, 64, 64, 0.3)' }}
                    >
                        {(totalCasualties ?? 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-red-400/50 uppercase tracking-wider">
                        total casualties
                    </div>
                    {(totalDisplaced ?? 0) > 0 && (
                        <div className="text-[28px] font-bold tabular-nums text-amber-500/60 leading-none mt-2">
                            {(totalDisplaced ?? 0).toLocaleString()}
                        </div>
                    )}
                    {(totalDisplaced ?? 0) > 0 && (
                        <div className="text-[10px] font-mono text-amber-500/30 uppercase tracking-wider">
                            people displaced
                        </div>
                    )}
                </div>
            );
        }

        case 'your_war': {
            const factionName = (slide.data?.faction as string) ?? 'Unknown';
            return (
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="text-[56px] font-bold uppercase tracking-wider leading-none"
                        style={{ color: FACTION_ACCENT[factionName] ?? '#c4a35a' }}
                    >
                        {factionName}
                    </div>
                    <div className="text-[48px] font-bold tabular-nums text-amber-400/80 leading-none">
                        {slide.heroValue}
                    </div>
                    <div className="text-[11px] font-mono text-amber-400/40 uppercase tracking-wider">
                        {slide.heroLabel}
                    </div>
                </div>
            );
        }

        case 'best_brigade': {
            return (
                <div className="flex flex-col items-center gap-3">
                    <div
                        className="text-[20px] font-bold leading-tight text-center"
                        style={{ color: accent }}
                    >
                        {slide.heroValue ?? '-'}
                    </div>
                    {slide.heroLabel && (
                        <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider text-center">
                            {slide.heroLabel}
                        </div>
                    )}
                </div>
            );
        }

        default: {
            return (
                <div className="flex flex-col items-center gap-2">
                    {slide.heroValue && (
                        <div
                            className="text-[56px] font-bold tabular-nums leading-none"
                            style={{ color: accent }}
                        >
                            {slide.heroValue}
                        </div>
                    )}
                    {slide.heroLabel && (
                        <div className="text-[11px] font-mono text-white/40 uppercase tracking-wider">
                            {slide.heroLabel}
                        </div>
                    )}
                </div>
            );
        }
    }
}
