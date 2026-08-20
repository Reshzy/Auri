/**
 * Fictional marketing composition only. Do not use onboarding sample names or report fixtures.
 */
export function MarketingOutputPair() {
  return (
    <div className="grid grid-cols-2 gap-3 px-1 py-2 sm:px-0">
      <article className="border-auri-border rotate-0 rounded-2xl border bg-white p-3 shadow-[2px_6px_18px_color-mix(in_srgb,var(--auri-ink)_8%,transparent)] sm:rotate-[-1.25deg]">
        <p className="text-auri-ink text-xs font-semibold">Daily Time Record</p>
        <p className="text-auri-ink-muted text-xs">XLSX · CSC Form No. 48</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-xs tabular-nums">
          <div>
            <dt className="text-auri-ink-muted">AM in</dt>
            <dd className="text-auri-ink font-medium">07:00</dd>
          </div>
          <div>
            <dt className="text-auri-ink-muted">AM out</dt>
            <dd className="text-auri-ink font-medium">12:00</dd>
          </div>
          <div>
            <dt className="text-auri-ink-muted">PM in</dt>
            <dd className="text-auri-ink font-medium">13:00</dd>
          </div>
          <div>
            <dt className="text-auri-ink-muted">PM out</dt>
            <dd className="text-auri-ink font-medium">18:00</dd>
          </div>
        </dl>
        <p className="text-auri-ink-muted mt-3 text-xs">Left and right copies match.</p>
      </article>
      <article className="border-auri-border rotate-0 rounded-2xl border bg-white p-3 shadow-[2px_6px_18px_color-mix(in_srgb,var(--auri-ink)_8%,transparent)] sm:rotate-[1.5deg]">
        <p className="text-auri-ink text-xs font-semibold">Accomplishment report</p>
        <p className="text-auri-ink-muted text-xs">DOCX · Word layout</p>
        <ul className="text-auri-ink mt-3 space-y-1 text-xs leading-snug">
          <li>Prepared weekly status notes for the office.</li>
          <li>Reviewed incoming requests and routed replies.</li>
        </ul>
      </article>
    </div>
  );
}
