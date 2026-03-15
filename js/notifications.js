/**
 * Admin Notification System
 * Helper functions for creating and managing admin notifications
 */

const AdminNotifications = {
    /**
     * Create a new notification
     */
    create: async function (type, title, message, relatedId) {
        const notification = {
            type: type, // 'report' or 'feedback'
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: relatedId
        };
        return await DB.saveNotification(notification);
    },

    /**
     * Listen to admin notifications
     */
    listen: function(callback) {
        return DB.listenToAdminNotifications(callback);
    },

    /**
     * Mark notification as read
     */
    markAsRead: async function (notificationId) {
        await DB.markNotificationAsRead(notificationId);
    },

    /**
     * Mark all as read
     */
    markAllAsRead: async function () {
        await DB.markAllAdminNotificationsAsRead();
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
    create: async function (userEmail, type, title, message, relatedId) {
        if (!userEmail) return null;

        const notification = {
            userEmail: userEmail.toLowerCase(),
            type: type, // 'report_involved'
            title: title,
            message: message,
            timestamp: new Date().toISOString(),
            read: false,
            relatedId: relatedId
        };
        
        return await DB.saveNotification(notification);
    },

    /**
     * Listen for user notifications
     */
    listen: function (userEmail, callback) {
        return DB.listenToUserNotifications(userEmail, callback);
    },

    /**
     * Mark notification as read
     */
    markAsRead: async function (userEmail, notificationId) {
        await DB.markNotificationAsRead(notificationId, userEmail);
    },

    /**
     * Mark all as read for a user
     */
    markAllAsRead: async function (userEmail) {
        await DB.markAllUserNotificationsAsRead(userEmail);
    },

    /**
     * Get relative time string
     */
    getRelativeTime: function (timestamp) {
        return AdminNotifications.getRelativeTime(timestamp);
    }
};
