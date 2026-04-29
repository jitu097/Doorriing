import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// CRITICAL: Set LOCAL persistence at startup so the Firebase session survives
// app kills, phone restarts, and WebView recreation. This must run before any
// auth operation — setting it only inside login handlers is NOT sufficient
// because onAuthStateChanged fires before the login handler runs on restart.
setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.error("[Auth] Failed to set local persistence:", err);
});
