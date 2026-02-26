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
    }
};
