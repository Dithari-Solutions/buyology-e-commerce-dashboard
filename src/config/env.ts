/**
 * Centralised environment config.
 * All `import.meta.env` reads happen here — never scattered across components.
 */
export const env = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "",
} as const;
