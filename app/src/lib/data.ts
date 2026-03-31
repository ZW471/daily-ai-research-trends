import type { DailyReview, Index, LiteratureReview, ReviewsIndex } from "./types";

export type Language = "en" | "cn";

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/ZW471/daily-ai-research-trends/main/data";

const isDev = process.env.NODE_ENV === "development";

async function fetchFromGitHub(urlPath: string): Promise<string | null> {
  try {
    const res = await fetch(`${GITHUB_RAW_BASE}/${urlPath}`, {
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function readLocal(filePath: string): Promise<string | null> {
  try {
    const { promises: fs } = await import("fs");
    const path = await import("path");
    const dataDir = (() => {
      const local = path.join(process.cwd(), "data");
      const parent = path.join(process.cwd(), "..", "data");
      try {
        require("fs").accessSync(local);
        return local;
      } catch {
        return parent;
      }
    })();
    return await fs.readFile(path.join(dataDir, filePath), "utf-8");
  } catch {
    return null;
  }
}

async function loadData(filePath: string): Promise<string | null> {
  if (isDev) {
    return await readLocal(filePath);
  }
  return await fetchFromGitHub(filePath);
}

export async function getLanguageFromCookies(): Promise<Language> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const lang = cookieStore.get("lang")?.value;
    return lang === "cn" ? "cn" : "en";
  } catch {
    return "en";
  }
}

export async function getIndex(lang: Language = "en"): Promise<Index | null> {
  const content = await loadData(`index_${lang}.json`);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getDailyReview(
  date: string,
  lang: Language = "en"
): Promise<DailyReview | null> {
  const content = await loadData(`daily/${date}_${lang}.json`);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getAllDates(lang: Language = "en"): Promise<string[]> {
  const index = await getIndex(lang);
  if (index) {
    return index.days.map((d) => d.date).sort().reverse();
  }
  return [];
}

export async function getReviewsIndex(lang: Language = "en"): Promise<ReviewsIndex | null> {
  const content = await loadData(`reviews-index_${lang}.json`);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getReview(
  date: string,
  lang: Language = "en"
): Promise<LiteratureReview | null> {
  const content = await loadData(`reviews/${date}_${lang}.json`);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
