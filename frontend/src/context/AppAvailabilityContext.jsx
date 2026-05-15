/**
 * AppAvailabilityContext.jsx
 *
 * Polls the Admin Panel's availability endpoint every 30 seconds.
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
  useCallback,
} from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
// Points at the Admin Panel backend — this is the single source of truth for
// global app availability (is_app_enabled toggle + delivery time window).
const AVAILABILITY_API_URL =
  'https://doorriing-delivery-3.onrender.com/api/platform/availability';

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

  const abortRef   = useRef(null);
  const intervalRef = useRef(null);
  const mountedRef  = useRef(true);

  const fetchAvailability = useCallback(async () => {
    // Cancel any in-flight request before starting a new one
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const res = await fetch(AVAILABILITY_API_URL, {
        signal:  abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        // No auth header — this is a public endpoint
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      // Guard: validate response shape
      if (!json?.success || !json?.data) {
        throw new Error('Unexpected response format from availability API');
      }

      const d = json.data;

      if (mountedRef.current) {
        setState({
          isOpen:    d.isCurrentlyOpen ?? true,
          isLoading: false,
          reason:    d.closedReason   ?? null,
          blockedBy: d.blockedBy      ?? null,
          settings:  d,
          error:     null,
        });
      }
    } catch (err) {
      // Ignore expected abort errors (fired by cleanup / re-fetch)
      if (err.name === 'AbortError') return;

      console.warn(
        '[AppAvailability] Poll failed — keeping last known state:', err.message
      );

      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message,
          // IMPORTANT: fail open on network errors.
          // A brief connectivity blip should never wrongly block orders.
          // The DB trigger is the authoritative safety net.
          isOpen: prev.isOpen ?? true,
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Initial fetch immediately on mount
    fetchAvailability();

    // Then poll every 30 s
    intervalRef.current = setInterval(fetchAvailability, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(intervalRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [fetchAvailability]);

  return (
    <AppAvailabilityContext.Provider value={state}>
      {children}
    </AppAvailabilityContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useAppAvailability = () => useContext(AppAvailabilityContext);

export default AppAvailabilityContext;
