import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PwaManager } from "@/components/pwa-manager";
import "./globals.css";

const dmSans = localFont({
  src: "./fonts/dm-sans-latin-700-normal.woff2",
  weight: "700",
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [
    { path: "./fonts/space-grotesk-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/space-grotesk-latin-600-normal.woff2", weight: "600" },
    { path: "./fonts/space-grotesk-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-space-grotesk",
  display: "swap",
});

const inter = localFont({
  src: [
    { path: "./fonts/inter-latin-400-normal.woff2", weight: "400" },
    { path: "./fonts/inter-latin-500-normal.woff2", weight: "500" },
    { path: "./fonts/inter-latin-600-normal.woff2", weight: "600" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0E6B5B",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "Keyhaus — Honest Nigerian Rentals & Room Tours",
    template: "%s · Keyhaus",
  },
  description:
    "Find homes to rent across Nigeria with room-by-room photo tours and honest neighborhood reports on power, roads, water, and waste.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Keyhaus",
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-NG"
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${inter.variable}`}
    >
      <body className="min-h-screen bg-[#F6F4EF] text-[#17211F] antialiased selection:bg-[#DDEEE9] selection:text-[#0E6B5B]">
        {children}
        <PwaManager />
      </body>
    </html>
  );
}
