import Link from "next/link";
import { getReviewsIndex } from "@/lib/data";

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

export default async function ReviewsPage() {
  const index = await getReviewsIndex();
  const reviews = index?.reviews ?? [];

  if (reviews.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-4">No reviews yet</h1>
        <p className="text-muted">
          Literature reviews will appear here once the first volume is published.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Literature Reviews
        </h1>
        <p className="text-muted text-lg">
          In-depth comparative reviews of AI/ML model families and research
          directions.
        </p>
      </div>

      <div className="space-y-4">
        {reviews.map((entry) => (
          <Link
            key={entry.date}
            href={`/reviews/${entry.date}`}
            className="block bg-card border border-border rounded-lg p-6 hover:border-accent/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
                    Vol. {entry.volume}
                  </span>
                  <span className="text-sm text-muted">
                    {formatDate(entry.date)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold mb-2">{entry.title}</h2>
                <p className="text-sm text-muted leading-relaxed">
                  {entry.subtitle}
                </p>
              </div>
              <div className="flex gap-4 text-sm text-muted shrink-0">
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {entry.model_count}
                  </div>
                  <div>models</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {entry.section_count}
                  </div>
                  <div>sections</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
