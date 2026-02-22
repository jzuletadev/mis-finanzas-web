// src/utils/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Construye URL con query params opcionales
export function withQuery(path, params) {
  if (!params) return path;
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    if (Array.isArray(v)) v.forEach(x => usp.append(k, String(x)));
    else usp.set(k, String(v));
  });
  const q = usp.toString();
  return q ? `${path}?${q}` : path;
}

// --- Low-level: fetch con cookies (no JSON parsing) ---
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const method = (options.method || 'GET').toUpperCase();

  const hasBody = options.body !== undefined && options.body !== null && method !== 'GET' && method !== 'HEAD';

  const headers = {
    ...(options.headers || {}),
  };

  const storedToken = localStorage.getItem('access_token');
  if (storedToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${storedToken}`;
  }

  const init = {
    method,
    credentials: 'include',
    headers,
    signal: options.signal,
  };

  if (hasBody) {
    if (options.isFormData || options.body instanceof FormData) {
      // Para FormData, no hacer JSON.stringify ni agregar Content-Type
      init.body = options.body;
    } else {
      // Para datos JSON normales
      headers['Content-Type'] = 'application/json';
      init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, init);
  return res;
}

// --- High-level: JSON + intento de refresh si 401/403 ---
export async function apiJson(path, options = {}) {
  // 1er intento
  let res = await apiFetch(path, options);

  // Si no autorizado, intentamos refrescar una sola vez
  if ((res.status === 401 || res.status === 403) && !options.__retried) {
    // Intentar refresh con token de localStorage si está disponible
    const refreshToken = localStorage.getItem('refresh_token');
    const refreshBody = refreshToken ? { refresh_token: refreshToken } : undefined;

    const refresh = await apiFetch('/auth/refresh', {
      method: 'POST',
      body: refreshBody
    });

    if (refresh.ok) {
      // Procesar la respuesta del refresh
      try {
        const refreshData = await refresh.json();
        if (refreshData.ok && refreshData.data) {
          // Guardar nuevos tokens en localStorage
          if (refreshData.data.access_token) {
            localStorage.setItem('access_token', refreshData.data.access_token);
          }
          if (refreshData.data.refresh_token) {
            localStorage.setItem('refresh_token', refreshData.data.refresh_token);
          }
        }
      } catch (e) {
        console.warn('Error parsing refresh response:', e);
      }

      // reintentar la original marcando que ya hicimos refresh
      res = await apiFetch(path, { ...options, __retried: true });
    }
  }

  // Parsear JSON con fallback seguro
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  return {
    ok: res.ok,
    status: res.status,
    data, // tu backend suele responder { ok:true, data:{...} } vía responseHandler
  };
}

// Helpers de conveniencia
export const apiGet = (path, params, options = {}) =>
  apiJson(withQuery(path, params), { ...options, method: 'GET' });

export const apiPost = (path, body, options = {}) =>
  apiJson(path, { ...options, method: 'POST', body });

export const apiPut = (path, body, options = {}) =>
  apiJson(path, { ...options, method: 'PUT', body });

export const apiPatch = (path, body, options = {}) =>
  apiJson(path, { ...options, method: 'PATCH', body });

export const apiDelete = (path, body, options = {}) =>
  apiJson(path, { ...options, method: 'DELETE', body });
