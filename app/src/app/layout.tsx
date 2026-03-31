import type { Metadata } from "next";
import { Geist, Geist_Mono, Special_Elite } from "next/font/google";
import Link from "next/link";
import { GitHubStars } from "./github-stars";
import { LanguageToggle } from "./language-toggle";
import { getLanguageFromCookies } from "@/lib/data";
import { t } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const specialElite = Special_Elite({
  variable: "--font-special-elite",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wowl",
  description: "Daily AI/ML research trending analysis",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLanguageFromCookies();
  const i18n = t(lang);

  return (
    <html
      lang={lang === "cn" ? "zh-CN" : "en"}
      className={`${geistSans.variable} ${geistMono.variable} ${specialElite.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-3">
                <span className="text-3xl tracking-tight text-foreground" style={{ fontFamily: "var(--font-special-elite)" }}>
                  {i18n.siteTitle}
                </span>
              </Link>
              <nav className="flex items-center gap-1">
                <Link
                  href="/"
                  className="text-sm font-medium text-muted hover:text-foreground px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {i18n.navDaily}
                </Link>
                <Link
                  href="/reviews"
                  className="text-sm font-medium text-muted hover:text-foreground px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  {i18n.navReviews}
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <LanguageToggle />
              <a
                href="https://github.com/ZW471/daily-ai-research-trends"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
              >
                <span className="text-sm font-medium">@ZW471</span>
                <svg
                  viewBox="0 0 16 16"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-label="GitHub"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <GitHubStars />
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border py-6 mt-12">
          <div className="max-w-7xl mx-auto px-6 text-sm text-muted">
            {i18n.footerText}
          </div>
        </footer>
      </body>
    </html>
  );
}
