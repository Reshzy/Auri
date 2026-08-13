"use client";

import { type ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MOTION, prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function SectionReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) {
        return;
      }

      const tween = gsap.fromTo(
        root,
        { y: 8, opacity: MOTION.readableOpacity },
        {
          y: 0,
          opacity: 1,
          duration: MOTION.duration,
          ease: MOTION.ease,
          paused: true,
        },
      );

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            tween.play();
            observer.disconnect();
          }
        },
        { threshold: 0.16, rootMargin: "0px 0px -8% 0px" },
      );

      observer.observe(root);
      return () => observer.disconnect();
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
