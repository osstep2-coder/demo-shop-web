import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
// Self-hosted, so the site makes no requests to third-party hosts.
import "@fontsource-variable/manrope/wght.css";
import { AuthProvider } from "./auth/AuthContext";
import { ErrorBoundary } from "./components/states";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
      // No retries: errors show up immediately and deterministically (retries also pause in background tabs).
      retry: false,
    },
  },
});

// Handy for debugging and for screenshot tests that need to inspect query state.
if (import.meta.env.DEV) (window as unknown as { __queryClient: QueryClient }).__queryClient = queryClient;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
            <Toaster position="top-right" richColors closeButton toastOptions={{ style: { fontFamily: "'Manrope Variable', sans-serif" } }} />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
