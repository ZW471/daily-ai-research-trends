import type { Language } from "./data";

const translations = {
  en: {
    // Layout
    siteTitle: "Research Trends",
    siteBadge: "AI/ML",
    navDaily: "Daily Trends",
    navReviews: "Reviews",
    footerText: "AI/ML Research Trends — automated daily analysis",

    // Home page
    dailyFeedTitle: "Daily Research Feed",
    dailyFeedSubtitle:
      "Tracking trending AI/ML papers and models across arXiv, HuggingFace, and AlphaXiv.",
    noReviewsTitle: "No reviews yet",
    noReviewsDaily:
      "Daily research reviews will appear here once the first analysis is published.",
    dailyReviewFallback: "Daily Review",
    papers: "papers",
    models: "models",
    repos: "repos",

    // Reviews index
    litReviewsTitle: "Literature Reviews",
    litReviewsSubtitle:
      "In-depth comparative reviews of AI/ML model families and research directions.",
    noReviewsLit:
      "Literature reviews will appear here once the first volume is published.",
    vol: "Vol.",
    sections: "sections",

    // Daily review detail
    allReviews: "All Reviews",
    executiveSummary: "Executive Summary",
    researcherNotes: "Researcher Notes",
    themesAndTrends: "Themes & Trends",
    trendingPapers: "Trending Papers",
    trendingModels: "Trending Models",
    trendingGithubRepos: "Trending GitHub Repos",
    sourcesChecked: "Sources Checked",
    keyFindings: "Key Findings",
    highRelevance: "High Relevance",
    upvotes: "upvotes",
    viewOnHF: "View on HF",
    downloads: "downloads",
    likes: "likes",
    today: "today",

    // Download
    download: "Download",
    downloadJson: "Download JSON",

    // Literature review detail
    summary: "Summary",
    keyInnovation: "Key Innovation",
    limitations: "Limitations",
    comparison: "Comparison",
  },
  cn: {
    // Layout
    siteTitle: "研究趋势",
    siteBadge: "AI/ML",
    navDaily: "每日趋势",
    navReviews: "综述",
    footerText: "AI/ML 研究趋势 — 每日自动分析",

    // Home page
    dailyFeedTitle: "每日研究动态",
    dailyFeedSubtitle:
      "追踪 arXiv、HuggingFace 和 AlphaXiv 上的热门 AI/ML 论文与模型。",
    noReviewsTitle: "暂无内容",
    noReviewsDaily: "每日研究综述将在首次分析发布后显示在此处。",
    dailyReviewFallback: "每日综述",
    papers: "论文",
    models: "模型",
    repos: "仓库",

    // Reviews index
    litReviewsTitle: "文献综述",
    litReviewsSubtitle: "AI/ML 模型系列和研究方向的深度对比综述。",
    noReviewsLit: "文献综述将在首期发布后显示在此处。",
    vol: "第",
    sections: "章节",

    // Daily review detail
    allReviews: "所有综述",
    executiveSummary: "摘要总结",
    researcherNotes: "研究员笔记",
    themesAndTrends: "主题与趋势",
    trendingPapers: "热门论文",
    trendingModels: "热门模型",
    trendingGithubRepos: "热门 GitHub 仓库",
    sourcesChecked: "数据源检查",
    keyFindings: "主要发现",
    highRelevance: "高相关性",
    upvotes: "点赞",
    viewOnHF: "在 HF 查看",
    downloads: "下载",
    likes: "喜欢",
    today: "今日",

    // Download
    download: "下载",
    downloadJson: "下载 JSON",

    // Literature review detail
    summary: "摘要",
    keyInnovation: "关键创新",
    limitations: "局限性",
    comparison: "对比",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];
export type Translations = { [K in TranslationKey]: string };

export function t(lang: Language): Translations {
  return translations[lang];
}

export function formatDateLocalized(dateStr: string, lang: Language): string {
  const d = new Date(dateStr + "T12:00:00Z");
  if (lang === "cn") {
    return d.toLocaleDateString("zh-CN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  }
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimeLocalized(dateStr: string, lang: Language): string {
  const locale = lang === "cn" ? "zh-CN" : "en-US";
  return new Date(dateStr).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function volLabel(vol: number, lang: Language): string {
  if (lang === "cn") return `第 ${vol} 期`;
  return `Vol. ${vol}`;
}
