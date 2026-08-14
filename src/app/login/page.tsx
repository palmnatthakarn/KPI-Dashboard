"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

const featureCards = [
  {
    title: "VAT Monitor",
    description: "ติดตามสถานะภาษีแบบ Real-time",
    value: "Live",
    icon: Activity,
    className: "animate-float-card-1",
  },
  {
    title: "File Approval",
    description: "อนุมัติเอกสารได้ทันที",
    value: "Fast",
    icon: FileCheck2,
    className: "animate-float-card-2",
  },
  {
    title: "Multi-Shop",
    description: "รวมข้อมูลหลายสาขาในที่เดียว",
    value: "Sync",
    icon: Store,
    className: "animate-float-card-3",
  },
];

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
    <main className="relative min-h-screen overflow-hidden bg-brand-navy text-brand-navy">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(38,102,172,0.25),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,176,182,0.18),transparent_28%)]" />
      <div className="absolute left-[-8rem] top-[-8rem] h-80 w-80 rounded-full bg-brand-blue/30 blur-3xl animate-blob-1" />
      <div className="absolute right-[-6rem] top-1/4 h-72 w-72 rounded-full bg-brand-teal/20 blur-3xl animate-blob-2" />
      <div className="absolute bottom-[-8rem] left-1/3 h-96 w-96 rounded-full bg-brand-green/20 blur-3xl animate-blob-3" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />

      <section className="relative grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <div className="hidden min-h-screen flex-col justify-between p-10 text-white lg:flex xl:p-14">
          <div className="animate-fade-in-up opacity-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-white/80 shadow-2xl shadow-brand-navy/30 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-brand-lime shadow-[0_0_16px_rgba(147,193,69,0.9)]" />
              Real-time VAT operation center
            </div>
          </div>

          <div className="relative max-w-2xl animate-fade-in-up animation-delay-200 opacity-0">
            <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-3xl border border-white/15 bg-white/10 shadow-2xl shadow-brand-blue/20 backdrop-blur-xl">
              <Sparkles className="h-8 w-8 text-brand-skyLight" />
            </div>
            <h1 className="text-5xl font-semibold tracking-tight text-white xl:text-6xl">
              VAT Dashboard
              <span className="block bg-gradient-to-r from-brand-skyLight via-brand-teal to-brand-green bg-clip-text text-transparent">
                Status Monitor
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              ระบบติดตามสถานะภาษีมูลค่าเพิ่ม พร้อมการอนุมัติไฟล์และมุมมองข้อมูลหลายสาขาในแบบ Real-time
            </p>
          </div>

          <div className="flex flex-row gap-4 animate-fade-in-up animation-delay-300 opacity-0">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className={`flex-1 rounded-3xl border border-white/10 bg-white/[0.08] p-5 text-white shadow-2xl shadow-brand-navy/30 backdrop-blur-2xl ${card.className}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-brand-skyLight">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="rounded-full bg-brand-green/15 px-3 py-1 text-xs font-medium text-brand-lime">
                      {card.value}
                    </span>
                  </div>
                  <h2 className="mt-5 text-base font-semibold">{card.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.description}</p>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-sm text-slate-400 animate-fade-in-up animation-delay-400 opacity-0">
            <ShieldCheck className="h-5 w-5 text-brand-tealGreen" />
            Secure Google Authentication • Enterprise Grade Security
          </div>
        </div>

        <div className="flex min-h-screen items-center justify-center px-5 py-10 lg:bg-white/70 lg:backdrop-blur-3xl">
          <div className="w-full max-w-md animate-fade-in-up animation-delay-200 opacity-0">
            <div className="rounded-[2rem] border border-white/60 bg-white/90 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl sm:p-10">
              <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-navy to-brand-teal text-white shadow-xl shadow-brand-blue/25">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <div className="space-y-3 text-center">
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-brand-blue">
                  Welcome Back
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-brand-navy">
                  เข้าสู่ระบบอย่างปลอดภัย
                </h2>
                <p className="text-sm leading-6 text-slate-500">
                  ใช้บัญชี Google ที่ได้รับอนุญาตเพื่อเข้าสู่ VAT Dashboard Status Monitor
                </p>
              </div>

              {error && (
                <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-600 animate-fade-in-up">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="group relative mt-8 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-900 shadow-lg shadow-slate-200/70 transition duration-300 hover:-translate-y-0.5 hover:border-brand-skyLight hover:shadow-2xl hover:shadow-brand-skyLight/70 active:translate-y-0 disabled:pointer-events-none disabled:opacity-70"
              >
                <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue to-transparent opacity-0 transition group-hover:opacity-100" />
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin text-brand-blue" />
                ) : (
                  <GoogleIcon />
                )}
                <span>{isSubmitting ? "กำลังเชื่อมต่อกับ Google..." : "เข้าสู่ระบบด้วย Google"}</span>
                {!isSubmitting && (
                  <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-blue" />
                )}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2  text-xs font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full bg-brand-tealGreen" />
                Secure Google Authentication
              </div>
            </div>

            <p className="mt-6 text-center text-xs leading-6 text-white/70 lg:text-slate-500">
              Protected access for authorized dashboard users only.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
