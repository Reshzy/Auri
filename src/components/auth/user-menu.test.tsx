import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signOut: async () => undefined } }),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogClose: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
    asChild?: boolean;
  }) => <span className={className}>{children}</span>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({
    children,
    id,
    className,
  }: {
    children?: React.ReactNode;
    id?: string;
    className?: string;
  }) => (
    <p id={id} className={className}>
      {children}
    </p>
  ),
  DialogTitle: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => <h2 className={className}>{children}</h2>,
}));

import { UserMenu } from "./user-menu";

describe("UserMenu", () => {
  it("renders a DiceBear sprouts animation avatar when a user id is provided", () => {
    const html = renderToStaticMarkup(
      <UserMenu email="ada@example.com" userId="user-123" />,
    );
    expect(html).toContain(
      "https://api.dicebear.com/10.x/sprouts/svg?seed=user-123&amp;tags=animation",
    );
    expect(html).toContain("ada@example.com");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain("mix-blend-overlay");
  });

  it("falls back to initials when no user id is provided", () => {
    const html = renderToStaticMarkup(<UserMenu email="ada@example.com" />);
    expect(html).not.toContain("api.dicebear.com");
    expect(html).toContain(">A<");
  });

  it("shows employee name and settings shortcuts in the app account dialog", () => {
    const html = renderToStaticMarkup(
      <UserMenu email="ada@example.com" userId="user-123" employeeName="Ada Lovelace" />,
    );
    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("/app/settings/profile");
    expect(html).toContain("Profile &amp; office");
    expect(html).toContain("Sign out");
  });

  it("omits settings shortcuts in the marketing variant", () => {
    const html = renderToStaticMarkup(
      <UserMenu variant="marketing" email="ada@example.com" userId="user-123" />,
    );
    expect(html).not.toContain("/app/settings/profile");
    expect(html).toContain("/app");
    expect(html).toContain("Open app");
    expect(html).toContain("Sign out");
  });
});
