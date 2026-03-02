/**
 * Auth Service
 * Handles user authentication using localStorage
 */

const AUTH_KEY = 'medsafety_user';
const USERS_KEY = 'medsafety_users_db';

const AuthService = {
    // Base path for redirects
    basePath: '',

    setBasePath: (path) => {
        AuthService.basePath = path;
    },

    // Helper to safely construct absolute URLs
    getAbsoluteUrl: (relativePath) => {
        // If it's already absolute
        if (relativePath.startsWith('http')) return relativePath;

        let origin = window.location.origin;
        // Some older iOS webviews might not support window.location.origin
        if (!origin) origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');

        let pathArray = window.location.pathname.split('/');
        pathArray.pop(); // Remove current file

        // If basePath is provided (like '../') apply it
        let parts = (AuthService.basePath + relativePath).split('/');

        for (let part of parts) {
            if (part === '') continue;
            if (part === '.') continue;
            if (part === '..') {
                pathArray.pop();
            } else {
                pathArray.push(part);
            }
        }

        return origin + pathArray.join('/') + window.location.search;
    },

    // Register a new user
    register: async (userData) => {
        if (typeof auth !== 'undefined' && auth) {
            // Firebase Auth Mode
            try {
                const userCredential = await auth.createUserWithEmailAndPassword(userData.email, userData.password);
                const user = userCredential.user;

                const newUser = {
                    id: user.uid,
                    ...userData,
                    approved: userData.role === 'admin',
                    createdAt: new Date().toISOString()
                };
                delete newUser.password; // Don't save password

                // Save user details to Firestore
                if (db) await db.collection('users').doc(user.uid).set(newUser);

                // Keep LocalStorage in sync for UI
                localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
                return { success: true, user: newUser };
            } catch (error) {
                return { success: false, message: error.message };
            }
        } else {
            // ... (Original LocalStorage Logic) ...
            const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            if (users.find(u => u.email === userData.email)) {
                return { success: false, message: 'Email already registered' };
            }
            const hashedPassword = await Security.hashPassword(userData.password);
            const newUser = {
                id: Date.now().toString(),
                ...userData,
                password: hashedPassword,
                approved: userData.role === 'admin',
                createdAt: new Date().toISOString()
            };
            users.push(newUser);
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
            const { password, ...userWithoutPass } = newUser;
            localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
            return { success: true, user: newUser };
        }
    },

    // Login user
    login: async (email, passwordInput) => {
        if (typeof auth !== 'undefined' && auth) {
            // Firebase Auth Mode
            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, passwordInput);
                const user = userCredential.user;

                // Fetch user details from Firestore
                let userDetails = {};
                if (db) {
                    const doc = await db.collection('users').doc(user.uid).get();
                    if (doc.exists) userDetails = doc.data();
                }

                const mergedUser = { ...userDetails, email: user.email, id: user.uid };

                if (!mergedUser.approved && mergedUser.role !== 'admin') {
                    // Sign out because they shouldn't actually be logged in
                    await auth.signOut();
                    return { success: false, message: 'Your account is pending admin approval.' };
                }

                localStorage.setItem(AUTH_KEY, JSON.stringify(mergedUser));
                return { success: true, user: mergedUser };
            } catch (error) {
                return { success: false, message: error.message };
            }
        } else {
            // ... (Original LocalStorage Logic) ...
            const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const user = users.find(u => u.email === email);

            if (user) {
                let isValid = false;
                const inputHash = await Security.hashPassword(passwordInput);
                if (user.password === inputHash) isValid = true;
                else if (user.password === passwordInput) {
                    isValid = true;
                    user.password = inputHash;
                    localStorage.setItem(USERS_KEY, JSON.stringify(users));
                }

                if (isValid) {
                    if (!user.approved && user.role !== 'admin') {
                        return { success: false, message: 'Your account is pending admin approval.' };
                    }

                    const { password, ...userWithoutPass } = user;
                    localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
                    return { success: true, user: userWithoutPass };
                }
            }
            return { success: false, message: 'Invalid email or password' };
        }
    },

    // Logout user
    logout: () => {
        if (typeof auth !== 'undefined' && auth) auth.signOut();
        try {
            localStorage.removeItem(AUTH_KEY);
        } catch (e) {
            console.error('LocalStorage error during logout:', e);
        }
        window.location.replace(AuthService.getAbsoluteUrl('login.html'));
    },

    // Get current user (Sync - relies on localStorage cache)
    getCurrentUser: () => {
        try {
            const userStr = localStorage.getItem(AUTH_KEY);
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('LocalStorage error in getCurrentUser:', e);
            return null;
        }
    },

    // Check if authenticated
    isAuthenticated: () => {
        try {
            return !!localStorage.getItem(AUTH_KEY);
        } catch (e) {
            console.error('LocalStorage error in isAuthenticated:', e);
            return false;
        }
    },

    // Route guard
    requireAuth: (loginPath) => {
        if (!AuthService.isAuthenticated()) {
            const path = loginPath || 'login.html';
            const absUrl = AuthService.getAbsoluteUrl(path);
            if (window.location.href !== absUrl) {
                window.location.replace(absUrl);
            }
        }
    },

    // Redirect if already logged in
    redirectIfAuthenticated: () => {
        const user = AuthService.getCurrentUser();
        if (user) {
            const targetPath = user.role === 'admin' ? 'admin/index.html' : 'dashboard.html';
            const absUrl = AuthService.getAbsoluteUrl(targetPath);
            if (window.location.href !== absUrl) {
                window.location.replace(absUrl);
            }
        }
    },

    // Get count of admins
    getAdminCount: async () => {
        if (typeof DB !== 'undefined' && DB.getAllUsers) {
            const users = await DB.getAllUsers();
            return users.filter(user => user.role === 'admin').length;
        } else {
            // Fallback
            const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            return users.filter(user => user.role === 'admin').length;
        }
    },

    // Check if admin registration is allowed (max 3 admins)
    canRegisterAdmin: async () => {
        const count = await AuthService.getAdminCount();
        return count < 3;
    }
};

// Expose to window
window.AuthService = AuthService;
