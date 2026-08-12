#!/usr/bin/env python3
"""Offline synthesizer: generates review JSON from pre-fetched source data.

Usage:
    python3 scripts/_synthesize_offline.py [--date YYYY-MM-DD] [--skip-push]

This script reads cached source data and uses the claude CLI to synthesize
the review, writing results to data/daily/{date}/ and updating indexes.
It is designed to run as a background process independent of the heartbeat session.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_DIR = SCRIPT_DIR.parent
DATA_DIR = REPO_DIR / "data"
DAILY_DIR = DATA_DIR / "daily"

sys.path.insert(0, str(SCRIPT_DIR))
from generate_daily_review import (
    OUTPUT_SCHEMA,
    update_index,
    validate_review,
    _patch_engagement,
)


def run_claude_cli(prompt: str, max_retries: int = 2) -> str | None:
    """Run claude CLI with a prompt, return output or None on failure."""
    import shutil
    claude_bin = shutil.which("claude") or os.environ.get("CLAUDE_CODE_EXECPATH", "")
    if not claude_bin:
        print("ERROR: claude CLI not found")
        return None
    for attempt in range(max_retries):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write(prompt)
            prompt_file = f.name
        try:
            result = subprocess.run(
                [claude_bin, "-p", "--output-format", "text", f"@{prompt_file}"],
                capture_output=True,
                text=True,
                timeout=600,
            )
            os.unlink(prompt_file)
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            print(f"  [CLI attempt {attempt+1}] Exit {result.returncode}: {result.stderr[:300]}")
        except subprocess.TimeoutExpired:
            os.unlink(prompt_file)
            print(f"  [CLI attempt {attempt+1}] Timed out after 600s")
        except Exception as e:
            os.unlink(prompt_file)
            print(f"  [CLI attempt {attempt+1}] Error: {e}")
    return None


def synthesize_en(source_context: str, date: str) -> dict:
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

CRITICAL — Affiliations: For each paper, you MUST provide real institutional affiliations. NEVER use "Unknown". Use author names, paper content, or your knowledge.

Source data:
{source_context}

Output ONLY valid JSON matching this schema (no markdown fences, no commentary):
{OUTPUT_SCHEMA}
"""
    print("  Synthesizing EN review via claude CLI...")
    text = run_claude_cli(prompt)
    if text is None:
        raise RuntimeError("claude CLI synthesis failed")
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    return json.loads(text)


def translate_cn(review_en: dict) -> dict:
    prompt = f"""Translate the following AI research daily review JSON from English to Chinese.

Rules:
- Translate ALL text fields: summary.headline, summary.body, researcher_notes, paper summaries, key_findings, model descriptions, theme names/descriptions.
- Keep structural fields unchanged: version, date, generated_at, ids, slugs, tags, URLs, author names, model names/IDs, organization names, task_type, metric keys, source keys, relevance, trend_signal, status.
- key_themes slugs stay in English.
- Maintain the exact same JSON structure.
- Use natural, fluent Chinese suitable for a technical audience.
- CRITICAL JSON SAFETY: Inside JSON string values, NEVER use bare ASCII double-quote characters. Use Chinese quotation marks or escape them as \\".

Input JSON:
{json.dumps(review_en, indent=2, ensure_ascii=False)}

Output ONLY valid JSON (no markdown fences, no commentary):"""

    print("  Translating to CN via claude CLI...")
    text = run_claude_cli(prompt, max_retries=2)
    if text is None:
        print("  WARNING: CN translation failed, copying EN as fallback")
        return review_en.copy()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        print("  WARNING: CN JSON parse failed, using EN as fallback")
        return review_en.copy()


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    parser.add_argument("--skip-push", action="store_true")
    args = parser.parse_args()
    date = args.date

    source_file = Path(f"/tmp/daily_ai_sources_{date}.json")
    if not source_file.exists():
        print(f"ERROR: Source file not found: {source_file}")
        print("Run: python3 scripts/_fetch_data.py {date}")
        sys.exit(1)

    print(f"Loading source data from {source_file}...")
    with open(source_file) as f:
        data = json.load(f)

    source_context = data["source_context"]
    hf_papers = data["hf_papers"]

    date_dir = DAILY_DIR / date
    date_dir.mkdir(parents=True, exist_ok=True)
    (date_dir / "assets").mkdir(exist_ok=True)

    # Synthesize EN
    review_en = synthesize_en(source_context, date)

    # Patch engagement
    patched = _patch_engagement(review_en, hf_papers)
    if patched:
        print(f"  Patched engagement for {patched} papers")

    # Validate EN
    errors = validate_review(review_en, "EN")
    if errors:
        print(f"VALIDATION FAILED ({len(errors)} errors):")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    print("  EN validation passed")

    # Write EN
    en_file = date_dir / "en.json"
    en_file.write_text(json.dumps(review_en, indent=2, ensure_ascii=False) + "\n")
    print(f"  Written: {en_file}")

    # Translate CN
    review_cn = translate_cn(review_en)

    # Write CN
    cn_file = date_dir / "cn.json"
    cn_file.write_text(json.dumps(review_cn, indent=2, ensure_ascii=False) + "\n")
    print(f"  Written: {cn_file}")

    # Update indexes
    update_index(date, review_en, review_cn)
    print("  Indexes updated")

    # Git commit and push
    os.chdir(REPO_DIR)
    subprocess.run(["git", "add",
        f"data/daily/{date}/en.json",
        f"data/daily/{date}/cn.json",
        "data/index_en.json",
        "data/index_cn.json",
    ], check=True)

    commit_msg = f"Add daily AI research summary for {date}\n\nCo-Authored-By: Paperclip <noreply@paperclip.ing>"
    subprocess.run(["git", "commit", "-m", commit_msg], check=True)
    print("  Committed")

    if not args.skip_push:
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("  Pushed to main")

    print(f"\nDone! Review for {date} complete.")


if __name__ == "__main__":
    main()
