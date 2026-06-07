import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { apiClient } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { ApiResponse } from "../../api/types/api.types";

interface TokenInfo {
  supplierEmail: string;
  businessName: string;
}

export default function SupplierSetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const token = searchParams.get("token") ?? "";

  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmedPassword, setConfirmedPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!token) { setTokenError("No setup token provided."); setValidating(false); return; }
    apiClient
      .get<ApiResponse<TokenInfo>>(`/api/supplier/auth/validate-token?token=${encodeURIComponent(token)}`)
      .then((r) => setTokenInfo(r.data ?? null))
      .catch(() => setTokenError("This setup link is invalid or has already been used."))
      .finally(() => setValidating(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!/[A-Z]/.test(password)) { setError("Password must contain at least one uppercase letter."); return; }
    if (!/[0-9]/.test(password)) { setError("Password must contain at least one number."); return; }
    if (password !== confirmedPassword) { setError("Passwords do not match."); return; }
    setError("");
    setLoading(true);
    try {
      const res = await apiClient.post<ApiResponse<{ accessToken: string }>>("/api/supplier/auth/set-password", {
        token,
        password,
        confirmedPassword,
      });
      if (res.data?.accessToken) {
        // Mark the session authenticated so route guards let the new supplier in.
        applySession(res.data.accessToken);
      }
      navigate("/supplier/my-products");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message;
      setError(msg || "Failed to set password. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Validating setup link…</p>
      </div>
    );
  }

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-500 text-xl">✕</span>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Link Unavailable</h2>
          <p className="text-sm text-gray-500">{tokenError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Set Your Password</h1>
          {tokenInfo && (
            <p className="text-sm text-gray-500 mt-1">
              Welcome, <span className="font-medium">{tokenInfo.businessName}</span>!
              <br />
              <span className="text-xs text-gray-400">{tokenInfo.supplierEmail}</span>
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Min 8 chars, 1 uppercase, 1 number"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmedPassword}
              onChange={(e) => setConfirmedPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Repeat your password"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 text-white py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Setting password…" : "Set Password & Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
