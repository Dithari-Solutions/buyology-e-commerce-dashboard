import { useEffect, useRef, useState } from "react";
import { hasPermission, hasRole } from "../../api/client";
import { canAccessRoles } from "../../auth/roles";
import { cartActivityService } from "../../api/services/cart-activity.service";
import type { CustomerCart, CustomerCartItem, CustomerCartPage } from "../../api/services/cart-activity.service";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import { Modal } from "../../components/ui/modal";

const panel = "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900";
const input = "w-full rounded-xl border border-gray-300 bg-transparent p-3 text-sm dark:border-gray-700 dark:text-white";
const name = (customer: CustomerCart) => [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer";
const date = (value: string | null) => value ? new Date(value).toLocaleString() : "No recorded additions";
const money = (value: number, currency: string | null) => `${currency || ""} ${Number(value).toFixed(2)}`.trim();
const errorMessage = (err: unknown) => err instanceof Error ? err.message : "Request failed. Please try again.";
function ItemImage({ item }: { item: CustomerCartItem }) {
  const [failed, setFailed] = useState(false);
  return item.image_url && !failed ? <img src={item.image_url} alt={item.title} loading="lazy" onError={() => setFailed(true)} className="h-14 w-14 rounded-lg bg-gray-50 object-contain" />
    : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-xs text-gray-400 dark:bg-gray-800">Item</span>;
}

export default function CartActivityPage() {
  const allowed = canAccessRoles(["CUSTOMER_SUPPORT", "MARKETING", "ADMIN"]) || hasPermission("user:read") || hasPermission("marketing:email:send");
  const canSend = hasRole("SUPERADMIN") || hasPermission("marketing:email:send") || hasRole("ADMIN");
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [withItems, setWithItems] = useState(false);
  const [result, setResult] = useState<CustomerCartPage>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CustomerCart>();
  const [detailError, setDetailError] = useState("");
  const [subject, setSubject] = useState("Your Buyology cart");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState("");
  const attempt = useRef<{ id: string; subject: string; body: string } | null>(null);
  const sendLock = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    if (!allowed) return;
    const controller = new AbortController();
    let inFlight = false;
    const load = async (initial = false) => {
      if (inFlight || (!initial && document.visibilityState !== "visible")) return;
      inFlight = true;
      if (initial) { setLoading(true); setResult(undefined); }
      try {
        const response = await cartActivityService.list(page, query, withItems, controller.signal);
        if (!controller.signal.aborted) { setResult(response.data); setError(""); }
      } catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)); }
      finally { inFlight = false; if (!controller.signal.aborted) setLoading(false); }
    };
    void load(true);
    const timer = setInterval(() => void load(), 15000);
    const focus = () => void load();
    window.addEventListener("focus", focus);
    return () => { controller.abort(); clearInterval(timer); window.removeEventListener("focus", focus); };
  }, [allowed, page, query, withItems, refresh]);
  useEffect(() => {
    if (!selectedId || !allowed) return;
    const controller = new AbortController();
    let inFlight = false;
    const load = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const response = await cartActivityService.detail(selectedId, controller.signal);
        if (!controller.signal.aborted) { setDetail(response.data); setDetailError(""); }
      } catch (err) { if (!controller.signal.aborted) setDetailError(errorMessage(err)); }
      finally { inFlight = false; }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 15000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selectedId, allowed, refresh]);

  function open(customer: CustomerCart) {
    setDetail(undefined); setDetailError(""); setBody(""); setSubject("Your Buyology cart");
    setSendResult(""); attempt.current = null; setSelectedId(customer.user_id);
  }
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (!detail || sendLock.current) return;
    const subjectText = subject.trim(); const bodyText = body.trim();
    if (!subjectText || !bodyText) return;
    if (!attempt.current || attempt.current.subject !== subjectText || attempt.current.body !== bodyText)
      attempt.current = { id: crypto.randomUUID(), subject: subjectText, body: bodyText };
    sendLock.current = true; setSending(true); setSendResult("");
    try {
      const response = await cartActivityService.send(detail.user_id, attempt.current.id, subjectText, bodyText);
      const message = response.data;
      setSendResult(`Email: ${message.email_status.toLowerCase()}. Notification: ${message.notification_status.toLowerCase()}.`);
      if (["ACCEPTED", "FAILED"].includes(message.email_status) && ["QUEUED", "RECORDED"].includes(message.notification_status)) {
        setBody(""); attempt.current = null;
      }
      setRefresh(value => value + 1);
    } catch (err) { setSendResult(errorMessage(err)); }
    finally { sendLock.current = false; setSending(false); }
  }

  if (!allowed) return <div className={panel}>You don’t have permission to view customer cart activity.</div>;
  return <>
    <PageMeta title="Customer Cart Activity | Buyology Dashboard" description="View customer carts and contact customers." />
    <PageBreadcrumb pageTitle="Customer Cart Activity" />
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customers & their carts</h2>
        <p className="mt-1 text-sm text-gray-500">Newest additions first · Updates every 15 seconds</p>
        <p className="mt-1 text-xs text-gray-500">Customer accounts are listed here. Guest carts stored on devices are not visible.</p></div>
      <button type="button" onClick={() => setRefresh(value => value + 1)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700 dark:text-white">Refresh</button>
    </div>
    <div className="mb-5 flex flex-wrap items-center gap-4">
      <input aria-label="Search customers" placeholder="Search name, email or phone…" value={search} onChange={event => setSearch(event.target.value)} className={`${input} max-w-md`} />
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><input type="checkbox" checked={withItems} onChange={event => { setWithItems(event.target.checked); setPage(0); }} />Only customers with cart items</label>
      <span className="text-sm text-gray-500">{result?.totalElements ?? "—"} customers</span>
    </div>
    {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => setRefresh(value => value + 1)} className="underline">Retry</button></p>}
    {loading ? <p className="py-12 text-center text-gray-500">Loading customer carts…</p> : result?.content.length === 0 ? <div className={panel}>No customers match these filters.</div> :
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result?.content.map(customer => <button type="button" key={customer.user_id} onClick={() => open(customer)} className={`${panel} text-left transition hover:border-brand-400 focus-visible:outline-2 focus-visible:outline-brand-500`}>
        <div className="flex items-start gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-lg font-semibold text-brand-600 dark:bg-brand-500/10">{name(customer).slice(0, 1).toUpperCase()}</span>
          <div className="min-w-0 flex-1"><h3 className="truncate font-semibold text-gray-900 dark:text-white">{name(customer)}</h3><p className="break-all text-sm text-gray-500">{customer.email || "Email not provided"}</p><p className="text-sm text-gray-500">{customer.phone_number || "Phone not provided"}</p></div></div>
        <div className="mt-4 flex items-center justify-between text-xs"><span className="rounded-full bg-brand-50 px-3 py-1 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">{customer.item_count} cart lines</span><span className="text-gray-500">{customer.status}</span></div>
        <div className="mt-4 space-y-2">{customer.items.map(item => <div key={item.id} className="flex items-center gap-3"><ItemImage key={item.image_url || item.id} item={item} /><div className="min-w-0"><p className="truncate text-sm text-gray-800 dark:text-gray-200">{item.title}</p><p className="text-xs text-gray-500">Qty {item.quantity} · {money(item.total_price, item.currency)}</p></div></div>)}{Number(customer.item_count) > customer.items.length && <p className="text-xs text-brand-500">+{Number(customer.item_count) - customer.items.length} more items</p>}{!customer.items.length && <p className="py-3 text-sm text-gray-400">Cart is empty</p>}</div>
        <p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-800">Last added: {date(customer.last_added_at)}</p>
      </button>)}</div>}
    {result && result.totalPages > 1 && <div className="mt-6 flex items-center justify-center gap-4 text-sm dark:text-white"><button disabled={page === 0} onClick={() => setPage(value => value - 1)} className="disabled:opacity-40">Previous</button><span>Page {page + 1} of {result.totalPages}</span><button disabled={page + 1 >= result.totalPages} onClick={() => setPage(value => value + 1)} className="disabled:opacity-40">Next</button></div>}
    <Modal isOpen={!!selectedId} onClose={() => { if (!sending) setSelectedId(null); }} className="m-4 max-w-3xl p-6">
      <div role="dialog" aria-modal="true" aria-label="Customer cart details" className="max-h-[80vh] overflow-y-auto pr-2">
        {detailError && <p role="alert" className="text-red-600">{detailError}</p>}
        {!detail && !detailError && <p className="py-10 text-gray-500">Loading cart…</p>}
        {detail && <><h2 className="pr-12 text-xl font-semibold dark:text-white">{name(detail)}</h2><p className="mt-1 text-sm text-gray-500">{detail.email || "No email"} · {detail.phone_number || "No phone"}</p>
          <h3 className="mb-3 mt-6 font-semibold dark:text-white">Current cart items ({detail.item_count})</h3>
          <p className="mb-3 text-xs text-gray-500">Recorded cart prices; the customer’s checkout confirms current prices. Unselected items are marked below.</p>
          <div className="space-y-3">{detail.items.map(item => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3 dark:border-gray-800"><ItemImage key={item.image_url || item.id} item={item} /><div className="min-w-0 flex-1"><p className="text-sm font-medium dark:text-white">{item.title}</p><p className="text-xs text-gray-500">{item.variant_sku || item.sku} · Qty {item.quantity} · {money(item.unit_price, item.currency)} each</p><p className="text-xs text-gray-500">{item.country_code}{!item.selected && " · Not selected for checkout"}</p></div><span className="text-sm dark:text-white">{money(item.total_price, item.currency)}</span></div>)}{!detail.items.length && <p className="text-sm text-gray-500">This customer’s cart is empty.</p>}</div>
          <form onSubmit={send} className="mt-6 space-y-3 border-t border-gray-100 pt-5 dark:border-gray-800"><h3 className="font-semibold dark:text-white">Email & notify customer</h3><p className="text-xs text-gray-500">Sent to one eligible email address on this account and saved in the customer’s notification inbox. Device push requires notification permission.</p>
            {!canSend && <p className="text-sm text-gray-500">Sending requires customer email permission.</p>}
            <label className="block text-sm dark:text-white">Subject<input required maxLength={160} disabled={!canSend || sending} value={subject} onChange={event => setSubject(event.target.value)} className={`${input} mt-1`} /></label>
            <label className="block text-sm dark:text-white">Message<textarea required maxLength={5000} rows={5} disabled={!canSend || sending} value={body} onChange={event => setBody(event.target.value)} placeholder="Write your message to this customer…" className={`${input} mt-1`} /></label>
            <button disabled={!canSend || sending || !subject.trim() || !body.trim()} className="rounded-xl bg-brand-500 px-5 py-3 text-sm font-medium text-white disabled:opacity-40">{sending ? "Sending…" : "Send email & notification"}</button>
            {sendResult && <p role="status" className="text-sm text-gray-600 dark:text-gray-300">{sendResult}</p>}
          </form>
          {!!detail.messages?.length && <div className="mt-6"><h3 className="mb-3 font-semibold dark:text-white">Recent messages</h3>{detail.messages.map(message => <div key={message.id} className="mb-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800"><p className="text-sm font-medium dark:text-white">{message.subject}</p><p className="mt-1 whitespace-pre-wrap text-sm text-gray-500">{message.body}</p><p className="mt-2 text-xs text-gray-500">{date(message.created_at)} · Email {message.email_status.toLowerCase()} · Notification {message.notification_status.toLowerCase()}</p></div>)}</div>}
        </>}
      </div>
    </Modal>
  </>;
}
