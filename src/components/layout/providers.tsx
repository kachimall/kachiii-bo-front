"use client";

import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
// Imported for its side effect too: it registers the token and 401/2FA handlers with the API client.
import { useAuth } from "@/store/auth";

export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    void useAuth.persist.rehydrate();
  }, []);

  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
