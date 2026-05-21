import React from 'react';

/**
 * RouteErrorBoundary
 *
 * A lightweight React class-based Error Boundary for lazy-loaded routes.
 * Catches chunk-load failures (e.g. network error loading a split JS chunk)
 * and renders a user-friendly retry UI instead of crashing the whole app.
 *
 * Used as a wrapper around each <Suspense> boundary in UserRoutes.jsx.
 */
class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, isChunkError: false };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    // Detect dynamic chunk load failures specifically
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch dynamically imported module') ||
      error?.message?.includes('Unable to preload CSS');

    return { hasError: true, isChunkError };
  }

  componentDidCatch(error, info) {
    console.error('[RouteErrorBoundary] Route failed to load:', error, info);
  }

  handleRetry() {
    this.setState({ hasError: false, isChunkError: false });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          padding: '2rem',
          textAlign: 'center',
          color: '#555',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          <p style={{ fontSize: '1rem', marginBottom: '1rem', color: '#666' }}>
            {this.state.isChunkError
              ? 'Failed to load page. Check your connection and try again.'
              : 'Something went wrong loading this page.'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '8px',
              border: 'none',
              background: '#f5565c',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RouteErrorBoundary;
