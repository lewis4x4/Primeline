import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const CACHE_TIMES = {
  realtime: 30 * 1000,
  short: 2 * 60 * 1000,
  standard: 5 * 60 * 1000,
  medium: 15 * 60 * 1000,
  long: 30 * 60 * 1000,
  static: 60 * 60 * 1000,
} as const;
