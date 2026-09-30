/** Thin fetch wrapper around the Demo Shop API envelope: {success, data | error, meta.correlationId}. */

const TOKEN_KEY = "shop.token";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public correlationId: string | null,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable */
  }
}

let onUnauthorized: (() => void) | null = null;

/** Called when the API says the token is invalid or expired. */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Query = Record<string, string | number | boolean | null | undefined>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return `/api/v1${path}${qs ? `?${qs}` : ""}`;
}

async function request<T>(method: string, path: string, { query, body }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network", "Не удаётся связаться с сервером. Проверьте подключение к интернету и попробуйте ещё раз.", null);
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* not JSON (e.g. proxy error) */
  }
  // The dev proxy answers 502/503/504 without a JSON body when the API is not running.
  if (!payload && res.status >= 502 && res.status <= 504) {
    throw new ApiError(0, "network", "Не удаётся связаться с сервером. Проверьте подключение к интернету и попробуйте ещё раз.", null);
  }
  const correlationId = payload?.meta?.correlationId ?? res.headers.get("X-Correlation-Id");

  if (!res.ok || !payload?.success) {
    const code = payload?.error?.code ?? (res.status >= 500 ? "internal" : "unknown");
    const message = payload?.error?.message ?? `HTTP ${res.status}`;
    if (res.status === 401 && token && code === "auth.invalid_token") onUnauthorized?.();
    throw new ApiError(res.status, code, message, correlationId);
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body: body ?? {} }),
  delete: <T>(path: string) => request<T>("DELETE", path),
};
