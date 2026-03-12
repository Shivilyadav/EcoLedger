const envBaseUrl = import.meta?.env?.VITE_API_BASE_URL?.trim();

const devDefaultBaseUrl =
    typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:8000`
        : 'http://localhost:8000';

// In dev, default to "same host as the frontend, but backend port 8000"
// so phones on the same Wi‑Fi can use http://<PC-LAN-IP>:3000 and still reach the API.
// In prod, default to same-origin (works behind reverse proxies) unless overridden at build time.
export const API_BASE_URL =
    envBaseUrl || (import.meta.env.DEV ? devDefaultBaseUrl : window.location.origin);

export const apiUrl = (path) => {
    if (!path) return API_BASE_URL;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (!path.startsWith('/')) return `${API_BASE_URL}/${path}`;
    return `${API_BASE_URL}${path}`;
};
