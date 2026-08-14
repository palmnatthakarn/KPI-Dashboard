/**
 * Client-side JWT storage.
 * Mirrors auth_repository.dart: stores the token + expiry, and treats a token
 * as "expired" 5 minutes before its real expiry (refresh buffer).
 */

const TOKEN_KEY = "dashboard_auth_token";
const EXPIRY_KEY = "dashboard_auth_token_expiry";
const REFRESH_TOKEN_KEY = "dashboard_auth_refresh_token";
const USERNAME_KEY = "dashboard_auth_username";
const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5-minute expiry buffer, same as the Flutter app

/**
 * @param expiresAtMs Pass `null` when the token's expiry can't be determined
 * (non-JWT token, or JWT without an `exp` claim) — we then assume the token
 * is valid and let the server decide via a 401, same as isTokenExpired's
 * fallback in auth_repository.dart.
 */
export function saveToken(token: string, expiresAtMs: number | null) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  if (expiresAtMs == null) {
    localStorage.removeItem(EXPIRY_KEY);
  } else {
    localStorage.setItem(EXPIRY_KEY, String(expiresAtMs));
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveRefreshToken(refreshToken: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveUsername(username: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERNAME_KEY, username);
}

export function getUsername(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USERNAME_KEY);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

/**
 * True if the stored token is within the 5-minute refresh buffer of expiring.
 * If we never learned an expiry (non-JWT token, or no `exp` claim), assume
 * the token is valid — matches isTokenExpired's fallback in
 * auth_repository.dart ("assuming token is valid, let server decide").
 */
export function isTokenExpiredOrExpiring(): boolean {
  if (typeof window === "undefined") return false;
  const expiry = localStorage.getItem(EXPIRY_KEY);
  if (!expiry) return false;
  return Date.now() >= Number(expiry) - REFRESH_BUFFER_MS;
}
