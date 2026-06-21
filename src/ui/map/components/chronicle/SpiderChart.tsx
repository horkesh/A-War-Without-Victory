import React from 'react';
import { t, type MessageKey, useLocale } from '../../i18n';

interface SpiderChartProps {
    values: Record<string, number>; // 0-100 per dimension
    axes?: Array<{ key: string; label: string }>;
    color?: string;
    size?: number;
}

const DEFAULT_AXES: Array<{ key: string; labelKey: MessageKey }> = [
    { key: 'military_credibility', labelKey: 'diplomacyOverview.dimension.military_credibility' },
    { key: 'territorial_legitimacy', labelKey: 'diplomacyOverview.dimension.territorial_legitimacy' },
    { key: 'international_standing', labelKey: 'diplomacyOverview.dimension.international_standing' },
    { key: 'patron_confidence', labelKey: 'diplomacyOverview.dimension.patron_confidence' },
    { key: 'internal_cohesion', labelKey: 'diplomacyOverview.dimension.internal_cohesion' },
    { key: 'negotiating_leverage', labelKey: 'diplomacyOverview.dimension.negotiating_leverage' },
];
const GRID_LEVELS = [0.25, 0.50, 0.75];
const AXIS_COUNT = 6;

function polarToCartesian(cx: number, cy: number, radius: number, index: number): { x: number; y: number } {
    const angle = (index / AXIS_COUNT) * 2 * Math.PI;
    return {
        x: cx + radius * Math.sin(angle),
        y: cy - radius * Math.cos(angle),
    };
}

function hexagonPoints(cx: number, cy: number, radius: number): string {
    const points: string[] = [];
    for (let i = 0; i < AXIS_COUNT; i++) {
        const { x, y } = polarToCartesian(cx, cy, radius, i);
        points.push(`${x},${y}`);
    }
    return points.join(' ');
}

export const SpiderChart = React.memo(function SpiderChart({
    values,
    axes,
    color = '#c4a35a',
    size = 200,
}: SpiderChartProps) {
    useLocale();
    const cx = size / 2;
    const cy = size / 2;
    const maxRadius = size * 0.38; // leave room for labels
    const labelRadius = size * 0.47;

    const resolvedAxes = axes ?? DEFAULT_AXES.map((axis) => ({ key: axis.key, label: t(axis.labelKey) }));
    const dataPoints: string[] = [];
    for (let i = 0; i < AXIS_COUNT; i++) {
        const key = resolvedAxes[i]?.key ?? '';
        const val = Math.max(0, Math.min(100, values[key] ?? 0));
        const r = (val / 100) * maxRadius;
        const { x, y } = polarToCartesian(cx, cy, r, i);
        dataPoints.push(`${x},${y}`);
    }
    const dataPolygon = dataPoints.join(' ');

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Grid hexagons */}
            {GRID_LEVELS.map((level) => (
                <polygon
                    key={level}
                    points={hexagonPoints(cx, cy, maxRadius * level)}
                    fill="none"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={0.5}
                />
            ))}
            {/* Outer boundary */}
            <polygon
                points={hexagonPoints(cx, cy, maxRadius)}
                fill="none"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={1}
            />

            {/* Axis lines */}
            {Array.from({ length: AXIS_COUNT }, (_, i) => {
                const { x, y } = polarToCartesian(cx, cy, maxRadius, i);
                return (
                    <line
                        key={i}
                        x1={cx}
                        y1={cy}
                        x2={x}
                        y2={y}
                        stroke="rgba(255,255,255,0.10)"
                        strokeWidth={0.5}
                    />
                );
            })}

            {/* Data polygon */}
            <polygon
                points={dataPolygon}
                fill={color}
                fillOpacity={0.25}
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
            />

            {/* Data vertices */}
            {Array.from({ length: AXIS_COUNT }, (_, i) => {
                const key = resolvedAxes[i]?.key ?? '';
                const val = Math.max(0, Math.min(100, values[key] ?? 0));
                const r = (val / 100) * maxRadius;
                const { x, y } = polarToCartesian(cx, cy, r, i);
                return (
                    <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r={2}
                        fill={color}
                    />
                );
            })}

            {/* Labels */}
            {resolvedAxes.map((axis, i) => {
                const { x, y } = polarToCartesian(cx, cy, labelRadius, i);
                return (
                    <text
                        key={axis.key}
                        x={x}
                        y={y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="rgba(255,255,255,0.55)"
                        fontSize={size * 0.045}
                        fontFamily="monospace"
                        fontWeight="bold"
                        letterSpacing="0.05em"
                    >
                        {axis.label}
                    </text>
                );
            })}
        </svg>
    );
});
