import React from "react";
import { BuyologyWave } from "../../components/common/BuyologyLogo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel — American Blue ground, per the guidelines' approved
          "white logo on American Blue" and "Mikado Yellow tagline on American
          Blue" pairings. */}
      <div className="relative z-10 hidden flex-col items-center justify-center overflow-hidden bg-[#402F75] p-12 lg:flex lg:w-[45%]">
        {/* Decorative blooms */}
        <div className="absolute -left-24 -top-24 size-96 rounded-full bg-[#FFBE12]/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-[28rem] rounded-full bg-white/5 blur-3xl" />
        <BuyologyWave className="absolute -bottom-10 left-0 w-full text-white/[0.06]" />

        <div className="relative z-10 max-w-sm text-center">
          {/* The dark-theme lockup: white wordmark, which is the one that reads
              on American Blue. */}
          <img
            src="/images/logo/buyology-wordmark-dark.png"
            alt="Buyology"
            width={2651}
            height={582}
            className="mx-auto mb-10 h-10 w-auto"
          />
          <p className="text-base leading-relaxed text-white/65">
            Your all-in-one e-commerce dashboard for smarter business decisions.
          </p>

          <p className="mt-12 border-t border-white/10 pt-8 text-sm font-semibold uppercase tracking-[0.25em] text-[#FFBE12]">
            Buy the why
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-6 dark:bg-gray-900">
        {children}
      </div>
    </div>
  );
}
