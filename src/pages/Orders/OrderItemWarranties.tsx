import { useState } from "react";
import { ApiRequestError } from "../../api";
import { warrantyCardsService } from "../../api/services/warrantyCards.service";
import { canPerformPermission } from "../../auth/roles";
import type { OrderItemWarranty } from "../../types/order.types";
import { dithariWarrantyUrl } from "../../utils/warranty";

const STATUS_STYLE: Record<OrderItemWarranty["status"], { label: string; cls: string }> = {
  ACTIVE: { label: "Active", cls: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
  EXPIRING_SOON: { label: "Expiring soon", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400" },
  EXPIRED: { label: "Expired", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  VOID: { label: "Void", cls: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
};

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * The warranty cards of one order item, one per unit, with void/restore for staff who may.
 * Rendered beside the item row, not inside it: the row itself is a link to the product.
 */
export function OrderItemWarranties({
  warranties,
  onChanged,
}: {
  warranties?: OrderItemWarranty[];
  onChanged: (updated: OrderItemWarranty) => void;
}) {
  const [busySerial, setBusySerial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!warranties || warranties.length === 0) return null;
  const canManage = canPerformPermission("order:warranty:update");

  const run = async (w: OrderItemWarranty) => {
    let call: Promise<{ data: OrderItemWarranty }>;
    if (w.status === "VOID") {
      if (!confirm(`Restore warranty card ${w.serialNumber}? It will show as valid again.`)) return;
      call = warrantyCardsService.restore(w.serialNumber);
    } else {
      const reason = prompt(
        `Void warranty card ${w.serialNumber}?\n\nThe warranty checker will show it as no longer valid. ` +
          "Reason (kept for staff, never shown to the customer):",
        "Unit returned",
      );
      if (reason === null) return;
      call = warrantyCardsService.void(w.serialNumber, reason);
    }
    setBusySerial(w.serialNumber);
    setError(null);
    try {
      const res = await call;
      onChanged(res.data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not update the warranty card.");
    } finally {
      setBusySerial(null);
    }
  };

  return (
    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/[0.03]">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
        Warranty {warranties.length === 1 ? "card" : `cards (${warranties.length})`}
      </p>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {warranties.map((w) => {
          const style = STATUS_STYLE[w.status] ?? STATUS_STYLE.ACTIVE;
          return (
            <li key={w.serialNumber} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
              <span className="font-mono text-gray-800 dark:text-white/90" dir="ltr">{w.serialNumber}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${style.cls}`}>{style.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(w.startDate)} – {formatDate(w.endDate)}
              </span>
              <span className="ms-auto flex gap-2">
                <a
                  href={dithariWarrantyUrl(w.serialNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-brand-50 px-2 py-1 text-xs text-brand-600 hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400"
                >
                  View card
                </a>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => run(w)}
                    disabled={busySerial === w.serialNumber}
                    className={`rounded-lg px-2 py-1 text-xs disabled:opacity-50 ${
                      w.status === "VOID"
                        ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
                        : "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {busySerial === w.serialNumber ? "Saving…" : w.status === "VOID" ? "Restore" : "Void"}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
