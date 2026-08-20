import Link from "next/link";

type AuthAccountSwitcherProps = {
  prompt: string;
  href: string;
  actionLabel: string;
};

export function AuthAccountSwitcher({
  prompt,
  href,
  actionLabel,
}: AuthAccountSwitcherProps) {
  return (
    <p className="text-auri-ink-muted flex min-h-11 flex-wrap items-center gap-x-1 text-sm">
      <span>{prompt}</span>
      <Link
        href={href}
        className="text-auri-orange-700 inline-flex min-h-11 items-center font-medium underline-offset-2 hover:underline"
      >
        {actionLabel}
      </Link>
    </p>
  );
}
