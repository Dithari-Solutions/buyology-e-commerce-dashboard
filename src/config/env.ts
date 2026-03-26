/**
 * Centralised environment config.
 * All `import.meta.env` reads happen here — never scattered across components.
 */
const apiBaseUrlRaw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const courierImageBaseUrlRaw = (import.meta.env.VITE_COURIER_IMAGE_BASE_URL as string | undefined) ?? "";

const normalizeUrl = (value: string): string => value.replace(/\/$/, "");

const resolveApiBaseUrl = (): string => {
  if (apiBaseUrlRaw.trim()) {
    return normalizeUrl(apiBaseUrlRaw);
  }

  // For dev with proxy setup, use relative API path.
  if (import.meta.env.DEV) {
    console.warn(
      "VITE_API_BASE_URL is not set. Falling back to /api proxy path (dev only). Configure VITE_API_BASE_URL for direct backend URL."
    );
    return "/api";
  }

  // Production fallback if env missing (avoid render crash). Expects backend reverse proxy.
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  console.warn(
    "VITE_API_BASE_URL is not set. Falling back to origin + /api. Set VITE_API_BASE_URL to backend API host for correct behavior."
  );
  return normalizeUrl(`${origin}/api`);
};

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  courierImageBaseUrl: normalizeUrl(courierImageBaseUrlRaw || apiBaseUrlRaw || "/api"),
} as const;
