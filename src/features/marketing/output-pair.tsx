/**
 * Fictional marketing composition only. Do not use onboarding sample names or report fixtures.
 */

const DAYS = [
  { day: "3", amIn: "07:00", amOut: "12:00", pmIn: "13:00", pmOut: "18:00" },
  { day: "4", amIn: "07:00", amOut: "12:00", pmIn: "13:00", pmOut: "18:00" },
  { day: "5", amIn: "07:00", amOut: "12:00", pmIn: "13:00", pmOut: "18:00" },
] as const;

const paperClassName =
  "border-auri-border rounded-xl border bg-white p-3 shadow-[2px_6px_18px_color-mix(in_srgb,var(--auri-ink)_8%,transparent)] sm:p-4";

export function MarketingOutputPair() {
  return (
    <div className="space-y-4 px-1 py-2 sm:px-0">
      <article className={paperClassName}>
        <p className="text-auri-ink text-center text-xs tracking-wide uppercase">
          CSC Form No. 48
        </p>
        <p className="text-auri-ink mt-1 text-center text-xs font-semibold">
          Daily Time Record
        </p>
        <p className="text-auri-ink-muted mt-0.5 text-center text-xs">
          XLSX · first half of the current month
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <Form48Copy title="Left copy" />
          <Form48Copy title="Right copy" />
        </div>
        <p className="text-auri-ink-muted mt-3 text-center text-xs">
          Left and right copies match.
        </p>
      </article>

      <article className={paperClassName}>
        <p className="text-auri-ink text-center text-xs tracking-wide uppercase">
          Accomplishment report
        </p>
        <p className="text-auri-ink-muted mt-0.5 text-center text-xs">
          DOCX · Word layout · first half of the current month
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
            <caption className="sr-only">Sample accomplishment report days</caption>
            <thead>
              <tr>
                <th className="border-auri-border border px-2 py-1 font-medium">Date</th>
                <th className="border-auri-border border px-2 py-1 font-medium">AM</th>
                <th className="border-auri-border border px-2 py-1 font-medium">PM</th>
                <th className="border-auri-border border px-2 py-1 font-medium">
                  Time spent
                </th>
                <th className="border-auri-border border px-2 py-1 font-medium">
                  Daily accomplishment
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap">
                  Aug 4
                </td>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap tabular-nums">
                  07:00–12:00
                </td>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap tabular-nums">
                  13:00–18:00
                </td>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap tabular-nums">
                  10 hrs
                </td>
                <td className="border-auri-border border px-2 py-1">
                  Prepared weekly status notes for the office.
                </td>
              </tr>
              <tr>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap">
                  Aug 5
                </td>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap tabular-nums">
                  07:00–12:00
                </td>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap tabular-nums">
                  13:00–18:00
                </td>
                <td className="border-auri-border border px-2 py-1 whitespace-nowrap tabular-nums">
                  10 hrs
                </td>
                <td className="border-auri-border border px-2 py-1">
                  Reviewed incoming requests and routed replies.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}

function Form48Copy({ title }: { title: string }) {
  return (
    <div>
      <p className="text-auri-ink mb-2 text-center text-xs font-medium">{title}</p>
      <table className="w-full border-collapse text-xs tabular-nums">
        <thead>
          <tr>
            <th className="border-auri-border border px-1 py-1 font-medium">Day</th>
            <th className="border-auri-border border px-1 py-1 font-medium">AM in</th>
            <th className="border-auri-border border px-1 py-1 font-medium">AM out</th>
            <th className="border-auri-border border px-1 py-1 font-medium">PM in</th>
            <th className="border-auri-border border px-1 py-1 font-medium">PM out</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((row) => (
            <tr key={`${title}-${row.day}`}>
              <td className="border-auri-border border px-1 py-1 text-center">
                {row.day}
              </td>
              <td className="border-auri-border border px-1 py-1 text-center">
                {row.amIn}
              </td>
              <td className="border-auri-border border px-1 py-1 text-center">
                {row.amOut}
              </td>
              <td className="border-auri-border border px-1 py-1 text-center">
                {row.pmIn}
              </td>
              <td className="border-auri-border border px-1 py-1 text-center">
                {row.pmOut}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
