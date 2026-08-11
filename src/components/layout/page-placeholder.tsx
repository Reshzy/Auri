type PagePlaceholderProps = {
  title: string;
  description: string;
  phaseNote: string;
};

export function PagePlaceholder({ title, description, phaseNote }: PagePlaceholderProps) {
  return (
    <section className="motion-safe-fade-in max-w-3xl space-y-3">
      <h2 className="text-auri-ink text-2xl font-semibold">{title}</h2>
      <p className="text-auri-ink-muted">{description}</p>
      <p className="border-auri-border bg-auri-surface/70 text-auri-ink-muted rounded-2xl border border-dashed px-4 py-3 text-sm">
        {phaseNote}
      </p>
    </section>
  );
}
