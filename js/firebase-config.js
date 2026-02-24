/**
 * Firebase Configuration
 * PASTE YOUR FIREBASE CONFIG KEYS HERE
 * Get them from: https://console.firebase.google.com/
 */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize only if keys are replaced
let db = null;
let auth = null;

if (firebaseConfig.projectId !== "YOUR_PROJECT_ID") {
    // These scripts must be loaded in HTML:
    // <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore-compat.js"></script>
    // <script src="https://www.gstatic.com/firebasejs/10.7.1/firebase-auth-compat.js"></script>

    try {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
        console.log('Firebase initialized successfully');
    } catch (e) {
        console.error('Firebase initialization failed:', e);
    }
} else {
    console.warn('Firebase config not set. Using LocalStorage fallback.');
}
