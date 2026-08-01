import { useState } from "react";
import { Navigate, Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/services/auth.service";
import { ApiRequestError } from "../../api/types/api.types";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";

export default function MfaVerify() {
  const { pendingMfa, completeMfa } = useAuth();
  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // No active challenge (e.g. page opened directly or after refresh) → restart login.
  if (!pendingMfa || pendingMfa.mode !== "verify") {
    return <Navigate to="/signin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await authService.mfaVerify(pendingMfa.mfaToken, code.trim());
      if (res.data?.accessToken) {
        completeMfa(res.data.accessToken);
      } else {
        setError("Could not complete sign-in. Please try again.");
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta title="Two-factor verification | Buyology" description="Enter your authenticator code" />
      <AuthLayout>
        <div className="w-full max-w-[400px] z-2">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Two-factor authentication</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {useRecovery
                ? "Enter one of your saved recovery codes."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
            <form onSubmit={handleSubmit}>
              <div className="space-y-5">
                {error && (
                  <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                    {error}
                  </div>
                )}

                <div>
                  <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {useRecovery ? "Recovery code" : "Authenticator code"}
                  </Label>
                  <Input
                    type="text"
                    placeholder={useRecovery ? "XXXXX-XXXXX" : "123456"}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="pt-1">
                  <Button className="w-full font-semibold tracking-wide" size="md" disabled={submitting || !code.trim()}>
                    {submitting ? "Verifying…" : "Verify"}
                  </Button>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setUseRecovery((v) => !v);
                      setCode("");
                      setError(null);
                    }}
                    className="text-[#402F75] dark:text-[#FBBB14] hover:underline"
                  >
                    {useRecovery ? "Use authenticator code" : "Use a recovery code"}
                  </button>
                  <Link to="/signin" className="text-gray-500 hover:underline">
                    Back to sign in
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
