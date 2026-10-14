import { useState } from "react";
import { Link, Navigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { isSuperAdmin } from "../../auth/roles";
import { ApiRequestError } from "../../api";
import { ordersService, type PaymobPaymentLookup } from "../../api/services/orders.service";

export default function PaymentVerification() {
  const [transactionId, setTransactionId] = useState(() => new URLSearchParams(window.location.search).get("transactionId") ?? "");
  const [result, setResult] = useState<PaymobPaymentLookup | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  if (!isSuperAdmin()) return <Navigate to="/orders" replace />;

  async function check(event: React.FormEvent) {
    event.preventDefault();
    const id = transactionId.trim().replace(/^#/, "").trim();
    setResult(null); setMessage(""); setError("");
    if (!/^[1-9][0-9]{0,17}$/.test(id)) {
      setError("Enter a numeric Paymob transaction ID, for example 36914143.");
      return;
    }
    setBusy(true);
    try {
      setResult((await ordersService.lookupPaymobPayment(id)).data);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not check this payment with Paymob. No payment was confirmed.");
    } finally { setBusy(false); }
  }

  async function confirm() {
    if (!result?.canConfirm || !result.orderId || busy) return;
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await ordersService.confirmPaymobPayment(result.providerTransactionId, result.orderId);
      // The order listener runs after the payment commit. Read again to show the actual order
      // status rather than presenting SUCCESS on a payment row as proof the order was repaired.
      const fresh = (await ordersService.lookupPaymobPayment(result.providerTransactionId)).data;
      setResult(fresh);
      setMessage(fresh.orderStatus === "PENDING_PAYMENT"
        ? "Paymob payment is confirmed, but the order is still awaiting payment. Check the order's payment-review details before retrying."
        : response.data.message);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Could not confirm the payment. Check its status again before retrying.");
      setResult(null);
    } finally { setBusy(false); }
  }

  const box = "rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]";
  return <>
    <PageMeta title="Payment verification | Buyology" description="Check Paymob transactions and recover confirmed order payments" />
    <PageBreadcrumb pageTitle="Payment verification" />
    <section className={box}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Check a Paymob transaction</h2>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Enter the transaction ID from Paymob to find the order and check whether payment completed.</p>
      <form onSubmit={check} className="mt-5 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm text-gray-700 dark:text-gray-300">
          Paymob transaction ID
          <input value={transactionId} onChange={event => { setTransactionId(event.target.value); setResult(null); setMessage(""); setError(""); }}
            disabled={busy} required placeholder="36914143 or #36914143" autoComplete="off"
            className="rounded-lg border border-gray-300 bg-transparent px-4 py-3 dark:border-gray-700" />
        </label>
        <button disabled={busy} className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white disabled:opacity-50" type="submit">{busy ? "Checking…" : "Check payment"}</button>
      </form>
      {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      {message && <p role="status" className="mt-4 text-sm text-gray-700 dark:text-gray-300">{message}</p>}
    </section>
    {result && <section className={`${box} mt-6`}>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment check result</h2>
      <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
        {[["Paymob transaction", result.providerTransactionId], ["Paymob payment", result.gatewayPaid ? "Completed" : "Not confirmed as completed"],
          ["Matched order ID", result.orderId ?? "No matching order"], ["Order status", result.orderStatus ?? "Unavailable"],
          ["Local payment status", result.paymentStatus ?? "No matching attempt"], ["Amount", `${(result.amountCents / 100).toFixed(2)} ${result.currency}`]].map(([label, value]) =>
          <div key={label}><dt className="text-gray-500 dark:text-gray-400">{label}</dt><dd className="mt-1 break-all font-medium text-gray-900 dark:text-white">{value}</dd></div>)}
      </dl>
      <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">{result.message}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        {result.canConfirm && <button onClick={confirm} disabled={busy} className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-medium text-white disabled:opacity-50">{busy ? "Confirming…" : "Confirm payment for this order"}</button>}
        {result.orderId && <Link className="text-sm font-medium text-brand-500 underline" to={`/orders/all/${result.orderId}`}>Open matched order</Link>}
      </div>
    </section>}
  </>;
}
