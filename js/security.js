/**
 * Security Service
 * Provides utilities for hashing, sanitization, and rate limiting
 */

const Security = {
    /**
     * Hash a password using SHA-256
     * @param {string} password 
     * @returns {Promise<string>} Hex string of the hash
     */
    hashPassword: async (password) => {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    },

    /**
     * Sanitize a string to prevent XSS
     * @param {string} str 
     * @returns {string} Sanitized string
     */
    sanitize: (str) => {
        if (!str) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            "/": '&#x2F;',
        };
        const reg = /[&<>"'/]/ig;
        return str.toString().replace(reg, (match) => (map[match]));
    },

    /**
     * Check if an action is allowed based on rate limiting
     * @param {string} key Unique key for the action (e.g., 'report_submit')
     * @param {number} limitTime Time limit in milliseconds
     * @returns {boolean} True if allowed, False if rate limited
     */
    checkRateLimit: (key, limitTime) => {
        const storageKey = `medsafety_ratelimit_${key}`;
        const lastTime = localStorage.getItem(storageKey);
        const now = Date.now();

        if (lastTime && (now - parseInt(lastTime) < limitTime)) {
            return false;
        }

        localStorage.setItem(storageKey, now.toString());
        return true;
    },

    /**
     * Get remaining time for rate limit
     * @param {string} key 
     * @param {number} limitTime 
     * @returns {number} Remaining seconds
     */
    getRateLimitWait: (key, limitTime) => {
        const storageKey = `medsafety_ratelimit_${key}`;
        const lastTime = localStorage.getItem(storageKey);
        if (!lastTime) return 0;

        const diff = Date.now() - parseInt(lastTime);
        if (diff >= limitTime) return 0;

        return Math.ceil((limitTime - diff) / 1000);
    }
};

window.Security = Security;
