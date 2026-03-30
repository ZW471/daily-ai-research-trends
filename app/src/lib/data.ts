import { promises as fs } from "fs";
import path from "path";
import type { DailyReview, Index } from "./types";

const DATA_DIR = path.join(process.cwd(), "..", "data");

export async function getIndex(): Promise<Index | null> {
  try {
    const content = await fs.readFile(
      path.join(DATA_DIR, "index.json"),
      "utf-8"
    );
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function getDailyReview(
  date: string
): Promise<DailyReview | null> {
  try {
    const content = await fs.readFile(
      path.join(DATA_DIR, "daily", `${date}.json`),
      "utf-8"
    );
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
  // Fallback: scan the daily directory
  try {
    const files = await fs.readdir(path.join(DATA_DIR, "daily"));
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}
