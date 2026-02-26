/**
 * Firebase Configuration
 * PASTE YOUR FIREBASE CONFIG KEYS HERE
 * Get them from: https://console.firebase.google.com/
 */

const firebaseConfig = {
    apiKey: "AIzaSyAFn195fBVfpwlKNAirr12l7dpey3GQSHA",
    authDomain: "med-safety-pro.firebaseapp.com",
    projectId: "med-safety-pro",
    storageBucket: "med-safety-pro.firebasestorage.app",
    messagingSenderId: "1013374830917",
    appId: "1:1013374830917:web:a0291eedb25a8c2418962c",
    measurementId: "G-D4R3XDRNX6"
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
