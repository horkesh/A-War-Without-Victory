import { memo, type CSSProperties } from 'react';

export type IconName =
    | 'personnel'
    | 'cohesion'
    | 'morale'
    | 'fatigue'
    | 'supply'
    | 'entrenchment'
    | 'tanks'
    | 'artillery'
    | 'aa'
    | 'dead'
    | 'wounded'
    | 'star'
    | 'offensive'
    | 'defensive'
    | 'balanced'
    | 'reorganizing'
    | 'transit'
    | 'operation'
    | 'disrupted'
    | 'home'
    | 'recon'
    | 'locked';

interface IconProps {
    name: IconName;
    size?: number;
    className?: string;
    style?: CSSProperties;
    color?: string;
    title?: string;
}

const paths: Record<IconName, string> = {
    // Stat icons
    personnel: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    cohesion: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z',
    morale: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    fatigue: 'M13 2.05v3.03c3.39.49 6 3.39 6 6.92 0 .9-.18 1.75-.52 2.54l2.5 1.5c.67-1.22 1.02-2.6 1.02-4.04 0-4.75-3.67-8.68-8.5-9.25V2.05c0-.52-.63-.79-1-42L6.14 7.5c-.32.32-.32.85 0 1.17L11.58 14c.39.39 1.02.11 1.02-.42v-2.62c4.13.38 7.4 3.81 7.4 8.04 0 1.36-.34 2.65-.95 3.79l2.5 1.5c1.1-1.5 1.75-3.32 1.75-5.29 0-5.74-4.81-10.37-10.7-10.22zM7 21c-4.41 0-8-3.59-8-8 0-1.89.65-3.62 1.74-5l2.49 1.49C2.45 10.66 2 11.8 2 13c0 3.31 2.69 6 6 6 1.83 0 3.47-.83 4.55-2.126l2.49 1.491C13.56 20.37 10.42 22 7 22', // placeholder generic lightningish
    supply: 'M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18s-.41-.06-.57-.18l-7.9-4.44A.991.991 0 013 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18s.41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9zM12 4.15l-6.79 3.82 2.5 1.41L14.5 5.55 12 4.15zM20 16.5V7.5L12.5 11.75v9l7.5-4.25zM11.5 11.75L4 7.5v9l7.5 4.25v-9z',
    entrenchment: 'M19.5 9.5c0-.82-.68-1.5-1.5-1.5s-1.5.68-1.5 1.5c0 .7.49 1.28 1.15 1.46V12H3v2h9L8.73 20H11l3-6v-3.04c.66-.18 1.15-.76 1.15-1.46h2.35v1.5h1.5V8.5h-5.5v1.5H19.5v-.5z', // Shovel
    tanks: 'M21 14H3v2h18v-2z M20 10.5h-3L14.5 8h-4L8 10.5H4v1.5h16v-1.5z M6.5 6L8.5 8h-2z M10 4v2.5h2V4 M14 5.5V8h2L14 5.5z M23 10H17V9h6 M3 13V12', // simplified tank
    artillery: 'M18.81 9.38l-1.42 1.42 2.83 2.83 1.42-1.42-2.83-2.83zm-10.4-3.32l-1.42 1.42L5.56 6.06l1.42-1.42 1.43 1.42zm11.3 7.79l-4.24-4.24c-1.17-1.17-2.6-1.55-3.89-1.2l-3.21-3.2c-.44-.44-1.14-.4-1.51.1-.38.5-.32 1.23.11 1.66l3.2 3.2c-.35 1.3.04 2.72 1.21 3.89l4.24 4.24c.78.78 2.05.78 2.83 0 .78-.78.78-2.05 0-2.83z', // crossed cannons
    aa: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z', // placeholder for AA
    dead: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2.5 12h-3v-3h3v3zm6 0h-3v-3h3v3zm-3-5c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z', // skull like placeholder
    wounded: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 14h-2v-4H7v-2h4V7h2v4h4v2h-4v4z', // bandage cross
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    offensive: 'M14 6l-1.41-1.41L17.17 0H2v2h15.17l-4.58 4.59L14 8l6-6-6-6v4z',
    defensive: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
    balanced: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z',
    reorganizing: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z', // wrench
    transit: 'M16.01 11H4v2h12.01v3L20 12l-3.99-4z', // arrow forward
    operation: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v4h-2zm0 6h2v2h-2z', // crosshairs approx
    disrupted: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', // alert triangle
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    recon: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z',
    locked: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z'
};

export const Icon = memo(function Icon({ name, size = 16, className = '', color = 'currentColor', style = {}, title }: IconProps) {
    const path = paths[name] || paths['personnel']; // Fallback

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            className={`awwv-icon ${className}`}
            style={{ ...style, fill: color, display: 'inline-block', verticalAlign: 'text-bottom' }}
            {...(title ? {} : { 'aria-hidden': true as unknown as boolean })}
        >
            {title && <title>{title}</title>}
            <path d={path} />
        </svg>
    );
});
