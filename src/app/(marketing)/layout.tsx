import { MarketingFooter } from "@/components/layout/marketing-footer";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { SkipToContent } from "@/components/layout/skip-to-content";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <SkipToContent />
      <MarketingHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
