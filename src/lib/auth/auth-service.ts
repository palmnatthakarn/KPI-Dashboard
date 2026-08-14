import { jwtDecode } from "jwt-decode";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/config";
import { apiClient } from "@/lib/api/client";
import {
  saveToken,
  saveRefreshToken,
  saveUsername,
  getRefreshToken,
  getUsername,
  clearToken,
} from "@/lib/auth/token-storage";
import { resetShopSelection } from "@/lib/api/multi-shop-service";

/**
 * Auth flows ported 1:1 from lib/services/auth_repository.dart and
 * lib/services/google_auth_service.dart.
 *
 * Endpoints (relative to NEXT_PUBLIC_API_BASE_URL):
 *   POST /login        { username, password } -> { success, data:{token, refresh_token} } | { success, token }
 *   POST /login/email  { email, username, shopid } -> same shape (used for Google sign-in)
 *   POST /refresh       { token: refreshToken } -> { success, token }
 *   POST /logout         (Bearer token)
 */

interface LoginResponseData {
  success: boolean;
  message?: string;
  token?: string;
  refresh_token?: string;
  data?: {
    token?: string;
    refresh_token?: string;
  };
}

/**
 * Returns the token's expiry in ms since epoch, or `null` if it can't be
 * determined (non-JWT token, or JWT without an `exp` claim). `null` is
 * treated as "assume valid" by token-storage — mirrors isTokenExpired's
 * fallback in auth_repository.dart, which does NOT treat an undecodable
 * token as expired.
 */
function extractTokenExpiryMs(token: string): number | null {
  try {
    const decoded = jwtDecode<{ exp?: number }>(token);
    if (decoded.exp) return decoded.exp * 1000;
  } catch {
    // non-JWT or malformed token — unknown expiry, not "expired"
  }
  return null;
}

function extractTokenAndRefresh(data: LoginResponseData): {
  token: string;
  refreshToken?: string;
} {
  const token = data.data?.token ?? data.token;
  const refreshToken = data.data?.refresh_token ?? data.refresh_token;
  if (!token) throw new Error(data.message ?? "No token in response");
  return { token, refreshToken };
}

function persistSession(token: string, username: string, refreshToken?: string) {
  saveToken(token, extractTokenExpiryMs(token));
  saveUsername(username);
  if (refreshToken) saveRefreshToken(refreshToken);
}

/** Email/password login -> POST /login */
export async function login(username: string, password: string): Promise<string> {
  const { data } = await apiClient.post<LoginResponseData>("/login", {
    username,
    password,
  });
  if (!data.success) throw new Error(data.message ?? "Login failed");
  const { token, refreshToken } = extractTokenAndRefresh(data);
  persistSession(token, username, refreshToken);
  return token;
}

/** Exchanges a verified Google email for a backend JWT via POST /login/email. */
async function exchangeGoogleEmail(email: string): Promise<string> {
  const { data } = await apiClient.post<LoginResponseData>("/login/email", {
    email,
    username: email,
    shopid: "1",
  });
  if (!data.success) throw new Error(data.message ?? "Login with email failed");
  const { token, refreshToken } = extractTokenAndRefresh(data);
  persistSession(token, email, refreshToken);
  return token;
}

/**
 * Signs in with Google and immediately exchanges the verified email for the
 * backend JWT. The popup flow avoids the redirect helper's cross-origin
 * storage dependency, which modern browsers block on third-party hosting.
 */
export async function loginWithGoogle(): Promise<string> {
  const credential = await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
  const email = credential.user?.email;
  if (!email) throw new Error("No email found in Google account");
  return exchangeGoogleEmail(email);
}


/** Refresh the access token using the stored refresh token -> POST /refresh */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const { data } = await apiClient.post<{ success: boolean; token?: string }>(
      "/refresh",
      { token: refreshToken }
    );
    if (data.success && data.token) {
      saveToken(data.token, extractTokenExpiryMs(data.token));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** POST /logout, then clear local session + sign out of Firebase. */
export async function logout(): Promise<void> {
  try {
    await apiClient.post("/logout");
  } catch {
    // continue clearing local session even if the API call fails
  }
  clearToken();
  resetShopSelection();
  try {
    await firebaseSignOut(firebaseAuth);
  } catch {
    // ignore Firebase sign-out errors
  }
}

export function getCurrentUsername(): string | null {
  return getUsername();
}
