const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

function readCookie(name) {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.split('=')
    .slice(1)
    .join('=');
}

export class ApiError extends Error {
  constructor(message, status, issues) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

export async function request(path, { method = 'GET', body, signal, ...rest } = {}) {
  const headers = { Accept: 'application/json', ...(rest.headers || {}) };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const csrf = readCookie('pos_csrf');
  if (csrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)) headers['x-csrf-token'] = decodeURIComponent(csrf);

  let response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    const error = new ApiError(data?.message || `Request failed (${response.status})`, response.status, data?.issues);
    if (response.status === 401) window.dispatchEvent(new CustomEvent('auth:expired'));
    throw error;
  }
  return data;
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
};
