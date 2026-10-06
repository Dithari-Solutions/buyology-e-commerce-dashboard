import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { Modal } from "../../components/ui/modal";
import ExportStoreProductsModal from "../../components/store/ExportStoreProductsModal";
import { storeProductsService, ApiRequestError } from "../../api";
import type {
  StoreProductResponse,
  StoreVariantResponse,
  UpdateStoreProductRequest,
  AssignVariantToStoreRequest,
  UpdateStoreVariantRequest,
  DiscountType,
} from "../../types";
import { useStoreCurrencies } from "../../hooks/useStoreCurrencies";
import { productLabel } from "../../utils/storeProduct";
import {
  dubaiInstantFromLocalInput,
  dubaiLocalInputValue,
  formatDubai,
  formatDubaiSaleEnd,
  formatMoney,
  isFlashSale,
  resolveDiscountStatus,
  serverSaysEnded,
  serverSaysLive,
} from "../../utils/flashSale";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(iso));
}

/**
 * The discount as a phrase, or an em dash when there is nothing to say.
 *
 * Both halves of a discount are nullable and the API sets them together, so a type with no value is
 * not a state it produces — but it is a state the TYPE allows, and the `discountValue!` this used to
 * carry turned that into `undefined.toLocaleString()`, which throws inside the map and takes the
 * whole table down with it rather than blanking one cell. A row that somehow lost half its discount
 * is worth a dash; it is not worth the other 200 rows.
 */
function discountLabel(sp: StoreProductResponse, currency: string): string {
  if (!sp.discountType || sp.discountValue == null) return "—";
  if (sp.discountType === "PERCENTAGE") return `${sp.discountValue}% OFF`;
  return `Sale: ${formatMoney(sp.discountValue, currency)}`;
}

// ---------------------------------------------------------------------------
// Shared style constants
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

const labelCls = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1";

const selectCls =
  "w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-800 dark:text-white focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 transition-all";

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Edit Store Product Modal
// ---------------------------------------------------------------------------

interface EditStoreProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeProduct: StoreProductResponse;
  /** ISO code this store prices in, or "" when it could not be resolved. */
  currency: string;
  onSaved: (updated: StoreProductResponse) => void;
}

