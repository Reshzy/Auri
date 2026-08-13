/**
 * Fictional marketing composition only. Do not use onboarding sample names or report fixtures.
 */
export function MarketingEditorMock() {
  return (
    <div className="border-auri-border bg-auri-surface rounded-3xl border p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-auri-ink-muted text-xs tracking-wide uppercase">
            Daily editor
          </p>
          <p className="text-auri-ink text-sm font-semibold">
            First half · current period
          </p>
        </div>
        <span className="border-auri-border bg-auri-orange-50 text-auri-orange-700 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium">
          Saved · 14:02
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-[7.5rem_minmax(0,1fr)]">
        <ol className="hidden gap-1 md:grid">
          {["Mon 3", "Tue 4", "Wed 5"].map((label, index) => (
            <li
              key={label}
              className={
                index === 1
                  ? "bg-auri-orange-600 rounded-xl px-3 py-2 text-xs font-medium text-white"
                  : "text-auri-ink-muted rounded-xl px-3 py-2 text-xs"
              }
            >
              {label}
            </li>
          ))}
        </ol>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["AM in", "07:00"],
              ["AM out", "12:00"],
              ["PM in", "13:00"],
              ["PM out", "18:00"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="border-auri-border bg-auri-bg rounded-2xl border px-3 py-2"
              >
                <p className="text-auri-ink-muted text-xs">{label}</p>
                <p className="text-auri-ink text-sm font-medium tabular-nums">{value}</p>
              </div>
            ))}
          </div>
          <div className="border-auri-border rounded-2xl border px-3 py-3">
            <p className="text-auri-ink-muted text-xs">Accomplishments</p>
            <ul className="text-auri-ink mt-2 space-y-1 text-sm">
              <li>Prepared weekly status notes for the office.</li>
              <li>Reviewed incoming requests and routed replies.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
