import { useState } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { suppliersService } from "../../api/services/suppliers.service";
import { useT } from "../../i18n/I18nProvider";

export default function SupplierAccountPage() {
  const t = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string>("");
  const [err, setErr] = useState<string>("");

  const run = async (action: "freeze" | "unfreeze" | "delete") => {
    setMsg("");
    setErr("");
    setBusy(action);
    try {
      let res;
      if (action === "freeze") res = await suppliersService.freezeMyAccount();
      else if (action === "unfreeze") res = await suppliersService.unfreezeMyAccount();
      else res = await suppliersService.deleteMyAccount();
      setMsg(res.message ?? "Done");
    } catch (e: unknown) {
      setErr((e as Error).message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <PageMeta title={t("supplier.account.title", "Account")} description="Manage your supplier account" />
      <PageBreadcrumb pageTitle={t("supplier.account.title", "My Account")} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
          {t("supplier.account.lifecycle", "Account lifecycle")}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Freeze your account to temporarily hide your products and block sign-in. You can unfreeze
          at any time. Deleting moves your account to trash; if not restored within 30 days, it is
          removed permanently.
        </p>

        {msg && (
          <div className="mt-4 rounded-md bg-green-50 px-4 py-2 text-sm text-green-700">{msg}</div>
        )}
        {err && (
          <div className="mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700">{err}</div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => run("freeze")}
            disabled={busy !== null}
            className="rounded-md border border-yellow-400 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
          >
            {busy === "freeze" ? t("common.loading", "Freezing…") : t("supplier.account.freeze", "Freeze account")}
          </button>
          <button
            onClick={() => run("unfreeze")}
            disabled={busy !== null}
            className="rounded-md border border-brand-400 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {busy === "unfreeze" ? t("common.loading", "Unfreezing…") : t("supplier.account.unfreeze", "Unfreeze")}
          </button>
          <button
            onClick={() => {
              if (
                confirm(
                  "Delete your supplier account? It will be moved to trash and permanently removed after 30 days unless you contact support to restore it.",
                )
              )
                run("delete");
            }}
            disabled={busy !== null}
            className="rounded-md border border-red-400 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {busy === "delete" ? t("common.loading", "Deleting…") : t("supplier.account.delete", "Delete account")}
          </button>
        </div>
      </div>
    </>
  );
}
