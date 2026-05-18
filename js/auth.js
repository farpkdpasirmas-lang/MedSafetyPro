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
                if (db) {
                    try {
                        const collectionName = typeof DB !== 'undefined' ? DB.COLLECTION_USERS : 'users_v2';
                        await db.collection(collectionName).doc(user.uid).set(newUser);
                    } catch (dbErr) {
                        console.warn("Could not save to Firestore (likely permission denied), continuing registration locally.", dbErr);
                        try {
                            const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                            const existsIndex = localUsers.findIndex(u => u.email === newUser.email);
                            if (existsIndex >= 0) {
                                localUsers[existsIndex] = newUser;
                            } else {
                                localUsers.push(newUser);
                            }
                            localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
                        } catch (e) {}
                    }
                }

                // Keep LocalStorage in sync for UI (Only if admin, as they are pre-approved)
                if (newUser.approved) {
                    localStorage.setItem(AUTH_KEY, JSON.stringify(newUser));
                }
                return { success: true, user: newUser };
            } catch (error) {
                // If it's an admin registration and the email is already in use, upgrade the user
                if (error.code === 'auth/email-already-in-use' && userData.role === 'admin') {
                    let userCredential;
                    try {
                        // We need to sign in to get the UID, or we could use a Cloud Function.
                        // Since we just have client-side JS here, we ask them to log in, but we can try 
                        // to authenticate them with the provided password.
                        userCredential = await auth.signInWithEmailAndPassword(userData.email, userData.password);
                    } catch (signInErr) {
                        return {
                            success: false,
                            message: 'Email exists, but the password provided was incorrect. Please use the same password you registered with to upgrade this account to admin.'
                        };
                    }

                    const user = userCredential.user;

                    const updatedData = {
                        role: 'admin',
                        approved: true,
                        fullname: userData.fullname // update name if changed
                    };

                    if (db) {
                        const collectionName = typeof DB !== 'undefined' ? DB.COLLECTION_USERS : 'users_v2';
                        try {
                            await db.collection(collectionName).doc(user.uid).update(updatedData);
                        } catch (dbErr) {
                            console.warn("Could not push update to Firestore (likely permission denied), continuing locally.", dbErr);
                        }
                        
                        let mergedUser = { ...updatedData, email: user.email, id: user.uid };
                        try {
                            const doc = await db.collection(collectionName).doc(user.uid).get();
                            if (doc.exists) {
                                mergedUser = { ...doc.data(), ...mergedUser };
                            }
                        } catch (dbErr) {
                            console.warn("Could not fetch from Firestore, continuing with local data.", dbErr);
                        }
                        
                        try {
                            const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                            const existsIndex = localUsers.findIndex(u => u.email === mergedUser.email);
                            if (existsIndex >= 0) {
                                localUsers[existsIndex] = mergedUser;
                            } else {
                                localUsers.push(mergedUser);
                            }
                            localStorage.setItem(USERS_KEY, JSON.stringify(localUsers));
                        } catch (e) {}
                        
                        localStorage.setItem(AUTH_KEY, JSON.stringify(mergedUser));
                        return { success: true, user: mergedUser, message: 'Existing user upgraded to Admin.' };
                    }
                    // Catch block handled above
                }
                return { success: false, message: error.message };
            }
        } else {
            // ... (Original LocalStorage Logic) ...
            const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
            const existingUserIndex = users.findIndex(u => u.email === userData.email);

            if (existingUserIndex !== -1) {
                if (userData.role === 'admin') {
                    // Try to authenticate them before upgrading
                    const inputHash = await Security.hashPassword(userData.password);
                    const existingUser = users[existingUserIndex];

                    if (existingUser.password === inputHash || existingUser.password === userData.password) {
                        existingUser.role = 'admin';
                        existingUser.approved = true;
                        existingUser.fullname = userData.fullname;

                        // Update hash if they used plain text unexpectedly
                        if (existingUser.password === userData.password) {
                            existingUser.password = inputHash;
                        }

                        users[existingUserIndex] = existingUser;
                        localStorage.setItem(USERS_KEY, JSON.stringify(users));

                        const { password, ...userWithoutPass } = existingUser;
                        localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
                        return { success: true, user: userWithoutPass, message: 'Existing user upgraded to Admin.' };
                    } else {
                        return {
                            success: false,
                            message: 'Email exists, but the password provided was incorrect. Please use the original password to upgrade.'
                        };
                    }
                }
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

            // Only auto-login if they are pre-approved (admins)
            if (newUser.approved) {
                localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
            }

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
                    let docExists = false;
                    try {
                        const collectionName = typeof DB !== 'undefined' ? DB.COLLECTION_USERS : 'users_v2';
                        const doc = await db.collection(collectionName).doc(user.uid).get();
                        if (doc.exists) {
                            userDetails = doc.data();
                            docExists = true;
                        }
                    } catch (dbErr) {
                        console.warn("Could not fetch user details from Firestore, continuing with limited data.", dbErr);
                    }
                    
                    if (!docExists) {
                        try {
                            const localUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                            const localUser = localUsers.find(u => u.email === user.email);
                            if (localUser) {
                                userDetails = { ...localUser };
                            }
                        } catch (e) {}
                    }
                }

                const mergedUser = { ...userDetails, email: user.email, id: user.uid };

                /* TEMPORARILY DISABLED: Allow all users to log in without approval
                if (!mergedUser.approved && mergedUser.role !== 'admin') {
                    // Sign out because they shouldn't actually be logged in
                    await auth.signOut();
                    return { success: false, message: 'Your account is pending admin approval.' };
                }
                */

                localStorage.setItem(AUTH_KEY, JSON.stringify(mergedUser));
                return { success: true, user: mergedUser };
            } catch (error) {
                // If Firebase Auth fails, gracefully fallback to checking local storage (for legacy or imported accounts)
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    try {
                        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
                        const localUser = users.find(u => u.email === email);
                        
                        if (localUser) {
                            let isValid = false;
                            const inputHash = await Security.hashPassword(passwordInput);
                            if (localUser.password === inputHash) isValid = true;
                            else if (localUser.password === passwordInput) {
                                isValid = true;
                                localUser.password = inputHash;
                                localStorage.setItem(USERS_KEY, JSON.stringify(users));
                            }
                            
                            if (isValid) {
                                /* TEMPORARILY DISABLED
                                if (!localUser.approved && localUser.role !== 'admin') {
                                    return { success: false, message: 'Your account is pending admin approval.' };
                                }
                                */
                                const { password, ...userWithoutPass } = localUser;
                                localStorage.setItem(AUTH_KEY, JSON.stringify(userWithoutPass));
                                return { success: true, user: userWithoutPass };
                            }
                        }
                    } catch (fallbackErr) {}
                    
                    return { success: false, message: "Incorrect email or password. Please try again." };
                }
                
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
                    /* TEMPORARILY DISABLED
                    if (!user.approved && user.role !== 'admin') {
                        return { success: false, message: 'Your account is pending admin approval.' };
                    }
                    */

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
        window.location.replace(AuthService.basePath + 'login.html');
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
            const loc = window.location.pathname;
            const targetPath = loginPath || 'login.html';

            // Check if we are already on the login page to prevent loop
            if (!loc.endsWith('login.html')) {
                window.location.replace(AuthService.basePath + targetPath);
            }
        }
    },

    // Redirect if already logged in
    redirectIfAuthenticated: () => {
        const user = AuthService.getCurrentUser();
        if (user) {
            const loc = window.location.pathname;
            const targetPath = user.role === 'admin' ? 'admin/index.html' : 'dashboard.html';

            // Check if we are already on the target page
            if (!loc.endsWith(targetPath) && (!loc.endsWith('admin/') || user.role !== 'admin')) {
                window.location.replace(AuthService.basePath + targetPath);
            }
        }
    },

    // Get count of admins
    getAdminCount: async () => {
        if (typeof DB !== 'undefined' && DB.getAllUsers) {
            try {
                const users = await DB.getAllUsers();
                return users.filter(user => user.role === 'admin').length;
            } catch (error) {
                if (error.code !== 'permission-denied') {
                    console.warn("Could not get users to count admins.", error);
                } else {
                    console.info("Count admins fallback triggered due to expected permissions check.");
                }
                return 0; // Return 0 to allow registration to proceed
            }
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
