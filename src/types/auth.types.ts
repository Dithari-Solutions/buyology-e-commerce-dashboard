export interface SignInRequest {
  email: string;
  password: string;
}

/** Shape of `data` in the /auth/signin response */
export interface SignInData {
  accessToken: string;
  /** Ignored — the real refresh token lives in an HttpOnly cookie set by the backend */
  refreshToken: string;
  expiresIn: number;
}

/** Shape of `data` in the /auth/refresh response */
export interface RefreshData {
  accessToken: string;
  expiresIn: number;
}
