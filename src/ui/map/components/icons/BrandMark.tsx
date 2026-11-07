import { memo, useId, type CSSProperties } from 'react';

/**
 * The game's mark: three identical pushpins driven into one hole from three directions.
 * Canonical geometry and the generator live in docs/50_launch/marketing/logo/convergence/generate.cjs;
 * this component mirrors the two cuts from there. Always one ink (currentColor); never colour a pin.
 */

// Side view, origin at the top centre of the head, needle tip at y=45.
const PIN_DISPLAY = [
    'M-11 3a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v7h-5l-2 9h-8l-2-9h-5z',
    'M-1.1 19h2.2v22.5L0 45l-1.1-3.5z',
];
// Heavier head, collar and needle for 48 px and under.
const PIN_SMALL = [
    'M-13 3.5a3.5 3.5 0 0 1 3.5-3.5h19a3.5 3.5 0 0 1 3.5 3.5v7.5h-5.5l-2.5 9h-10l-2.5-9h-5.5z',
    'M-3.4 20h6.8v19L0 45l-3.4-6z',
];

const ANGLE = 26;
const TIP = { x: 50, y: 80 };

function placement(rotate: number): string {
    return `translate(${TIP.x} ${TIP.y}) rotate(${rotate}) translate(0 -45)`;
}

interface BrandMarkProps {
    /** Rendered size in CSS pixels; picks the heavy cut automatically at 48 and under. */
    size?: number;
    cut?: 'display' | 'small';
    className?: string;
    style?: CSSProperties;
    title?: string;
}

function BrandMarkInner({ size = 48, cut, className, style, title }: BrandMarkProps) {
    const maskId = useId();
    const useSmall = cut ? cut === 'small' : size <= 48;
    const pin = useSmall ? PIN_SMALL : PIN_DISPLAY;
    const gap = useSmall ? 6 : 5;
    const paths = pin.map((d) => <path key={d} d={d} />);
    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className={className}
            style={style}
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
            focusable="false"
        >
            {title ? <title>{title}</title> : null}
            <mask id={maskId}>
                <rect width="100" height="100" fill="#fff" />
                <g transform={placement(0)} fill="#000" stroke="#000" strokeWidth={gap} strokeLinejoin="round">
                    {paths}
                </g>
            </mask>
            <g fill="currentColor">
                <g mask={`url(#${maskId})`}>
                    <g transform={placement(-ANGLE)}>{paths}</g>
                    <g transform={placement(ANGLE)}>{paths}</g>
                </g>
                <g transform={placement(0)}>{paths}</g>
            </g>
        </svg>
    );
}

export const BrandMark = memo(BrandMarkInner);
