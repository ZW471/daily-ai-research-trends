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
INDEX_EN_FILE = DATA_DIR / "index_en.json"
INDEX_CN_FILE = DATA_DIR / "index_cn.json"

HF_DAILY_PAPERS_URL = "https://huggingface.co/api/daily_papers"
HF_TRENDING_MODELS_URL = "https://huggingface.co/api/models"
ARXIV_API_URL = "https://export.arxiv.org/api/query"
ALPHAXIV_URL = "https://api.alphaxiv.org/v1/papers/trending"
GITHUB_TRENDING_URL = "https://github.com/trending"

CLAUDE_MODEL = "claude-sonnet-4-6"


def _fetch_with_retry(url: str, params: dict | None = None, retries: int = 3,
                      delay: float = 10.0, timeout: int = 30) -> httpx.Response | None:
    """Fetch a URL with retry logic for transient failures."""
    import time
    for attempt in range(retries):
        try:
            resp = httpx.get(url, params=params, timeout=timeout)
            resp.raise_for_status()
            return resp
        except Exception as e:
            if attempt < retries - 1:
                print(f"    Attempt {attempt + 1} failed: {e}. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"    All {retries} attempts failed: {e}")
                return None


def fetch_hf_daily_papers(date: str | None = None) -> list[dict]:
    """Fetch trending papers from HuggingFace Daily Papers API.

    Args:
        date: Optional date string (YYYY-MM-DD) to fetch papers for a specific date.
              If None, fetches today's papers.
    """
    params = {}
    if date:
        params["date"] = date
    resp = _fetch_with_retry(HF_DAILY_PAPERS_URL, params=params)
    if resp is None:
        return []
    papers = resp.json()
    label = f" for {date}" if date else ""
    print(f"  [HF Papers] Fetched {len(papers)} papers{label}")
    return papers[:30]


def fetch_hf_daily_papers_with_fallback(date: str) -> list[dict]:
    """Fetch daily papers with fallback to previous days if the target date is empty.

    This handles weekends, holidays, and transient API gaps by trying up to 2 prior days.
    """
    papers = fetch_hf_daily_papers(date)
    if papers:
        return papers

    # Fallback: try previous 2 days (covers weekends)
    from datetime import timedelta
    dt = datetime.strptime(date, "%Y-%m-%d")
    for days_back in range(1, 3):
        prev = (dt - timedelta(days=days_back)).strftime("%Y-%m-%d")
        print(f"  [HF Papers] No papers for {date}, trying {prev}...")
        papers = fetch_hf_daily_papers(prev)
        if papers:
            print(f"  [HF Papers] Using {len(papers)} papers from {prev} as fallback")
            return papers

    print(f"  [HF Papers] WARNING: No papers found for {date} or 2 prior days")
    return []


def fetch_hf_trending_models() -> list[dict]:
    """Fetch trending models from HuggingFace."""
    resp = _fetch_with_retry(
        HF_TRENDING_MODELS_URL,
        params={"sort": "likes7d", "direction": "-1", "limit": "20"},
    )
    if resp is None:
        return []
    models = resp.json()
    print(f"  [HF Models] Fetched {len(models)} trending models")
    return models[:20]


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


def _enrich_repos_with_github_api(repos: list[dict]) -> None:
    """Fill in missing stars/forks using the GitHub REST API."""
    for repo in repos:
        if repo.get("stars", 0) > 0 and repo.get("forks", 0) > 0:
            continue
        full_name = repo["full_name"]
        try:
            api_resp = httpx.get(
                f"https://api.github.com/repos/{full_name}",
                timeout=10,
                headers={"User-Agent": "DailyAIResearchTrends/1.0"},
            )
            if api_resp.status_code == 200:
                data = api_resp.json()
                if repo.get("stars", 0) == 0:
                    repo["stars"] = data.get("stargazers_count", 0)
                if repo.get("forks", 0) == 0:
                    repo["forks"] = data.get("forks_count", 0)
                if not repo.get("description") and data.get("description"):
                    repo["description"] = data["description"]
        except Exception as e:
            print(f"  [GitHub API] Warning: could not enrich {full_name}: {e}")


def fetch_github_trending() -> list[dict]:
    """Fetch trending repositories from GitHub (AI/ML relevant)."""
    repos = []
    for lang_filter in ["python", ""]:
        try:
            url = GITHUB_TRENDING_URL
            if lang_filter:
                url += f"/{lang_filter}"
            resp = httpx.get(
                url,
                params={"since": "daily"},
                timeout=30,
                headers={"User-Agent": "DailyAIResearchTrends/1.0"},
            )
            resp.raise_for_status()
            html = resp.text

            # Parse repo entries from the HTML
            import html as html_module

            for article in re.finditer(
                r'<article class="Box-row">(.*?)</article>', html, re.DOTALL
            ):
                block = article.group(1)

                # Extract repo name (owner/name)
                name_match = re.search(
                    r'<h2[^>]*>\s*<a[^>]*href="/([^"]+)"', block
                )
                if not name_match:
                    continue
                full_name = name_match.group(1).strip()

                # Extract description
                desc_match = re.search(
                    r'<p class="col-9[^"]*"[^>]*>(.*?)</p>', block, re.DOTALL
                )
                description = ""
                if desc_match:
                    description = html_module.unescape(
                        re.sub(r"<[^>]+>", "", desc_match.group(1)).strip()
                    )

                # Extract language
                lang_match = re.search(
                    r'<span itemprop="programmingLanguage">(.*?)</span>', block
                )
                language = lang_match.group(1).strip() if lang_match else ""

                # Extract total stars (try multiple HTML patterns)
                stars = 0
                for stars_pattern in [
                    r'href="/[^/]+/[^/]+/stargazers"[^>]*>.*?</svg>\s*([\d,]+)\s*</a>',
                    r'<a[^>]*href="/[^/]+/[^/]+/stargazers"[^>]*>\s*([\d,]+)\s*</a>',
                ]:
                    stars_match = re.search(stars_pattern, block, re.DOTALL)
                    if stars_match:
                        stars = int(stars_match.group(1).replace(",", ""))
                        break

                # Extract stars today
                stars_today_match = re.search(
                    r'([\d,]+)\s+stars?\s+today', block
                )
                stars_today = (
                    int(stars_today_match.group(1).replace(",", ""))
                    if stars_today_match
                    else 0
                )

                # Extract forks (try multiple HTML patterns)
                forks = 0
                for forks_pattern in [
                    r'href="/[^/]+/[^/]+/forks"[^>]*>.*?</svg>\s*([\d,]+)\s*</a>',
                    r'<a[^>]*href="/[^/]+/[^/]+/forks"[^>]*>\s*([\d,]+)\s*</a>',
                ]:
                    forks_match = re.search(forks_pattern, block, re.DOTALL)
                    if forks_match:
                        forks = int(forks_match.group(1).replace(",", ""))
                        break

                # Avoid duplicates
                if any(r["full_name"] == full_name for r in repos):
                    continue

                repos.append(
                    {
                        "full_name": full_name,
                        "description": description,
                        "language": language,
                        "stars": stars,
                        "stars_today": stars_today,
                        "forks": forks,
                        "url": f"https://github.com/{full_name}",
                    }
                )
        except Exception as e:
            print(f"  [GitHub Trending] Error fetching {lang_filter or 'all'}: {e}")

    # Enrich any repos where HTML scraping missed stars/forks
    _enrich_repos_with_github_api(repos)

    print(f"  [GitHub Trending] Fetched {len(repos)} repos")
    return repos[:30]


def build_source_context(
    hf_papers: list[dict],
    hf_models: list[dict],
    arxiv_data: list[dict],
    alphaxiv_papers: list[dict],
    github_repos: list[dict],
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

    parts.append("\n## GitHub Trending Repositories\n")
    for r in github_repos:
        parts.append(
            f"- {r['full_name']}: {r['description']}\n"
            f"  Language: {r['language']}, Stars: {r['stars']}, "
            f"Stars today: {r['stars_today']}, Forks: {r['forks']}\n"
            f"  URL: {r['url']}\n"
        )

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
  "trending_repos": [
    {
      "id": "slug-id",
      "name": "owner/repo-name",
      "description": "1-2 sentences about what this repo does and why it's trending",
      "language": "Python",
      "stars": N,
      "stars_today": N,
      "forks": N,
      "url": "https://github.com/owner/repo",
      "tags": ["tag1", "tag2"],
      "relevance": "high|medium|low"
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


def _make_anthropic_client():
    """Create an Anthropic client, supporting both api_key and Bearer session tokens."""
    import anthropic

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if api_key:
        return anthropic.Anthropic(api_key=api_key)

    # Claude Code web sessions provide a Bearer token via CLAUDE_SESSION_INGRESS_TOKEN_FILE
    token_file = os.environ.get("CLAUDE_SESSION_INGRESS_TOKEN_FILE")
    if token_file:
        try:
            token = Path(token_file).read_text().strip()
            if token:
                return anthropic.Anthropic(auth_token=token)
        except Exception:
            pass

    # Fall back to default (reads ANTHROPIC_API_KEY from env or fails)
    return anthropic.Anthropic()


def synthesize_with_claude(source_context: str, date: str) -> dict:
    """Use Claude to synthesize the daily review from source data."""
    client = _make_anthropic_client()

    prompt = f"""You are an expert AI/ML researcher producing a daily research trends review for {date}.

Analyze the following data from HuggingFace Daily Papers, HuggingFace Trending Models, arXiv, AlphaXiv, and GitHub Trending Repositories. Produce a comprehensive daily review as a JSON object.

Instructions:
- Select the 10-15 most significant/trending papers. Prioritize by: engagement (upvotes), novelty, institutional backing, and practical impact.
- Select the 8-12 most notable trending models.
- Select the 8-15 most AI/ML-relevant trending GitHub repos. Focus on repos related to AI, ML, LLMs, agents, data science, and developer tools for AI. Include the actual stars, stars_today, and forks from the source data — NEVER output 0 for stars or forks unless the repo truly has zero.
- Identify 4-6 key themes across the papers.
- Write insightful researcher_notes (3-5 paragraphs in markdown) that highlight non-obvious connections, sleeper hits, and trends worth watching.
- The summary headline should capture the 2-3 biggest stories in a single semicolon-separated sentence.
- The summary body should be 2-3 paragraphs of markdown.
- All URLs must be real (derived from the source data). Do not invent URLs.
- Relevance scoring: "high" = transformative or highly engaged, "medium" = solid contribution, "low" = incremental.
- Trend signals: "rising" = growing momentum, "stable" = consistent, "fading" = declining interest.

CRITICAL — Affiliations: For each paper, you MUST provide real institutional affiliations (universities, companies, labs). Determine affiliations from author names, paper content, or your knowledge. Common sources include: the abstract mentioning an institution, well-known author-institution associations, or explicit affiliation markers. NEVER use "Unknown" for affiliations — if you truly cannot determine the affiliation, use the author's most likely institutional association based on their publication history. For trending_repos, use the exact stars and forks values from the source data. If the source shows 0 but the repo clearly has many stars (e.g. stars_today is high), flag this discrepancy rather than blindly outputting 0.

Source data:
{source_context}

Output ONLY valid JSON matching this schema (no markdown fences, no commentary):
{OUTPUT_SCHEMA}
"""

    print("  [Claude] Synthesizing daily review...")
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=16000,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        text = stream.get_final_message().content[0].text.strip()

    # Strip markdown fences if present
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    return json.loads(text)


def update_index(date: str, review_en: dict, review_cn: dict) -> None:
    """Update both index_en.json and index_cn.json with the new review entry."""
    for lang, index_file, review in [
        ("en", INDEX_EN_FILE, review_en),
        ("cn", INDEX_CN_FILE, review_cn),
    ]:
        if index_file.exists():
            index = json.loads(index_file.read_text())
        else:
            index = {"version": "1.0", "days": []}

        # Remove existing entry for this date if any
        index["days"] = [d for d in index["days"] if d["date"] != date]

        # Add new entry
        index["days"].append(
            {
                "date": date,
                "file": f"daily/{date}/{lang}.json",
                "headline": review["summary"]["headline"],
                "paper_count": len(review.get("papers", [])),
                "model_count": len(review.get("models", [])),
            }
        )

        # Sort by date descending
        index["days"].sort(key=lambda d: d["date"], reverse=True)

        index_file.write_text(json.dumps(index, indent=2, ensure_ascii=False) + "\n")
        print(f"  [Index] Updated {index_file}")


def translate_to_chinese(review_en: dict) -> dict:
    """Use Claude to translate the English review JSON to Chinese."""
    client = _make_anthropic_client()

    prompt = f"""Translate the following AI research daily review JSON from English to Chinese.

Rules:
- Translate ALL text fields: summary.headline, summary.body, researcher_notes, paper summaries, key_findings, model descriptions, theme names/descriptions.
- Keep structural fields unchanged: version, date, generated_at, ids, slugs, tags, URLs, author names, model names/IDs, organization names, task_type, metric keys, source keys, relevance, trend_signal, status.
- key_themes slugs stay in English.
- Maintain the exact same JSON structure.
- Use natural, fluent Chinese suitable for a technical audience.
- Do not translate proper nouns (model names, tool names, project names) but you may add Chinese explanation in parentheses where helpful.
- CRITICAL JSON SAFETY: Inside JSON string values, NEVER use bare ASCII double-quote characters ("). Use Chinese quotation marks 「」 or 《》 instead, or escape them as \\". Unescaped double quotes will break JSON parsing.

Input JSON:
{json.dumps(review_en, indent=2, ensure_ascii=False)}

Output ONLY valid JSON (no markdown fences, no commentary):"""

    print("  [Claude] Translating to Chinese...")
    with client.messages.stream(
        model=CLAUDE_MODEL,
        max_tokens=32000,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        text = stream.get_final_message().content[0].text.strip()

    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)

    # Try to repair common JSON issue: unescaped ASCII double quotes inside strings
    try:
        return json.loads(text)
    except json.JSONDecodeError as first_err:
        print(f"  [Claude] Translation JSON issue, attempting repair...")
        # Last resort: truncate to last complete top-level object
        depth = 0
        last_complete = 0
        for i, ch in enumerate(text):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    last_complete = i + 1
        if last_complete > 0:
            try:
                return json.loads(text[:last_complete])
            except json.JSONDecodeError:
                pass
        raise first_err


def validate_review(review: dict, label: str = "review") -> list[str]:
    """Validate a generated review against the expected schema.

    Returns a list of error strings. Empty list means the review is valid.
    """
    errors = []

    # Top-level required fields
    for field in ["version", "date", "generated_at", "summary", "researcher_notes",
                  "papers", "models", "trending_repos", "themes", "sources_checked"]:
        if field not in review:
            errors.append(f"[{label}] Missing top-level field: {field}")

    # Summary structure
    summary = review.get("summary", {})
    for field in ["headline", "body", "key_themes"]:
        if field not in summary:
            errors.append(f"[{label}] Missing summary.{field}")

    # Minimum content thresholds
    papers = review.get("papers", [])
    models = review.get("models", [])
    repos = review.get("trending_repos", [])
    themes = review.get("themes", [])

    if len(papers) < 5:
        errors.append(f"[{label}] Only {len(papers)} papers (minimum 5 expected)")
    if len(models) < 3:
        errors.append(f"[{label}] Only {len(models)} models (minimum 3 expected)")
    if len(repos) < 3:
        errors.append(f"[{label}] Only {len(repos)} trending repos (minimum 3 expected)")
    if len(themes) < 2:
        errors.append(f"[{label}] Only {len(themes)} themes (minimum 2 expected)")

    # Validate paper entries
    all_zero_engagement = True
    for i, paper in enumerate(papers):
        for field in ["id", "title", "authors", "affiliations", "summary",
                      "key_findings", "tags", "relevance", "engagement", "sources"]:
            if field not in paper:
                errors.append(f"[{label}] Paper #{i} missing field: {field}")
        if paper.get("relevance") not in ("high", "medium", "low"):
            errors.append(f"[{label}] Paper #{i} invalid relevance: {paper.get('relevance')}")
        affs = paper.get("affiliations", [])
        if not affs or any(a.lower() == "unknown" for a in affs):
            errors.append(f"[{label}] Paper #{i} has missing or 'Unknown' affiliations")
        eng = paper.get("engagement", {})
        if eng.get("upvotes", 0) > 0 or eng.get("comments", 0) > 0:
            all_zero_engagement = False
    if papers and all_zero_engagement:
        errors.append(f"[{label}] ALL {len(papers)} papers have 0 upvotes and 0 comments — engagement data likely lost")

    # Validate model entries
    all_zero_metrics = True
    for i, model in enumerate(models):
        for field in ["id", "name", "organization", "description", "task_type",
                      "tags", "metrics", "source_url"]:
            if field not in model:
                errors.append(f"[{label}] Model #{i} missing field: {field}")
        metrics = model.get("metrics", {})
        if metrics.get("downloads", 0) > 0 or metrics.get("likes", 0) > 0:
            all_zero_metrics = False
    if models and all_zero_metrics:
        errors.append(f"[{label}] ALL {len(models)} models have 0 downloads and 0 likes — metrics data likely lost")

    # Validate repo entries
    for i, repo in enumerate(repos):
        for field in ["id", "name", "description", "stars", "url", "tags", "relevance"]:
            if field not in repo:
                errors.append(f"[{label}] Repo #{i} missing field: {field}")

    # Validate theme entries
    for i, theme in enumerate(themes):
        for field in ["name", "description", "related_paper_ids", "trend_signal"]:
            if field not in theme:
                errors.append(f"[{label}] Theme #{i} missing field: {field}")
        if theme.get("trend_signal") not in ("rising", "stable", "fading"):
            errors.append(f"[{label}] Theme #{i} invalid trend_signal: {theme.get('trend_signal')}")

    return errors


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
    parser.add_argument(
        "--allow-empty",
        action="store_true",
        help="Allow generation even when HF papers and models are both empty",
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="Skip schema validation (not recommended)",
    )
    args = parser.parse_args()

    date = args.date
    print(f"Generating daily review for {date}")

    # Ensure directories exist
    date_dir = DAILY_DIR / date
    date_dir.mkdir(parents=True, exist_ok=True)
    (date_dir / "assets").mkdir(exist_ok=True)

    # Step 1: Fetch from all sources
    print("Fetching sources...")
    hf_papers = fetch_hf_daily_papers_with_fallback(date)
    hf_models = fetch_hf_trending_models()
    arxiv_data = fetch_arxiv_recent()
    alphaxiv_papers = fetch_alphaxiv_trending()
    github_repos = fetch_github_trending()

    # Guard: abort if papers OR models are empty (either is a likely API issue)
    if not args.allow_empty:
        if not hf_papers and not hf_models:
            print(
                "ERROR: HuggingFace returned 0 papers and 0 models. "
                "This is likely a transient API issue. "
                "Re-run later, or use --allow-empty to proceed anyway."
            )
            sys.exit(1)
        if not hf_papers:
            print(
                "WARNING: HuggingFace returned 0 papers (even after fallback). "
                "Models are available. Proceeding, but the review may lack papers."
            )
        if not hf_models:
            print(
                "WARNING: HuggingFace returned 0 trending models. "
                "Papers are available. Proceeding, but the review may lack models."
            )

    # Step 2: Build context
    context = build_source_context(hf_papers, hf_models, arxiv_data, alphaxiv_papers, github_repos)

    if args.dry_run:
        print("\n--- DRY RUN: Source Context ---")
        print(context[:3000])
        print(f"\n... ({len(context)} chars total)")
        return

    # Step 3: Synthesize English review with Claude
    review_en = synthesize_with_claude(context, date)

    # Step 4: Validate English review before writing
    if not args.skip_validation:
        print("  [Validation] Checking English review...")
        errors = validate_review(review_en, "EN")
        if errors:
            print(f"  [Validation] FAILED with {len(errors)} error(s):")
            for err in errors:
                print(f"    - {err}")
            print(
                "  [Validation] Aborting — review does not meet quality standards. "
                "Use --skip-validation to bypass (not recommended)."
            )
            sys.exit(1)
        print("  [Validation] English review passed all checks.")

    # Step 5: Write English file immediately (before translation, in case translation fails)
    en_file = DAILY_DIR / date / "en.json"
    en_file.write_text(json.dumps(review_en, indent=2, ensure_ascii=False) + "\n")
    print(f"  [Output] Written to {en_file}")

    # Step 6: Translate to Chinese
    review_cn = translate_to_chinese(review_en)

    # Step 7: Validate Chinese review
    if not args.skip_validation:
        print("  [Validation] Checking Chinese review...")
        errors = validate_review(review_cn, "CN")
        if errors:
            print(f"  [Validation] WARNING — Chinese review has {len(errors)} issue(s):")
            for err in errors:
                print(f"    - {err}")
            print("  [Validation] Proceeding anyway (translation issues are non-fatal).")
        else:
            print("  [Validation] Chinese review passed all checks.")

    # Step 8: Write Chinese file
    cn_file = DAILY_DIR / date / "cn.json"
    cn_file.write_text(json.dumps(review_cn, indent=2, ensure_ascii=False) + "\n")
    print(f"  [Output] Written to {cn_file}")

    # Step 9: Update both index files
    update_index(date, review_en, review_cn)

    print(f"Done! Review for {date} generated in English and Chinese.")


if __name__ == "__main__":
    main()
