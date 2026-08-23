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
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#FFBE12]/10 rounded-full" />
        <div className="absolute -bottom-40 -right-20 w-[28rem] h-[28rem] bg-white/5 rounded-full" />
        <div className="absolute top-1/2 right-0 translate-x-1/2 w-48 h-48 bg-[#FFBE12]/15 rounded-full" />

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

          <p className="mt-12 border-t border-white/10 pt-8 text-sm font-semibold uppercase tracking-[0.25em] text-[#FFBE12]">
            Buy the why
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
        {children}
      </div>
    </div>
  );
}
