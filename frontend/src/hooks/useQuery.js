import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../services/apiV2.js';

/**
 * STAGE 5.4: Progressive Data Loading Hook
 * 
 * Features:
 * - Automatic refetch on dependency change
 * - Loading/error/success states
 * - Stale-while-revalidate support
 * - Manual refetch capability
 * - Cache invalidation support
 * 
 * Usage:
 * const { data, loading, error, refetch } = useQuery('/api/shops', { params: { limit: 10 } });
 * 
 * Or with SWR:
 * const { data, loading, error, refetch } = useQuery('/api/shops', { swr: true });
 */
export const useQuery = (
	path,
	options = {
		params: {},
		cache: true,
		cacheTtlMs: 5 * 60 * 1000,
		swr: false, // Stale-while-revalidate
		enabled: true, // Allow disabling queries conditionally
		retries: 3,
		onSuccess: null,
		onError: null,
		dedup: true,
	}
) => {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const isMountedRef = useRef(true);
	const abortControllerRef = useRef(null);

	const fetchData = useCallback(async () => {
		if (!options.enabled) {
			return;
		}

		// Cancel previous request if still pending
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		abortControllerRef.current = new AbortController();

		setLoading(true);
		setError(null);

		try {
			const result = await api.get(path, {
				params: options.params,
				cache: options.cache,
				cacheTtlMs: options.cacheTtlMs,
				swr: options.swr,
				retries: options.retries,
				dedup: options.dedup,
			});

			if (isMountedRef.current) {
				setData(result.data || result);
				setLoading(false);

				// Call success callback if provided
				if (options.onSuccess) {
					options.onSuccess(result.data || result);
				}
			}
		} catch (err) {
			if (isMountedRef.current) {
				setError(err);
				setLoading(false);

				// Call error callback if provided
				if (options.onError) {
					options.onError(err);
				}
			}
		}
	}, [path, options]);

	// Auto-fetch on mount and dependency changes
	useEffect(() => {
		isMountedRef.current = true;
		fetchData();

		return () => {
			isMountedRef.current = false;
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, [fetchData]);

	/**
	 * Manual refetch
	 */
	const refetch = useCallback(() => {
		fetchData();
	}, [fetchData]);

	/**
	 * Invalidate cache and refetch
	 */
	const invalidateAndRefetch = useCallback(() => {
		api.invalidate(path, options.params);
		refetch();
	}, [path, options.params, refetch]);

	return {
		data,
		loading,
		error,
		refetch,
		invalidateAndRefetch,
		isSuccess: !loading && !error && data !== null,
		isError: error !== null,
		isLoading: loading,
	};
};

/**
 * STAGE 5.4: Progressive Data Loading - Sequential Loading
 * Load critical data first, then supplementary
 * 
 * Usage:
 * const { criticalData, supplementaryData, loading } = useProgressiveLoad(
 *   // Critical requests (must load first)
 *   [
 *     { path: '/shops/:id', options: {} },
 *     { path: '/categories', options: { params: { shop_id: shopId } } }
 *   ],
 *   // Supplementary requests (load in background)
 *   [
 *     { path: '/reviews', options: {} },
 *     { path: '/related-items', options: {} }
 *   ]
 * );
 */
export const useProgressiveLoad = (criticalRequests, supplementaryRequests = []) => {
	const [criticalData, setCriticalData] = useState(null);
	const [supplementaryData, setSupplementaryData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		let isMounted = true;

		const loadData = async () => {
			try {
				// Load critical data first
				const criticalResults = await Promise.all(
					criticalRequests.map((req) =>
						api.get(req.path, req.options)
					)
				);

				if (isMounted) {
					setCriticalData(criticalResults);
					setLoading(false);
				}

				// Load supplementary data in background (don't block UI)
				const supplementaryResults = await Promise.all(
					supplementaryRequests.map((req) =>
						api.get(req.path, req.options).catch((err) => {
							console.warn('Supplementary data failed', err);
							return null;
						})
					)
				);

				if (isMounted) {
					setSupplementaryData(supplementaryResults);
				}
			} catch (err) {
				if (isMounted) {
					setError(err);
					setLoading(false);
				}
			}
		};

		loadData();

		return () => {
			isMounted = false;
		};
	}, []);

	return {
		criticalData,
		supplementaryData,
		loading,
		error,
	};
};

/**
 * STAGE 5.4: Parallel Data Loading
 * Load multiple requests in parallel
 * 
 * Usage:
 * const { data, loading, error } = useParallelLoad([
 *   { path: '/shops/:id', name: 'shop' },
 *   { path: '/items', name: 'items' },
 *   { path: '/reviews', name: 'reviews' }
 * ]);
 * // Returns: { shop: {...}, items: [...], reviews: [...] }
 */
export const useParallelLoad = (requests, enabled = true) => {
	const [data, setData] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!enabled) {
			setLoading(false);
			return;
		}

		let isMounted = true;

		const loadData = async () => {
			try {
				const results = await Promise.all(
					requests.map((req) =>
						api.get(req.path, req.options).then((res) => ({
							name: req.name,
							data: res.data || res,
						}))
					)
				);

				if (isMounted) {
					const dataObj = results.reduce((acc, { name, data: d }) => {
						acc[name] = d;
						return acc;
					}, {});
					setData(dataObj);
					setLoading(false);
				}
			} catch (err) {
				if (isMounted) {
					setError(err);
					setLoading(false);
				}
			}
		};

		loadData();

		return () => {
			isMounted = false;
		};
	}, [requests, enabled]);

	return { data, loading, error };
};

export default useQuery;
