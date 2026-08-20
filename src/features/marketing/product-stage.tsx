import { MarketingEditorMock } from "@/features/marketing/editor-mock";
import { MarketingOutputPair } from "@/features/marketing/output-pair";

export function MarketingProductStage() {
  return (
    <figure id="outputs" className="auri-hash-target space-y-4">
      <div className="pointer-events-none select-none" aria-hidden="true">
        <MarketingEditorMock />
        <div className="mt-4">
          <MarketingOutputPair />
        </div>
      </div>
      <figcaption
        id="trust"
        className="auri-hash-target text-auri-ink-muted max-w-prose text-sm leading-relaxed"
      >
        One day fills both files. The preview confirms content; downloaded Word and Excel
        keep the office templates. Print layout can differ slightly from this screen.
      </figcaption>
    </figure>
  );
}
