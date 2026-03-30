import Link from "next/link";
import { getAllDates, getDailyReview, getIndex } from "@/lib/data";

const THEME_COLORS: Record<string, string> = {
  agents: "bg-purple-100 text-purple-700",
  reasoning: "bg-blue-100 text-blue-700",
  multimodal: "bg-amber-100 text-amber-700",
  efficiency: "bg-green-100 text-green-700",
  "video-generation": "bg-rose-100 text-rose-700",
  "text-generation": "bg-cyan-100 text-cyan-700",
  diffusion: "bg-pink-100 text-pink-700",
  safety: "bg-red-100 text-red-700",
  benchmarks: "bg-indigo-100 text-indigo-700",
  distillation: "bg-teal-100 text-teal-700",
};

function getThemeColor(theme: string): string {
  const key = theme.toLowerCase();
  return THEME_COLORS[key] || "bg-gray-100 text-gray-600";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const dates = await getAllDates();
  const index = await getIndex();

  if (dates.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-4">No reviews yet</h1>
        <p className="text-muted">
          Daily research reviews will appear here once the first analysis is
          published.
        </p>
      </div>
    );
  }

  const reviews = await Promise.all(
    dates.map(async (date) => {
      const indexEntry = index?.days.find((d) => d.date === date);
      const review = await getDailyReview(date);
      return { date, indexEntry, review };
    })
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Daily Research Feed
        </h1>
        <p className="text-muted text-lg">
          Tracking trending AI/ML papers and models across arXiv, HuggingFace,
          and AlphaXiv.
        </p>
      </div>

      <div className="space-y-4">
        {reviews.map(({ date, indexEntry, review }) => {
          const headline =
            review?.summary.headline || indexEntry?.headline || "Daily Review";
          const themes = review?.summary.key_themes || [];
          const paperCount =
            review?.papers.length || indexEntry?.paper_count || 0;
          const modelCount =
            review?.models.length || indexEntry?.model_count || 0;

          return (
            <Link
              key={date}
              href={`/review/${date}`}
              className="block bg-card border border-border rounded-lg p-6 hover:border-accent/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted mb-1">{formatDate(date)}</p>
                  <h2 className="text-xl font-semibold mb-3 truncate">
                    {headline}
                  </h2>
                  {themes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {themes.map((theme) => (
                        <span
                          key={theme}
                          className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getThemeColor(theme)}`}
                        >
                          {theme}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-4 text-sm text-muted shrink-0">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {paperCount}
                    </div>
                    <div>papers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">
                      {modelCount}
                    </div>
                    <div>models</div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
