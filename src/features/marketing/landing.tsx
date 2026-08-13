import Link from "next/link";
import { HeroAurora } from "@/components/brand/hero-aurora";
import { HeroReveal } from "@/components/motion/hero-reveal";
import { SectionReveal } from "@/components/motion/section-reveal";
import { Button } from "@/components/ui/button";
import { MarketingEditorMock } from "@/features/marketing/editor-mock";
import {
  AURI_EYEBROW,
  AURI_HERO_BODY,
  AURI_PRIMARY_CTA,
  AURI_SECONDARY_CTA,
  AURI_TAGLINE,
} from "@/lib/brand";

export function LandingPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <HeroAurora />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
          <HeroReveal>
            <div className="max-w-2xl space-y-6">
              <p
                data-hero-item
                className="text-auri-orange-700 text-sm font-medium tracking-wide uppercase"
              >
                {AURI_EYEBROW}
              </p>
              <h1
                data-hero-item
                className="text-auri-ink text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
              >
                {AURI_TAGLINE}
              </h1>
              <p
                data-hero-item
                className="text-auri-ink-muted max-w-xl text-base sm:text-lg"
              >
                {AURI_HERO_BODY}
              </p>
              <div data-hero-item className="flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/sign-up">{AURI_PRIMARY_CTA}</Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/#how-it-works">{AURI_SECONDARY_CTA}</Link>
                </Button>
              </div>
            </div>
          </HeroReveal>
        </div>
      </section>

      <section id="product" className="border-auri-border/70 bg-auri-surface/60 border-t">
        <SectionReveal>
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-auri-ink text-2xl font-semibold">
                A calm place to record the day
              </h2>
              <p className="text-auri-ink-muted">
                Enter times and accomplishments in one workspace. Save state stays
                visible, and the next action is always obvious.
              </p>
            </div>
            <MarketingEditorMock />
          </div>
        </SectionReveal>
      </section>

      <section id="how-it-works" className="border-auri-border/70 border-t">
        <SectionReveal>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-auri-ink text-2xl font-semibold">
              Record → Review → Generate
            </h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Record",
                  body: "Log attendance and accomplishments once per day.",
                },
                {
                  step: "2",
                  title: "Review",
                  body: "Check totals, undertime, and anything that still needs attention.",
                },
                {
                  step: "3",
                  title: "Generate",
                  body: "Download Word and Excel files that keep the templates your office already uses.",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="border-auri-border bg-auri-surface/80 rounded-3xl border p-6"
                >
                  <p className="text-auri-orange-700 text-sm font-semibold">
                    Step {item.step}
                  </p>
                  <h3 className="text-auri-ink mt-2 text-lg font-semibold">
                    {item.title}
                  </h3>
                  <p className="text-auri-ink-muted mt-2 text-sm">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </SectionReveal>
      </section>

      <section id="outputs" className="border-auri-border/70 bg-auri-surface/50 border-t">
        <SectionReveal>
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
            <div className="space-y-3">
              <h2 className="text-auri-ink text-2xl font-semibold">
                One input. Two files.
              </h2>
              <p className="text-auri-ink-muted">
                A single period of daily entries produces an accomplishment report and a
                Daily Time Record. Both stay editable in Microsoft Office.
              </p>
            </div>
            <ul className="border-auri-border from-auri-orange-50 to-auri-surface space-y-4 rounded-3xl border bg-gradient-to-br p-6">
              <li>
                <p className="text-auri-ink font-medium">Accomplishment report</p>
                <p className="text-auri-ink-muted text-sm">
                  DOCX — familiar Word layout, ready to review and print.
                </p>
              </li>
              <li>
                <p className="text-auri-ink font-medium">Daily Time Record</p>
                <p className="text-auri-ink-muted text-sm">
                  XLSX — CSC Form No. 48 structure preserved in Excel.
                </p>
              </li>
            </ul>
          </div>
        </SectionReveal>
      </section>

      <section id="presets" className="border-auri-border/70 border-t">
        <SectionReveal>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-auri-ink text-2xl font-semibold">
              Repeat the work that already happened
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
                <h3 className="text-auri-ink text-lg font-semibold">Presets</h3>
                <p className="text-auri-ink-muted mt-2 text-sm">
                  Save phrases you reuse, then drop them into a day without retyping.
                </p>
              </div>
              <div className="border-auri-border bg-auri-surface rounded-3xl border p-6">
                <h3 className="text-auri-ink text-lg font-semibold">
                  Copy previous workday
                </h3>
                <p className="text-auri-ink-muted mt-2 text-sm">
                  Carry times and accomplishments forward, then adjust only what changed.
                </p>
              </div>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section id="trust" className="border-auri-border/70 bg-auri-surface/60 border-t">
        <SectionReveal>
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <h2 className="text-auri-ink text-2xl font-semibold">
              Your files stay yours
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <p className="text-auri-ink-muted text-sm">
                Auri fills the Office templates your workplace already recognizes. The
                downloaded Word and Excel files remain editable.
              </p>
              <p className="text-auri-ink-muted text-sm">
                Generated reports are private to your account. Browser previews confirm
                content; they are not a claim of pixel-perfect print output.
              </p>
            </div>
          </div>
        </SectionReveal>
      </section>

      <section id="get-started" className="border-auri-border/70 border-t">
        <SectionReveal>
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
            <h2 className="text-auri-ink text-3xl font-semibold tracking-tight">
              {AURI_TAGLINE}
            </h2>
            <p className="text-auri-ink-muted mx-auto mt-3 max-w-xl">
              Start with your profile and schedule, then create the current half-month
              report.
            </p>
            <div className="mt-8 flex justify-center">
              <Button asChild size="lg">
                <Link href="/sign-up">{AURI_PRIMARY_CTA}</Link>
              </Button>
            </div>
          </div>
        </SectionReveal>
      </section>
    </div>
  );
}
