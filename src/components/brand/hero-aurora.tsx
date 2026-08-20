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
      if (
        !root ||
        prefersReducedMotion() ||
        !window.matchMedia("(min-width: 1024px)").matches
      ) {
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
      className="pointer-events-none absolute inset-0 overflow-hidden contain-paint"
    >
      <div
        data-orb
        className="bg-auri-orange-300/35 absolute -top-10 left-[12%] hidden h-40 w-40 rounded-full blur-2xl lg:block"
      />
      <div
        data-orb
        className="bg-auri-orange-500/18 absolute top-20 right-[10%] hidden h-44 w-44 rounded-full blur-2xl lg:block"
      />
    </div>
  );
}
