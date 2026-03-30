import { notFound } from "next/navigation";
import Link from "next/link";
import { getDailyReview, getAllDates } from "@/lib/data";
import type { Paper, Model, Theme, SourceCheck } from "@/lib/types";
import ReactMarkdown from "react-markdown";

export const dynamic = "force-dynamic";

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
  return THEME_COLORS[theme.toLowerCase()] || "bg-gray-100 text-gray-600";
}

const TREND_ICONS: Record<string, { icon: string; color: string }> = {
  rising: { icon: "\u2191", color: "text-green-600" },
  stable: { icon: "\u2192", color: "text-gray-500" },
  fading: { icon: "\u2193", color: "text-red-500" },
};

const RELEVANCE_STYLES: Record<string, string> = {
  high: "bg-blue-50 border-blue-200 border-l-blue-500",
  medium: "bg-white border-gray-200",
  low: "bg-white border-gray-100",
};

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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function PaperCard({ paper }: { paper: Paper }) {
  return (
    <div
      className={`border-l-4 border rounded-lg p-5 ${RELEVANCE_STYLES[paper.relevance] || RELEVANCE_STYLES.medium}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-base font-semibold leading-snug">{paper.title}</h3>
        {paper.relevance === "high" && (
          <span className="shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            High Relevance
          </span>
        )}
      </div>

      <p className="text-sm text-muted mb-2">
        {paper.authors.join(", ")}
        {paper.affiliations.length > 0 && (
          <span className="text-muted/70">
            {" "}
            &mdash; {paper.affiliations.join(", ")}
          </span>
        )}
      </p>

      <p className="text-sm leading-relaxed mb-3">{paper.summary}</p>

      {paper.key_findings.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
            Key Findings
          </p>
          <ul className="text-sm space-y-1">
            {paper.key_findings.map((finding, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted shrink-0">&bull;</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <div className="flex flex-wrap gap-1.5">
          {paper.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${getThemeColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {paper.engagement && (
            <span className="text-xs text-muted">
              {paper.engagement.upvotes} upvotes
            </span>
          )}
          <div className="flex gap-2">
            {paper.sources.arxiv && (
              <a
                href={paper.sources.arxiv}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:underline"
              >
                arXiv
              </a>
            )}
            {paper.sources.huggingface && (
              <a
                href={paper.sources.huggingface}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:underline"
              >
                HF
              </a>
            )}
            {paper.sources.alphaxiv && (
              <a
                href={paper.sources.alphaxiv}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:underline"
              >
                AlphaXiv
              </a>
            )}
            {paper.sources.pdf && (
              <a
                href={paper.sources.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-accent hover:underline"
              >
                PDF
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelCard({ model }: { model: Model }) {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <a
            href={model.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold hover:text-accent transition-colors"
          >
            {model.name}
          </a>
          <p className="text-sm text-muted">
            {model.organization} &middot; {model.task_type} &middot;{" "}
            {model.model_size}
          </p>
        </div>
        <a
          href={model.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium bg-accent/10 text-accent px-3 py-1 rounded-full hover:bg-accent/20 transition-colors"
        >
          View on HF
        </a>
      </div>

      <p className="text-sm leading-relaxed mb-3">{model.description}</p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {model.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${getThemeColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex gap-4 text-sm text-muted">
          <span>{formatNumber(model.metrics.downloads)} downloads</span>
          <span>{formatNumber(model.metrics.likes)} likes</span>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ theme }: { theme: Theme }) {
  const trend = TREND_ICONS[theme.trend_signal] || TREND_ICONS.stable;
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-lg font-bold ${trend.color}`}>{trend.icon}</span>
        <h3 className="font-semibold">{theme.name}</h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            theme.trend_signal === "rising"
              ? "bg-green-100 text-green-700"
              : theme.trend_signal === "fading"
                ? "bg-red-100 text-red-600"
                : "bg-gray-100 text-gray-600"
          }`}
        >
          {theme.trend_signal}
        </span>
      </div>
      <p className="text-sm text-muted leading-relaxed">{theme.description}</p>
    </div>
  );
}

function SourceRow({ source }: { source: SourceCheck }) {
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
        {new Date(source.checked_at).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        })}
      </span>
    </div>
  );
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const review = await getDailyReview(date);

  if (!review) {
    notFound();
  }

  const allDates = await getAllDates();
  const currentIndex = allDates.indexOf(date);
  const prevDate = currentIndex < allDates.length - 1 ? allDates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? allDates[currentIndex - 1] : null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          &larr; All Reviews
        </Link>
        <div className="flex gap-4 text-sm">
          {prevDate && (
            <Link href={`/review/${prevDate}`} className="text-accent hover:underline">
              &larr; {prevDate}
            </Link>
          )}
          {nextDate && (
            <Link href={`/review/${nextDate}`} className="text-accent hover:underline">
              {nextDate} &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Header */}
      <div className="mb-10">
        <p className="text-sm text-muted mb-1">{formatDate(date)}</p>
        <h1 className="text-3xl font-bold tracking-tight mb-4">
          {review.summary.headline}
        </h1>
        <div className="flex flex-wrap gap-1.5 mb-4">
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

      {/* Executive Summary */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
          Executive Summary
        </h2>
        <div className="bg-card border border-border rounded-lg p-6 prose text-[15px]">
          <ReactMarkdown>{review.summary.body}</ReactMarkdown>
        </div>
      </section>

      {/* Researcher Notes */}
      {review.researcher_notes && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            Researcher Notes
          </h2>
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-6 prose text-[15px]">
            <ReactMarkdown>{review.researcher_notes}</ReactMarkdown>
          </div>
        </section>
      )}

      {/* Themes */}
      {review.themes.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            Themes &amp; Trends
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {review.themes.map((theme) => (
              <ThemeCard key={theme.name} theme={theme} />
            ))}
          </div>
        </section>
      )}

      {/* Papers */}
      {review.papers.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            Trending Papers ({review.papers.length})
          </h2>
          <div className="space-y-3">
            {review.papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        </section>
      )}

      {/* Models */}
      {review.models.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            Trending Models ({review.models.length})
          </h2>
          <div className="space-y-3">
            {review.models.map((model) => (
              <ModelCard key={model.id} model={model} />
            ))}
          </div>
        </section>
      )}

      {/* Sources */}
      {review.sources_checked.length > 0 && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
            Sources Checked
          </h2>
          <div className="bg-card border border-border rounded-lg p-4 divide-y divide-border/50">
            {review.sources_checked.map((source) => (
              <SourceRow key={source.name} source={source} />
            ))}
          </div>
        </section>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-6 border-t border-border">
        {prevDate ? (
          <Link href={`/review/${prevDate}`} className="text-accent hover:underline text-sm">
            &larr; {formatDate(prevDate)}
          </Link>
        ) : <div />}
        {nextDate ? (
          <Link href={`/review/${nextDate}`} className="text-accent hover:underline text-sm">
            {formatDate(nextDate)} &rarr;
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
