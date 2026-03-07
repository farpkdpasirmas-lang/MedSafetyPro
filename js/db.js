/**
 * Database Service
 * Abstraction layer for data storage (Firebase Firestore OR LocalStorage)
 */

const DB = {
    // Collection Names
    COLLECTION_REPORTS: 'reports', // Restored name to pull primary 500 reports
    COLLECTION_USERS: 'users_v2',

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
                return reportData;
            } catch (error) {
                console.error("Error writing document: ", error);
                throw error;
            }
        } else {
            // LocalStorage Mode
            const reports = JSON.parse(localStorage.getItem('medsafety_reports_db') || '[]');
            reports.push(reportData);
            localStorage.setItem('medsafety_reports_db', JSON.stringify(reports));
            return reportData;
        }
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
                console.error("Error listening to reports: ", error);
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
                const snapshot = await db.collection('users').get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.error("Error getting users: ", error);
                throw error;
            }
        } else {
            return JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
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
                await db.collection('users').doc(userId).delete();
            } catch (error) {
                console.error("Error deleting user: ", error);
                throw error;
            }
        } else {
            const users = JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
            const newUsers = users.filter(u => u.id !== userId);
            localStorage.setItem('medsafety_users_db', JSON.stringify(newUsers));
        }
    },

    /**
     * Approve a user
     * @param {string} userId 
     * @returns Promise<void>
     */
    approveUser: async (userId) => {
        if (db) {
            try {
                await db.collection('users').doc(userId).update({ approved: true });
            } catch (error) {
                console.error("Error approving user: ", error);
                throw error;
            }
        } else {
            const users = JSON.parse(localStorage.getItem('medsafety_users_db') || '[]');
            const index = users.findIndex(u => u.id === userId);
            if (index !== -1) {
                users[index].approved = true;
                localStorage.setItem('medsafety_users_db', JSON.stringify(users));
            }
        }
    }
};
