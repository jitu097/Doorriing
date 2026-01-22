import { createContext, useEffect, useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up
    const registerWithEmail = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    // Login
    const loginWithEmail = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    // Login with Google
    const loginWithGoogle = () => {
        return signInWithPopup(auth, googleProvider);
    };

    // Logout
    const logout = () => {
        return signOut(auth);
    };

    // Subscribe to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);

            // Optional: Sync with local storage if needed for other non-auth logic, 
            // but Firebase handles session persistence automatically.
            if (currentUser) {
                localStorage.setItem('user', JSON.stringify({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName
                }));
                // Note: Managing tokens manually is usually not needed with Firebase SDK unless for backend calls
                // currentUser.getIdToken().then(token => localStorage.setItem('token', token));
            } else {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        loading,
        registerWithEmail,
        loginWithEmail,
        loginWithGoogle,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
