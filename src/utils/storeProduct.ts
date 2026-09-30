/**
 * What a store-product row means to the screens that display and edit one.
 *
 * One fact about the shared `StoreProductResponse` is easy to get wrong in each screen separately and
 * has already cost us a bug: the title can be absent. It is decided once here so the Store Products
 * table, the assign form and the Flash Sale page cannot disagree with each other. The money itself
 * lives in utils/flashSale, and a variant has no price of its own to reason about — see the note at
 * the foot of this file.
 */

/** The minimum a row needs for a human-readable label. */
interface Titled {
  productTitle?: string | null;
  productSku: string;
}

/**
 * What to print for a product.
 *
 * `productTitle` is set from the product's ENGLISH translation and from nothing else, so a product
 * that has never been translated into EN arrives with the field absent — the type said `string`
 * for months while the API had always been able to omit it. Rendered bare that is a blank cell on
 * a row that still has a price and a sale; said out loud it tells the admin exactly what is
 * missing, with the SKU underneath to identify it by.
 */
export function productLabel(sp: Titled): string {
  return sp.productTitle?.trim() || "Untitled product";
}

/**
 * WHY THERE IS NOTHING HERE ABOUT VARIANT PRICES.
 *
 * A listing has one price — `storePrice` on the store_products row — and one discount on top of it.
 * That single number is what every customer surface advertises and what every charge path computes,
 * so it is the only number these screens may state. A variant identifies which SKU a cart line is
 * and caps that line's stock; it does not carry a price the customer pays.
 *
 * Two things used to live here and are deliberately gone. An `activeVariantCount`, and a note
 * explaining a per-variant sale price, both written for a version of this work in which a variant
 * line was quoted and charged from its own row. That version was abandoned: the read path it needed
 * answered the cheapest variant's price for the listing while the web storefront — which never sends
 * a variantId — was still charged the parent's, so the shop advertised 900 and took 1000. The fix
 * went the other way instead. Pricing always uses the parent listing, for a variant line too, which
 * is why no screen here shows a variant price and why the API no longer refuses a windowed discount
 * on a listing that has variants: there is nothing left for that refusal to protect.
 */
