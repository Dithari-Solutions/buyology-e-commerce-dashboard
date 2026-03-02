import { useState } from "react";
import Label from "../form/Label";
import { Link } from "react-router";
import Button from "../ui/button/Button";
import Logo from "../../../public/logo.png";
import Input from "../form/input/InputField";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Curve from "../../assets/vectors/auth-bg-vector.png";

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <div className="w-full max-w-[400px] z-2">
        {/* Mobile-only logo */}
        <div className="flex lg:hidden justify-center mb-6">
          <img src={Logo} alt="Buyology" className="w-14 h-14 rounded-xl shadow-md" />
        </div>

        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Sign in to your Buyology account
          </p>
        </div>

        {/* Form card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <form>
            <div className="space-y-5">
              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input type="email" placeholder="you@company.com" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password <span className="text-red-500">*</span>
                  </Label>
                  <Link
                    to="/reset-password"
                    className="text-xs font-medium text-[#402F75] hover:text-[#FBBB14] dark:text-brand-400 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 right-4 top-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-current size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-current size-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button className="w-full font-semibold tracking-wide" size="md">
                  Sign in
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <img src={Curve} alt="Buyology Curve" className="fixed bottom-0 right-0 z-0" />
    </>
  );
}
