import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";

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
  title: {
    default: "Mechanical Team Inventory",
    template: "%s · Mechanical Team Inventory",
  },
  description:
    "Search the mechanical team's tools and materials, see what is in stock and where it is kept.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader />

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          {children}
        </main>

        <footer className="border-t border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
            Mechanical Team Inventory. Anyone with this link can search stock and
            locations. Changes require an account.
          </div>
        </footer>
      </body>
    </html>
  );
}
