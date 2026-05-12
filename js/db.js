/**
 * Database Service
 * Abstraction layer for data storage (Firebase Firestore OR LocalStorage)
 */

const DB = {
    // Collection Names
    COLLECTION_REPORTS: 'reports', // Restored name to pull primary 500 reports
    COLLECTION_USERS: 'users_v2',
    COLLECTION_NOTIFICATIONS: 'notifications',
    COLLECTION_STAFF: 'staff_data',

    // --- Reports ---

    /**
     * Get next auto-incrementing serial number (Format: MSP-YYYY-XXXX)
     * Uses a Firestore transaction to ensure uniqueness even with concurrent submissions.
     */
    getNextSerialNumber: async () => {
        const year = new Date().getFullYear();
        if (typeof db !== 'undefined' && db) {
            const counterRef = db.collection('metadata').doc('reportCounter');
            try {
                return await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(counterRef);
                    let newCount = 1;
                    if (doc.exists) {
                        const data = doc.data();
                        // Reset counter if it's a new year, otherwise increment
                        if (data.year === year) {
                            newCount = (data.count || 0) + 1;
                        }
                    }
                    transaction.set(counterRef, { count: newCount, year: year }, { merge: true });
                    const paddedCount = newCount.toString().padStart(4, '0');
                    return `MSP-${year}-${paddedCount}`;
                });
            } catch (error) {
                console.error("Error generating serial sequence via transaction:", error);
                // Fallback offline/error
                return `MSP-${year}-OFF-${Date.now().toString().slice(-4)}`;
            }
        } else {
            // LocalStorage mode
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            // Count reports for current year
            const yearReports = reports.filter(r => r.timestamp && r.timestamp.startsWith(year.toString()));
            const newCount = yearReports.length + 1;
            const paddedCount = newCount.toString().padStart(4, '0');
            return `MSP-${year}-L${paddedCount}`;
        }
    },

    /**
     * Save a new report
     * @param {Object} reportData 
     * @returns Promise
     */
    saveReport: async (reportData) => {
        if (db) {
            // Firebase Mode
            try {
                // Use 'add' to auto-generate ID, or 'set' if ID exists
                if (reportData.id) {
                    await db.collection(DB.COLLECTION_REPORTS).doc(reportData.id).set(reportData);
                } else {
                    const docRef = await db.collection(DB.COLLECTION_REPORTS).add(reportData);
                    reportData.id = docRef.id;
                }
            } catch (error) {
                console.warn("Firestore permission denied. Falling back to local storage.", error);
            }
        } 
        
        // LocalStorage Sync/Fallback
        const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
        if (!reportData.id) {
            // Give it a pseudo-unique ID for pure local usage if Firebase entirely omitted creation
            reportData.id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
        }
        const index = reports.findIndex(r => r.id === reportData.id);
        if (index !== -1) {
            reports[index] = reportData;
        } else {
            reports.push(reportData);
        }
        localStorage.setItem('medsafety_reports_db', JSON.stringify(reports));
        return reportData;
    },

    /**
     * Get all reports
     * @returns Promise<Array>
     */
    getAllReports: async () => {
        if (db) {
            // Firebase Mode
            try {
                const snapshot = await db.collection(DB.COLLECTION_REPORTS).orderBy('timestamp', 'desc').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Error getting documents: ", error);
                throw error;
            }
        } else {
            // LocalStorage Mode
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            // Sort desc
            return reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
    },

    /**
     * Get a single report by ID
     * @param {string} reportId 
     * @returns Promise<Object|null>
     */
    getReportById: async (reportId) => {
        if (!reportId) return null;
        
        if (db) {
            try {
                const doc = await db.collection(DB.COLLECTION_REPORTS).doc(reportId).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
            } catch (error) {
                console.warn("Firestore permission denied for report retrieval. Falling back to local storage.", error);
            }
        } 
        
        // Fallback
        const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
        return reports.find(r => r.id === reportId) || null;
    },

    /**
     * Listen to real-time changes of all reports
     * @param {Function} callback 
     * @returns {Function} Unsubscribe function
     */
    listenToAllReports: (callback) => {
        if (db) {
            // Firebase Mode - Realtime sync
            return db.collection(DB.COLLECTION_REPORTS).orderBy('timestamp', 'desc').onSnapshot(snapshot => {
                const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                callback(reports);
            }, error => {
                if (error.code !== 'permission-denied') {
                    console.error("Error listening to reports: ", error);
                } else {
                    console.info("Firestore permission denied for reports. Falling back to local storage.");
                    const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
                    const sorted = reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    callback(sorted);
                }
            });
        } else {
            // LocalStorage mode doesn't support built-in tabs sync easily without storage event listener
            // We'll just call the callback once for fallback
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            const sorted = reports.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            callback(sorted);
            return () => { }; // return empty unsubscribe
        }
    },

    // --- Users ---

    /**
     * Get all users
     * @returns Promise<Array>
     */
    getAllUsers: async () => {
        if (db) {
            try {
                const snapshot = await db.collection(DB.COLLECTION_USERS).get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                if (error.code !== 'permission-denied') {
                    console.error("Error getting users: ", error);
                    throw error;
                } else {
                    console.info("Firestore permission denied for users. Falling back to local storage.");
                    const users = JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
                    try {
                        const currentUser = JSON.parse(localStorage.getItem('medsafety_auth_user'));
                        if (currentUser && currentUser.email && !users.find(u => u.email === currentUser.email)) {
                             users.push(currentUser);
                             localStorage.setItem('medsafety_users_db', JSON.stringify(users));
                        }
                    } catch(e) {}
                    return users;
                }
            }
        } else {
            const users = JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
            try {
                const currentUser = JSON.parse(localStorage.getItem('medsafety_auth_user'));
                if (currentUser && currentUser.email && !users.find(u => u.email === currentUser.email)) {
                     users.push(currentUser);
                     localStorage.setItem('medsafety_users_db', JSON.stringify(users));
                }
            } catch(e) {}
            return users;
        }
    },

    /**
     * Delete a user
     * @param {string} userId 
     * @returns Promise<void>
     */
    deleteUser: async (userId) => {
        if (db) {
            try {
                const collectionName = typeof DB !== 'undefined' ? DB.COLLECTION_USERS : 'users_v2';
                await db.collection(collectionName).doc(userId).delete();
            } catch (error) {
                console.warn("Firestore permission denied for deleting user. Falling back to local storage.");
            }
        } 
        
        // Fallback local storage execution
        const users = JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
        const newUsers = users.filter(u => u.id !== userId);
        localStorage.setItem('medsafety_users_db', JSON.stringify(newUsers));
    },

    /**
     * Approve a user
     * @param {string} userId 
     * @returns Promise<void>
     */
    approveUser: async (userId) => {
        if (db) {
            try {
                const collectionName = typeof DB !== 'undefined' ? DB.COLLECTION_USERS : 'users_v2';
                await db.collection(collectionName).doc(userId).update({ approved: true });
            } catch (error) {
                console.warn("Firestore permission denied for approving user. Falling back to local storage.");
            }
        } 
        
        // Fallback local storage execution
        const users = JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
        const index = users.findIndex(u => u.id === userId);
        if (index !== -1) {
            users[index].approved = true;
            localStorage.setItem('medsafety_users_db', JSON.stringify(users));
        }
    },

    // --- Notifications ---

    /**
     * Save a new notification
     * @param {Object} notification
     * @returns Promise
     */
    saveNotification: async (notification) => {
        if (db) {
            try {
                if (notification.id) {
                    await db.collection(DB.COLLECTION_NOTIFICATIONS).doc(notification.id).set(notification);
                } else {
                    const docRef = await db.collection(DB.COLLECTION_NOTIFICATIONS).add(notification);
                    notification.id = docRef.id;
                }
                return notification;
            } catch (error) {
                console.error("Error saving notification: ", error);
                throw error;
            }
        } else {
            // Local fallback
            const isUserNotif = !!notification.userEmail;
            const key = isUserNotif ? 'user_notifications_' + notification.userEmail.toLowerCase() : 'admin_notifications';
            const notifications = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Ensure unique ID if not provided
            if (!notification.id) notification.id = Date.now().toString();
            
            notifications.unshift(notification);
            
            // Keep bounds
            if (isUserNotif && notifications.length > 50) notifications.splice(50);
            if (!isUserNotif && notifications.length > 100) notifications.splice(100);
            
            localStorage.setItem(key, JSON.stringify(notifications));
            return notification;
        }
    },

    /**
     * Listen to a user's notifications in real-time
     * @param {string} userEmail
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    listenToUserNotifications: (userEmail, callback) => {
        if (!userEmail) {
            callback([]);
            return () => {};
        }

        if (db) {
            try {
                return db.collection(DB.COLLECTION_NOTIFICATIONS)
                    .where('userEmail', '==', userEmail.toLowerCase())
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .onSnapshot(snapshot => {
                        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        callback(notifications);
                    }, error => {
                        if (error.code !== 'permission-denied') {
                            console.error("Error listening to user notifications: ", error);
                        } else {
                            console.info("Firestore permission denied for user notifications. Falling back to local storage.");
                            const key = 'user_notifications_' + userEmail.toLowerCase();
                            const localNotifications = JSON.parse(localStorage.getItem(key) || '[]');
                            callback(localNotifications);
                            return;
                        }
                        if (error.message && error.message.includes('requires an index')) {
                            // Extract URL from error message
                            const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                            const url = urlMatch ? urlMatch[0] : '';
                            if (url && typeof UI !== 'undefined') {
                                UI.showToast(`Admin action required: Firestore Index missing for user notifications. Please <a href="${url}" target="_blank" style="color:white; text-decoration:underline;">Click Here to Create It</a>.`, 'error', 20000);
                            } else {
                                alert("Firestore Index missing for user notifications. Please check the browser console for the creation link.");
                            }

                            // Fallback: Query without orderBy and sort in memory
                            console.log("Attempting fallback query without orderBy for user notifications...");
                            db.collection(DB.COLLECTION_NOTIFICATIONS)
                                .where('userEmail', '==', userEmail.toLowerCase())
                                .onSnapshot(fallbackSnapshot => {
                                    const notifications = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                    // Manually sort by timestamp descending
                                    notifications.sort((a, b) => b.timestamp - a.timestamp);
                                    // Limit to 50
                                    callback(notifications.slice(0, 50));
                                }, fallbackErr => {
                                    console.error("Fallback query also failed: ", fallbackErr);
                                    // Absolute fallback to local storage
                                    const key = 'user_notifications_' + userEmail.toLowerCase();
                                    const localNotifications = JSON.parse(localStorage.getItem(key) || '[]');
                                    callback(localNotifications);
                                });
                        } else {
                            // Fallback to local storage if it's a different error
                            const key = 'user_notifications_' + userEmail.toLowerCase();
                            const localNotifications = JSON.parse(localStorage.getItem(key) || '[]');
                            callback(localNotifications);
                        }
                    });
            } catch (err) {
                console.error("Error setting up user notifications listener: ", err);
                return () => {};
            }
        } else {
            // LocalStorage fallback
            const key = 'user_notifications_' + userEmail.toLowerCase();
            const notifications = JSON.parse(localStorage.getItem(key) || '[]');
            callback(notifications);
            return () => {};
        }
    },
    
    /**
     * Listen to admin notifications in real-time
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    listenToAdminNotifications: (callback) => {
        if (db) {
            try {
                return db.collection(DB.COLLECTION_NOTIFICATIONS)
                    // We check if it doesn't have a userEmail, implying it's an admin notification.
                    // Or we could check type. We'll use type 'in' ['report', 'feedback']
                    .where('type', 'in', ['report', 'feedback'])
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .onSnapshot(snapshot => {
                        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                        callback(notifications);
                    }, error => {
                        if (error.code !== 'permission-denied') {
                            console.error("Error listening to admin notifications: ", error);
                        } else {
                            console.info("Firestore permission denied for admin notifications. Falling back to local storage.");
                            const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
                            callback(notifications);
                            return;
                        }
                        if (error.message && error.message.includes('requires an index')) {
                            const urlMatch = error.message.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
                            const url = urlMatch ? urlMatch[0] : '';
                            if (url && typeof UI !== 'undefined') {
                                UI.showToast(`Admin action required: Firestore Index missing for admin notifications. Please <a href="${url}" target="_blank" style="color:white; text-decoration:underline;">Click Here to Create It</a>.`, 'error', 20000);
                            } else {
                                alert("Firestore Index missing for admin notifications. Please check the browser console for the creation link.");
                            }
                            
                            // Fallback: Query without orderBy and sort in memory
                            console.log("Attempting fallback query without orderBy for admin notifications...");
                            db.collection(DB.COLLECTION_NOTIFICATIONS)
                                .where('type', 'in', ['report', 'feedback'])
                                .onSnapshot(fallbackSnapshot => {
                                    const notifications = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                                    // Manually sort by timestamp descending
                                    notifications.sort((a, b) => b.timestamp - a.timestamp);
                                    // Limit to 100
                                    callback(notifications.slice(0, 100));
                                }, fallbackErr => {
                                    console.error("Fallback query also failed: ", fallbackErr);
                                });
                        }
                    });
            } catch (err) {
                 console.error("Error setting up admin notifications listener: ", err);
                 return () => {};
            }
        } else {
            // LocalStorage fallback
            const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
            callback(notifications);
            return () => {};
        }
    },

    /**
     * Delete a notification
     * @param {string} notificationId
     * @param {string} userEmail (optional, for local storage fallback)
     * @returns Promise<void>
     */
    deleteNotification: async (notificationId, userEmail = null) => {
        if (db) {
            try {
                await db.collection(DB.COLLECTION_NOTIFICATIONS).doc(notificationId).delete();
            } catch (error) {
                console.error("Error deleting notification: ", error);
                throw error;
            }
        } else {
            // LocalStorage fallback
            if (userEmail) {
                const key = 'user_notifications_' + userEmail.toLowerCase();
                let notifications = JSON.parse(localStorage.getItem(key) || '[]');
                notifications = notifications.filter(n => n.id !== notificationId);
                localStorage.setItem(key, JSON.stringify(notifications));
            } else {
                let notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
                notifications = notifications.filter(n => n.id !== notificationId);
                localStorage.setItem('admin_notifications', JSON.stringify(notifications));
            }
        }
    },

    /**
     * Mark a notification as read
     * @param {string} notificationId
     * @param {string} userEmail (optional, for local storage fallback)
     * @returns Promise<void>
     */
    markNotificationAsRead: async (notificationId, userEmail = null) => {
        if (db) {
            try {
                await db.collection(DB.COLLECTION_NOTIFICATIONS).doc(notificationId).update({ read: true });
            } catch (error) {
                console.error("Error marking notification as read: ", error);
                throw error;
            }
        } else {
            // LocalStorage fallback
            if (userEmail) {
                const key = 'user_notifications_' + userEmail.toLowerCase();
                const notifications = JSON.parse(localStorage.getItem(key) || '[]');
                const notification = notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.read = true;
                    localStorage.setItem(key, JSON.stringify(notifications));
                }
            } else {
                const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
                const notification = notifications.find(n => n.id === notificationId);
                if (notification) {
                    notification.read = true;
                    localStorage.setItem('admin_notifications', JSON.stringify(notifications));
                }
            }
        }
    },

    /**
     * Mark all notifications as read for a user
     * @param {string} userEmail
     * @returns Promise<void>
     */
    markAllUserNotificationsAsRead: async (userEmail) => {
        if (db) {
            try {
                const snapshot = await db.collection(DB.COLLECTION_NOTIFICATIONS)
                    .where('userEmail', '==', userEmail.toLowerCase())
                    .where('read', '==', false)
                    .get();
                
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, { read: true });
                    });
                    await batch.commit();
                }
            } catch (error) {
                console.error("Error marking all user notifications as read: ", error);
                throw error;
            }
        } else {
            const key = 'user_notifications_' + userEmail.toLowerCase();
            const notifications = JSON.parse(localStorage.getItem(key) || '[]');
            notifications.forEach(n => n.read = true);
            localStorage.setItem(key, JSON.stringify(notifications));
        }
    },

    /**
     * Mark all admin notifications as read
     * @returns Promise<void>
     */
    markAllAdminNotificationsAsRead: async () => {
        if (db) {
            try {
                const snapshot = await db.collection(DB.COLLECTION_NOTIFICATIONS)
                    .where('type', 'in', ['report', 'feedback'])
                    .where('read', '==', false)
                    .get();
                
                if (!snapshot.empty) {
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => {
                        batch.update(doc.ref, { read: true });
                    });
                    await batch.commit();
                }
            } catch (error) {
                console.error("Error marking all admin notifications as read: ", error);
                throw error;
            }
        } else {
            const notifications = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
            notifications.forEach(n => n.read = true);
            localStorage.setItem('admin_notifications', JSON.stringify(notifications));
        }
    },

    // --- Staff Data ---

    /**
     * Get staff data master list
     * @returns Promise<Object>
     */
    getStaffData: async () => {
        if (typeof db !== 'undefined' && db) {
            try {
                const doc = await db.collection(DB.COLLECTION_STAFF).doc('master').get();
                if (doc.exists) {
                    const data = doc.data().data;
                    localStorage.setItem('medsafety_staff_db', JSON.stringify(data));
                    return data;
                }
            } catch (error) {
                console.warn("Firestore error for staff data. Falling back to local storage.", error);
            }
        }
        
        // Fallback
        const localData = localStorage.getItem('medsafety_staff_db');
        if (localData) return JSON.parse(localData);
        if (typeof STAFF_DATA !== 'undefined') return JSON.parse(JSON.stringify(STAFF_DATA)); // Fallback to hardcoded JS
        return {};
    },

    /**
     * Save staff data master list
     * @param {Object} staffData 
     * @returns Promise<void>
     */
    saveStaffData: async (staffData) => {
        if (typeof db !== 'undefined' && db) {
            try {
                await db.collection(DB.COLLECTION_STAFF).doc('master').set({ data: staffData });
            } catch (error) {
                console.error("Error saving staff data to Firestore:", error);
                // We don't throw here to ensure local storage still updates even if offline
            }
        }
        
        // Always sync to local storage
        localStorage.setItem('medsafety_staff_db', JSON.stringify(staffData));
        window.STAFF_DATA = staffData;
    }
};

// Initialize Global Staff Data on Application Load
document.addEventListener('DOMContentLoaded', () => {
    const fetchInitialData = async () => {
        if (typeof DB !== 'undefined') {
            try {
                window.STAFF_DATA = await DB.getStaffData();
                // If we are on the admin page, refresh the staff list dynamically after fetch completes
                if (typeof AdminApp !== 'undefined' && AdminApp.renderStaffList) {
                    AdminApp.renderStaffList();
                }
            } catch(e) {
                console.error("Failed to fetch initial staff data", e);
            }
        }
    };

    if (typeof firebase !== 'undefined' && firebase.auth) {
        // Wait for Firebase Auth state to resolve before fetching to ensure we send the auth token
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            fetchInitialData();
            unsubscribe(); // Run only once
        });
        
        // Failsafe timeout in case auth state takes too long or fails
        setTimeout(() => {
            if (!window.STAFF_DATA) {
                fetchInitialData();
            }
        }, 2000);
    } else {
        // Fallback for purely local execution without Firebase
        setTimeout(fetchInitialData, 300);
    }
});
