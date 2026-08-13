"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { DASHBOARD_FIRST_VISIT_KEY, MOTION, prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function FirstVisitStagger({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) {
        return;
      }

      try {
        if (sessionStorage.getItem(DASHBOARD_FIRST_VISIT_KEY) === "1") {
          return;
        }
        sessionStorage.setItem(DASHBOARD_FIRST_VISIT_KEY, "1");
      } catch {
        return;
      }

      const cards = root.querySelectorAll("[data-dashboard-card]");
      if (cards.length === 0) {
        return;
      }

      gsap.fromTo(
        cards,
        { y: MOTION.y, opacity: MOTION.readableOpacity },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.duration,
          ease: MOTION.ease,
          stagger: 0.08,
        },
      );
    },
    { scope: rootRef },
  );

  return <div ref={rootRef}>{children}</div>;
}
