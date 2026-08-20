import Link from "next/link";
import { HeroAurora } from "@/components/brand/hero-aurora";
import { HeroReveal } from "@/components/motion/hero-reveal";
import { Button } from "@/components/ui/button";
import { MarketingProductStage } from "@/features/marketing/product-stage";
import {
  AURI_CLOSE_BODY,
  AURI_CLOSE_HEADING,
  AURI_HERO_BODY,
  AURI_PRIMARY_CTA,
  AURI_TAGLINE,
} from "@/lib/brand";

export function LandingPage() {
  return (
    <div>
      <section id="product" className="relative overflow-hidden">
        <HeroAurora />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:py-12">
          <HeroReveal>
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-6">
                <h1
                  data-hero-item
                  className="text-auri-ink text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:text-6xl"
                >
                  {AURI_TAGLINE}
                </h1>
                <p
                  data-hero-item
                  className="text-auri-ink-muted max-w-xl text-base text-pretty sm:text-lg"
                >
                  {AURI_HERO_BODY}
                </p>
                <div data-hero-item>
                  <Button
                    asChild
                    size="lg"
                    className="bg-auri-orange-700 hover:bg-auri-orange-700/90 shadow-auri-orange-700/20"
                  >
                    <Link href="/sign-up">{AURI_PRIMARY_CTA}</Link>
                  </Button>
                </div>
              </div>
              <div data-hero-item>
                <MarketingProductStage />
              </div>
            </div>
          </HeroReveal>
        </div>
      </section>

      <section id="get-started" className="border-auri-border/70 border-t">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <h2 className="text-auri-ink text-3xl font-semibold tracking-tight text-balance">
            {AURI_CLOSE_HEADING}
          </h2>
          <p className="text-auri-ink-muted mx-auto mt-3 max-w-xl text-pretty">
            {AURI_CLOSE_BODY}
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-auri-orange-700 hover:bg-auri-orange-700/90 shadow-auri-orange-700/20"
            >
              <Link href="/sign-up">{AURI_PRIMARY_CTA}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
