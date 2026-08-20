export function SkipToContent({ href = "#main-content" }: { href?: string }) {
  return (
    <a
      href={href}
      className="bg-auri-orange-700 focus:ring-auri-orange-700 absolute top-[max(0.75rem,env(safe-area-inset-top,0px))] left-[max(0.75rem,env(safe-area-inset-left,0px))] z-50 -translate-y-[calc(100%+1.5rem)] rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap text-white focus:translate-y-0 focus:ring-2"
    >
      Skip to content
    </a>
  );
}
