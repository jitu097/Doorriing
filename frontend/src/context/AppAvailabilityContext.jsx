/**
 * AppAvailabilityContext.jsx
 *
 * Polls the backend availability endpoint every 30 seconds.
 * Provides global isOpen / reason / blockedBy to the entire User App.
 *
 * ─── Architecture ────────────────────────────────────────────────────
 *   Layer 1 (UX guard)  ← This file — disables Add-to-Cart, shows banner
 *   Layer 3 (DB guard)  ← PostgreSQL BEFORE INSERT trigger on `orders`
 *                          (cannot be bypassed — always the final safety net)
 * ─────────────────────────────────────────────────────────────────────
 *
 * Usage anywhere in the app:
 *   import { useAppAvailability } from '../context/AppAvailabilityContext';
 *   const { isOpen, isLoading, reason, blockedBy } = useAppAvailability();
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
// Resolves at build time from VITE_API_BASE_URL env var.
// Falls back to the correct prod/dev URL when the var is not set.
const _base = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const AVAILABILITY_API_URL = _base
  ? `${_base}/platform/availability`
  : import.meta.env.MODE === 'production'
    ? 'https://doorriing.onrender.com/api/platform/availability'
    : 'http://localhost:5002/api/platform/availability';

console.log('[AppAvailability] Polling URL:', AVAILABILITY_API_URL);

/** Re-poll every 30 seconds so the UI reflects admin toggle changes quickly */
const POLL_INTERVAL_MS = 30_000;

// ─── Context ──────────────────────────────────────────────────────────────────
const AppAvailabilityContext = createContext({
  isOpen:    true,
  isLoading: true,
  reason:    null,
  blockedBy: null,
  settings:  null,
  error:     null,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AppAvailabilityProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen:    true,   // optimistic default — assume open until first fetch
    isLoading: true,
    reason:    null,
    blockedBy: null,
    settings:  null,
    error:     null,
  });

  // Single ref that tracks whether this provider instance is still alive.
  // We re-set it to true at the start of each effect run so React StrictMode's
  // double-invoke cycle doesn't leave it permanently false.
  const mountedRef = useRef(false);

  useEffect(() => {
    // Mark as mounted FIRST — critical for StrictMode correctness.
    mountedRef.current = true;

    let intervalId = null;

    const fetchAvailability = async (signal) => {
      try {
        console.log('[AppAvailability] Fetching:', AVAILABILITY_API_URL);
        const res = await fetch(AVAILABILITY_API_URL, {
          signal,
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        if (!json?.success || !json?.data) {
          throw new Error('Unexpected response format from availability API');
        }

        const d = json.data;

        // Only update state if this effect instance is still alive
        if (mountedRef.current) {
          setState({
            isOpen:    d.isCurrentlyOpen ?? true,
            isLoading: false,
            reason:    d.closedReason   ?? null,
            blockedBy: d.blockedBy      ?? null,
            settings:  d,
            error:     null,
          });
          console.log('[AppAvailability] ✅ isOpen:', d.isCurrentlyOpen ?? true);
        }
      } catch (err) {
        if (err.name === 'AbortError') return; // Normal cleanup — ignore silently

        console.warn('[AppAvailability] Poll failed — keeping last known state:', err.message);

        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: err.message,
            // Fail-open: a network blip should never block ordering.
            isOpen: prev.isOpen ?? true,
          }));
        }
      }
    };

    // Each poll cycle gets its own AbortController so cleanup cancels only
    // the currently in-flight request — not the next one.
    let currentAbort = new AbortController();
    fetchAvailability(currentAbort.signal);

    intervalId = setInterval(() => {
      currentAbort.abort();           // Cancel the previous in-flight request
      currentAbort = new AbortController();
      fetchAvailability(currentAbort.signal);
    }, POLL_INTERVAL_MS);

    return () => {
      // Cleanup: mark unmounted and cancel any in-flight request
      mountedRef.current = false;
      clearInterval(intervalId);
      currentAbort.abort();
    };
  }, []); // Empty deps — runs once per actual mount lifecycle

  return (
    <AppAvailabilityContext.Provider value={state}>
      {children}
    </AppAvailabilityContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAppAvailability = () => useContext(AppAvailabilityContext);

export default AppAvailabilityContext;
