export interface TrendingRepo {
  id: string;
  name: string;
  description: string;
  language: string;
  stars: number;
  stars_today: number;
  forks: number;
  url: string;
  tags: string[];
  relevance: "high" | "medium" | "low";
}

export interface DailyReview {
  version: string;
  date: string;
  generated_at: string;
  summary: {
    headline: string;
    body: string;
    key_themes: string[];
  };
  researcher_notes: string;
  papers: Paper[];
  models: Model[];
  trending_repos?: TrendingRepo[];
  themes: Theme[];
  sources_checked: SourceCheck[];
}

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  affiliations: string[];
  summary: string;
  key_findings: string[];
  tags: string[];
  relevance: "high" | "medium" | "low";
  engagement: {
    upvotes: number;
    comments: number;
  };
  sources: {
    arxiv?: string;
    huggingface?: string;
    alphaxiv?: string;
    pdf?: string;
  };
}

export interface Model {
  id: string;
  name: string;
  organization: string;
  description: string;
  task_type: string;
  model_size: string;
  tags: string[];
  metrics: {
    downloads: number;
    likes: number;
  };
  source_url: string;
}

export interface Theme {
  name: string;
  description: string;
  related_paper_ids: string[];
  trend_signal: "rising" | "stable" | "fading";
}

export interface SourceCheck {
  name: string;
  url: string;
  checked_at: string;
  status: string;
}

export interface IndexEntry {
  date: string;
  file: string;
  headline: string;
  paper_count: number;
  model_count: number;
}

export interface Index {
  version: string;
  days: IndexEntry[];
}

// Literature Review types

export interface ReviewModel {
  id: string;
  name: string;
  paper_title: string;
  authors: string[];
  affiliations: string[];
  venue: string;
  core_idea: string;
  key_innovation: string;
  limitations: string[];
  tags: string[];
  sources: Record<string, string>;
}

export interface ComparisonTable {
  headers: string[];
  rows: string[][];
}

export interface ReviewSection {
  id: string;
  title: string;
  body: string;
  models: ReviewModel[];
  comparison_table: ComparisonTable;
}

export interface LiteratureReview {
  version: string;
  date: string;
  generated_at: string;
  type: string;
  volume: number;
  title: string;
  subtitle: string;
  summary: {
    headline: string;
    body: string;
    key_themes: string[];
  };
  researcher_notes: string;
  sections: ReviewSection[];
  cross_cutting_analysis: {
    title: string;
    body: string;
  };
  sources_checked: SourceCheck[];
}

export interface ReviewsIndexEntry {
  date: string;
  file: string;
  volume: number;
  title: string;
  subtitle: string;
  model_count: number;
  section_count: number;
}

export interface ReviewsIndex {
  version: string;
  reviews: ReviewsIndexEntry[];
}
