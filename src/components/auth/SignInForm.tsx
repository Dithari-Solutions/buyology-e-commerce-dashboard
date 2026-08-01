import { useState } from "react";
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
      <div className="z-2 w-full max-w-[400px]">
        {/* Mobile-only logo */}
        <div className="mb-5 flex justify-center lg:hidden">
          <img src={Logo} alt="Buyology" className="h-9 w-[190px] object-cover" />
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Welcome back
            </h1>
            <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
              Sign in to your Buyology account
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-error-200 bg-error-50 px-3 py-2.5 text-[13px] text-error-700 dark:border-error-800 dark:bg-error-500/10 dark:text-error-400"
                >
                  {error}
                </div>
              )}

              <div>
                <Label htmlFor="email">
                  Email <span className="text-error-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="password">
                  Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1/2 z-30 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeIcon className="size-4 fill-current" />
                    ) : (
                      <EyeCloseIcon className="size-4 fill-current" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  className="w-full font-semibold"
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
      <img
        src={Curve}
        alt=""
        aria-hidden
        className="pointer-events-none fixed bottom-0 right-0 z-0 w-[320px] opacity-30"
      />
    </>
  );
}
