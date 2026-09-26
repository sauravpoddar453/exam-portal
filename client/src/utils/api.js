/**
 * Helper to build full API URL using environment variable VITE_API_URL if configured.
 */
export function getApiUrl(path = '') {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return cleanBase ? `${cleanBase}${cleanPath}` : cleanPath;
}

/**
 * Helper to safely fetch and parse JSON responses.
 * Prevents "Unexpected end of JSON input" errors when responses are 0-byte, 204 No Content, HTML error pages, or when proxy fails.
 */
export async function safeFetchJson(url, options = {}) {
  try {
    const fullUrl = url.startsWith('/') ? getApiUrl(url) : url;
    const headers = { ...(options.headers || {}) };
    const authToken = localStorage.getItem('token');
    if (authToken && !headers.Authorization && !headers.authorization) {
      headers.Authorization = `Bearer ${authToken}`;
    }

    const fetchOptions = { ...options, headers };
    const res = await fetch(fullUrl, fetchOptions);

    if (res.status === 204) {
      return { ok: res.ok, status: res.status, data: { success: true } };
    }

    const text = await res.text();
    if (!text || !text.trim()) {
      if (res.ok) {
        return { ok: true, status: res.status, data: { success: true } };
      }
      return {
        ok: false,
        status: res.status,
        data: { success: false, message: `Server returned empty response (Status ${res.status}).` },
      };
    }

    try {
      const data = JSON.parse(text);
      return { ok: res.ok, status: res.status, data };
    } catch (parseErr) {
      console.warn(`[safeFetchJson] Non-JSON response from ${url} (status ${res.status}):`, text.slice(0, 150));
      return {
        ok: false,
        status: res.status,
        data: {
          success: false,
          message: res.ok ? 'Received unexpected response format from server.' : `Server error (${res.status}).`,
        },
      };
    }
  } catch (netErr) {
    console.error(`[safeFetchJson] Network fetch error for ${url}:`, netErr.message);
    return {
      ok: false,
      status: 0,
      data: { success: false, message: `Connection failed: ${netErr.message}` },
    };
  }
}
