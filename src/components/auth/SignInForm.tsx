import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { ApiRequestError } from "../../api/types/api.types";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Logo from "../../../public/logo.png";
import Curve from "../../assets/vectors/auth-bg-vector.png";

export default function SignInForm() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // signIn() POSTs to /auth/signin, stores the accessToken in memory,
      // and navigates to "/" on success. The HttpOnly refresh_token cookie is
      // set by the backend automatically — we never read or store it here.
      await signIn({ email, password });
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              {/* Error banner */}
              {error && (
                <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  {error}
                </div>
              )}

              <div>
                <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <Button
                  className="w-full font-semibold tracking-wide"
                  size="md"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in…" : "Sign in"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <img src={Curve} alt="" className="fixed bottom-0 right-0 z-0" />
    </>
  );
}
