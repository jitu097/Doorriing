const DEFAULT_API_BASE_URL = 'http://localhost:5001/api';

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

const apiRequest = async (path, { method = 'GET', params, body, headers = {} } = {}) => {
	const url = buildUrl(path, params);
	const requestInit = {
		method,
		headers: {
			Accept: 'application/json',
			...headers,
		},
	};

	if (body !== undefined && body !== null) {
		requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
		if (!requestInit.headers['Content-Type']) {
			requestInit.headers['Content-Type'] = 'application/json';
		}
	}

	try {
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
	} catch (error) {
		console.error('API request failed', { path, method, error });
		throw error;
	}
};

export const api = {
	get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
	post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
	put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
	patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
	delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
};

export default api;
