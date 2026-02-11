/**
 * ModalManager — Manages modal overlays and tooltips for warroom GUI
 * Provides DOM-based modal system for better text rendering and accessibility
 */

export class ModalManager {
    private backdrop: HTMLElement;
    private contentContainer: HTMLElement;
    private tooltip: HTMLElement;
    private currentCloseCallback: (() => void) | null = null;
    private tooltipTimeout: number | null = null;

    constructor() {
        this.backdrop = document.getElementById('modal-backdrop')!;
        this.contentContainer = document.getElementById('modal-content-container')!;
        this.tooltip = document.getElementById('warroom-tooltip')!;

        this.initializeEventListeners();
    }

    private initializeEventListeners() {
        // Close modal on backdrop click
        this.backdrop.addEventListener('click', (e) => {
            if (e.target === this.backdrop) {
                this.hideModal();
            }
        });

        // Close modal on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.backdrop.classList.contains('active')) {
                this.hideModal();
            }
        });
    }

    /**
     * Show a modal with custom HTML content
     */
    showModal(content: HTMLElement, onClose?: () => void) {
        // Clear previous content
        this.contentContainer.innerHTML = '';

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close';
        closeBtn.innerHTML = '×';
        closeBtn.onclick = () => this.hideModal();

        // Add content
        this.contentContainer.appendChild(closeBtn);
        this.contentContainer.appendChild(content);

        // Store close callback
        this.currentCloseCallback = onClose || null;

        // Show backdrop
        this.backdrop.classList.add('active');
    }

    /**
     * Hide the currently displayed modal
     */
    hideModal() {
        this.backdrop.classList.remove('active');

        // Call close callback if exists
        if (this.currentCloseCallback) {
            this.currentCloseCallback();
            this.currentCloseCallback = null;
        }

        // Clear content after animation
        setTimeout(() => {
            if (!this.backdrop.classList.contains('active')) {
                this.contentContainer.innerHTML = '';
            }
        }, 300);
    }

    /**
     * Show tooltip at screen coordinates
     */
    showTooltip(text: string, screenX: number, screenY: number) {
        // Clear existing timeout
        if (this.tooltipTimeout !== null) {
            clearTimeout(this.tooltipTimeout);
        }

        // Delay tooltip appearance
        this.tooltipTimeout = window.setTimeout(() => {
            this.tooltip.textContent = text;

            // Position tooltip (offset from cursor)
            let left = screenX + 15;
            let top = screenY + 15;

            // Prevent tooltip from going off screen
            const tooltipRect = this.tooltip.getBoundingClientRect();
            if (left + tooltipRect.width > window.innerWidth) {
                left = screenX - tooltipRect.width - 5;
            }
            if (top + tooltipRect.height > window.innerHeight) {
                top = screenY - tooltipRect.height - 5;
            }

            this.tooltip.style.left = `${left}px`;
            this.tooltip.style.top = `${top}px`;
            this.tooltip.classList.add('active');
        }, 500); // 500ms delay before showing tooltip
    }

    /**
     * Hide tooltip
     */
    hideTooltip() {
        // Clear timeout if waiting
        if (this.tooltipTimeout !== null) {
            clearTimeout(this.tooltipTimeout);
            this.tooltipTimeout = null;
        }

        this.tooltip.classList.remove('active');
    }

    /**
     * Check if a modal is currently open
     */
    isModalOpen(): boolean {
        return this.backdrop.classList.contains('active');
    }
}
