import { useCallback, useEffect, useState } from "react";
import { storesService, ApiRequestError } from "../api";
import type { Country, Store } from "../types";

/**
 * Store names and the currency each store prices in.
 *
 * A store-product price is in its store's country's currency, and neither the store-product DTO nor
 * the store DTO carries it — only `countryId` does. So it takes two lists to answer "what currency
 * is this number in", which is a question any screen showing prices from more than one store has to
 * answer before an admin reads 999 as dirhams and types a sale price in riyals.
 *
 * The two lists fail DIFFERENTLY, because losing them costs different things.
 *
 *  - Countries are best-effort and fail silently. An unresolved currency renders the bare figure,
 *    which is what every one of these screens did before there was a currency to show. Losing a
 *    label is not worth losing the table.
 *  - Stores are NOT. On a screen that is addressed by store — the Flash Sale page picks one before it
 *    can load a product, filter a row or put anything on sale — an empty store list is the whole
 *    feature switched off. Reported as "no stores", it looks like an account with no stores in it and
 *    sends the admin to look for the wrong problem. So the failure is handed back for the caller to
 *    show, with a retry, and `storesFailed` says it was a failure rather than an empty shop.
 */
export interface UseStoreCurrencies {
  /** Every store, for the screens that also need a picker. Empty until loaded, or on failure. */
  stores: Store[];
  /** The store's display name, or "" when it is not known yet. */
  nameOf: (storeId: string) => string;
  /** ISO currency code the store prices in (e.g. "AED"), or "" when it is not known yet. */
  currencyOf: (storeId: string) => string;
  loading: boolean;
  /**
   * Why the store list could not be loaded, or null. Non-null means `stores` is empty BECAUSE of a
   * failure — the one case a caller must not render as "there are no stores".
   */
  storesError: string | null;
  /** Re-fetch both lists. For the retry button beside `storesError`. */
  reload: () => void;
}

export function useStoreCurrencies(): UseStoreCurrencies {
  const [stores, setStores] = useState<Store[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [storesError, setStoresError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setStoresError(null);
    Promise.allSettled([
      storesService.getAll(ctrl.signal),
      storesService.getAllCountries(ctrl.signal),
    ])
      .then(([storeRes, countryRes]) => {
        if (ctrl.signal.aborted) return;
        if (storeRes.status === "fulfilled") {
          setStores(storeRes.value.data ?? []);
        } else {
          // An abort is this effect being cleaned up, not a failure to report — it would otherwise
          // flash an error every time the caller re-mounts or the retry runs.
          const reason = storeRes.reason as { name?: string } | undefined;
          if (reason?.name !== "AbortError") {
            setStores([]);
            setStoresError(
              storeRes.reason instanceof ApiRequestError
                ? storeRes.reason.message
                : "Could not load the list of stores."
            );
          }
        }
        if (countryRes.status === "fulfilled") setCountries(countryRes.value.data ?? []);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const nameOf = useCallback(
    (storeId: string) => stores.find((s) => s.id === storeId)?.name ?? "",
    [stores]
  );

  const currencyOf = useCallback(
    (storeId: string) => {
      const countryId = stores.find((s) => s.id === storeId)?.countryId;
      if (!countryId) return "";
      return countries.find((c) => c.id === countryId)?.currency ?? "";
    },
    [stores, countries]
  );

  return { stores, nameOf, currencyOf, loading, storesError, reload };
}
