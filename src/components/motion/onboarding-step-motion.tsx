"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MOTION, prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function OnboardingStepMotion({
  step,
  children,
}: {
  step: string;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current || prefersReducedMotion()) {
        return;
      }

      gsap.fromTo(
        rootRef.current,
        { y: 8, opacity: MOTION.readableOpacity },
        { y: 0, opacity: 1, duration: 0.35, ease: MOTION.ease },
      );
    },
    { dependencies: [step], scope: rootRef },
  );

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  return (
    <div ref={rootRef}>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="sr-only"
      >{`Onboarding step: ${step}`}</h2>
      {children}
    </div>
  );
}
