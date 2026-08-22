"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useClerk } from "@clerk/nextjs";
import { Alert } from "@/components/ui/alert";
import { AUTH_CLERK_LOAD_BODY, AUTH_CLERK_LOAD_TITLE } from "@/lib/auth/copy";

const LOAD_TIMEOUT_MS = 5000;

export function ClerkFormGate({ children }: { children: ReactNode }) {
  const clerk = useClerk();
  const [waited, setWaited] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => setWaited(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, []);

  if (waited && !clerk.loaded) {
    return (
      <Alert tone="danger" title={AUTH_CLERK_LOAD_TITLE}>
        <p>{AUTH_CLERK_LOAD_BODY}</p>
        <p className="mt-2 font-mono text-xs break-all">
          This origin: {window.location.origin}
        </p>
      </Alert>
    );
  }

  return children;
}
