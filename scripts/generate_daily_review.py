#!/usr/bin/env python3
"""
Daily AI Research Trends Generator

Fetches trending papers from HuggingFace Daily Papers, arXiv, and AlphaXiv,
plus trending models from HuggingFace, then uses Claude to synthesize a
structured daily review JSON.

Usage:
    python generate_daily_review.py [--date YYYY-MM-DD] [--dry-run]

Requires:
    uv pip install anthropic httpx
    ANTHROPIC_API_KEY env var
"""

import argparse
import json
import os
import sys
import re
from datetime import datetime, timezone
from pathlib import Path

import httpx

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
DAILY_DIR = DATA_DIR / "daily"
INDEX_FILE = DATA_DIR / "index.json"

HF_DAILY_PAPERS_URL = "https://huggingface.co/api/daily_papers"
HF_TRENDING_MODELS_URL = "https://huggingface.co/api/models"
ARXIV_API_URL = "https://export.arxiv.org/api/query"
ALPHAXIV_URL = "https://api.alphaxiv.org/v1/papers/trending"

CLAUDE_MODEL = "claude-sonnet-4-6"


def fetch_hf_daily_papers() -> list[dict]:
    """Fetch today's trending papers from HuggingFace Daily Papers API."""
    try:
        resp = httpx.get(HF_DAILY_PAPERS_URL, timeout=30)
        resp.raise_for_status()
        papers = resp.json()
        print(f"  [HF Papers] Fetched {len(papers)} papers")
        return papers[:30]
    except Exception as e:
        print(f"  [HF Papers] Error: {e}")
        return []


def fetch_hf_trending_models() -> list[dict]:
    """Fetch trending models from HuggingFace."""
    try:
        resp = httpx.get(
            HF_TRENDING_MODELS_URL,
            params={"sort": "likes7d", "direction": "-1", "limit": "20"},
            timeout=30,
        )
        resp.raise_for_status()
        models = resp.json()
        print(f"  [HF Models] Fetched {len(models)} trending models")
        return models[:20]
    except Exception as e:
        print(f"  [HF Models] Error: {e}")
        return []


def fetch_arxiv_recent(categories: list[str] | None = None) -> list[dict]:
    """Fetch recent papers from arXiv in AI/ML categories."""
    if categories is None:
        categories = ["cs.AI", "cs.LG", "cs.CL", "cs.CV"]
    query = " OR ".join(f"cat:{cat}" for cat in categories)
    try:
        resp = httpx.get(
            ARXIV_API_URL,
            params={
                "search_query": query,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "max_results": 50,
            },
            timeout=60,
            headers={"User-Agent": "DailyAIResearchTrends/1.0"},
        )
        resp.raise_for_status()
        print(f"  [arXiv] Fetched recent papers")
        return [{"raw_xml": resp.text}]
    except Exception as e:
        print(f"  [arXiv] Warning (non-critical): {e}")
        return []


