import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "hzel - Transparent Hosting for Everyone",
  description: "Discover hosting that puts you in control. Fair pricing, full data ownership, no overcrowding, and privacy by default. Learn how hosting works and experience the difference.",
  icons: {
    icon: { url: "https://content.hzel.org/branding/logo.svg", type: "image/svg+xml" },
  },
  openGraph: {
    title: "hzel - Transparent Hosting for Everyone",
    description: "Hosting that puts you in control. Fair pricing, full data ownership, no overcrowding, and privacy by default.",
    type: "website",
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
      className={`${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
