import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "Research Trends",
  description: "Daily AI/ML research trending analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight text-foreground">
                Research Trends
              </span>
              <span className="text-xs font-medium text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                AI/ML
              </span>
            </Link>
            <span className="text-sm text-muted">Daily Review</span>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 mt-12">
          <div className="max-w-5xl mx-auto px-6 text-sm text-muted">
            AI/ML Research Trends &mdash; automated daily analysis
          </div>
        </footer>
      </body>
    </html>
  );
}