def fetch_alphaxiv_trending() -> list[dict]:
    """Fetch trending papers from AlphaXiv."""
    try:
        resp = httpx.get(ALPHAXIV_URL, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        papers = data if isinstance(data, list) else data.get("papers", [])
        print(f"  [AlphaXiv] Fetched {len(papers)} trending papers")
        return papers[:20]
    except Exception as e:
        print(f"  [AlphaXiv] Error: {e}")
        return []


def build_source_context(
    hf_papers: list[dict],
    hf_models: list[dict],
    arxiv_data: list[dict],
    alphaxiv_papers: list[dict],
) -> str:
    """Build a context string from all sources for Claude to synthesize."""
    parts = []

    parts.append("## HuggingFace Daily Papers (trending)\n")
    for p in hf_papers:
        paper = p.get("paper", p)
        title = paper.get("title", "Unknown")
        authors = paper.get("authors", [])
        author_names = ", ".join(
            a.get("name", a) if isinstance(a, dict) else str(a) for a in authors[:5]
        )
        summary = paper.get("summary", "No abstract available.")
        upvotes = p.get("numUpvotes", p.get("paper", {}).get("upvotes", 0))
        comments = p.get("numComments", 0)
        arxiv_id = paper.get("id", "")
        parts.append(
            f"### {title}\n"
            f"Authors: {author_names}\n"
            f"Abstract: {summary[:500]}\n"
            f"Upvotes: {upvotes}, Comments: {comments}\n"
            f"arXiv: https://arxiv.org/abs/{arxiv_id}\n"
        )

    parts.append("\n## HuggingFace Trending Models\n")
    for m in hf_models:
        model_id = m.get("modelId", m.get("id", "unknown"))
        downloads = m.get("downloads", 0)
        likes = m.get("likes", 0)
        tags = m.get("tags", [])[:5]
        parts.append(
            f"- {model_id}: downloads={downloads}, likes={likes}, tags={tags}\n"
        )

    parts.append("\n## AlphaXiv Trending\n")
    for p in alphaxiv_papers:
        title = p.get("title", "Unknown")
        arxiv_id = p.get("arxiv_id", p.get("id", ""))
        parts.append(f"- {title} (arxiv: {arxiv_id})\n")

    return "\n".join(parts)


OUTPUT_SCHEMA = r"""
{
  "version": "1.0",
  "date": "YYYY-MM-DD",
  "generated_at": "ISO-8601 timestamp",
  "summary": {
    "headline": "Single sentence, semicolon-separated highlights",
    "body": "2-3 paragraph markdown summary",
    "key_themes": ["theme-slug-1", "theme-slug-2", ...]
  },
  "researcher_notes": "Markdown analysis with bold highlights for key insights",
  "papers": [
    {
      "id": "slug-id",
      "title": "Full title",
      "authors": ["Author 1", "Author 2 et al."],
      "affiliations": ["Org 1"],
      "summary": "2-3 sentence summary",
      "key_findings": ["finding 1", "finding 2", "finding 3"],
      "tags": ["tag1", "tag2"],
      "relevance": "high|medium|low",
      "engagement": { "upvotes": N, "comments": N },
      "sources": {
        "arxiv": "url",
        "huggingface": "url",
        "alphaxiv": "url (if available)",
        "pdf": "url"
      }
    }
  ],
  "models": [
    {
      "id": "slug-id",
      "name": "Display name",
      "organization": "Org",
      "description": "1-2 sentences",
      "task_type": "e.g. text-generation",
      "model_size": "e.g. 7B",
      "tags": ["tag1"],
      "metrics": { "downloads": N, "likes": N },
      "source_url": "HuggingFace URL"
    }
  ],
  "themes": [
    {
      "name": "Theme Name",
      "description": "1-2 sentences",
      "related_paper_ids": ["paper-slug-1"],
      "trend_signal": "rising|stable|fading"
    }
  ],
  "sources_checked": [
    {
      "name": "Source Name",
      "url": "url",
      "checked_at": "ISO-8601",
      "status": "ok|partial|error"
    }
  ]
}
"""


def synthesize_with_claude(source_context: str, date: str) -> dict:
    """Use Claude to synthesize the daily review from source data."""
    import anthropic

    client = anthropic.Anthropic()

    prompt = f"""You are an expert AI/ML researcher producing a daily research trends review for {date}.

Analyze the following data from HuggingFace Daily Papers, HuggingFace Trending Models, arXiv, and AlphaXiv. Produce a comprehensive daily review as a JSON object.

Instructions:
- Select the 10-15 most significant/trending papers. Prioritize by: engagement (upvotes), novelty, institutional backing, and practical impact.
- Select the 8-12 most notable trending models.
- Identify 4-6 key themes across the papers.
- Write insightful researcher_notes (3-5 paragraphs in markdown) that highlight non-obvious connections, sleeper hits, and trends worth watching.
- The summary headline should capture the 2-3 biggest stories in a single semicolon-separated sentence.
- The summary body should be 2-3 paragraphs of markdown.
- All URLs must be real (derived from the source data). Do not invent URLs.
- Relevance scoring: "high" = transformative or highly engaged, "medium" = solid contribution, "low" = incremental.
- Trend signals: "rising" = growing momentum, "stable" = consistent, "fading" = declining interest.

Source data:
{source_context}

Output ONLY valid JSON matching this schema (no markdown fences, no commentary):
{OUTPUT_SCHEMA}
"""

    print("  [Claude] Synthesizing daily review...")
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    # Strip markdown fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    return json.loads(text)


def update_index(date: str, review: dict) -> None:
    """Update the index.json with the new review entry."""
    if INDEX_FILE.exists():
        index = json.loads(INDEX_FILE.read_text())
    else:
        index = {"version": "1.0", "days": []}

    # Remove existing entry for this date if any
    index["days"] = [d for d in index["days"] if d["date"] != date]

    # Add new entry
    index["days"].append(
        {
            "date": date,
            "file": f"daily/{date}.json",
            "headline": review["summary"]["headline"],
            "paper_count": len(review.get("papers", [])),
            "model_count": len(review.get("models", [])),
        }
    )

    # Sort by date descending
    index["days"].sort(key=lambda d: d["date"], reverse=True)

    INDEX_FILE.write_text(json.dumps(index, indent=2) + "\n")
    print(f"  [Index] Updated {INDEX_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Generate daily AI research review")
    parser.add_argument(
        "--date",
        default=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        help="Date for the review (default: today UTC)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data and print context without calling Claude",
    )
    args = parser.parse_args()

    date = args.date
    print(f"Generating daily review for {date}")

    # Ensure directories exist
    DAILY_DIR.mkdir(parents=True, exist_ok=True)

    # Step 1: Fetch from all sources
    print("Fetching sources...")
    hf_papers = fetch_hf_daily_papers()
    hf_models = fetch_hf_trending_models()
    arxiv_data = fetch_arxiv_recent()
    alphaxiv_papers = fetch_alphaxiv_trending()

    # Step 2: Build context
    context = build_source_context(hf_papers, hf_models, arxiv_data, alphaxiv_papers)

    if args.dry_run:
        print("\n--- DRY RUN: Source Context ---")
        print(context[:3000])
        print(f"\n... ({len(context)} chars total)")
        return

    # Step 3: Synthesize with Claude
    review = synthesize_with_claude(context, date)

    # Step 4: Write daily file
    output_file = DAILY_DIR / f"{date}.json"
    output_file.write_text(json.dumps(review, indent=2, ensure_ascii=False) + "\n")
    print(f"  [Output] Written to {output_file}")

    # Step 5: Update index
    update_index(date, review)

    print(f"Done! Review for {date} generated successfully.")


if __name__ == "__main__":
    main()
