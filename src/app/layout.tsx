import type { Metadata } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "DELAY RECEIPT · Cryptographically Signed Airline Delay Proof",
    template: "%s · DELAY RECEIPT",
  },
  description:
    "Verify airport skies and airline arrival delays with cryptographically signed first-party AirnodeHub telemetry. Generate an immutable EU261 / UK261 proof receipt in seconds.",
  openGraph: {
    title: "DELAY RECEIPT · Cryptographically Signed Airline Delay Proof",
    description:
      "Debunk airline bad-weather excuses in seconds with cryptographically signed aviation and meteorological telemetry via API3 AirnodeHub.",
    type: "website",
    siteName: "DELAY RECEIPT",
  },
  twitter: {
    card: "summary_large_image",
    title: "DELAY RECEIPT · Cryptographically Signed Airline Delay Proof",
    description:
      "Debunk airline bad-weather excuses in seconds with cryptographically signed aviation and weather telemetry.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#111111] text-[#F3F1EA] font-sans selection:bg-[#D92D20] selection:text-[#F3F1EA] flex flex-col">
        {children}
      </body>
    </html>
  );
}
