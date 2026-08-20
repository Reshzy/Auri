import { cn } from "@/lib/utils";

type AuriMarkProps = {
  className?: string;
  showWordmark?: boolean;
};

export function AuriMark({ className, showWordmark = true }: AuriMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {/* <span
        aria-hidden="true"
        className="bg-auri-orange-600 shadow-auri-orange-600/30 relative grid h-9 w-9 place-items-center overflow-hidden rounded-2xl shadow-sm"
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.45),transparent_55%)]" />
        <span className="bg-auri-paper relative h-3.5 w-3.5 rounded-full" />
      </span> */}
      <img src="/logo.png" alt="Auri logo" className="h-10" />
      {showWordmark ? (
        <span className="text-auri-ink text-lg font-semibold tracking-tight">Auri</span>
      ) : null}
    </span>
  );
}
