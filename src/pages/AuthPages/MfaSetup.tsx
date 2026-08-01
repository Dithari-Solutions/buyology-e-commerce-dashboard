import { useEffect, useState } from "react";
import { Navigate, Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../api/services/auth.service";
import { ApiRequestError } from "../../api/types/api.types";
import type { MfaEnrollStartData } from "../../types/auth.types";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Input from "../../components/form/input/InputField";

export default function MfaSetup() {
  const { pendingMfa, completeMfa } = useAuth();

  const [enroll, setEnroll] = useState<MfaEnrollStartData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set once enrollment is confirmed: show the one-time recovery codes before
  // landing the user in the app.
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);

  const token = pendingMfa?.mode === "setup" ? pendingMfa.mfaToken : null;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    authService
      .mfaEnrollStart(token)
      .then((res) => {
        if (!cancelled) setEnroll(res.data ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiRequestError ? err.message : "Could not start enrollment.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // No active setup challenge (direct nav / refresh) → restart login.
  if (!pendingMfa || pendingMfa.mode !== "setup") {
    return <Navigate to="/signin" replace />;
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await authService.mfaEnrollConfirm(token, code.trim());
      const accessToken = res.data?.accessToken ?? null;
      if (!accessToken) {
        setError("Could not complete setup. Please try again.");
        return;
      }
      if (res.data?.recoveryCodes && res.data.recoveryCodes.length > 0) {
        // Hold the session until the user acknowledges their recovery codes.
        setRecoveryCodes(res.data.recoveryCodes);
        setPendingToken(accessToken);
      } else {
        completeMfa(accessToken);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Recovery-codes acknowledgement step ────────────────────────────────────
  if (recoveryCodes && pendingToken) {
    return (
      <>
        <PageMeta title="Save your recovery codes | Buyology" description="One-time backup codes" />
        <AuthLayout>
          <div className="w-full max-w-[420px] z-2">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Save your recovery codes</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                Store these somewhere safe. Each code can be used once if you lose access to your
                authenticator. They will not be shown again.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm text-gray-800 dark:text-gray-100">
                {recoveryCodes.map((rc) => (
                  <div key={rc} className="rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2 text-center tracking-wider">
                    {rc}
                  </div>
                ))}
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  size="md"
                  onClick={() => navigator.clipboard?.writeText(recoveryCodes.join("\n"))}
                >
                  Copy codes
                </Button>
                <Button className="flex-1 font-semibold" size="md" onClick={() => completeMfa(pendingToken)}>
                  I've saved them — continue
                </Button>
              </div>
            </div>
          </div>
        </AuthLayout>
      </>
    );
  }

  // ── Enrollment (scan QR + confirm code) ────────────────────────────────────
  return (
    <>
      <PageMeta title="Set up two-factor authentication | Buyology" description="Enroll Google Authenticator" />
      <AuthLayout>
        <div className="w-full max-w-[420px] z-2">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Set up two-factor authentication</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              Two-factor authentication is required for this account. Scan the QR code with Google
              Authenticator (or any TOTP app), then enter the 6-digit code to confirm.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {loadError ? (
              <div className="space-y-4 text-center">
                <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                  {loadError}
                </div>
                <Link to="/signin" className="text-sm text-[#402F75] dark:text-[#FBBB14] hover:underline">
                  Back to sign in
                </Link>
              </div>
            ) : !enroll ? (
              <p className="text-center text-sm text-gray-500 py-10">Preparing your authenticator…</p>
            ) : (
              <form onSubmit={handleConfirm}>
                <div className="space-y-5">
                  <div className="flex justify-center">
                    <img
                      src={enroll.qrDataUri}
                      alt="Authenticator QR code"
                      className="w-44 h-44 rounded-lg border border-gray-200 dark:border-gray-700 bg-white p-2"
                    />
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Can't scan? Enter this key manually:</p>
                    <code className="mt-1 inline-block break-all rounded bg-gray-50 dark:bg-gray-900 px-2 py-1 text-xs text-gray-700 dark:text-gray-200">
                      {enroll.secret}
                    </code>
                  </div>

                  {error && (
                    <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
                      {error}
                    </div>
                  )}

                  <div>
                    <Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      6-digit code
                    </Label>
                    <Input type="text" placeholder="123456" value={code} onChange={(e) => setCode(e.target.value)} />
                  </div>

                  <Button
                    className="w-full font-semibold tracking-wide"
                    size="md"
                    disabled={submitting || code.trim().length < 6}
                  >
                    {submitting ? "Confirming…" : "Confirm & continue"}
                  </Button>

                  <div className="text-center">
                    <Link to="/signin" className="text-sm text-gray-500 hover:underline">
                      Back to sign in
                    </Link>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </AuthLayout>
    </>
  );
}
