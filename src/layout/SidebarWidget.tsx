import { BuyologyWave } from "../components/common/BuyologyLogo";

/**
 * Sidebar footer card. Carries the brand's primary tagline ("Buy the why") on
 * American Blue, per the Brand Identity Guidelines' approved pairing of a
 * Mikado Yellow tagline on an American Blue ground.
 */
export default function SidebarWidget() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl bg-buyology-600 px-4 py-4 text-left shadow-lg shadow-buyology-900/20 dark:bg-buyology-500/20 dark:ring-1 dark:ring-white/10">
      <span
        aria-hidden
        className="absolute -right-6 -top-8 size-24 rounded-full bg-buyology-yellow-500/20 blur-2xl"
      />
      <BuyologyWave className="relative mb-3 h-4 w-auto text-buyology-yellow-500" />
      <p className="relative text-sm font-semibold uppercase tracking-[0.22em] text-buyology-yellow-500">
        Buy the why
      </p>
      <p className="relative mt-1.5 text-xs leading-relaxed text-white/70">
        Every order, supplier and shipment across Buyology — in one place.
      </p>
    </div>
  );
}
