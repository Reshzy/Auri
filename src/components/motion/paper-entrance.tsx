"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MOTION, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function PaperEntrance({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current || prefersReducedMotion()) {
        return;
      }

      gsap.fromTo(
        rootRef.current,
        { y: 8, opacity: MOTION.readableOpacity },
        { y: 0, opacity: 1, duration: MOTION.duration, ease: MOTION.ease },
      );
    },
    { scope: rootRef },
  );

  return (
    <article
      ref={rootRef}
      className={cn(
        "border-auri-border text-auri-ink rounded-3xl border bg-white p-5 shadow-sm sm:p-8",
        className,
      )}
    >
      {children}
    </article>
  );
}
