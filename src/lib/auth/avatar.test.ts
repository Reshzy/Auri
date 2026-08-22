import { describe, expect, it } from "vitest";
import { avatarUrlFromAuthClaims, avatarUrlFromUserMetadata } from "@/lib/auth/avatar";

describe("avatarUrlFromUserMetadata", () => {
  it("prefers GitHub avatar_url over picture", () => {
    expect(
      avatarUrlFromUserMetadata({
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        picture: "https://lh3.googleusercontent.com/a/google",
      }),
    ).toBe("https://avatars.githubusercontent.com/u/1");
  });

  it("falls back to Google picture when avatar_url is missing", () => {
    expect(
      avatarUrlFromUserMetadata({
        picture: "https://lh3.googleusercontent.com/a/google-photo",
      }),
    ).toBe("https://lh3.googleusercontent.com/a/google-photo");
  });

  it("returns null when metadata is missing", () => {
    expect(avatarUrlFromUserMetadata(undefined)).toBeNull();
    expect(avatarUrlFromUserMetadata(null)).toBeNull();
    expect(avatarUrlFromUserMetadata({})).toBeNull();
  });

  it("rejects non-https URLs", () => {
    expect(
      avatarUrlFromUserMetadata({ avatar_url: "http://example.com/a.png" }),
    ).toBeNull();
    expect(avatarUrlFromUserMetadata({ avatar_url: "javascript:alert(1)" })).toBeNull();
    expect(
      avatarUrlFromUserMetadata({
        avatar_url: "data:image/png;base64,aaaa",
      }),
    ).toBeNull();
    expect(avatarUrlFromUserMetadata({ avatar_url: "/relative.png" })).toBeNull();
  });

  it("skips a bad avatar_url and uses a valid picture", () => {
    expect(
      avatarUrlFromUserMetadata({
        avatar_url: "http://insecure.example/a.png",
        picture: "https://lh3.googleusercontent.com/a/ok",
      }),
    ).toBe("https://lh3.googleusercontent.com/a/ok");
  });
});

describe("avatarUrlFromAuthClaims", () => {
  it("reads user_metadata from JWT claims", () => {
    expect(
      avatarUrlFromAuthClaims({
        sub: "user-1",
        email: "ada@example.com",
        user_metadata: {
          avatar_url: "https://avatars.githubusercontent.com/u/42",
        },
      }),
    ).toBe("https://avatars.githubusercontent.com/u/42");
  });

  it("returns null for claims without user_metadata", () => {
    expect(avatarUrlFromAuthClaims({ sub: "user-1" })).toBeNull();
    expect(avatarUrlFromAuthClaims(null)).toBeNull();
    expect(avatarUrlFromAuthClaims("token")).toBeNull();
  });
});
