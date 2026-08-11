import Link from "next/link";
import { HeroAurora } from "@/components/brand/hero-aurora";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <HeroAurora />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-4 py-16 sm:px-6">
          <div className="motion-safe-fade-in max-w-2xl space-y-6">
            <p className="text-auri-orange-700 text-sm font-medium tracking-wide uppercase">
              Your reporting routine, simplified.
            </p>
            <h1 className="text-auri-ink text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
              Auri
            </h1>
            <p className="text-auri-ink max-w-xl text-xl sm:text-2xl">
              Work, without the paperwork.
            </p>
            <p className="text-auri-ink-muted max-w-xl text-base sm:text-lg">
              Record your time and accomplishments once. Auri prepares your DTR and
              accomplishment report using the templates your office already knows.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Create your report</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/#how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section id="product" className="border-auri-border/70 bg-auri-surface/60 border-t">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-auri-ink text-2xl font-semibold">
              One entry. Two official files.
            </h2>
            <p className="text-auri-ink-muted">
              Fill daily attendance and accomplishments in a calm workspace. Generate the
              CSC Form No. 48 DTR and your accomplishment report without retyping.
            </p>
          </div>
          <div className="border-auri-border from-auri-orange-50 to-auri-surface rounded-3xl border bg-gradient-to-br p-6 shadow-sm">
            <p className="text-auri-orange-700 text-sm font-medium">Official outputs</p>
            <ul className="text-auri-ink mt-4 space-y-3 text-sm">
              <li>Daily Time Record (XLSX)</li>
              <li>Accomplishment Report (DOCX)</li>
              <li>Editable downloads that preserve familiar layouts</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-auri-border/70 border-t">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-auri-ink text-2xl font-semibold">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Record",
                body: "Enter times and accomplishments once per day.",
              },
              {
                step: "2",
                title: "Review",
                body: "Check totals, undertime, and validation warnings.",
              },
              {
                step: "3",
                title: "Generate",
                body: "Download Word and Excel files ready for print review.",
              },
            ].map((item) => (
              <li
                key={item.step}
                className="border-auri-border bg-auri-surface/80 rounded-3xl border p-6"
              >
                <p className="text-auri-orange-700 text-sm font-semibold">
                  Step {item.step}
                </p>
                <h3 className="text-auri-ink mt-2 text-lg font-semibold">{item.title}</h3>
                <p className="text-auri-ink-muted mt-2 text-sm">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
