/**
 * STAGE 5: Frontend Data Fetching Optimization
 * 
 * Features:
 * 5.2 - Request Deduplication: Multiple requests to same endpoint return same promise
 * 5.3 - Stale-While-Revalidate: Use cache immediately, update in background
 * 5.5 - Request Header Optimization: Smart caching headers, compression
 * 5.6 - Exponential Backoff: Retry failed requests with increasing delays
 */

import { auth } from '../config/firebase';
import { useQueryCache } from '../store/queryCache.store.js';

const PROD_API_BASE_URL = 'https://doorriing.onrender.com/api';
const DEV_API_BASE_URL = 'http://localhost:5002/api';
const DEFAULT_API_BASE_URL = import.meta.env.MODE === 'production'
	? PROD_API_BASE_URL
	: DEV_API_BASE_URL;

/**
 * 5.5 - Build URL with query params
 */
const buildUrl = (path, params) => {
	const normalizedBase = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
	const normalizedPath = path.startsWith('/') ? path : `/${path}`;
	const url = new URL(`${normalizedBase}${normalizedPath}`);

	if (params && typeof params === 'object') {
		Object.entries(params).forEach(([key, value]) => {
			if (value === undefined || value === null || value === '') {
				return;
			}
			url.searchParams.append(key, value);
		});
	}

	return url.toString();
};

/**
 * Format API errors consistently
 */
const formatError = async (response) => {
	try {
		const payload = await response.json();
		const message = payload?.message || response.statusText || 'Request failed';
		const error = new Error(message);
		error.status = response.status;
		error.payload = payload;
		return error;
	} catch (parseError) {
		const error = new Error(response.statusText || 'Request failed');
		error.status = response.status;
		return error;
	}
};

/**
 * 5.6 - Exponential Backoff Retry
 * Retries failed requests with increasing delays
 */
const retryWithBackoff = async (
	fn,
	maxRetries = 3,
	initialDelayMs = 1000,
	backoffMultiplier = 2
) => {
	let lastError;

	for (let attempt = 0; attempt < maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry on certain status codes
			if (error.status && [400, 401, 403, 404].includes(error.status)) {
				throw error;
			}

			// Don't retry on last attempt
			if (attempt === maxRetries - 1) {
				break;
			}

			// Calculate delay with exponential backoff
			const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt);
			// Add jitter to prevent thundering herd
			const jitter = Math.random() * delay * 0.1;
			const totalDelay = delay + jitter;

			console.warn(`API request failed, retrying in ${totalDelay.toFixed(0)}ms (attempt ${attempt + 1}/${maxRetries})`, {
				error: error.message,
				status: error.status,
			});

			await new Promise(resolve => setTimeout(resolve, totalDelay));
		}
	}

	throw lastError;
};

/**
 * 5.5 - Build optimized request headers
 * - Smart caching directives
 * - Accept compression
 * - Firebase auth
 */
const buildRequestHeaders = async (customHeaders = {}) => {
	// Auto attach firebase token securely
	let authHeaders = {};
	try {
		await auth.authStateReady();
		const currentUser = auth?.currentUser;
		if (currentUser) {
			const token = await currentUser.getIdToken(false);
			authHeaders = { Authorization: `Bearer ${token}` };
		}
	} catch (e) {
		console.warn('Failed to retrieve auth token', e);
	}

	return {
		'Accept': 'application/json',
		'Accept-Encoding': 'gzip, deflate, br', // 5.5 - Request header optimization
		'Content-Type': 'application/json',
		...authHeaders,
		...customHeaders,
	};
};

/**
 * Core API request function with all Stage 5 optimizations
 */
