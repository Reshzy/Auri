import type { Metadata } from "next";
import { LandingPage } from "@/features/marketing/landing";
import { AURI_DESCRIPTION, AURI_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = {
  title: { absolute: `Auri — ${AURI_TAGLINE}` },
  description: AURI_DESCRIPTION,
};

export default function HomePage() {
  return <LandingPage />;
}
