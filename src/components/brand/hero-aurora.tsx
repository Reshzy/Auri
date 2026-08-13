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
        className="bg-auri-orange-300/40 absolute -top-16 left-[10%] h-56 w-56 rounded-full blur-3xl"
      />
      <div
        data-orb
        className="bg-auri-orange-500/20 absolute top-24 right-[8%] h-64 w-64 rounded-full blur-3xl"
      />
    </div>
  );
}
