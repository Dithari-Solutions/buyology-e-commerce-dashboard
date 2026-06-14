import { useEffect, useState } from "react";
import { specCodesService, type SpecCodeItem } from "../api/services/specCodes.service";
import { SPEC_CODES } from "../api/services/specs.service";

/** Humanize a snake_case code as a last-resort label (e.g. operating_system -> Operating System). */
function humanize(code: string): string {
  return code
    .split("_")
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

const FALLBACK_ITEMS: SpecCodeItem[] = SPEC_CODES.map((code, i) => ({
  id: code,
  code,
  labelEn: humanize(code),
  labelAz: null,
  labelAr: null,
  filterable: code !== "gpu",
  displayOrder: i,
}));

export interface UseSpecCodes {
  items: SpecCodeItem[];
  codes: string[];
  labels: Record<string, string>;
  loading: boolean;
}

/**
 * Loads the DB-backed spec-code registry. Falls back to the legacy hardcoded
 * SPEC_CODES list if the endpoint is unavailable, so the product/spec dropdowns
 * never break.
 */
export function useSpecCodes(): UseSpecCodes {
  const [items, setItems] = useState<SpecCodeItem[]>(FALLBACK_ITEMS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    specCodesService
      .getAll(ac.signal)
      .then((r) => {
        if (r.data && r.data.length > 0) setItems(r.data);
      })
      .catch(() => {
        /* keep fallback */
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  const codes = items.map((i) => i.code);
  const labels = items.reduce<Record<string, string>>((acc, i) => {
    acc[i.code] = i.labelEn || humanize(i.code);
    return acc;
  }, {});

  return { items, codes, labels, loading };
}
