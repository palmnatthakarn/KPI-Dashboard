"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <section className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-neutral-900">
          เกิดข้อผิดพลาดในการโหลดข้อมูล
        </h1>
        <p className="mt-3 text-sm text-neutral-600">
          กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาให้เข้าสู่ระบบใหม่
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          ลองใหม่
        </button>
        {error.digest && (
          <p className="mt-4 text-xs text-neutral-400">
            รหัสอ้างอิง: {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
