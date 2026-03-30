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
