import { cn } from "@/lib/utils";

type AuriMarkProps = {
  className?: string;
  showWordmark?: boolean;
};

export function AuriMark({ className, showWordmark = true }: AuriMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/logo.png"
        alt={showWordmark ? "" : "Auri"}
        width={856}
        height={746}
        className="h-10 w-auto"
      />
      {showWordmark ? (
        <span className="text-auri-ink text-lg font-semibold tracking-tight">Auri</span>
      ) : null}
    </span>
  );
}
