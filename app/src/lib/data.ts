import type { DailyReview, Index } from "./types";

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

export async function getIndex(): Promise<Index | null> {
  const content = await loadData("index.json");
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getDailyReview(
  date: string
): Promise<DailyReview | null> {
  const content = await loadData(`daily/${date}.json`);
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getAllDates(): Promise<string[]> {
  const index = await getIndex();
  if (index) {
    return index.days.map((d) => d.date).sort().reverse();
  }
  return [];
}
