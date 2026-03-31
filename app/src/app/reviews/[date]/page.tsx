import { notFound } from "next/navigation";
import Link from "next/link";
import { getReview, getReviewsIndex, getLanguageFromCookies } from "@/lib/data";
import type { Language } from "@/lib/data";
import type {
  ReviewSection,
  ReviewModel,
  ComparisonTable,
  SourceCheck,
} from "@/lib/types";
import { t, formatDateLocalized, formatTimeLocalized, volLabel } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n";
import ReactMarkdown from "react-markdown";

export const dynamic = "force-dynamic";

const THEME_COLORS: Record<string, string> = {
  "neural-ode": "bg-blue-100 text-blue-700",
  "continuous-time": "bg-blue-100 text-blue-700",
  vae: "bg-purple-100 text-purple-700",
  "irregular-sampling": "bg-amber-100 text-amber-700",
  gru: "bg-green-100 text-green-700",
  bayesian: "bg-rose-100 text-rose-700",
  filtering: "bg-cyan-100 text-cyan-700",
  "linear-sde": "bg-teal-100 text-teal-700",
  "kalman-filter": "bg-teal-100 text-teal-700",
  uncertainty: "bg-yellow-100 text-yellow-700",
  efficient: "bg-green-100 text-green-700",
  "solver-free": "bg-emerald-100 text-emerald-700",
  attention: "bg-indigo-100 text-indigo-700",
  transformer: "bg-indigo-100 text-indigo-700",
  interpolation: "bg-sky-100 text-sky-700",
  "self-supervised": "bg-violet-100 text-violet-700",
  clinical: "bg-rose-100 text-rose-700",
  "graph-neural-network": "bg-purple-100 text-purple-700",
  "message-passing": "bg-purple-100 text-purple-700",
  "foundation-model": "bg-green-100 text-green-700",
  medical: "bg-rose-100 text-rose-700",
  "open-source": "bg-gray-100 text-gray-600",
  baseline: "bg-gray-100 text-gray-600",
  rnn: "bg-orange-100 text-orange-700",
  cnn: "bg-orange-100 text-orange-700",
  forecasting: "bg-cyan-100 text-cyan-700",
};

function getThemeColor(theme: string): string {
  return THEME_COLORS[theme.toLowerCase()] || "bg-gray-100 text-gray-600";
}

