import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AURI_DESCRIPTION, AURI_NAME, AURI_TAGLINE, AURI_THEME_COLOR } from "@/lib/brand";
import { getSiteUrl } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: `${AURI_NAME} — ${AURI_TAGLINE}`,
    template: `%s — ${AURI_NAME}`,
  },
  description: AURI_DESCRIPTION,
  applicationName: AURI_NAME,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: `${AURI_NAME} — ${AURI_TAGLINE}`,
    description: AURI_DESCRIPTION,
    siteName: AURI_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${AURI_NAME} — ${AURI_TAGLINE}`,
    description: AURI_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: AURI_THEME_COLOR,
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ClerkProvider afterSignOutUrl="/" appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