function EditStoreProductModal({
  isOpen,
  onClose,
  storeId,
  storeProduct,
  currency,
  onSaved,
}: EditStoreProductModalProps) {
  const [form, setForm] = useState<UpdateStoreProductRequest>({
    storePrice: storeProduct.storePrice,
    discountType: storeProduct.discountType ?? undefined,
    discountValue: storeProduct.discountValue ?? undefined,
    isActive: storeProduct.isActive,
    b2cEnabled: storeProduct.b2cEnabled,
    b2bEnabled: storeProduct.b2bEnabled,
  });
  // The window is held as Dubai wall-clock text, the way the inputs show it, and converted to an
  // instant only on save — so what the admin reads back is exactly what they set.
  const [startsAtLocal, setStartsAtLocal] = useState(dubaiLocalInputValue(storeProduct.discountStartsAt));
  const [endsAtLocal, setEndsAtLocal] = useState(dubaiLocalInputValue(storeProduct.discountEndsAt));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Emptying both dates does not just drop a schedule — it makes the discount permanent, and on a
  // sale that has finished that quietly starts charging the sale price again. Asked for explicitly.
  const [confirmPermanent, setConfirmPermanent] = useState(false);

  useEffect(() => {
    setForm({
      storePrice: storeProduct.storePrice,
      discountType: storeProduct.discountType ?? undefined,
      discountValue: storeProduct.discountValue ?? undefined,
      isActive: storeProduct.isActive,
      b2cEnabled: storeProduct.b2cEnabled,
      b2bEnabled: storeProduct.b2bEnabled,
    });
    setStartsAtLocal(dubaiLocalInputValue(storeProduct.discountStartsAt));
    setEndsAtLocal(dubaiLocalInputValue(storeProduct.discountEndsAt));
    setError(null);
    setConfirmPermanent(false);
  }, [storeProduct]);

  // What the inputs were filled from. A date the admin never touched must not be re-sent: the
  // server validates the window as a pair against now, so re-sending a lapsed sale's own end date
  // is refused — which would make every listing with a finished sale impossible to edit at all.
  const savedStartsLocal = dubaiLocalInputValue(storeProduct.discountStartsAt);
  const savedEndsLocal = dubaiLocalInputValue(storeProduct.discountEndsAt);
  const startChanged = startsAtLocal !== savedStartsLocal;
  const endChanged = endsAtLocal !== savedEndsLocal;

  const hadWindow = !!storeProduct.discountStartsAt || !!storeProduct.discountEndsAt;
  // Both dates emptied on a discount that had a window: the row becomes a permanent markdown.
  const clearingWindow = !!form.discountType && hadWindow && !startsAtLocal && !endsAtLocal;

  // TWO verdicts on the same window, and which one is allowed where is the whole point.
  //
  // `endedOnScreen` is the cautious shared rule — the server's flag reconciled with this browser's
  // clock, the less generous answer winning. It is what this modal may SAY, because a sentence that
  // over-warns costs a refresh.
  //
  // `endedPerServer` is the shop's own answer and nothing else. It is the only one allowed to shape
  // the REQUEST, because the request can delete the sale's end date, and a browser clock running a few
  // hours fast would then turn "edit the discount" into "delete the end date" on a campaign that is
  // still running — a sale that never expires, at prices nobody reviewed, because of a wrong clock on
  // one laptop. The server owns whether a window has ended; see serverSaysEnded.
  const endedOnScreen = resolveDiscountStatus(storeProduct) === "ENDED";
  const endedPerServer = serverSaysEnded(storeProduct);
  // The shop says the sale is being applied while this screen's clock puts it outside its window.
  // Whatever else is true, "this sale has ended" is not, so the panels below must not say it.
  const shopStillCharging = serverSaysLive(storeProduct);

  // What is in the inputs now, as instants. Derived here rather than inside handleSave because the
  // panels below have to state what saving will do before it is saved.
  const startsAt = form.discountType ? dubaiInstantFromLocalInput(startsAtLocal) : null;
  const endsAt = form.discountType ? dubaiInstantFromLocalInput(endsAtLocal) : null;
  const removingDiscount = !form.discountType;
  const sendingStart = !removingDiscount && !clearingWindow && !!startsAt && startChanged;
  const sendingEnd = !removingDiscount && !clearingWindow && !!endsAt && endChanged;

  // The discount itself is re-sent ONLY when it changed, for the same reason the dates are.
  // The server reads a discount arriving with no dates as a new one, and a new discount does not
  // inherit a window that has already run out — it drops the dead dates and keeps the markdown. So
  // re-sending an untouched discountType/discountValue while correcting a store price or flipping a
  // channel would quietly turn last month's finished sale into a permanent one, charged from now on.
  const savedType = storeProduct.discountType ?? undefined;
  const savedValue = storeProduct.discountValue ?? undefined;
  const discountChanged =
    form.discountType !== savedType || (form.discountValue ?? undefined) !== savedValue;

  // Changing the discount on a sale that has already finished IS making it permanent, because the
  // server drops the finished window along with the discount it belonged to. That is the same decision
  // as blanking both dates, so it is asked for the same way rather than happening on the way past.
  //
  // Judged on the SERVER's verdict, not this screen's: the confirmation is a claim about what the save
  // will do, and the save's effect on the window is decided by the shop's clock. Where the flag is
  // absent — a backend older than it — this is false and the confirmation is not asked for, which is
  // the safe direction to be wrong in: the window is untouched either way, and the alternative is
  // demanding confirmation for making permanent a sale that is in fact still running.
  const revivingEndedDiscount =
    !removingDiscount && !clearingWindow && !sendingStart && !sendingEnd && endedPerServer && discountChanged;
  const becomingPermanent = clearingWindow || revivingEndedDiscount;

  // A confirmation authorises ONE save. Left ticked it silently pre-approves the next: the panel
  // disappears when a date is typed back in and reappears already agreed to if the dates are cleared
  // again, so the second permanent discount is made with nobody confirming it. This is the case the
  // failed save leaves behind — the modal stays open with the box still ticked.
  useEffect(() => {
    if (!becomingPermanent) setConfirmPermanent(false);
  }, [becomingPermanent]);

  // No variant panel here, on purpose. This discount applies to the LISTING, and a cart line is
  // priced from the listing whether or not it names a variant — so there is nothing per-variant for
  // this modal to preview. Manage Variants edits each variant's own price column, which is store
  // bookkeeping and not a figure any customer is charged.

  async function handleSave() {
    // The store price is on every one of these requests, so an empty box is not "leave it alone" —
    // it is a price. Refused rather than sent, and refused at zero too: zero is the one value that
    // passes the API's own @DecimalMin("0.00") and gives the shop something to sell for nothing.
    // A listing already stored at zero therefore cannot be saved until a real price is typed, which
    // is the right way round — this is the screen where that gets fixed.
    const storePrice = form.storePrice;
    if (storePrice == null || !(storePrice > 0)) {
      setError("Enter a store price above zero — a listing priced at nothing is sold for nothing.");
      return;
    }
    if (startsAt && endsAt && Date.parse(startsAt) >= Date.parse(endsAt)) {
      setError("The discount has to start before it ends.");
      return;
    }
    // The discount's own value, checked here and not only by the server. Every one of these is a
    // refusal the API already makes, so nothing new is being enforced — but this modal saves a store
    // PRICE and two channel flags in the same request, and a 400 on the discount loses all of it.
    if (!removingDiscount) {
      const value = form.discountValue;
      // Absent, not zero: the input reports an emptied box as undefined precisely so this reads as
      // "no discount was typed" rather than as a discount of nothing.
      if (value == null || !(value > 0)) {
        setError("Enter a discount above zero, or set Discount to None to take it off.");
        return;
      }
      // Stricter than the API, which refuses only above 100. A 100% discount does not give anything
      // away — the price floor clamps it to the minimum unit price — so it is a typo every time, and
      // the flash-sale screen has always refused it. One rule across the dashboard.
      if (form.discountType === "PERCENTAGE" && value >= 100) {
        setError("A percentage discount must be under 100%.");
        return;
      }
      // A FIXED value IS the sale price, so it has to be below the price it replaces — above it, the
      // "sale" is a price rise. There is no separate "needs a price above zero to discount from" check
      // any more: the store-price refusal at the top of this function has already guaranteed one.
      if (form.discountType === "FIXED" && value >= storePrice) {
        setError(
          `A fixed sale price of ${formatMoney(value, currency)} is not below the store price of `
            + `${formatMoney(storePrice, currency)} — that is a price rise, not a sale.`
        );
        return;
      }
    }

    // On this PATCH a null or absent field means "leave unchanged" — on EVERY field, the two dates
    // included. So removing something is asked for with a flag, never by sending a null, and the
    // window is expressed as one of three requests rather than two nullable dates.
    //
    // The endpoint also clears the window as a pair, so blanking one date while keeping the other is
    // not something one request can say. Better to refuse than to save a date the admin deleted.
    if (!removingDiscount && hadWindow && !clearingWindow) {
      if (!startsAt && !!storeProduct.discountStartsAt) {
        setError(
          "The start and end are removed together, so an end with no start is not a request this API can make. "
            + "To bring the sale forward, use Start now — a start of this moment prices exactly like no start "
            + "at all — or clear both dates to make the discount permanent."
        );
        return;
      }
      if (!endsAt && !!storeProduct.discountEndsAt) {
        setError(
          "Clear both dates to make this a permanent discount, or set an end as well — the start and end are removed together."
        );
        return;
      }
    }
    // Two empty dates mean "never ends", which is a promotion, not a tidy-up: the sale price starts
    // being charged indefinitely. Not something to do by accident on the way past.
    if (becomingPermanent && !confirmPermanent) {
      setError(
        clearingWindow
          ? "Confirm the discount should become permanent — with no dates it applies from now on, with nothing to expire it."
          : "This sale has already ended, so changing its discount makes the discount permanent — confirm that, or give it an end date in the future to run it as a sale again."
      );
      return;
    }

    // Only dates the admin actually changed are sent. The server then validates the pair — the new
    // value plus whatever is stored — against its own clock, so a window whose end has already passed
    // can only be re-sent by moving it into the future. Said here so the admin gets a sentence they
    // can act on instead of a 400.
    //
    // WHICH clock decides depends on which end is being relied on, and neither choice is arbitrary.
    // An end the admin has just typed is theirs to be told about: they set it against the clock in
    // front of them, and "that is in the past" is a message, not an action. A STORED end is the
    // shop's business, and this refusal is the only thing standing between the admin and an edit the
    // server would have accepted — so a fast browser clock must not be what blocks it.
    if (sendingEnd && endsAt && Date.parse(endsAt) < Date.now()) {
      setError(
        `That end — ${formatDubai(endsAt)} — has already passed. Give the sale an end in the future to run it `
          + "again, clear both dates to make the discount permanent, or set Discount to None to remove it."
      );
      return;
    }
    if (sendingStart && !sendingEnd && endedPerServer) {
      setError(
        `This sale ended on ${formatDubai(storeProduct.discountEndsAt)}, so moving its start alone leaves it `
          + "finished. Set an end in the future as well, clear both dates to make the discount permanent, or "
          + "set Discount to None to remove it."
      );
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: UpdateStoreProductRequest = {
        storePrice,
        isActive: form.isActive,
        // Removing the discount removes its window with it, in one flag — otherwise the row keeps
        // dates for a discount that no longer exists.
        ...(removingDiscount
          ? { clearDiscount: true }
          : {
              // Only when it actually changed — see discountChanged above.
              ...(discountChanged && {
                discountType: form.discountType,
                discountValue: form.discountValue,
              }),
              // clearDiscountWindow is a DESTRUCTIVE instruction — it deletes both dates — so it is
              // sent for exactly one reason: the admin emptied both boxes. That is an action they took,
              // not a conclusion drawn from a clock.
              //
              // It used to be sent for a second reason as well: because this screen had decided the
              // sale was over. Which meant a browser clock an hour fast read "edit the discount" as
              // "and delete the end date", and the campaign it was told to adjust stopped ever
              // expiring. Reviving a genuinely finished sale needs no flag anyway — the server drops a
              // window that has run out on its OWN clock when a new discount arrives with no dates
              // (StoreProductService.update), and only one that has really run out. So the outcome is
              // the same where the clocks agree, and correct where they do not.
              ...(clearingWindow
                ? { clearDiscountWindow: true }
                : {
                    ...(sendingStart && { discountStartsAt: startsAt as string }),
                    ...(sendingEnd && { discountEndsAt: endsAt as string }),
                  }),
            }),
        b2cEnabled: form.b2cEnabled,
        b2bEnabled: form.b2bEnabled,
      };
      const res = await storeProductsService.update(storeId, storeProduct.id, payload);
      // The confirmation is spent. It authorised this save and must not carry into the next one.
      setConfirmPermanent(false);
      onSaved(res.data);
      onClose();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="p-6 space-y-5">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Edit Store Product
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 -mt-3">
          {productLabel(storeProduct)}{" "}
          <span className="font-mono text-xs text-gray-400">{storeProduct.productSku}</span>
        </p>

        {/* Store Price */}
        <div>
          <label className={labelCls}>Store Price{currency && ` (${currency})`}</label>
          <input
            type="number"
            min={0}
            step={0.01}
            className={inputCls}
            value={form.storePrice ?? ""}
            onChange={(e) => {
              // `parseFloat(x) || 0` read an EMPTY box as a store price of zero — and this field is
              // sent on every save, so clearing it and pressing Save published a listing priced at
              // nothing. The API takes it (@DecimalMin("0.00") allows zero), the storefront shows it,
              // and the first order for it is free. Nobody clears a price box to mean zero, so an
              // unreadable box is "nothing typed" — undefined — and handleSave refuses to send it.
              const parsed = parseFloat(e.target.value);
              setForm((f) => ({ ...f, storePrice: Number.isNaN(parsed) ? undefined : parsed }));
            }}
          />
        </div>

        {/* Discount Type */}
        <div>
          <label className={labelCls}>Discount</label>
          <select
            className={selectCls}
            value={form.discountType ?? "NONE"}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({
                ...f,
                discountType: val === "NONE" ? undefined : (val as DiscountType),
                discountValue: val === "NONE" ? undefined : f.discountValue,
              }));
            }}
          >
            <option value="NONE">None</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed Sale Price</option>
          </select>
        </div>

        {/* Discount Value */}
        {form.discountType && (
          <div>
            <label className={labelCls}>
              {form.discountType === "PERCENTAGE"
                ? "Discount %"
                : `Fixed Sale Price${currency ? ` (${currency})` : ""}`}
            </label>
            <input
              type="number"
              min={0}
              step={form.discountType === "PERCENTAGE" ? 1 : 0.01}
              className={inputCls}
              value={form.discountValue ?? ""}
              onChange={(e) => {
                // `parseFloat(x) || 0` turned a cleared box — and the "-" or "." of a number being
                // typed — into a discount of 0, which is a value the checks above cannot tell from a
                // deliberate one. Undefined is what "nothing typed" means, and it is what they test.
                const parsed = parseFloat(e.target.value);
                setForm((f) => ({
                  ...f,
                  discountValue: Number.isNaN(parsed) ? undefined : parsed,
                }));
              }}
            />
          </div>
        )}

        {/* Sale window — an end date turns this discount into a flash sale that expires itself */}
        {form.discountType && (
          <div className="space-y-3">
            <div>
              <div className="flex items-end justify-between">
                <label className={labelCls}>Discount starts (optional, Dubai time)</label>
                {/* Emptying this box is refused on save, because the API clears the window as a PAIR
                    — "no start, keep the end" is not a request it can express. A start of NOW prices
                    identically and is expressible, so the intent behind clearing the start has a
                    button rather than only an error message. */}
                {(startsAtLocal || storeProduct.discountStartsAt) && (
                  <button
                    type="button"
                    onClick={() => setStartsAtLocal(dubaiLocalInputValue(new Date().toISOString()))}
                    className="mb-1 text-xs font-medium text-brand-500 hover:text-brand-600"
                    title="Bring the sale forward to this moment — the same thing as no start date, said in a way the API accepts"
                  >
                    Start now
                  </button>
                )}
              </div>
              <input
                type="datetime-local"
                className={inputCls}
                value={startsAtLocal}
                onChange={(e) => setStartsAtLocal(e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Discount ends (optional, Dubai time)</label>
              <input
                type="datetime-local"
                className={inputCls}
                value={endsAtLocal}
                onChange={(e) => setEndsAtLocal(e.target.value)}
              />
            </div>
            <p className="text-xs text-gray-400">
              Both blank = a permanent discount, exactly as before. An end date expires the discount on its
              own; nothing has to be cleared afterwards.
            </p>

            {/* The caption reads the box back EXACTLY, to the minute, and that is the whole point of
                it: the input above is an exact instant the admin sets, and the caption is the only
                confirmation of what was set.
                It used to run the instant through formatDubaiSaleEnd, which renders a midnight as "the
                whole of the day before, end of day Dubai". That is the right reading of a stored end
                that came from a bare DATE elsewhere in the dashboard — "ends 31 March" is kept as
                midnight on 1 April — but here it put a caption saying 31 March directly beneath a box
                reading 2026-04-01 00:00. One of the two had to be wrong to the admin, and the box is
                what they typed. So this screen, the one that edits the instant, states the instant;
                the tables, which only display a stored end, keep the inclusive-day reading. */}
            {endsAtLocal && (
              <p className="text-xs text-brand-600 dark:text-brand-400">
                {endsAt ? (
                  <>
                    The discount applies up to <strong>{formatDubai(endsAt)}</strong>, and not after it.
                  </>
                ) : (
                  "That end date and time could not be read — set it again."
                )}
              </p>
            )}

            {endedOnScreen && !becomingPermanent && !endChanged && (
              <p className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-700 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                {shopStillCharging ? (
                  <>
                    This screen's clock puts this sale past its end, but the shop reports it as still being
                    applied — and the shop is what customers are charged against. Refresh, and check this
                    device's clock, before deciding the sale is over.
                  </>
                ) : (
                  <>
                    This sale has already ended, so the customer is paying the normal price. Everything else on
                    this listing is still editable — the discount and its dates are only re-sent if you change
                    them.
                  </>
                )}
              </p>
            )}

            {becomingPermanent && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  {clearingWindow ? (
                    <>
                      With both dates empty this stops being a flash sale and becomes a{" "}
                      <strong>permanent discount</strong>: the sale price is charged from now on, with nothing
                      to expire it.
                      {endedPerServer && " This sale has already ended — clearing the dates starts charging it again."}
                    </>
                  ) : (
                    <>
                      This sale ended on {formatDubai(storeProduct.discountEndsAt)}. Changing its
                      discount takes the finished window with it, so what is left is a{" "}
                      <strong>permanent discount</strong> charged from now on. To run it as a sale again, give
                      it an end date in the future instead.
                    </>
                  )}
                </p>
                <label className="flex items-center gap-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                  <input
                    type="checkbox"
                    checked={confirmPermanent}
                    onChange={(e) => setConfirmPermanent(e.target.checked)}
                  />
                  Yes, make this discount permanent
                </label>
              </div>
            )}
          </div>
        )}

        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <span className={labelCls + " mb-0"}>Active on storefront</span>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.isActive ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.isActive ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Sales channels — B2C / B2B */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
          {/* B2C toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available in consumer shop (B2C)
              </span>
              <p className="text-xs text-gray-400">Shown to regular shoppers in the storefront.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, b2cEnabled: !f.b2cEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.b2cEnabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.b2cEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* B2B toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Available for B2B (bulk/quotes)
              </span>
              <p className="text-xs text-gray-400">Listed in the B2B catalog for quote requests.</p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, b2bEnabled: !f.b2bEnabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.b2bEnabled ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.b2bEnabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* B2B-only helper */}
          {form.b2bEnabled && !form.b2cEnabled && (
            <p className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 px-4 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              B2B-only: this product is hidden from the consumer shop and appears only in the B2B
              catalog (bulk orders via quote requests).
            </p>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
          >
            {saving && <Spinner />}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Manage Variants Modal
// ---------------------------------------------------------------------------

interface ManageVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
  storeProduct: StoreProductResponse;
  /** ISO code this store prices in, or "" when it could not be resolved. */
  currency: string;
  onUpdated: (updated: StoreProductResponse) => void;
}

function ManageVariantsModal({
  isOpen,
  onClose,
  storeId,
  storeProduct,
  currency,
  onUpdated,
}: ManageVariantsModalProps) {
  const [variants, setVariants] = useState<StoreVariantResponse[]>(storeProduct.variants);
  // `storePrice` is optional HERE and required on the request, deliberately. The assign endpoint has
  // it @NotNull, so unlike the edit row below there is no "leave it unchanged" to fall back on — which
  // is precisely why an empty box must not become a number. Undefined is "nothing typed", handleAdd
  // refuses it, and the request is built from a value that has been checked.
  const [addForm, setAddForm] = useState<{
    variantId: string;
    storePrice?: number;
    stock: number;
    isActive: boolean;
  }>({
    variantId: "",
    stock: 0,
    isActive: true,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<UpdateStoreVariantRequest>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVariants(storeProduct.variants);
    setError(null);
  }, [storeProduct]);

  async function handleAdd() {
    if (!addForm.variantId.trim()) return;
    // The recorded price is @NotNull on this endpoint and @DecimalMin("0.00") — so zero is accepted,
    // and an empty box read as zero is stored as a variant this store says is worth nothing. It is
    // not a price anyone is charged (the listing's is), but it is the shop's own record of what the
    // SKU is worth, used for stock valuation, and a silent zero in it is wrong data rather than a
    // pricing incident. Refused with a sentence instead of sent.
    const recordedPrice = addForm.storePrice;
    if (recordedPrice == null || !(recordedPrice > 0)) {
      setError("Enter a recorded price above zero for this variant — see the note above on what it is for.");
      return;
    }
    const payload: AssignVariantToStoreRequest = {
      variantId: addForm.variantId,
      storePrice: recordedPrice,
      stock: addForm.stock,
      isActive: addForm.isActive,
    };
    setSaving(true);
    setError(null);
    try {
      const res = await storeProductsService.assignVariant(storeId, storeProduct.id, payload);
      const updated = { ...storeProduct, variants: [...variants, res.data] };
      setVariants(updated.variants);
      onUpdated(updated);
      setAddForm({ variantId: "", stock: 0, isActive: true });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to assign variant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(v: StoreVariantResponse) {
    setSaving(true);
    setError(null);
    try {
      const res = await storeProductsService.updateVariant(storeId, storeProduct.id, v.id, editForm);
      const updatedVariants = variants.map((x) => (x.id === v.id ? res.data : x));
      setVariants(updatedVariants);
      onUpdated({ ...storeProduct, variants: updatedVariants });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update variant.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(variantId: string) {
    setRemoving(variantId);
    setError(null);
    try {
      await storeProductsService.removeVariant(storeId, storeProduct.id, variantId);
      const updatedVariants = variants.filter((v) => v.id !== variantId);
      setVariants(updatedVariants);
      onUpdated({ ...storeProduct, variants: updatedVariants });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to remove variant.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl w-full">
      <div className="p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Manage Variants</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {productLabel(storeProduct)}
          </p>
        </div>

        {/* The one thing about this screen an admin would otherwise read backwards. A variant's price
            column is not a price anyone is charged: a cart line takes the LISTING's price and its
            discount whichever variant it names. Stock is the number that does bite here. */}
        <p className="rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-gray-700 px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">
          Stock is per variant. Price is not: a customer pays this listing&apos;s price — and its sale price
          while a sale is running — whichever variant they pick. The prices here are your own record of what
          each variant is worth.
        </p>

        {/* Variant list */}
        {variants.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-700 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            {variants.map((v) => (
              <div key={v.id} className="px-4 py-3 bg-white dark:bg-gray-800">
                {editingId === v.id ? (
                  <div className="space-y-3">
                    <p className="text-xs font-mono text-gray-500">{v.variantSku}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        {/* NOT "Price", and not "Store Price" either — that is the name of the one
                            figure a customer is charged, and it lives on the listing. Calling this
                            field by it is the whole reason an admin reads this screen as setting what
                            each variant sells for. It sets a number the shop records and never bills. */}
                        <label className={labelCls}>Recorded price</label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className={inputCls}
                          defaultValue={v.storePrice}
                          onChange={(e) => {
                            // Undefined, not 0: on this PATCH an absent field means "leave unchanged",
                            // so a cleared box leaves the recorded price alone instead of zeroing it.
                            const parsed = parseFloat(e.target.value);
                            setEditForm((f) => ({
                              ...f,
                              storePrice: Number.isNaN(parsed) ? undefined : parsed,
                            }));
                          }}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Stock</label>
                        <input
                          type="number"
                          min={0}
                          className={inputCls}
                          defaultValue={v.stock}
                          onChange={(e) =>
                            setEditForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdate(v)}
                        disabled={saving}
                        className="flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
                      >
                        {saving && <Spinner />}
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-mono text-gray-700 dark:text-gray-300">{v.variantSku}</p>
                      {/* The variant's own price column, and only that. It is not what a cart line
                          costs: a line is priced from the listing's price and discount whether or not
                          it names a variant, so a sale never shows up here. A version of this screen
                          did render a struck-through per-variant sale price, which read as though the
                          two numbers could differ — they cannot, and saying they can is how the next
                          person builds a charge path that makes it true. */}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {formatMoney(v.storePrice, currency)} · Stock: {v.stock}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={v.isActive ? "success" : "error"}>
                        {v.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(v.id);
                          setEditForm({ storePrice: v.storePrice, stock: v.stock, isActive: v.isActive });
                        }}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                        title="Edit variant"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(v.id)}
                        disabled={removing === v.id}
                        className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50"
                        title="Remove variant"
                      >
                        {removing === v.id ? (
                          <Spinner />
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No variants assigned yet.
          </p>
        )}

        {/* Add variant */}
        <div className="rounded-xl border border-dashed border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Add Variant
          </p>
          <div>
            <label className={labelCls}>Global Variant ID</label>
            <input
              type="text"
              className={inputCls}
              placeholder="UUID from global product variants"
              value={addForm.variantId}
              onChange={(e) => setAddForm((f) => ({ ...f, variantId: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              {/* Same renaming as the edit row above, and for the same reason. */}
              <label className={labelCls}>Recorded price{currency && ` (${currency})`}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                value={addForm.storePrice ?? ""}
                onChange={(e) => {
                  // Undefined, not 0 — the same reason as the edit row, minus its escape hatch. This
                  // field is @NotNull on the assign request, so "nothing typed" cannot be expressed to
                  // the server at all; it has to be caught here, and handleAdd does.
                  const parsed = parseFloat(e.target.value);
                  setAddForm((f) => ({ ...f, storePrice: Number.isNaN(parsed) ? undefined : parsed }));
                }}
              />
            </div>
            <div>
              <label className={labelCls}>Stock</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={addForm.stock || ""}
                onChange={(e) => setAddForm((f) => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !addForm.variantId.trim()}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
              {saving && <Spinner />}
              Add Variant
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Remove Confirm Modal
// ---------------------------------------------------------------------------

interface RemoveConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  productTitle: string;
  removing: boolean;
  onConfirm: () => void;
}

function RemoveConfirmModal({ isOpen, onClose, productTitle, removing, onConfirm }: RemoveConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-sm w-full">
      <div className="p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">Remove Product from Store</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Remove <strong>{productTitle}</strong> from your store? This will hide the product from customers. The global product is not affected.
        </p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={removing}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60 transition-colors"
          >
            {removing && <Spinner />}
            Remove
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// StoreProducts Page
// ---------------------------------------------------------------------------

export default function StoreProducts() {
  const { id: storeId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // One currency for the whole page — every price here belongs to this one store. Best-effort: an
  // unresolved currency renders the bare figure, as this table always did.
  const { currencyOf } = useStoreCurrencies();
  const currency = currencyOf(storeId ?? "");

  // One clock for the whole table. Read per row instead — which is what the default argument of
  // resolveDiscountStatus does — and two rows could straddle the instant a sale expires, one still
  // inside its window while the next is already Ended. Nothing here counts down, so once per render
  // is enough.
  const now = Date.now();

  const [products, setProducts] = useState<StoreProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<StoreProductResponse | null>(null);
  const [variantTarget, setVariantTarget] = useState<StoreProductResponse | null>(null);
  const [removeTarget, setRemoveTarget] = useState<StoreProductResponse | null>(null);
  const [removing, setRemoving] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!storeId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await storeProductsService.list(storeId, signal);
        setProducts(res.data);
      } catch (err) {
        if ((err as { name?: string }).name === "AbortError") return;
        setError(err instanceof ApiRequestError ? err.message : "Failed to load products.");
      } finally {
        setLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
  }, [load]);

  async function handleRemoveConfirm() {
    if (!storeId || !removeTarget) return;
    setRemoving(true);
    try {
      await storeProductsService.remove(storeId, removeTarget.id);
      setProducts((ps) => ps.filter((p) => p.id !== removeTarget.id));
      setRemoveTarget(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to remove.");
    } finally {
      setRemoving(false);
    }
  }

  function handleUpdated(updated: StoreProductResponse) {
    setProducts((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
  }

  return (
    <>
      <PageMeta title="Store Products" description="Manage products assigned to this store" />
      <PageBreadcrumb pageTitle="Store Products" />

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Store Products</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Products assigned to this store with local pricing and stock.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              disabled={loading || products.length === 0}
              className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              Export
            </button>
            <button
              type="button"
              onClick={() => navigate(`/stores/${storeId}/products/assign`)}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Assign Product
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center items-center py-20 text-gray-400">
            <Spinner />
            <span className="ml-2 text-sm">Loading products…</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              type="button"
              onClick={() => load()}
              className="mt-3 text-sm font-medium text-red-600 dark:text-red-400 underline"
            >
              Retry
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 py-20 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">No products assigned to this store yet.</p>
            <button
              type="button"
              onClick={() => navigate(`/stores/${storeId}/products/assign`)}
              className="mt-3 text-sm font-semibold text-brand-500 hover:text-brand-600"
            >
              Assign your first product
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Sale Price
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Variants
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Updated
                    </th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {products.map((sp) => {
                    // The one shared rule — the same one the Flash Sale page badges with, so a
                    // scheduled or finished sale cannot read as live on one screen and not the other.
                    const state = resolveDiscountStatus(sp, now);
                    // effectivePrice is as old as the fetch: a sale that lapsed while this table was
                    // open still carries the discounted figure, so the window decides too.
                    const hasDiscount = state === "LIVE" && sp.effectivePrice < sp.storePrice;
                    // The badge takes the cautious verdict, which is right to badge and wrong to leave
                    // unexplained: where the shop says the sale IS being applied and this screen's clock
                    // says it is not, "Ended" is a statement about a price that is still being charged.
                    // The Flash Sale table has said so since it shipped; this one said nothing, so an
                    // admin with a fast clock saw a running campaign marked Ended and no reason why.
                    const shopStillCharging = serverSaysLive(sp, now);
                    return (
                      <tr
                        key={sp.id}
                        className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        {/* Product */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-800 dark:text-white/90 truncate max-w-[200px]">
                            {productLabel(sp)}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-gray-400">{sp.productSku}</p>
                        </td>

                        {/* Store Price */}
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                          {formatMoney(sp.storePrice, currency)}
                        </td>

                        {/* Effective / Sale Price */}
                        <td className="px-4 py-4">
                          {hasDiscount ? (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {formatMoney(sp.effectivePrice, currency)}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>

                        {/* Discount + where it sits in its window */}
                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                          <span className="block">{discountLabel(sp, currency)}</span>
                          {state === "SCHEDULED" && (
                            <span className="mt-1 inline-block">
                              <Badge color="info" size="sm">Scheduled</Badge>
                            </span>
                          )}
                          {state === "ENDED" && (
                            <span
                              className="mt-1 inline-block"
                              title={
                                shopStillCharging
                                  ? "The shop reports this sale as live while this screen's clock puts it outside its window. Customers are charged against the shop — refresh, and check this device's clock."
                                  : undefined
                              }
                            >
                              <Badge color="error" size="sm">Ended</Badge>
                            </span>
                          )}
                          {shopStillCharging && (
                            <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-400">
                              The shop is still charging it — refresh
                            </span>
                          )}
                          {isFlashSale(sp) && (
                            <span className="mt-0.5 block text-xs text-gray-400">
                              {state === "ENDED" ? "Ended after" : "Through"}{" "}
                              {formatDubaiSaleEnd(sp.discountEndsAt)}
                            </span>
                          )}
                        </td>

                        {/* Variants */}
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => setVariantTarget(sp)}
                            className="text-brand-500 hover:text-brand-600 hover:underline text-sm font-medium"
                          >
                            {sp.variants.length} variant{sp.variants.length !== 1 ? "s" : ""}
                          </button>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-4">
                          <Badge color={sp.isActive ? "success" : "error"}>
                            {sp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        {/* Channel — B2C / B2B */}
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <Badge color={sp.b2cEnabled ? "success" : "light"}>
                              B2C {sp.b2cEnabled ? "On" : "Off"}
                            </Badge>
                            <Badge color={sp.b2bEnabled ? "info" : "light"}>
                              B2B {sp.b2bEnabled ? "On" : "Off"}
                            </Badge>
                          </div>
                        </td>

                        {/* Updated */}
                        <td className="px-4 py-4 text-gray-500 dark:text-gray-400">
                          {formatDate(sp.updatedAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEditTarget(sp)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition-colors"
                              title="Edit"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemoveTarget(sp)}
                              className="rounded-lg p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                              title="Remove"
                            >
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editTarget && storeId && (
        <EditStoreProductModal
          isOpen={!!editTarget}
          onClose={() => setEditTarget(null)}
          storeId={storeId}
          storeProduct={editTarget}
          currency={currency}
          onSaved={handleUpdated}
        />
      )}

      {/* Manage Variants Modal */}
      {variantTarget && storeId && (
        <ManageVariantsModal
          isOpen={!!variantTarget}
          onClose={() => setVariantTarget(null)}
          storeId={storeId}
          storeProduct={variantTarget}
          currency={currency}
          onUpdated={(updated) => {
            handleUpdated(updated);
            setVariantTarget(updated);
          }}
        />
      )}

      {/* Export Modal */}
      {exportOpen && storeId && (
        <ExportStoreProductsModal
          isOpen={exportOpen}
          onClose={() => setExportOpen(false)}
          storeId={storeId}
          productCount={products.length}
        />
      )}

      {/* Remove Confirm Modal */}
      {removeTarget && (
        <RemoveConfirmModal
          isOpen={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
          productTitle={productLabel(removeTarget)}
          removing={removing}
          onConfirm={handleRemoveConfirm}
        />
      )}
    </>
  );
}
