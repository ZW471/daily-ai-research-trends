import { notFound } from "next/navigation";
import Link from "next/link";
import { getDailyReview, getAllDates, getLanguageFromCookies, getJsonDownloadUrl } from "@/lib/data";
import type { Language } from "@/lib/data";
import type { Paper, Model, Theme, SourceCheck, TrendingRepo } from "@/lib/types";
import { t, formatDateLocalized, formatTimeLocalized } from "@/lib/i18n";
import type { Translations } from "@/lib/i18n";
import { Markdown } from "../../markdown";
import { DownloadButton } from "../../download-button";
import { ArticleNav } from "../../article-nav";
import type { NavItem } from "../../article-nav";

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

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function PaperCard({ paper, i18n }: { paper: Paper; i18n: Translations }) {
  return (
    <div
      className={`border-l-4 border rounded-lg p-4 sm:p-5 ${RELEVANCE_STYLES[paper.relevance] || RELEVANCE_STYLES.medium}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 mb-2">
        <h3 className="text-base font-semibold leading-snug">{paper.title}</h3>
        {paper.relevance === "high" && (
          <span className="shrink-0 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">
            {i18n.highRelevance}
          </span>
        )}
      </div>

      <p className="text-sm text-muted mb-2 break-words">
        {paper.authors.join(", ")}
        {paper.affiliations.length > 0 && (
          <span className="text-muted/70">
            {" "}
            &mdash; {paper.affiliations.join(", ")}
          </span>
        )}
      </p>

      <div className="text-sm leading-relaxed mb-3"><Markdown>{paper.summary}</Markdown></div>

      {paper.key_findings.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted mb-1">
            {i18n.keyFindings}
          </p>
          <ul className="text-sm space-y-1">
            {paper.key_findings.map((finding, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-muted shrink-0">&bull;</span>
                <span><Markdown>{finding}</Markdown></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 pt-3 border-t border-border/50">
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
              {paper.engagement.upvotes} {i18n.upvotes}
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

function ModelCard({ model, i18n }: { model: Model; i18n: Translations }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
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
          className="shrink-0 text-xs font-medium bg-accent/10 text-accent px-3 py-1 rounded-full hover:bg-accent/20 transition-colors w-fit"
        >
          {i18n.viewOnHF}
        </a>
      </div>

      <div className="text-sm leading-relaxed mb-3"><Markdown>{model.description}</Markdown></div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
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
          <span>{formatNumber(model.metrics.downloads)} {i18n.downloads}</span>
          <span>{formatNumber(model.metrics.likes)} {i18n.likes}</span>
        </div>
      </div>
    </div>
  );
}

const LANG_COLORS: Record<string, string> = {
  Python: "#3572A5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Rust: "#dea584",
  Go: "#00ADD8",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Ruby: "#701516",
  Dart: "#00B4AB",
  Jupyter: "#DA5B0B",
  Shell: "#89e051",
  Scala: "#c22d40",
  R: "#198CE7",
  Lua: "#000080",
  Zig: "#ec915c",
  Cuda: "#3A4E3A",
};

function RepoCard({ repo, i18n }: { repo: TrendingRepo; i18n: Translations }) {
  const langColor = LANG_COLORS[repo.language] || "#8b8b8b";
  return (
    <div
      className={`border-l-4 border rounded-lg p-4 sm:p-5 ${RELEVANCE_STYLES[repo.relevance] || RELEVANCE_STYLES.medium}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-2">
        <div>
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold hover:text-accent transition-colors break-all"
          >
            {repo.name}
          </a>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {repo.relevance === "high" && (
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              {i18n.highRelevance}
            </span>
          )}
          <a
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium bg-gray-900 text-white px-3 py-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>

      <div className="text-sm leading-relaxed mb-3"><Markdown>{repo.description}</Markdown></div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {repo.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded-full ${getThemeColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-muted">
          <span className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-full"
              style={{ backgroundColor: langColor }}
            />
            {repo.language}
          </span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z" />
            </svg>
            {formatNumber(repo.stars)}
          </span>
          <span className="text-green-600 font-medium">+{formatNumber(repo.stars_today)} {i18n.today}</span>
          <span className="flex items-center gap-1">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
            </svg>
            {formatNumber(repo.forks)}
          </span>
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
      <div className="text-sm text-muted leading-relaxed"><Markdown>{theme.description}</Markdown></div>
    </div>
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

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  const lang = await getLanguageFromCookies();
  const review = await getDailyReview(date, lang);

  if (!review) {
    notFound();
  }

  const i18n = t(lang);
  const allDates = await getAllDates(lang);
  const currentIndex = allDates.indexOf(date);
  const prevDate = currentIndex < allDates.length - 1 ? allDates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? allDates[currentIndex - 1] : null;

  // Build navigation items
  const navItems: NavItem[] = [];
  navItems.push({ id: "executive-summary", label: i18n.executiveSummary });
  if (review.researcher_notes) {
    navItems.push({ id: "researcher-notes", label: i18n.researcherNotes });
  }
  if (review.themes.length > 0) {
    navItems.push({
      id: "themes",
      label: i18n.themesAndTrends,
      children: review.themes.map((theme) => ({
        id: `theme-${theme.name.toLowerCase().replace(/\s+/g, "-")}`,
        label: theme.name,
      })),
    });
  }
  if (review.papers.length > 0) {
    navItems.push({
      id: "papers",
      label: `${i18n.trendingPapers} (${review.papers.length})`,
      children: review.papers.map((paper) => ({
        id: `paper-${paper.id}`,
        label: paper.title,
      })),
    });
  }
  if (review.models.length > 0) {
    navItems.push({
      id: "models",
      label: `${i18n.trendingModels} (${review.models.length})`,
      children: review.models.map((model) => ({
        id: `model-${model.id}`,
        label: model.name,
      })),
    });
  }
  if (review.trending_repos && review.trending_repos.length > 0) {
    navItems.push({
      id: "repos",
      label: `${i18n.trendingGithubRepos} (${review.trending_repos.length})`,
      children: [...review.trending_repos]
        .sort((a, b) => b.stars_today - a.stars_today)
        .map((repo) => ({
          id: `repo-${repo.id}`,
          label: repo.name,
        })),
    });
  }
  if (review.sources_checked.length > 0) {
    navItems.push({ id: "sources", label: i18n.sourcesChecked });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <Link
          href="/"
          className="text-sm text-accent hover:underline flex items-center gap-1"
        >
          &larr; {i18n.allReviews}
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

      <div className="flex gap-8">
        <ArticleNav
          items={navItems}
          collapseLabel={i18n.tableOfContents}
          expandLabel={i18n.expandNav}
        />

        <div className="min-w-0 flex-1 max-w-5xl">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted">{formatDateLocalized(date, lang)}</p>
              <DownloadButton
                url={getJsonDownloadUrl(`daily/${date}/${lang}.json`)}
                label={i18n.download}
                showLabel
                className="text-sm"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4">
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
          <section id="executive-summary" className="mb-10 scroll-mt-20">
            <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
              {i18n.executiveSummary}
            </h2>
            <div className="bg-card border border-border rounded-lg p-4 sm:p-6 prose text-sm sm:text-[15px]">
              <Markdown>{review.summary.body}</Markdown>
            </div>
          </section>

          {/* Researcher Notes */}
          {review.researcher_notes && (
            <section id="researcher-notes" className="mb-10 scroll-mt-20">
              <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
                {i18n.researcherNotes}
              </h2>
              <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-4 sm:p-6 prose text-sm sm:text-[15px]">
                <Markdown>{review.researcher_notes}</Markdown>
              </div>
            </section>
          )}

          {/* Themes */}
          {review.themes.length > 0 && (
            <section id="themes" className="mb-10 scroll-mt-20">
              <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
                {i18n.themesAndTrends}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {review.themes.map((theme) => (
                  <div key={theme.name} id={`theme-${theme.name.toLowerCase().replace(/\s+/g, "-")}`} className="scroll-mt-20">
                    <ThemeCard theme={theme} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Papers */}
          {review.papers.length > 0 && (
            <section id="papers" className="mb-10 scroll-mt-20">
              <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
                {i18n.trendingPapers} ({review.papers.length})
              </h2>
              <div className="space-y-3">
                {review.papers.map((paper) => (
                  <div key={paper.id} id={`paper-${paper.id}`} className="scroll-mt-20">
                    <PaperCard paper={paper} i18n={i18n} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Models */}
          {review.models.length > 0 && (
            <section id="models" className="mb-10 scroll-mt-20">
              <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
                {i18n.trendingModels} ({review.models.length})
              </h2>
              <div className="space-y-3">
                {review.models.map((model) => (
                  <div key={model.id} id={`model-${model.id}`} className="scroll-mt-20">
                    <ModelCard model={model} i18n={i18n} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trending Repos */}
          {review.trending_repos && review.trending_repos.length > 0 && (
            <section id="repos" className="mb-10 scroll-mt-20">
              <h2 className="text-lg font-semibold mb-3 text-muted uppercase tracking-wide text-xs">
                {i18n.trendingGithubRepos} ({review.trending_repos.length})
              </h2>
              <div className="space-y-3">
                {[...review.trending_repos]
                  .sort((a, b) => b.stars_today - a.stars_today)
                  .map((repo) => (
                    <div key={repo.id} id={`repo-${repo.id}`} className="scroll-mt-20">
                      <RepoCard repo={repo} i18n={i18n} />
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Sources */}
          {review.sources_checked.length > 0 && (
            <section id="sources" className="mb-10 scroll-mt-20">
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
              <Link href={`/review/${prevDate}`} className="text-accent hover:underline text-sm">
                &larr; {formatDateLocalized(prevDate, lang)}
              </Link>
            ) : <div />}
            {nextDate ? (
              <Link href={`/review/${nextDate}`} className="text-accent hover:underline text-sm">
                {formatDateLocalized(nextDate, lang)} &rarr;
              </Link>
            ) : <div />}
          </div>
        </div>
      </div>
    </div>
  );
}
