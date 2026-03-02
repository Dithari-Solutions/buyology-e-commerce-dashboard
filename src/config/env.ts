/**
 * Centralised environment config.
 * All `import.meta.env` reads happen here — never scattered across components.
 *
 * In development the Vite proxy forwards /api and /story to the backend,
 * so apiBaseUrl is intentionally empty (same-origin) — no CORS preflight.
 * In production builds VITE_API_BASE_URL is baked in at build time.
 */
export const env = {
  apiBaseUrl: import.meta.env.DEV
    ? ""
    : ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ""),
} as const;
