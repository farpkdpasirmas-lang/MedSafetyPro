/**
 * UI Helper Library
 * Handles Toasts, Spinners, and Modals
 */

const UI = {
    // Container for toasts
    init: () => {
        if (!document.getElementById('toast-container')) {
            const container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        if (!document.getElementById('spinner-overlay')) {
            const spinner = document.createElement('div');
            spinner.id = 'spinner-overlay';
            spinner.className = 'spinner-overlay hidden';
            spinner.innerHTML = '<div class="spinner"></div><div class="spinner-text">Processing...</div>';
            document.body.appendChild(spinner);
        }
    },

    /**
     * Show a toast notification
     * @param {string} message 
     * @param {string} type 'success' | 'error' | 'info' | 'warning'
     * @param {number} duration ms
     */
    showToast: (message, type = 'info', duration = 3000) => {
        UI.init();
        const container = document.getElementById('toast-container');

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon">${UI.getIcon(type)}</div>
            <div class="toast-message">${message}</div>
            <div class="toast-close" onclick="this.parentElement.remove()">×</div>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    showSpinner: (text = 'Processing...') => {
        UI.init();
        const overlay = document.getElementById('spinner-overlay');
        const textEl = overlay.querySelector('.spinner-text');
        if (textEl) textEl.textContent = text;
        overlay.classList.remove('hidden');
    },

    hideSpinner: () => {
        const overlay = document.getElementById('spinner-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    getIcon: (type) => {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', UI.init);
