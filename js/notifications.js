/**
 * Admin Notification System
 * Helper functions for creating and managing admin notifications
 */

const AdminNotifications = {
    /**
     * Create a new notification
     */
    create: function (type, title, message, relatedId) {
        const notifications = this.getAll();

        const notification = {
            id: Date.now().toString(),
            type: type, // 'report' or 'feedback'
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: relatedId
        };

        notifications.unshift(notification); // Add to beginning

        // Keep only last 100 notifications
        if (notifications.length > 100) {
            notifications.splice(100);
        }

        localStorage.setItem('admin_notifications', JSON.stringify(notifications));
        return notification;
    },

    /**
     * Get all notifications
     */
    getAll: function () {
        return JSON.parse(localStorage.getItem('admin_notifications') || '[]');
    },

    /**
     * Get unread count
     */
    getUnreadCount: function () {
        const notifications = this.getAll();
        return notifications.filter(n => !n.read).length;
    },

    /**
     * Mark notification as read
     */
    markAsRead: function (notificationId) {
        const notifications = this.getAll();
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            localStorage.setItem('admin_notifications', JSON.stringify(notifications));
        }
    },

    /**
     * Mark all as read
     */
    markAllAsRead: function () {
        const notifications = this.getAll();
        notifications.forEach(n => n.read = true);
        localStorage.setItem('admin_notifications', JSON.stringify(notifications));
    },

    /**
     * Clear all notifications
     */
    clearAll: function () {
        localStorage.setItem('admin_notifications', JSON.stringify([]));
    },

    /**
     * Get relative time string
     */
    getRelativeTime: function (timestamp) {
        const now = new Date();
        const then = new Date(timestamp);
        const diffMs = now - then;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return then.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
};

/**
 * User Notification System
 * For notifying staff members who have been reported
 */
const UserNotifications = {
    /**
     * Create a notification for a specific user
     */
    create: function (userEmail, type, title, message, relatedId) {
        if (!userEmail) return null;

        const key = 'user_notifications_' + userEmail.toLowerCase();
        const notifications = this.getForUser(userEmail);

        const notification = {
            id: Date.now().toString(),
            type: type, // 'report_involved'
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: relatedId
        };

        notifications.unshift(notification);

        // Keep only last 50 notifications per user
        if (notifications.length > 50) {
            notifications.splice(50);
        }

        localStorage.setItem(key, JSON.stringify(notifications));
        return notification;
    },

    /**
     * Get notifications for a specific user
     */
    getForUser: function (userEmail) {
        if (!userEmail) return [];
        const key = 'user_notifications_' + userEmail.toLowerCase();
        return JSON.parse(localStorage.getItem(key) || '[]');
    },

    /**
     * Get unread count for a user
     */
    getUnreadCount: function (userEmail) {
        const notifications = this.getForUser(userEmail);
        return notifications.filter(n => !n.read).length;
    },

    /**
     * Mark notification as read
     */
    markAsRead: function (userEmail, notificationId) {
        const key = 'user_notifications_' + userEmail.toLowerCase();
        const notifications = this.getForUser(userEmail);
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            localStorage.setItem(key, JSON.stringify(notifications));
        }
    },

    /**
     * Mark all as read for a user
     */
    markAllAsRead: function (userEmail) {
        const key = 'user_notifications_' + userEmail.toLowerCase();
        const notifications = this.getForUser(userEmail);
        notifications.forEach(n => n.read = true);
        localStorage.setItem(key, JSON.stringify(notifications));
    },

    /**
     * Get relative time string
     */
    getRelativeTime: function (timestamp) {
        return AdminNotifications.getRelativeTime(timestamp);
    }
};