function ReviewModelCard({ model, i18n }: { model: ReviewModel; i18n: Translations }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <h4 className="text-base font-semibold">{model.name}</h4>
          <p className="text-sm text-muted">
            {model.authors.join(", ")}
            {model.affiliations.length > 0 && (
              <span className="text-muted/70">
                {" "}
                &mdash; {model.affiliations.join(", ")}
              </span>
            )}
          </p>
          <p className="text-xs text-muted mt-0.5">{model.venue}</p>
        </div>
      </div>

      <p className="text-sm font-medium text-foreground mb-1">
        {model.paper_title}
      </p>

      <p className="text-sm leading-relaxed mb-3 text-muted">
        {model.core_idea}
      </p>

      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-green-700 mb-1">
          {i18n.keyInnovation}
        </p>
        <p className="text-sm">{model.key_innovation}</p>
      </div>

      {model.limitations.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
            {i18n.limitations}
          </p>
          <ul className="text-sm space-y-1">
            {model.limitations.map((lim, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted shrink-0">&bull;</span>
                <span className="text-muted">{lim}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex flex-wrap gap-1.5">
          {model.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${getThemeColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          {Object.entries(model.sources).map(([key, url]) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-accent hover:underline"
            >
              {key === "arxiv"
                ? "arXiv"
                : key === "pdf"
                  ? "PDF"
                  : key === "github"
                    ? "GitHub"
                    : key === "proceedings"
                      ? "Proceedings"
                      : key}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionComparisonTable({ table }: { table: ComparisonTable }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            {table.headers.map((h) => (
              <th
                key={h}
                className="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wide text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-4 py-2.5 ${j === 0 ? "font-medium" : "text-muted"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewSectionBlock({ section, i18n }: { section: ReviewSection; i18n: Translations }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold mb-4">{section.title}</h2>

      <div className="bg-card border border-border rounded-lg p-6 prose text-[15px] mb-6">
        <ReactMarkdown>{section.body}</ReactMarkdown>
      </div>

      {section.models.length > 0 && (
        <div className="space-y-3 mb-6">
          {section.models.map((model) => (
            <ReviewModelCard key={model.id} model={model} i18n={i18n} />
          ))}
        </div>
      )}

      {section.comparison_table && (
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">
            {i18n.comparison}
          </p>
          <SectionComparisonTable table={section.comparison_table} />
        </div>
      )}
    </section>
  );
}

function SourceRow({ source, lang }: { source: SourceCheck; lang: Language }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${source.status === "ok" ? "bg-green-500" : "bg-red-500"}`}
        />
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          {source.name}
        </a>
      </div>
      <span className="text-muted text-xs">
        {formatTimeLocalized(source.checked_at, lang)}
      </span>
    </div>
  );
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const lang = await getLanguageFromCookies();
  const review = await getReview(date, lang);

  if (!review) {
    notFound();
  }

  const i18n = t(lang);
  const index = await getReviewsIndex(lang);
  const allDates = (index?.reviews ?? []).map((r) => r.date).sort().reverse();
  const currentIndex = allDates.indexOf(date);
  const prevDate =
    currentIndex < allDates.length - 1 ? allDates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? allDates[currentIndex - 1] : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/reviews"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          &larr; {i18n.allReviews}
        </Link>
        <div className="flex gap-4 text-sm">
          {prevDate && (
            <Link
              href={`/reviews/${prevDate}`}
              className="text-accent hover:underline"
            >
              &larr; {prevDate}
            </Link>
          )}
          {nextDate && (
            <Link
              href={`/reviews/${nextDate}`}
              className="text-accent hover:underline"
            >
              {nextDate} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-semibold bg-accent/10 text-accent px-3 py-1 rounded-full">
            {volLabel(review.volume, lang)}
          </span>
          <span className="text-sm text-muted">{formatDateLocalized(date, lang)}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">
          {review.title}
        </h1>
        <p className="text-lg text-muted">{review.subtitle}</p>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {review.summary.key_themes.map((theme) => (
            <span
              key={theme}
              className={`text-sm font-medium px-3 py-1 rounded-full ${getThemeColor(theme)}`}
            >
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Summary */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
          {i18n.summary}
        </h2>
        <div className="bg-card border border-border rounded-lg p-6 prose text-[15px]">
          <ReactMarkdown>{review.summary.body}</ReactMarkdown>
        </div>
      </section>

      {/* Researcher Notes */}
      {review.researcher_notes && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            {i18n.researcherNotes}
          </h2>
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-6 prose text-[15px]">
            <ReactMarkdown>{review.researcher_notes}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* Sections */}
      {review.sections.map((section) => (
        <ReviewSectionBlock key={section.id} section={section} i18n={i18n} />
      ))}

      {/* Cross-cutting Analysis */}
      {review.cross_cutting_analysis && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">
            {review.cross_cutting_analysis.title}
          </h2>
          <div className="bg-card border border-border rounded-lg p-6 prose text-[15px]">
            <ReactMarkdown>
              {review.cross_cutting_analysis.body}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Sources */}
      {review.sources_checked.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            {i18n.sourcesChecked}
          </h2>
          <div className="bg-card border border-border rounded-lg p-4 divide-y divide-border/50">
            {review.sources_checked.map((source) => (
              <SourceRow key={source.name} source={source} lang={lang} />
            ))}
          </div>
        </section>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        {prevDate ? (
          <Link
            href={`/reviews/${prevDate}`}
            className="text-accent hover:underline text-sm"
          >
            &larr; {formatDateLocalized(prevDate, lang)}
          </Link>
        ) : (
          <div />
        )}
        {nextDate ? (
          <Link
            href={`/reviews/${nextDate}`}
            className="text-accent hover:underline text-sm"
          >
            {formatDateLocalized(nextDate, lang)} &rarr;
          </Link>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}
