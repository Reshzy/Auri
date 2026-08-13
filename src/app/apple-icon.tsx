import { ImageResponse } from "next/og";
import { AURI_THEME_COLOR } from "@/lib/brand";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ea580c",
        borderRadius: 40,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 999,
          background: AURI_THEME_COLOR,
        }}
      />
    </div>,
    size,
  );
}
