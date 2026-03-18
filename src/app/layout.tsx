import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers/Providers";
import ClickBirdEffect from "@/components/shared/ClickBirdEffect";
import BackgroundLogos from "@/components/shared/BackgroundLogos";
import BackToTop from "@/components/shared/BackToTop";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CadPay | Next-Gen Subscriptions on Injective",
  description: "Experience the fastest and most interoperable subscription protocol built on Injective. CadPay enables seamless recurring payments for the Web3 economy.",
  keywords: ["CadPay", "Injective", "Subscriptions", "Web3 Payments", "DeFi", "Crypto Subscriptions", "Layer 1", "Fastest Blockchain"],
  authors: [{ name: "CadPay Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#ff8800",
  openGraph: {
    title: "CadPay | Next-Gen Subscriptions on Injective",
    description: "The fastest and most interoperable subscription protocol for the Web3 economy.",
    url: "https://cadpay.io",
    siteName: "CadPay",
    images: [
      {
        url: "/og-image.png", // Assuming this will be added or exists
        width: 1200,
        height: 630,
        alt: "CadPay - Subscriptions on Injective",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CadPay | Next-Gen Subscriptions on Injective",
    description: "Experience the fastest and most interoperable subscription protocol built on Injective.",
    images: ["/og-image.png"],
    creator: "@CadPay",
  },
    icons: {
    icon: [
      { url: "/icon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" }
    ],
    shortcut: "/icon.ico",
    apple: "/icon.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <body>
        <Providers>
          <ClickBirdEffect />
          <BackgroundLogos />
          <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
            {children}
            <BackToTop />
          </div>
        </Providers>
      </body>
    </html>
  );
}
