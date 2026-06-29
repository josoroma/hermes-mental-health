import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { AppNav } from "@/components/app-nav";
import { UiLabelsOverlay } from "@/components/ui-labels-overlay";
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
  title: "Hermes Mental Health",
  description:
    "DSM-5-TR assessment management for mental health practitioners — dashboard, patient profiles, invites, forms, results, and editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
      style={{ colorScheme: "dark" }}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppNav />
          {children}
          <UiLabelsOverlay />
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}