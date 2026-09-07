"use client";

import { type ReactNode, type RefObject, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

export function AvatarShine({
  children,
  className,
  triggerRef,
}: {
  children: ReactNode;
  className?: string;
  triggerRef?: RefObject<HTMLElement | null>;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const shineRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = rootRef.current;
      const shine = shineRef.current;
      if (!root || !shine || !contextSafe) return;

      const hoverTarget = triggerRef?.current ?? root.closest("button") ?? root;

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

      hoverTarget.addEventListener("pointerenter", play);
      hoverTarget.addEventListener("pointerleave", stop);

      return () => {
        hoverTarget.removeEventListener("pointerenter", play);
        hoverTarget.removeEventListener("pointerleave", stop);
        tween?.kill();
      };
    },
    { scope: rootRef, dependencies: [triggerRef] },
  );

  return (
    <div ref={rootRef} className={cn("relative overflow-hidden rounded-full", className)}>
      {children}
      <span
        ref={shineRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/2 origin-center -skew-x-12 bg-gradient-to-r from-transparent via-white/80 to-transparent mix-blend-overlay opacity-0"
      />
    </div>
  );
}
