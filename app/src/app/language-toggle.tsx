"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Language = "en" | "cn";

function getCookieLang(): Language {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )lang=(\w+)/);
  return match?.[1] === "cn" ? "cn" : "en";
}

function setCookieLang(lang: Language) {
  document.cookie = `lang=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function LanguageToggle() {
  const [lang, setLang] = useState<Language>("en");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setLang(getCookieLang());
  }, []);

  function toggle() {
    const next: Language = lang === "en" ? "cn" : "en";
    setCookieLang(next);
    setLang(next);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="flex items-center gap-1 text-sm font-medium px-2.5 py-1 rounded-md border border-border hover:bg-gray-100 transition-colors text-muted hover:text-foreground disabled:opacity-50"
      aria-label={lang === "en" ? "Switch to Chinese" : "Switch to English"}
      title={lang === "en" ? "切换到中文" : "Switch to English"}
    >
      <span className={lang === "en" ? "text-foreground font-semibold" : ""}>EN</span>
      <span className="text-muted/50">/</span>
      <span className={lang === "cn" ? "text-foreground font-semibold" : ""}>中</span>
    </button>
  );
}
