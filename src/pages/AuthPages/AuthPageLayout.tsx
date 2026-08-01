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
        <div className="absolute top-1/2 right-0 translate-x-1/2 w-48 h-48 bg-[#FBBB14]/15 rounded-full" />

        <div className="relative z-10 text-center max-w-sm">
          <img
            src={Logo}
            alt="Buyology"
            className="w-24 h-24 rounded-2xl mx-auto shadow-2xl mb-8"
          />
          <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
            Buyology
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            Your all-in-one e-commerce dashboard for smarter business decisions.
          </p>

          <div className="mt-12 pt-8 border-t border-white/10 grid grid-cols-3 gap-4">
            {[
              { value: "10K+", label: "Products" },
              { value: "99%", label: "Uptime" },
              { value: "500+", label: "Clients" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-xl font-bold text-[#FBBB14]">{value}</div>
                <div className="text-white/50 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        {children}
      </div>
    </div>
  );
}
