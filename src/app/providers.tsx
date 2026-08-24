"use client";

import { useEffect, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeStore } from "@/store/theme-store";

/**
 * Client-side providers root. React Query replaces the BLoC "cache for 2
 * minutes" pattern used by DashboardBloc — staleTime below mirrors that.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 minutes, mirrors DashboardBloc cache
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  const initTheme = useThemeStore((s) => s.init);

  // Syncs the store with what the inline script already painted, and starts
  // following the OS setting while the user is on "system".
  useEffect(() => initTheme(), [initTheme]);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
