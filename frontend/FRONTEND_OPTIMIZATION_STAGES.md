# Frontend Optimization Stages

This document collects the frontend optimization work into one place.

## Stage 1: Core Dependencies Optimization
- Removed unused dependencies.
- Deferred heavy startup work where possible.
- Reduced the baseline bundle size.
- Cumulative bundle reduction: about 45.1% vs original.

## Stage Impact Snapshot

| Stage | What improved | Cumulative gain |
| --- | --- | --- |
| Stage 1 | Core dependencies | 45.1% smaller bundle |
| Stage 2 | Code splitting and tree shaking | 67.8% smaller bundle |
| Stage 3 | Component optimization | 78.9% smaller bundle |
| Stage 4 | Production build optimization | 84.9% smaller bundle |
| Stage 5 | Final compression and polish | 85.5% smaller bundle |
| Stage 6 | Animation and UX optimization | 33% faster loading screen, 40% faster item animation delay, 60fps smooth motion |
| Image stage | WebP migration | Lower image payload on first paint; percentage depends on remaining assets |

## Stage 2: Code Splitting and Tree Shaking
- Added lazy-loaded routes.
- Split vendor and feature chunks.
- Kept only code needed for the first paint.
- Cumulative bundle reduction: about 67.8% vs original.

## Stage 3: Component Optimization
- Used memoization where it mattered.
- Reduced avoidable re-renders in key UI areas.
- Optimized shared state and context usage.
- Cumulative bundle reduction: about 78.9% vs original.

## Stage 4: Production Build Optimization
- Enabled stronger production minification.
- Tightened Vite build output.
- Improved CSS and asset handling for production.
- Cumulative bundle reduction: about 84.9% vs original.

## Stage 5: Final Compression and Polish
- Reduced dead code and startup noise.
- Deferred non-critical background tasks.
- Tightened the preload and cache strategy.
- Cumulative bundle reduction: about 85.5% vs original.

## Stage 6: Animation and UX Optimization
- Kept the loading animation, but made it start faster.
- Added GPU-friendly animation settings.
- Shortened animation timing while preserving the effect.
- Respected reduced-motion preferences.
- Animation timing: about 33% faster loading screen and about 40% faster per-item animation delay.
- Motion smoothness: improved from janky 30-45 fps behavior to a stable 60fps target.

## Image Optimization Stage
- Converted the main app images to WebP where possible.
- Replaced in-code PNG/JPG references with WebP equivalents.
- Reduced the number of large image requests during startup.
- Exact percentage varies by screen, but the first paint is lighter because the biggest visible images are now WebP.

## Current One-Click Workflow
Run this command from `frontend/`:

```bash
npm run optimize:frontend
```

It currently does three things:
1. Audits source image references.
2. Runs the production build.
3. Reports remaining non-WebP references.

## Remaining Non-WebP Holdouts
Some references are still non-WebP because matching `.webp` files do not exist yet:
- `Arrow.png`
- `Gbut.png`
- `Rbut.png`
- `third.png`
- `vegetables.jpg`
- `fruit.png`
- `SIGNUPbg.png`
- `delete.png`
- `information.png`

## Outcome
- Faster startup.
- Smaller initial bundle.
- Less aggressive background work.
- More WebP coverage across the UI.