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

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    // loading stays true until Firebase has confirmed auth state on this app launch.
    // This is the gate that prevents ProtectedRoute from redirecting to /login before
    // the persisted session has been restored.
    const [loading, setLoading] = useState(true);
    const [customerProfile, setCustomerProfile] = useState(null);
    const nativeGoogleLoginRef = useRef({ resolve: null, reject: null });

    // ─── Auth Actions ────────────────────────────────────────────────────────────

    const registerWithEmail = (email, password) =>
        createUserWithEmailAndPassword(auth, email, password);

    const loginWithEmail = (email, password) =>
        signInWithEmailAndPassword(auth, email, password);

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

        // Web / desktop browser — use popup
        return signInWithPopup(auth, googleProvider);
    };

    // ─── THE ONLY place that clears the session ──────────────────────────────────
    // No other part of the code should call localStorage.removeItem('token') or
    // signOut(auth). Doing so would cause spurious logouts.
    const logout = async () => {
        try {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            _pushTokenToNativeBridge('');
            await signOut(auth);
        } catch (error) {
            console.error('[Auth] Logout error:', error);
        }
    };

    // ─── Native Bridge Helper ────────────────────────────────────────────────────
    const _pushTokenToNativeBridge = (token) => {
        const bridge =
            typeof window !== 'undefined' &&
            (window.AndroidAuth?.saveAuthToken || window.Android?.saveAuthToken);
        if (!bridge) return;
        try {
            bridge.call(window.AndroidAuth || window.Android, token ?? '');
        } catch (err) {
            console.warn('[Auth] Failed to push token to native bridge:', err);
        }
    };

    // ─── Auth State Listener ─────────────────────────────────────────────────────
    useEffect(() => {
        // Register native Google sign-in callbacks
        if (typeof window !== 'undefined') {
            window.onNativeGoogleLoginSuccess = async (idToken) => {
                try {
                    if (!idToken || typeof idToken !== 'string') {
                        throw new Error('Google authentication token was not returned.');
                    }
                    console.log('[Auth] Native Google ID token received');
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
                nativeGoogleLoginRef.current.reject?.(
                    new Error(getGoogleSignInErrorMessage(message || 'Native Google login failed'))
                );
                nativeGoogleLoginRef.current.resolve = null;
                nativeGoogleLoginRef.current.reject = null;
            };
        }

        // Firebase calls this listener immediately on mount:
        //   • With the persisted FirebaseUser if LOCAL persistence has a stored session
        //   • With null if no session exists
        // We MUST NOT touch loading until this first call resolves.
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);

            if (currentUser) {
                try {
                    // forceRefresh=false → uses Firebase's internal 1-hour token cache.
                    // No extra network round-trip; still guarantees a valid token is stored.
                    const token = await currentUser.getIdToken(false);
                    localStorage.setItem('token', token);
                    localStorage.setItem('user', JSON.stringify({
                        uid: currentUser.uid,
                        email: currentUser.email,
                        displayName: currentUser.displayName
                    }));
                    _pushTokenToNativeBridge(token);

                    // Background sync with backend — does NOT block the auth gate
                    api.post('/auth/sync', {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).then(response => {
                        if (response.success && response.data) {
                            setCustomerProfile(response.data);
                        }
                    }).catch(error => {
                        console.error('[Auth] Failed to sync customer profile with backend:', error);
                        setCustomerProfile(null);
                    });

                } catch (tokenError) {
                    // Token is unrecoverable (revoked / network issue). Graceful signed-out state.
                    console.error('[Auth] Cannot obtain ID token — forcing sign-out:', tokenError);
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    _pushTokenToNativeBridge('');
                    await signOut(auth);
                    // setLoading(false) will be called by the next onAuthStateChanged emission (null)
                    return;
                }
            } else {
                // Signed-out state — clear any stale storage. This also runs after logout().
                setCustomerProfile(null);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                _pushTokenToNativeBridge('');
            }

            // Auth check complete — unblock the route rendering
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
