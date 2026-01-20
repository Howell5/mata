import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient configuration
 * Handles errors and retries consistently across the app
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Development-friendly settings
      retry: 1, // Don't retry too many times in development
      refetchOnWindowFocus: false, // Prevents annoying refetches during debugging
      staleTime: 0, // Data is immediately stale, users can optimize per-query
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      // Global query error handler
      // You can add toast notifications here
      console.error("Query error:", error.message);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Global mutation error handler
      // You can add toast notifications here
      console.error("Mutation error:", error.message);
    },
  }),
});
