import { ImageResponse } from "next/og";
import { AURI_DESCRIPTION, AURI_NAME, AURI_TAGLINE, AURI_THEME_COLOR } from "@/lib/brand";

export const alt = `${AURI_NAME} — ${AURI_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: 80,
        background: `linear-gradient(180deg, ${AURI_THEME_COLOR} 0%, #fff7ed 100%)`,
        color: "#17130f",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -80,
          left: 80,
          width: 280,
          height: 280,
          borderRadius: 999,
          background: "rgba(249, 115, 22, 0.28)",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 40,
          bottom: -40,
          width: 360,
          height: 360,
          borderRadius: 999,
          background: "rgba(234, 88, 12, 0.16)",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#ea580c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: AURI_THEME_COLOR,
            }}
          />
        </div>
        <div style={{ fontSize: 32, fontWeight: 600 }}>{AURI_NAME}</div>
      </div>
      <div style={{ marginTop: 36, fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>
        {AURI_TAGLINE}
      </div>
      <div style={{ marginTop: 24, fontSize: 28, color: "#6f6258", maxWidth: 820 }}>
        {AURI_DESCRIPTION}
      </div>
    </div>,
    size,
  );
}
