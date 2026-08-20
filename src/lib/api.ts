import { getCsrfToken } from "./csrf";

export const API_BASE = (import.meta.env.VITE_API_BASE ?? "/growth-api/v1").replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const readResponseBody = async (response: Response) => {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json() as Promise<unknown>;
  }
  const text = await response.text();
  return text || undefined;
};

interface ApiRequestOptions {
  /**
   * Login and registration are the only browser mutations that can run before
   * a session (and therefore a CSRF token) exists. The API still enforces
   * same-origin requests. Each option is endpoint-specific so a caller cannot
   * accidentally weaken another mutation.
   */
  csrf?: "required" | "unauthenticated-password-login" | "unauthenticated-password-register";
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const isMutation = !new Set(["GET", "HEAD", "OPTIONS"]).has(method);
  const isPasswordLogin = options.csrf === "unauthenticated-password-login";
  const isPasswordRegistration = options.csrf === "unauthenticated-password-register";

  if (isPasswordLogin && (method !== "POST" || path !== "/auth/password/login")) {
    throw new ApiError("A exceção CSRF só pode ser usada no login por palavra-passe.", 500);
  }
  if (isPasswordRegistration && (method !== "POST" || path !== "/auth/password/register")) {
    throw new ApiError("A exceção CSRF só pode ser usada no registo por palavra-passe.", 500);
  }

  if (isMutation && !isPasswordLogin && !isPasswordRegistration) {
    const csrfToken = getCsrfToken();
    if (!csrfToken) throw new ApiError("A sessão não possui um token CSRF válido.", 403);
    headers.set("X-Growth-CSRF", csrfToken);
  }
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Accept", "application/json");

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const body = await readResponseBody(response);
  if (!response.ok) {
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : undefined;
    const nestedError = record?.error && typeof record.error === "object"
      ? record.error as Record<string, unknown>
      : undefined;
    const message =
      (typeof nestedError?.message === "string" && nestedError.message) ||
      (typeof record?.message === "string" && record.message) ||
      (typeof record?.error === "string" && record.error) ||
      `Pedido recusado (${response.status})`;
    throw new ApiError(message, response.status, body);
  }
  return body as T;
}

export const isDemoEnabled =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO === "true";
