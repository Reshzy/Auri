import { ImageResponse } from "next/og";
import { AURI_THEME_COLOR } from "@/lib/brand";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ea580c",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: 999,
          background: AURI_THEME_COLOR,
        }}
      />
    </div>,
    size,
  );
}
