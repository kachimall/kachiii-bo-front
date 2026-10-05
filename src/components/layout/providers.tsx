"use client";

import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
// Imported for its side effect too: it registers the token and 401/2FA handlers with the API client.
import "@/store/auth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
