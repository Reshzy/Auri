import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";
import { Alert } from "./alert";

describe("shared product states", () => {
  it("renders an empty state with an action", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="No reports yet"
        description="Create a first-half or second-half period."
        action={<button type="button">Create report</button>}
      />,
    );
    expect(html).toContain("No reports yet");
    expect(html).toContain("Create report");
  });

  it("marks danger alerts as assertive", () => {
    const html = renderToStaticMarkup(
      <Alert tone="danger" title="Could not save">
        Try again.
      </Alert>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain("Try again.");
  });
});
