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
  AURI_PRIMARY_CTA_HINT,
  AURI_TAGLINE,
} from "@/lib/brand";

export function LandingPage() {
  return (
    <div>
      <section id="product" className="auri-hash-target relative">
        <HeroAurora />
        <div className="auri-safe-x relative mx-auto flex max-w-6xl flex-col justify-center py-10 lg:min-h-[calc(100vh-4rem)] lg:py-12">
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
                  <Button asChild size="lg">
                    <Link href="/sign-up" aria-describedby="hero-cta-hint">
                      {AURI_PRIMARY_CTA}
                    </Link>
                  </Button>
                  <p
                    id="hero-cta-hint"
                    className="text-auri-ink-muted mt-3 max-w-xl text-sm text-pretty"
                  >
                    {AURI_PRIMARY_CTA_HINT}
                  </p>
                </div>
              </div>
              <div data-hero-item>
                <MarketingProductStage />
              </div>
            </div>
          </HeroReveal>
        </div>
      </section>

      <section
        id="get-started"
        className="auri-hash-target border-auri-border/70 border-t"
      >
        <div className="auri-safe-x mx-auto max-w-3xl py-16 text-center">
          <h2 className="text-auri-ink text-3xl font-semibold tracking-tight text-balance">
            {AURI_CLOSE_HEADING}
          </h2>
          <p className="text-auri-ink-muted mx-auto mt-3 max-w-xl text-pretty">
            {AURI_CLOSE_BODY}
          </p>
          <div className="mt-8">
            <Button asChild size="lg">
              <Link href="/sign-up" aria-describedby="close-cta-hint">
                {AURI_PRIMARY_CTA}
              </Link>
            </Button>
            <p
              id="close-cta-hint"
              className="text-auri-ink-muted mx-auto mt-3 max-w-xl text-sm text-pretty"
            >
              {AURI_PRIMARY_CTA_HINT}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
