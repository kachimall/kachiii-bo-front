"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { LoadingState } from "@/components/common/states";
import { me, refresh, logout } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { isStaff, useAuth } from "@/store/auth";

const REFRESH_WITHIN_MS = 60 * 60 * 1000; // rotate the 12 h token in its last hour
const CHECK_EVERY_MS = 5 * 60 * 1000;
export const NOT_STAFF_MESSAGE = "This account is not authorized to use the KACHI admin.";

/**
 * Client-side guard for the back office (the token lives in localStorage, so the server cannot
 * check it). Sends visitors without a session to /login, staff who must set up 2FA to
 * /two-factor, and signs out accounts that are not staff.
 */
export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useAuth((s) => s.hydrated);
  const token = useAuth((s) => s.token);
  const user = useAuth((s) => s.user);
  const twoFactorSetupRequired = useAuth((s) => s.twoFactorSetupRequired);

  // Where to go when the session is missing or incomplete.
  useEffect(() => {
    if (!hydrated) return;
    if (!token) {
      router.replace(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname)}`);
    } else if (twoFactorSetupRequired) {
      router.replace("/two-factor");
    }
  }, [hydrated, token, twoFactorSetupRequired, pathname, router]);

  // Re-read the account once per token: roles and permissions may have changed.
  useEffect(() => {
    if (!hydrated || !token) return;
    let cancelled = false;
    me().then(
      (fresh) => {
        if (cancelled) return;
        if (!isStaff(fresh)) return void signOutNotStaff();
        useAuth.getState().setUser(fresh);
      },
      (error: unknown) => {
        if (!cancelled && error instanceof ApiError && error.status === 403 && !error.needsTwoFactorSetup) {
          signOutNotStaff();
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [hydrated, token]);

  // Rotate the token before it expires.
  useEffect(() => {
    if (!token) return;
    const check = () => {
      const expiresAt = useAuth.getState().expiresAt;
      if (!expiresAt) return;
      const left = new Date(expiresAt).getTime() - Date.now();
      if (left <= 0) useAuth.getState().clear("Your session expired. Sign in again.");
      else if (left < REFRESH_WITHIN_MS) {
        refresh().then((result) => useAuth.getState().setSession(result), () => {});
      }
    };
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [token]);

  if (!hydrated || !token || twoFactorSetupRequired || !user || !isStaff(user)) {
    return <LoadingState label="Checking your session…" />;
  }

  return <>{children}</>;
}

function signOutNotStaff() {
  logout().catch(() => {});
  useAuth.getState().clear(NOT_STAFF_MESSAGE);
}
