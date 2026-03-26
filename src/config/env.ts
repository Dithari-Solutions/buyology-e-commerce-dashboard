/**
 * Centralised environment config.
 * All `import.meta.env` reads happen here — never scattered across components.
 */
const apiBaseUrlRaw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const courierImageBaseUrlRaw = (import.meta.env.VITE_COURIER_IMAGE_BASE_URL as string | undefined) ?? "";

const normalizeUrl = (value: string): string => value.replace(/\/$/, "");

const DEFAULT_API_BASE = "https://api-dev.dithari.com";

const resolveApiBaseUrl = (): string => {
  if (apiBaseUrlRaw.trim()) {
    return normalizeUrl(apiBaseUrlRaw);
  }

  console.warn(
    "VITE_API_BASE_URL is not set. Falling back to default backend API URL.",
    DEFAULT_API_BASE
  );

  return normalizeUrl(DEFAULT_API_BASE);
};

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  courierImageBaseUrl: normalizeUrl(courierImageBaseUrlRaw || apiBaseUrlRaw || DEFAULT_API_BASE),
} as const;
