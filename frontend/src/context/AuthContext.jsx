import { createContext, useEffect, useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Sign up
    const registerWithEmail = (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    // Login
    const loginWithEmail = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user) {
            const token = await result.user.getIdToken();
            localStorage.setItem('token', token);
        }
        return result;
    };

    // Login with Google
    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
            const token = await result.user.getIdToken();
            localStorage.setItem('token', token);
        }
        return result;
    };

    // Logout
    const logout = () => {
        return signOut(auth);
    };

    const [customerProfile, setCustomerProfile] = useState(null);

    // Subscribe to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Save token on auth state change
                const token = await currentUser.getIdToken();
                localStorage.setItem('token', token);

                // Background sync - do not await
                api.post('/auth/sync', {}, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }).then(response => {
                    if (response.success && response.data) {
                        setCustomerProfile(response.data);
                    }
                }).catch(error => {
                    console.error('Failed to sync customer profile with backend:', error);
                    setCustomerProfile(null);
                });

                localStorage.setItem('user', JSON.stringify({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName
                }));
            } else {
                setCustomerProfile(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const value = {
        user,
        customerProfile,
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
