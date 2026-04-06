import React from 'react';
import './SuspenseFallback.css';

/**
 * Lightweight Suspense Fallback Component
 * Shows minimal loading indication while code chunks load
 * Helps with perceived performance during code splitting
 */
export const SuspenseFallback = () => {
  return (
    <div className="suspense-fallback">
      <div className="spinner-minimal"></div>
      <p className="loading-text">Loading...</p>
    </div>
  );
};

/**
 * Fallback for specific features
 * Used when loading feature-specific code chunks
 */
export const FeatureSuspense = ({ featureName = 'Feature' }) => {
  return (
    <div className="suspense-fallback suspense-feature">
      <div className="spinner-small"></div>
      <p className="loading-text">{featureName} loading...</p>
    </div>
  );
};

export default SuspenseFallback;
