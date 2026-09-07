"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function AvatarShine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const shine = shineRef.current;
      if (!root || !shine || !contextSafe) return;

      gsap.set(shine, { xPercent: -120, autoAlpha: 0 });
      let tween: gsap.core.Tween | null = null;

      const play = contextSafe(() => {
        if (prefersReducedMotion()) return;
        tween?.kill();
        tween = gsap.fromTo(
          shine,
          { xPercent: -120, autoAlpha: 1 },
          {
            xPercent: 180,
            duration: 0.65,
            ease: "power2.inOut",
            onComplete: () => {
              gsap.set(shine, { autoAlpha: 0, xPercent: -120 });
            },
          },
        );
      });

      const stop = contextSafe(() => {
        tween?.kill();
        tween = null;
        gsap.set(shine, { xPercent: -120, autoAlpha: 0 });
      });

      root.addEventListener("pointerenter", play);
      root.addEventListener("pointerleave", stop);

      return () => {
        root.removeEventListener("pointerenter", play);
        root.removeEventListener("pointerleave", stop);
        tween?.kill();
      };
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={cn("relative overflow-hidden rounded-full", className)}>
      {children}
      <span
        ref={shineRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-1/2 origin-center -skew-x-12 bg-gradient-to-r from-transparent via-white/75 to-transparent opacity-0"
      />
    </div>
  );
}
