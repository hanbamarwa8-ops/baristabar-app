import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Figtree,
  Geist,
  Geist_Mono,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-brand",
  display: "swap",
});

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BaristaBar | Discover your coffee",
  description: "Discover your coffee. Brew your experience.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        cormorant.variable,
        figtree.variable,
        geistSans.variable,
        geistMono.variable,
        "font-sans"
      )}
    >
      <body className="min-h-full antialiased">
        {children}
      </body>
    </html>
  );
}
