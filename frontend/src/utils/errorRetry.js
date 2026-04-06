/**
 * STAGE 5.6: Error Handling & Retry Utilities
 * 
 * Provides:
 * - Retry with exponential backoff
 * - Circuit breaker pattern
 * - Request timeout management
 * - Error classification
 */

/**
 * Classify errors for retry logic
 */
export const classifyError = (error) => {
	if (!error) return 'unknown';

	const status = error.status;

	// Don't retry client errors (4xx)
	if (status >= 400 && status < 500) {
		return 'client_error';
	}

	// Retry server errors (5xx)
	if (status >= 500) {
		return 'server_error';
	}

	// Network errors
	if (error.message === 'Network request failed') {
		return 'network_error';
	}

	// Timeout
	if (error.message.includes('timeout')) {
		return 'timeout';
	}

	return 'unknown';
};

/**
 * Check if error is retryable
 */
export const isRetryable = (error) => {
	const errorType = classifyError(error);
	return ['server_error', 'network_error', 'timeout'].includes(errorType);
};

/**
 * Circuit Breaker: Fail-fast if service is down
 * Tracks failures and opens circuit after threshold
 */
export class CircuitBreaker {
	constructor(options = {}) {
		this.failureThreshold = options.failureThreshold || 5;
		this.successThreshold = options.successThreshold || 2;
		this.timeout = options.timeout || 60000; // 60 seconds
		
		this.failureCount = 0;
		this.successCount = 0;
		this.lastFailureTime = null;
		this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
	}

	/**
	 * Execute function with circuit breaker protection
	 */
	async execute(fn) {
		if (this.state === 'OPEN') {
			// Check if timeout passed, if so go to HALF_OPEN
			if (Date.now() - this.lastFailureTime > this.timeout) {
				this.state = 'HALF_OPEN';
				console.log('Circuit breaker: HALF_OPEN, attempting recovery');
			} else {
				throw new Error('Circuit breaker is OPEN - service unavailable');
			}
		}

		try {
			const result = await fn();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();
			throw error;
		}
	}

	onSuccess() {
		this.failureCount = 0;

		if (this.state === 'HALF_OPEN') {
			this.successCount++;
			if (this.successCount >= this.successThreshold) {
				this.state = 'CLOSED';
				this.successCount = 0;
				console.log('Circuit breaker: CLOSED, service recovered');
			}
		}
	}

	onFailure() {
		this.failureCount++;
		this.lastFailureTime = Date.now();
		this.successCount = 0;

		if (this.failureCount >= this.failureThreshold) {
			this.state = 'OPEN';
			console.error('Circuit breaker: OPEN, stopping requests');
		}
	}

	getState() {
		return {
			state: this.state,
			failureCount: this.failureCount,
			lastFailureTime: this.lastFailureTime,
		};
	}

	reset() {
		this.failureCount = 0;
		this.successCount = 0;
		this.state = 'CLOSED';
	}
}

/**
 * Timeout wrapper for promises
 */
export const withTimeout = (promise, timeoutMs) => {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error(`Request timeout after ${timeoutMs}ms`)),
				timeoutMs
			)
		),
	]);
};

/**
 * Retry with jitter
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Max retry attempts
 * @param {number} initialDelayMs - Initial delay
 * @param {number} multiplier - Exponential backoff multiplier
 */
export const retryWithJitter = async (
	fn,
	maxAttempts = 3,
	initialDelayMs = 1000,
	multiplier = 2
) => {
	let lastError;

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await withTimeout(fn(), 30000); // 30 second timeout
		} catch (error) {
			lastError = error;

			// Don't retry on non-retryable errors
			if (!isRetryable(error)) {
				throw error;
			}

			// Don't retry on last attempt
			if (attempt === maxAttempts - 1) {
				break;
			}

			// Calculate delay with exponential backoff and jitter
			const exponentialDelay = initialDelayMs * Math.pow(multiplier, attempt);
			const jitter = Math.random() * exponentialDelay * 0.1;
			const totalDelay = exponentialDelay + jitter;

			console.warn(
				`Retry attempt ${attempt + 1}/${maxAttempts} after ${totalDelay.toFixed(0)}ms`,
				{ error: error.message, errorType: classifyError(error) }
			);

			await new Promise(resolve => setTimeout(resolve, totalDelay));
		}
	}

	throw lastError;
};

/**
 * Request deduplication middleware
 * Prevents duplicate requests for same resource
 */
export class RequestDeduplicator {
	constructor() {
		this.pendingRequests = new Map();
	}

	/**
	 * Execute request with deduplication
	 */
	async execute(key, fn) {
		// Return existing promise if request is already pending
		if (this.pendingRequests.has(key)) {
			return this.pendingRequests.get(key);
		}

		// Create new promise for this request
		const promise = fn()
			.then((result) => {
				this.pendingRequests.delete(key);
				return result;
			})
			.catch((error) => {
				this.pendingRequests.delete(key);
				throw error;
			});

		// Track pending request
		this.pendingRequests.set(key, promise);

		return promise;
	}

	/**
	 * Clear all pending requests
	 */
	clear() {
		this.pendingRequests.clear();
	}

	/**
	 * Get pending request count
	 */
	getPendingCount() {
		return this.pendingRequests.size;
	}
}

/**
 * Create circuit breaker instances for different services
 */
export const circuitBreakers = {
	shop: new CircuitBreaker({ failureThreshold: 5, timeout: 60000 }),
	items: new CircuitBreaker({ failureThreshold: 5, timeout: 60000 }),
	orders: new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }),
	auth: new CircuitBreaker({ failureThreshold: 3, timeout: 30000 }),
};

export const requestDeduplicator = new RequestDeduplicator();
