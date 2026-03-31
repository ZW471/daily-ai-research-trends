import Link from "next/link";
import { getReviewsIndex, getLanguageFromCookies } from "@/lib/data";
import { t, formatDateLocalized, volLabel } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ReviewsPage() {
  const lang = await getLanguageFromCookies();
  const index = await getReviewsIndex(lang);
  const reviews = index?.reviews ?? [];
  const i18n = t(lang);

  if (reviews.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h1 className="text-2xl font-semibold mb-4">{i18n.noReviewsTitle}</h1>
        <p className="text-muted">{i18n.noReviewsLit}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {i18n.litReviewsTitle}
        </h1>
        <p className="text-muted text-lg">{i18n.litReviewsSubtitle}</p>
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
                    {volLabel(entry.volume, lang)}
                  </span>
                  <span className="text-sm text-muted">
                    {formatDateLocalized(entry.date, lang)}
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
                  <div>{i18n.models}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-foreground">
                    {entry.section_count}
                  </div>
                  <div>{i18n.sections}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
