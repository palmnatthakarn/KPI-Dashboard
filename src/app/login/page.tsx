"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BarChart3, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

/**
 * Sign-in screen.
 *
 * Sign-in stays operational and direct, with lightweight motion to make the
 * first screen feel alive without slowing down the morning login flow.
 */
export default function LoginPage() {
  const router = useRouter();
  const { loginWithGoogle, status, error } = useAuthStore();
  const isSubmitting = status === "authenticating";

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
  }, [status, router]);

  async function handleGoogleLogin() {
    try {
      await loginWithGoogle();
    } catch {
      // error surfaced via store
    }
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8 text-foreground sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="login-shell grid w-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative hidden min-h-[620px] overflow-hidden border-r border-border bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary-foreground/25" />

            <div className="login-hero-content relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/15 bg-primary-foreground/10 px-3 py-1 text-xs font-medium text-primary-foreground/80 shadow-sm">
                <span className="login-status-dot h-1.5 w-1.5 rounded-full bg-status-safe-strong" />
                Internal status monitor
              </div>

              <div className="mt-10 max-w-xl">
                <div className="login-shield flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-foreground text-primary shadow-sm">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h1 className="mt-8 text-4xl font-bold tracking-tight text-primary-foreground">
                  KPI Dashboard
                </h1>
                <p className="mt-4 text-base leading-7 text-primary-foreground/70">
                  ระบบติดตาม KPI งานเอกสารและการบันทึกบัญชีของทุกสาขา สำหรับตรวจงานประจำวันให้เร็วและแม่นขึ้น
                </p>
              </div>
            </div>

            <div className="relative grid grid-cols-3 gap-3">
              <InfoTile icon={BarChart3} label="Overview" value="สรุปสถานะ" delay="0ms" />
              <InfoTile icon={CheckCircle2} label="KPI" value="ติดตามงาน" delay="90ms" />
              <InfoTile icon={LockKeyhole} label="Access" value="Google only" delay="180ms" />
            </div>
          </section>

          <section className="flex min-h-[620px] items-center justify-center p-6 sm:p-10">
            <div className="login-signin-panel w-full max-w-md">
              <div className="lg:hidden">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </span>
              </div>

              <div className="mt-8 lg:mt-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Secure sign in
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
                  เข้าสู่ระบบเพื่อดู Dashboard
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  ใช้บัญชี Google ที่ได้รับอนุญาตจากระบบเท่านั้น
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-6 rounded-xl border border-status-exceeded/30 bg-status-exceeded-soft px-4 py-3 text-sm leading-6 text-status-exceeded-strong"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="group mt-7 flex h-12 w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  {isSubmitting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : (
                    <GoogleIcon />
                  )}
                  <span>{isSubmitting ? "กำลังเชื่อมต่อกับ Google..." : "เข้าสู่ระบบด้วย Google"}</span>
                </span>
                {!isSubmitting && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                )}
              </button>

              <div className="mt-6 rounded-xl border border-border bg-secondary/60 px-4 py-3">
                <div className="flex items-start gap-3">
                  <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="text-xs leading-5 text-muted-foreground">
                    การเข้าสู่ระบบจะตรวจสอบสิทธิ์ผ่าน Google
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  delay,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delay: string;
}) {
  return (
    <div
      className="login-info-tile rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur transition-colors hover:bg-primary-foreground/15"
      style={{ animationDelay: delay }}
    >
      <Icon className="h-5 w-5 text-primary-foreground/80" />
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground/50">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-primary-foreground">{value}</p>
    </div>
  );
}
