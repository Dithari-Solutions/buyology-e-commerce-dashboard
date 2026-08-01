import React from "react";
import Logo from "../../../public/logo.png";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#402F75] relative overflow-hidden flex-col items-center justify-center p-12 z-10">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FBBB14]/10 rounded-full" />
        <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] bg-white/5 rounded-full" />

        <div className="relative z-10 text-center max-w-sm">
          {/* Cropped to wordmark proportions — the tile's purple matches the
              panel, so only the lettering reads. */}
          <img
            src={Logo}
            alt="Buyology"
            className="mx-auto mb-4 h-11 w-[230px] object-cover"
          />
          <p className="text-sm leading-relaxed text-white/60">
            Your all-in-one e-commerce dashboard for smarter business decisions.
          </p>

          <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
            {[
              { value: "10K+", label: "Products" },
              { value: "99%", label: "Uptime" },
              { value: "500+", label: "Clients" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-lg font-bold text-[#FBBB14]">{value}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
        {children}
      </div>
    </div>
  );
}
