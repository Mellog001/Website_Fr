// EduConnect API client
// Talks to the real backend at server/src (routes mounted under /api/v1).
// Change API_BASE_URL to your deployed backend URL when you go live.
const API_BASE_URL = "http://localhost:5000/api/v1";

const TOKEN_KEYS = {
  access: "educonnect_access_token",
  refresh: "educonnect_refresh_token",
  user: "educonnect_user",
};

const Auth = {
  getAccessToken() {
    return localStorage.getItem(TOKEN_KEYS.access);
  },
  getRefreshToken() {
    return localStorage.getItem(TOKEN_KEYS.refresh);
  },
  getUser() {
    const raw = localStorage.getItem(TOKEN_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn() {
    return !!this.getAccessToken();
  },
  setSession({ accessToken, refreshToken, user }) {
    localStorage.setItem(TOKEN_KEYS.access, accessToken);
    localStorage.setItem(TOKEN_KEYS.refresh, refreshToken);
    localStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEYS.access);
    localStorage.removeItem(TOKEN_KEYS.refresh);
    localStorage.removeItem(TOKEN_KEYS.user);
  },
  // The access token is a JWT — decode its payload client-side for quick
  // display (name/role) without a dedicated "/me" endpoint (the backend
  // doesn't expose one yet).
  decodeAccessToken() {
    const token = this.getAccessToken();
    if (!token) return null;
    try {
      const payload = token.split(".")[1];
      return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return null;
    }
  },
};

// Redirects to login if there's no session. Call at the top of any protected page.
function requireAuth() {
  if (!Auth.isLoggedIn()) {
    window.location.href = "login.html";
  }
}

let refreshInFlight = null;

async function refreshAccessToken() {
  const refreshToken = Auth.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available.");

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const body = await res.json();

  if (!res.ok) {
    Auth.clearSession();
    throw new Error(body.message || "Session expired.");
  }

  const user = Auth.getUser();
  Auth.setSession({
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    user,
  });
  return body.data.accessToken;
}

// Wraps fetch: attaches the access token, retries once on 401 via refresh,
// and always returns parsed JSON with response.ok / response.status attached.
async function apiFetch(path, options = {}) {
  const doFetch = (token) =>
    fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  let res = await doFetch(Auth.getAccessToken());

  if (res.status === 401 && Auth.getRefreshToken()) {
    try {
      refreshInFlight = refreshInFlight || refreshAccessToken();
      const newToken = await refreshInFlight;
      refreshInFlight = null;
      res = await doFetch(newToken);
    } catch {
      refreshInFlight = null;
      Auth.clearSession();
      window.location.href = "login.html";
      return null;
    }
  }

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, ...data };
}

const Api = {
  register: (email, password, role) =>
    apiFetch("/auth/register", { method: "POST", body: { email, password, role } }),

  login: (email, password) =>
    apiFetch("/auth/login", { method: "POST", body: { email, password } }),

  logout: async () => {
    const refreshToken = Auth.getRefreshToken();
    if (refreshToken) {
      await apiFetch("/auth/logout", { method: "POST", body: { refreshToken } });
    }
    Auth.clearSession();
  },

  getCatalog: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/courses/catalog${qs ? `?${qs}` : ""}`);
  },

  getCourseDetails: (courseId) => apiFetch(`/courses/${courseId}`),

  initiateStkPush: (courseId, phoneNumber) =>
    apiFetch("/payments/stk-push", { method: "POST", body: { courseId, phoneNumber } }),
};
