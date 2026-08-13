"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MOTION, prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function HeroReveal({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current || prefersReducedMotion()) {
        return;
      }

      const items = rootRef.current.querySelectorAll("[data-hero-item]");
      if (items.length === 0) {
        return;
      }

      gsap.fromTo(
        items,
        { y: MOTION.y, opacity: MOTION.readableOpacity },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.duration,
          ease: MOTION.ease,
          stagger: 0.06,
        },
      );
    },
    { scope: rootRef },
  );

  return <div ref={rootRef}>{children}</div>;
}
