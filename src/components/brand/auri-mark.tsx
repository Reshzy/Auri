import Image from "next/image";
import { cn } from "@/lib/utils";

type AuriMarkProps = {
  className?: string;
  showWordmark?: boolean;
  priority?: boolean;
};

export function AuriMark({
  className,
  showWordmark = true,
  priority = false,
}: AuriMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/logo.png"
        alt={showWordmark ? "" : "Auri"}
        width={184}
        height={160}
        sizes="46px"
        priority={priority}
        className="h-10 w-auto"
      />
      {showWordmark ? (
        <span className="text-auri-ink text-lg font-semibold tracking-tight">Auri</span>
      ) : null}
    </span>
  );
}
