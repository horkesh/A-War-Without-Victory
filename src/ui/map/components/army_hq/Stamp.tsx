import { memo } from 'react';

interface StampProps {
    text: string;
    color?: string;
    rotation?: number;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

/**
 * A reusable "Army Stamp" component to add authenticity to paper documents.
 * Uses a bold, uppercase, rotated style with mix-blend-mode for an ink-on-paper look.
 */
export const Stamp = memo(function Stamp({
    text,
    color = '#8b0000', // Default blood red ink
    rotation = -12,
    size = 'md',
    className = ''
}: StampProps) {
    const sizeClasses = {
        xs: 'text-[7px] px-1 py-0.25 border-[1px] tracking-tighter',
        sm: 'text-[9px] px-2 py-0.5 border-[2px] tracking-tight',
        md: 'text-[12px] px-3 py-1 border-[3px] tracking-normal',
        lg: 'text-[18px] px-5 py-2 border-[4px] tracking-widest',
    };

    return (
        <div
            className={`inline-block font-black uppercase pointer-events-none select-none ${sizeClasses[size]} ${className}`}
            style={{
                color,
                borderColor: `${color}88`, // Slightly transparent border for ink bleed look
                transform: `rotate(${rotation}deg)`,
                opacity: 0.7,
                mixBlendMode: 'multiply',
                filter: 'contrast(1.2) brightness(0.9)', // Slight grit
                fontFamily: 'Georgia, serif',
            }}
        >
            {text}
        </div>
    );
});
