/**
 * Centralised environment config.
 * All `import.meta.env` reads happen here — never scattered across components.
 */
const apiBaseUrlRaw = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
const courierImageBaseUrlRaw = (import.meta.env.VITE_COURIER_IMAGE_BASE_URL as string | undefined) ?? "";

const normalizeUrl = (value: string): string => value.replace(/\/$/, "");

if (!apiBaseUrlRaw) {
  throw new Error(
    "VITE_API_BASE_URL is not set. Please set it to the backend API URL so requests are not sent to the frontend/proxy origin."
  );
}

export const env = {
  apiBaseUrl: normalizeUrl(apiBaseUrlRaw),
  courierImageBaseUrl: normalizeUrl(courierImageBaseUrlRaw || apiBaseUrlRaw),
} as const;
