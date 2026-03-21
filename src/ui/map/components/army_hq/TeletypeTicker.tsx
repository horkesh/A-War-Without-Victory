import { useState, useEffect } from 'react';
import { playSFX } from '../../audio/audio_engine';
interface TeletypeTickerProps {
    alerts: Array<{ text: string; severity: 'critical' | 'warning' | 'info'; corpsId?: string }>;
    onAlertClick?: (corpsId?: string) => void;
}

export function TeletypeTicker({ alerts, onAlertClick }: TeletypeTickerProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);

    // Reset when alerts change
    useEffect(() => {
        setCurrentIndex(0);
        setDisplayedText('');
        setIsTyping(true);
    }, [alerts.length]);

    useEffect(() => {
        if (alerts.length === 0) return;

        let timeout: NodeJS.Timeout;
        const currentAlert = alerts[currentIndex];

        if (isTyping) {
            if (displayedText.length < currentAlert.text.length) {
                // Type next character
                timeout = setTimeout(() => {
                    setDisplayedText(currentAlert.text.slice(0, displayedText.length + 1));
                    playSFX('teletype_tick').catch(() => { });
                }, Math.random() * 20 + 10); // Fast typing speed
            } else {
                // Finished typing, pause
                setIsTyping(false);
                timeout = setTimeout(() => {
                    // Move to next alert after delay
                    setCurrentIndex((prev) => (prev + 1) % alerts.length);
                    setDisplayedText('');
                    setIsTyping(true);
                }, 3500); // Wait 3.5 seconds before next alert
            }
        }

        return () => clearTimeout(timeout);
    }, [alerts, currentIndex, displayedText, isTyping]);

    if (alerts.length === 0) return null;

    const alert = alerts[currentIndex];
    const severityColor = alert.severity === 'critical' ? 'text-red-400' :
        alert.severity === 'warning' ? 'text-amber-400' :
            'text-accent-gold';

    // Sort to show highest severity first in the ticker order
    // But since the index controls the display, we assume alerts are pre-sorted or we sort them here.
    // Actually, alerts are generated critically first usually, but let's just use the passed array.

    return (
        <div className="flex items-center gap-4 bg-black/60 border border-accent-gold/20 rounded-sm px-4 py-2.5 font-mono shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] backdrop-blur-xl">
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_rgba(220,38,38,0.6)]" />
                <div className="text-[10px] text-accent-gold/60 uppercase tracking-[0.3em] font-bold">TELETYPE</div>
            </div>
            <div className="w-px h-5 bg-panel-border shrink-0 mx-1" />
            <button
                type="button"
                onClick={() => onAlertClick?.(alert.corpsId)}
                className={`text-[13px] text-left truncate flex-1 transition-all group ${severityColor} ${alert.corpsId ? 'hover:text-white cursor-pointer' : 'cursor-default'}`}
            >
                <span className="opacity-50 mr-2">SYS&gt;</span>
                {displayedText}
                <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse" />
            </button>
            <div className="text-[10px] text-accent-gold/40 shrink-0 font-bold tabular-nums tracking-widest">
                MSG {currentIndex + 1}/{alerts.length}
            </div>
        </div>
    );
}