const apiRequest = async (
	path,
	{
		method = 'GET',
		params,
		body,
		headers = {},
		cache = true,
		cacheTtlMs = 5 * 60 * 1000, // 5 minutes default
		dedup = true,
		swr = false, // Stale-while-revalidate
		retries = 3,
	} = {}
) => {
	const url = buildUrl(path, params);
	const cacheKey = `${method}:${url}`;
	const store = useQueryCache.getState();

	// 5.2 - Request Deduplication: Check if request is already pending
	if (dedup && method === 'GET') {
		const pendingRequest = store.getPending(cacheKey);
		if (pendingRequest) {
			console.debug('Request deduplication: Using pending request', { path });
			return pendingRequest;
		}
	}

	// 5.1 - Check cache first
	if (cache && method === 'GET') {
		const cached = store.getCached(cacheKey);
		if (cached) {
			console.debug('Cache hit', { path, cacheKey });
			
			// 5.3 - Stale-While-Revalidate: If SWR enabled, refetch in background
			if (swr) {
				performBackgroundRefetch(path, { params, headers, cacheKey, cacheTtlMs });
			}
			
			return cached;
		}
	}

	// Create fetch function wrapped with retry logic
	const fetchFn = async () => {
		const requestInit = {
			method,
			headers: await buildRequestHeaders(headers),
		};

		if (body !== undefined && body !== null) {
			requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
		}

		const response = await fetch(url, requestInit);

		if (!response.ok) {
			throw await formatError(response);
		}

		const payload = await response.json();

		if (payload?.success === false) {
			const error = new Error(payload.message || 'Request failed');
			error.payload = payload;
			throw error;
		}

		return payload;
	};

	// 5.2 - Create and track pending promise for deduplication
	const requestPromise = retryWithBackoff(fetchFn, retries)
		.then((data) => {
			// 5.1 - Cache successful response
			if (cache && method === 'GET') {
				store.setCache(cacheKey, data, cacheTtlMs);
				console.debug('Response cached', { path, cacheKey, ttl: cacheTtlMs });
			}
			return data;
		})
		.finally(() => {
			// 5.2 - Remove from pending requests
			if (dedup && method === 'GET') {
				store.removePending(cacheKey);
			}
		});

	// 5.2 - Register pending request for deduplication
	if (dedup && method === 'GET') {
		store.setPending(cacheKey, requestPromise);
	}

	return requestPromise;
};

/**
 * 5.3 - Stale-While-Revalidate: Refetch in background without blocking UI
 */
const performBackgroundRefetch = async (path, { params, headers, cacheKey, cacheTtlMs }) => {
	try {
		const url = buildUrl(path, params);
		const requestInit = {
			method: 'GET',
			headers: await buildRequestHeaders(headers),
		};

		const response = await fetch(url, requestInit);
		if (response.ok) {
			const payload = await response.json();
			if (payload?.success !== false) {
				useQueryCache.getState().setCache(cacheKey, payload, cacheTtlMs);
				console.debug('Background refresh completed', { path });
			}
		}
	} catch (error) {
		// Silently fail background refreshes - UI is already showing stale data
		console.debug('Background refresh failed (acceptable)', { error: error.message });
	}
};

/**
 * 5.4 - Progressive Data Loading Helpers
 * Load critical data first, then supplementary data
 */
export const progressiveLoad = async (criticalRequests, supplementaryRequests = []) => {
	// Wait for critical data first
	const criticalData = await Promise.all(
		criticalRequests.map((req) => apiRequest(req.path, req.options))
	);

	// Then load supplementary data in background (don't block)
	supplementaryRequests.forEach((req) => {
		apiRequest(req.path, req.options).catch((err) => {
			console.warn('Supplementary data loading failed', err);
		});
	});

	return criticalData;
};

/**
 * Main API object with all Stage 5 optimizations built-in
 */
export const api = {
	// GET with full optimization
	get: (path, options = {}) =>
		apiRequest(path, {
			...options,
			method: 'GET',
			cache: options.cache !== false,
			dedup: options.dedup !== false,
			retries: options.retries ?? 3,
		}),

	// POST without cache (mutations usually shouldn't be cached)
	post: (path, body, options = {}) =>
		apiRequest(path, {
			...options,
			method: 'POST',
			body,
			cache: false,
			retries: options.retries ?? 2,
		}),

	// PUT without cache
	put: (path, body, options = {}) =>
		apiRequest(path, {
			...options,
			method: 'PUT',
			body,
			cache: false,
		}),

	// PATCH without cache
	patch: (path, body, options = {}) =>
		apiRequest(path, {
			...options,
			method: 'PATCH',
			body,
			cache: false,
		}),

	// DELETE without cache
	delete: (path, options = {}) =>
		apiRequest(path, {
			...options,
			method: 'DELETE',
			cache: false,
		}),

	/**
	 * Invalidate cache for specific endpoint
	 * Useful after mutations
	   */
	invalidate: (path, params) => {
		const url = buildUrl(path, params);
		const cacheKey = `GET:${url}`;
		useQueryCache.getState().removeCache(cacheKey);
	},

	/**
	 * Invalidate entire namespace
	 * e.g., api.invalidateNamespace('shops') clears all shop caches
	 */
	invalidateNamespace: (namespace) => {
		useQueryCache.getState().clearNamespace(namespace);
	},

	/**
	 * Get cache statistics
	 */
	cacheStats: () => useQueryCache.getState().getStats(),

	/**
	 * Clear all cache
	 */
	clearCache: () => useQueryCache.getState().clearCache(),
};

export default api;
