import type { MetadataRoute } from "next";
import { AURI_DESCRIPTION, AURI_NAME, AURI_THEME_COLOR } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: AURI_NAME,
    short_name: AURI_NAME,
    description: AURI_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: AURI_THEME_COLOR,
    theme_color: AURI_THEME_COLOR,
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
