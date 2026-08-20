"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { prefersReducedMotion } from "@/lib/motion";

gsap.registerPlugin(useGSAP);

export function HeroAurora() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || prefersReducedMotion()) {
        return;
      }

      const orbs = root.querySelectorAll("[data-orb]");
      if (orbs.length === 0) {
        return;
      }

      const tween = gsap.to(orbs, {
        y: 14,
        x: 10,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        stagger: 0.8,
        paused: true,
      });

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            tween.play();
          } else {
            tween.pause();
          }
        },
        { threshold: 0.05 },
      );

      observer.observe(root);
      return () => {
        observer.disconnect();
        tween.kill();
      };
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        data-orb
        className="bg-auri-orange-300/40 absolute -top-16 left-[10%] h-32 w-32 rounded-full blur-3xl sm:h-56 sm:w-56"
      />
      <div
        data-orb
        className="bg-auri-orange-500/20 absolute top-16 right-[8%] h-36 w-36 rounded-full blur-3xl sm:top-24 sm:h-64 sm:w-64"
      />
    </div>
  );
}
