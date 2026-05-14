import React from 'react';
import './ItemCardSkeleton.css';

/**
 * Skeleton loader for item cards - shows while data is loading
 * Improves perceived performance
 */
const ItemCardSkeleton = () => {
  return (
    <div className="item-card-skeleton">
      <div className="skeleton-image"></div>
      <div className="skeleton-content">
        <div className="skeleton-line skeleton-name"></div>
        <div className="skeleton-line skeleton-subtitle"></div>
        <div className="skeleton-line skeleton-price"></div>
      </div>
    </div>
  );
};

export const ItemCardSkeletonGrid = ({ count = 6 }) => (
  <div className="items-grid">
    {Array.from({ length: count }).map((_, i) => (
      <ItemCardSkeleton key={i} />
    ))}
  </div>
);

export default ItemCardSkeleton;
