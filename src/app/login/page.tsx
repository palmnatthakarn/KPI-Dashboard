"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

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
      // Error is surfaced by the auth store.
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-5 py-8 text-foreground selection:bg-foreground/15 sm:px-8 lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-48 h-[34rem] w-[34rem] animate-pulse rounded-full bg-foreground/[0.045] blur-3xl motion-reduce:animate-none" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-52 right-[-9rem] h-[38rem] w-[38rem] animate-pulse rounded-full bg-foreground/[0.035] blur-3xl [animation-delay:1.5s] [animation-duration:5s] motion-reduce:animate-none" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        <div className="login-shell grid w-full overflow-hidden rounded-[1.75rem] border border-border bg-card/90 shadow-xl backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[610px] overflow-hidden border-r border-border bg-secondary/70 p-10 lg:flex lg:flex-col lg:justify-between xl:p-12">
            <div aria-hidden="true" className="absolute -right-28 -top-32 h-80 w-80 animate-[spin_28s_linear_infinite] rounded-full border border-foreground/10 motion-reduce:animate-none" />
            <div aria-hidden="true" className="absolute -right-16 -top-20 h-56 w-56 animate-[spin_36s_linear_infinite_reverse] rounded-full border border-foreground/15 motion-reduce:animate-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs font-semibold text-foreground">
                <span className="login-status-dot h-1.5 w-1.5 rounded-full bg-foreground" /> KPI WORKSPACE
              </div>
              <div className="mt-16 max-w-lg">
                <span className="login-shield flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <h1 className="login-title-sweep mt-8 text-5xl font-semibold leading-none tracking-[-0.05em] sm:text-[3.5rem] xl:text-6xl">
                  KPI Dashboard
                </h1>
                <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
                  ระบบติดตาม KPI งานเอกสารและการบันทึกบัญชีของทุกสาขา
                  สำหรับตรวจงานประจำวันให้เร็วและแม่นขึ้น
                </p>
              </div>
            </div>
            <div className="relative flex flex-wrap gap-x-6 gap-y-3 text-xs font-medium text-muted-foreground">
              {[
                { label: "ภาพรวมทุกสาขา", icon: Building2 },
                { label: "ติดตามงานรายวัน", icon: ClipboardList },
                { label: "สิทธิ์เข้าถึงปลอดภัย", icon: Check },
              ].map(({ label, icon: Icon }) => (
                <span key={label} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground/10 text-foreground">
                    <Icon className="h-3 w-3" strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section className="flex min-h-[610px] items-center justify-center p-6 sm:p-10 xl:p-12">
            <div className="login-signin-panel w-full max-w-md">
              <div className="flex items-center justify-between lg:justify-end">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground lg:hidden">
                  <ShieldCheck className="h-6 w-6" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground">
                  <LockKeyhole className="h-3 w-3" /> SECURE ACCESS
                </span>
              </div>
              <div className="mt-10 lg:mt-14">
                <p className="text-sm font-semibold text-foreground">ยินดีต้อนรับกลับมา</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">เข้าสู่ระบบเพื่อดู Dashboard</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">ใช้บัญชี Google ขององค์กรที่ได้รับอนุญาตเพื่อดำเนินการต่อ</p>
              </div>
              {error && (
                <div role="alert" className="mt-6 rounded-2xl border border-[#cd694b]/25 bg-[#fff0e9] px-4 py-3 text-sm leading-6 text-[#a33f28]">{error}</div>
              )}
              <button type="button" onClick={handleGoogleLogin} disabled={isSubmitting} aria-busy={isSubmitting}
                className="group mt-8 flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-card disabled:pointer-events-none disabled:opacity-65 motion-reduce:transform-none">
                <span className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white">
                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin text-slate-600" /> : <GoogleIcon />}
                  </span>
                  <span>{isSubmitting ? "กำลังเชื่อมต่อกับ Google..." : "ดำเนินการต่อด้วย Google"}</span>
                </span>
                {!isSubmitting && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
              </button>
              <div className="mt-6 flex items-start gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
                <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                <p>ระบบตรวจสอบสิทธิ์ผ่าน Google และไม่จัดเก็บรหัสผ่านของคุณ</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
