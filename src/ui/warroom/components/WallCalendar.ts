export interface CalendarState {
    month: number; // 1-12
    year: number;
    currentTurn: number;
    startTurn: number;
}

export class WallCalendar {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    constructor() {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 400; // Expected dimensions for the wall calendar frame
        this.canvas.height = 300;
        this.ctx = this.canvas.getContext('2d')!;
    }

    async loadAssets() {
        return;
    }

    render(state: CalendarState): HTMLCanvasElement {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.font = 'bold 24px Courier New, monospace';
        this.ctx.textAlign = 'center';

        const monthName = this.getMonthName(state.month).toUpperCase();
        this.ctx.fillText(`${monthName} ${state.year}`, this.canvas.width / 2, 50);

        // Day headers
        this.ctx.font = 'bold 12px Arial, sans-serif';
        const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
        days.forEach((day, i) => {
            this.ctx.fillText(day, 50 + i * 50, 80);
        });

        // Simple grid layout for days
        this.ctx.font = '16px Arial, sans-serif';
        const startDay = new Date(state.year, state.month - 1, 1).getDay(); // 0-6 (Sun-Sat)
        const adjStartDay = (startDay === 0) ? 6 : startDay - 1; // Map to Mon-Sun (0-6)
        const daysInMonth = new Date(state.year, state.month, 0).getDate();

        // Determine which "week" is current based on turn
        // Each turn is 1 week.
        const currentWeekInMonth = Math.floor((state.currentTurn - state.startTurn)) % 4; // Simplified

        for (let i = 1; i <= daysInMonth; i++) {
            const col = (i + adjStartDay - 1) % 7;
            const row = Math.floor((i + adjStartDay - 1) / 7);
            const x = 50 + col * 50;
            const y = 110 + row * 40;

            // Highlight current week
            const weekOfDate = Math.floor((i + adjStartDay - 1) / 7);
            if (weekOfDate === currentWeekInMonth) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
                this.ctx.fillRect(x - 20, y - 20, 40, 30);
                this.ctx.fillStyle = '#d32f2f';
                this.ctx.font = 'bold 16px Arial, sans-serif';
            } else {
                this.ctx.fillStyle = '#1a1a1a';
                this.ctx.font = '16px Arial, sans-serif';
            }

            this.ctx.fillText(i.toString(), x, y);
        }

        return this.canvas;
    }

    private getMonthName(month: number): string {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || 'Unknown';
    }
}
