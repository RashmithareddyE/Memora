/**
 * Centralized API client for the Memora backend.
 */

export const AUTH_TOKEN_STORAGE_KEY = 'memora_token';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const getToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export interface ApiRequestOptions
  extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

async function request<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;

  const isFormData =
    typeof FormData !== 'undefined' && body instanceof FormData;

  const finalHeaders: HeadersInit = {
    Accept: 'application/json',
    ...(isFormData
      ? {}
      : { 'Content-Type': 'application/json' }),
    ...headers,
  };

  const token = getToken();

  if (token) {
    (finalHeaders as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${
    endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  }`;

  let response: Response;

  try {
    response = await fetch(url, {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Unable to reach the server. Check your connection and try again.',
      0
    );
  }

  const rawText = await response.text();

  let data: unknown = undefined;

  if (rawText) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = rawText;
    }
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof (data as { message?: unknown }).message === 'string'
        ? (data as { message: string }).message
        : `Request failed with status ${response.status}`;

    throw new ApiError(message, response.status, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T = unknown>(
    endpoint: string,
    options?: ApiRequestOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'GET',
    }),

  post: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body,
    }),

  put: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body,
    }),

  patch: <T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: ApiRequestOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body,
    }),

  delete: <T = unknown>(
    endpoint: string,
    options?: ApiRequestOptions
  ) =>
    request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    }),
};