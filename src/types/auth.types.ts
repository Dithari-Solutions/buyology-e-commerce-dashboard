export interface SignInRequest {
  email: string;
  password: string;
}

/** Shape of `data` in the /auth/signin response */
export interface SignInData {
  /** Null when a two-factor challenge is returned instead of a session. */
  accessToken?: string | null;
  /** Ignored — the real refresh token lives in an HttpOnly cookie set by the backend */
  refreshToken?: string;
  expiresIn?: number;

  /** Privileged account has not enrolled in 2FA yet (mandatory) — run the setup flow. */
  mfaSetupRequired?: boolean;
  /** Privileged account has 2FA enabled — submit a TOTP code to finish signing in. */
  mfaRequired?: boolean;
  /** Short-lived ticket that ties the setup/verify request back to this sign-in. */
  mfaToken?: string;
  /** One-time recovery codes, returned exactly once on enrollment confirmation. */
  recoveryCodes?: string[];
}

/** Shape of `data` from /auth/mfa/enroll/start */
export interface MfaEnrollStartData {
  qrDataUri: string; // data:image/png;base64,... — drop into <img src>
  secret: string;    // base32, for manual entry
  issuer: string;
  account: string;
}

/** Shape of `data` from /auth/mfa/status */
export interface MfaStatusData {
  enabled: boolean;
  enrolledAt?: string | null;
  unusedRecoveryCodes?: number | null;
}

/** Shape of `data` in the /auth/refresh response */
export interface RefreshData {
  accessToken: string;
  expiresIn: number;
}
