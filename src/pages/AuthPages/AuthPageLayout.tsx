import React from "react";
import Logo from "../../../public/logo.png";

const STATS = [
  { value: "10K+", label: "Products" },
  { value: "99%", label: "Uptime" },
  { value: "500+", label: "Clients" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      {/* Base colour matches the logo tile exactly, so the cropped wordmark
          reads as type on the panel rather than a pasted-on rectangle. */}
      <div className="relative z-10 hidden flex-col items-center justify-center overflow-hidden bg-[#402F75] p-12 lg:flex lg:w-[46%]">
        {/* Layered light — soft radial washes plus a faint grid, so the panel
            has depth instead of reading as one flat block of purple. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(110% 75% at 12% -5%, rgba(139,92,246,0.5) 0%, transparent 58%), radial-gradient(85% 65% at 100% 105%, rgba(251,187,20,0.14) 0%, transparent 62%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="pointer-events-none absolute -left-32 -top-32 size-[26rem] rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -right-24 size-[30rem] rounded-full bg-[#FBBB14]/10 blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          {/* logo.png is a square tile with a wide wordmark inside — cropping to
              wordmark proportions keeps the lettering legible, and the tile's
              purple sits on the panel colour so only the type reads. */}
          <img
            src={Logo}
            alt="Buyology"
            className="mx-auto mb-6 h-12 w-[250px] object-cover"
          />
          <p className="text-[15px] leading-relaxed text-white/70">
            Your all-in-one e-commerce dashboard for smarter business decisions.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-3">
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 backdrop-blur-sm"
              >
                <div className="text-lg font-semibold text-[#FBBB14]">
                  {value}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-white/50">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gray-50 p-6 dark:bg-gray-950">
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "radial-gradient(70% 55% at 50% 0%, rgba(124,58,237,0.07) 0%, transparent 70%)",
          }}
        />
        {children}
      </div>
    </div>
  );
}
