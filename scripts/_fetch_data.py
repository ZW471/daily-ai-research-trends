#!/usr/bin/env python3
"""Fetch all sources and dump raw data as JSON for offline synthesis."""
import json, sys
sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parent))
from generate_daily_review import (
    fetch_hf_daily_papers_with_fallback,
    fetch_hf_trending_models,
    fetch_arxiv_recent,
    fetch_alphaxiv_trending,
    fetch_github_trending,
    build_source_context,
)

date = sys.argv[1] if len(sys.argv) > 1 else "2026-06-16"
print(f"Fetching all sources for {date}...")

hf_papers = fetch_hf_daily_papers_with_fallback(date)
hf_models = fetch_hf_trending_models()
arxiv_data = fetch_arxiv_recent()
alphaxiv_papers = fetch_alphaxiv_trending()
github_repos = fetch_github_trending()

context = build_source_context(hf_papers, hf_models, arxiv_data, alphaxiv_papers, github_repos)

out = {
    "date": date,
    "hf_papers": hf_papers,
    "hf_models": hf_models,
    "alphaxiv_papers": alphaxiv_papers,
    "github_repos": github_repos,
    "source_context": context,
}

outfile = f"/tmp/daily_ai_sources_{date}.json"
with open(outfile, "w") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"Written to {outfile} ({len(context)} chars context)")
