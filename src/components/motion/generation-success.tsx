"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function GenerationSuccessMotion({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current || !active || prefersReducedMotion()) {
        return;
      }

      gsap.fromTo(
        rootRef.current,
        { scale: 0.98, opacity: 0.92 },
        { scale: 1, opacity: 1, duration: 0.35, ease: "power2.out" },
      );
    },
    { dependencies: [active], scope: rootRef, revertOnUpdate: true },
  );

  return <div ref={rootRef}>{children}</div>;
}
