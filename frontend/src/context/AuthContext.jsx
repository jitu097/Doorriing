import { createContext, useEffect, useRef, useState } from 'react';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithCredential,
    signInWithPopup
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import api from '../services/api';
import { getGoogleSignInErrorMessage } from '../utils/authErrors';
import {
    attachForegroundNotificationListener,
    registerWebPushToken,
} from '../services/pushNotification.service';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const nativeGoogleLoginRef = useRef({ resolve: null, reject: null });

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
        const nativeBridge =
            typeof window !== 'undefined' &&
            (window.AndroidAuth?.startGoogleSignIn || window.Android?.startGoogleSignIn);

        if (nativeBridge) {
            return new Promise((resolve, reject) => {
                nativeGoogleLoginRef.current.resolve = resolve;
                nativeGoogleLoginRef.current.reject = reject;
                try {
                    nativeBridge.call(window.AndroidAuth || window.Android);
                } catch (error) {
                    nativeGoogleLoginRef.current.resolve = null;
                    nativeGoogleLoginRef.current.reject = null;
                    reject(error);
                }
            });
        }

        // Web/desktop browser → use popup
        return signInWithPopup(auth, googleProvider);
    };

    // Logout
    const logout = () => {
        return signOut(auth);
    };

    const [customerProfile, setCustomerProfile] = useState(null);

    // Subscribe to auth state changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.onNativeGoogleLoginSuccess = async (idToken) => {
                try {
                    if (!idToken || typeof idToken !== 'string') {
                        throw new Error('Google authentication token was not returned.');
                    }

                    console.log('Google ID token:', idToken);

                    const credential = GoogleAuthProvider.credential(idToken, null);
                    await signInWithCredential(auth, credential);
                    nativeGoogleLoginRef.current.resolve?.();
                } catch (error) {
                    nativeGoogleLoginRef.current.reject?.(error);
                } finally {
                    nativeGoogleLoginRef.current.resolve = null;
                    nativeGoogleLoginRef.current.reject = null;
                }
            };

            window.onNativeGoogleLoginError = (message) => {
                nativeGoogleLoginRef.current.reject?.(new Error(getGoogleSignInErrorMessage(message || 'Native Google login failed')));
                nativeGoogleLoginRef.current.resolve = null;
                nativeGoogleLoginRef.current.reject = null;
            };
        }

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                // Save token on auth state change
                const token = await currentUser.getIdToken();
                localStorage.setItem('token', token);

                const nativeBridge =
                    typeof window !== 'undefined' &&
                    (window.AndroidAuth?.saveAuthToken || window.Android?.saveAuthToken);
                if (nativeBridge) {
                    try {
                        nativeBridge.call(window.AndroidAuth || window.Android, token);
                    } catch (bridgeError) {
                        console.warn('Failed to share auth token with native bridge', bridgeError);
                    }
                }

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

                registerWebPushToken().catch((error) => {
                    console.warn('Web push token registration failed', error);
                });

                attachForegroundNotificationListener().catch((error) => {
                    console.warn('Failed to attach foreground push listener', error);
                });
            } else {
                setCustomerProfile(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token');

                const nativeBridge =
                    typeof window !== 'undefined' &&
                    (window.AndroidAuth?.saveAuthToken || window.Android?.saveAuthToken);
                if (nativeBridge) {
                    try {
                        nativeBridge.call(window.AndroidAuth || window.Android, '');
                    } catch (bridgeError) {
                        console.warn('Failed to clear native auth token', bridgeError);
                    }
                }
            }

            setLoading(false);
        });

        return () => {
            unsubscribe();
            if (typeof window !== 'undefined') {
                delete window.onNativeGoogleLoginSuccess;
                delete window.onNativeGoogleLoginError;
            }
        };
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
            {children}
        </AuthContext.Provider>
    );
};
