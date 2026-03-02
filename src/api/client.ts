import { env } from "../config/env";
import { ApiError, ApiRequestError } from "./types/api.types";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions extends Omit<RequestInit, "method" | "body"> {
  signal?: AbortSignal;
}

interface RequestWithBodyOptions extends RequestOptions {
  body?: unknown;
}

class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // strip trailing slash
  }

  private buildUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  }

  private buildHeaders(extra?: HeadersInit): Headers {
    const headers = new Headers({ "Content-Type": "application/json" });

    if (extra) {
      new Headers(extra).forEach((value, key) => headers.set(key, value));
    }

    return headers;
  }

  private async request<T>(
    method: HttpMethod,
    endpoint: string,
    { body, headers: extraHeaders, ...rest }: RequestWithBodyOptions = {}
  ): Promise<T> {
    const response = await fetch(this.buildUrl(endpoint), {
      method,
      headers: this.buildHeaders(extraHeaders),
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...rest,
    });

    if (!response.ok) {
      let payload: ApiError;

      try {
        payload = (await response.json()) as ApiError;
      } catch {
        payload = {
          statusCode: response.status,
          message: response.statusText || "An unexpected error occurred.",
        };
      }

      throw new ApiRequestError(payload);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", endpoint, options);
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("POST", endpoint, { ...options, body });
  }

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("PUT", endpoint, { ...options, body });
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("PATCH", endpoint, { ...options, body });
  }

  delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", endpoint, options);
  }
}

export const apiClient = new HttpClient(env.apiBaseUrl);
