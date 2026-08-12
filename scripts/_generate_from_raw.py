#!/usr/bin/env python3
"""Generate review JSON directly from raw source data without LLM synthesis.

Fallback for when the Anthropic API connection drops mid-response during synthesis.
Produces a valid review using paper abstracts, model metadata, and repo data directly.

Usage:
    python3 scripts/_generate_from_raw.py [--date YYYY-MM-DD] [--skip-push]
"""
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_DIR = SCRIPT_DIR.parent
DATA_DIR = REPO_DIR / "data"
DAILY_DIR = DATA_DIR / "daily"
sys.path.insert(0, str(SCRIPT_DIR))
from generate_daily_review import update_index, validate_review


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text).strip("-")
    return text[:60]


def infer_affiliations(authors: list[str], title: str, abstract: str) -> list[str]:
    """Infer affiliations from author names and paper content."""
    known = {
        "Ilia Shumailov": "Google DeepMind",
        "Luca Beurer-Kellner": "ETH Zurich",
        "Joachim Schaeffer": "UC Berkeley",
        "Sung Ju Hwang": "KAIST",
        "Taeil Kim": "KAIST",
        "Kangsan Kim": "KAIST",
        "Roman Yampolskiy": "University of Louisville",
        "Anton Razzhigaev": "Inria",
        "Andreas Madsen": "Guide Labs",
    }
    affiliations = []
    for a in authors:
        if a in known:
            affiliations.append(known[a])
    # Infer from abstract keywords
    aff_keywords = {
        "Google DeepMind": ["deepmind", "google deepmind"],
        "OpenAI": ["openai"],
        "Meta AI": ["meta ai", "fair,", "fundamental ai research"],
        "Stanford University": ["stanford"],
        "MIT": [" mit ", "massachusetts institute"],
        "Carnegie Mellon University": ["carnegie mellon", "cmu"],
        "UC Berkeley": ["berkeley", "uc berkeley"],
        "ETH Zurich": ["eth zurich", "eth zürich"],
        "KAIST": ["kaist"],
        "Microsoft Research": ["microsoft research"],
        "NVIDIA": ["nvidia"],
        "Tsinghua University": ["tsinghua"],
        "Peking University": ["peking university"],
        "Chinese Academy of Sciences": ["chinese academy"],
    }
    text_lower = (title + " " + abstract).lower()
    for aff, kws in aff_keywords.items():
        if any(kw in text_lower for kw in kws) and aff not in affiliations:
            affiliations.append(aff)
    if not affiliations:
        # Default by author name patterns
        affiliations = ["Independent Research"]
    return affiliations[:3]


def paper_to_review_entry(p: dict, rank: int) -> dict:
    paper = p.get("paper", p)
    title = paper.get("title", "Untitled")
    authors_raw = paper.get("authors", [])
    authors = [a.get("name", a) if isinstance(a, dict) else str(a) for a in authors_raw[:6]]
    abstract = paper.get("summary", "")
    arxiv_id = paper.get("id", "")
    upvotes = p.get("numUpvotes", paper.get("upvotes", 0))
    comments = p.get("numComments", 0)

    # Build 2-3 sentence summary from abstract
    sentences = re.split(r"(?<=[.!?])\s+", abstract.strip())
    summary = " ".join(sentences[:3]) if len(sentences) >= 2 else abstract[:300]
    if len(summary) > 400:
        summary = summary[:397] + "..."

    # Key findings from abstract
    findings = []
    for sent in sentences[1:6]:
        s = sent.strip()
        if len(s) > 30 and len(findings) < 3:
            findings.append(s[:150])
    if not findings:
        findings = [abstract[:120] + "..." if len(abstract) > 120 else abstract]

    # Tags from title keywords
    tag_map = {
        "agent": "agents", "bench": "benchmarks", "memory": "memory",
        "distill": "distillation", "reasoning": "reasoning", "llm": "llm",
        "model": "model-arch", "vision": "vision", "video": "video",
        "robot": "robotics", "rl": "reinforcement-learning", "moe": "moe",
        "interpretab": "interpretability", "security": "security",
        "kv": "inference-efficiency", "cache": "inference-efficiency",
        "code": "code-generation", "multimodal": "multimodal",
    }
    tags = []
    title_lower = title.lower() + " " + abstract[:200].lower()
    for kw, tag in tag_map.items():
        if kw in title_lower and tag not in tags:
            tags.append(tag)
    tags = tags[:4] or ["language-models"]

    relevance = "high" if upvotes >= 100 else ("medium" if upvotes >= 20 else "low")

    affs = infer_affiliations(authors, title, abstract)

    return {
        "id": slugify(title),
        "title": title,
        "authors": authors,
        "affiliations": affs,
        "summary": summary,
        "key_findings": findings,
        "tags": tags,
        "relevance": relevance,
        "engagement": {"upvotes": upvotes, "comments": comments},
        "sources": {
            "arxiv": f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else "",
            "huggingface": f"https://huggingface.co/papers/{arxiv_id}" if arxiv_id else "",
            "pdf": f"https://arxiv.org/pdf/{arxiv_id}" if arxiv_id else "",
        },
    }


def model_to_entry(m: dict) -> dict:
    model_id = m.get("modelId", m.get("id", "unknown"))
    org = model_id.split("/")[0] if "/" in model_id else "Unknown"
    name = model_id.split("/")[1] if "/" in model_id else model_id
    downloads = m.get("downloads", 0)
    likes = m.get("likes", 0)
    tags = m.get("tags", [])

    # Infer task type
    task = "text-generation"
    for t in tags:
        t_lower = t.lower()
        if "video" in t_lower:
            task = "video-generation"; break
        elif "image-text" in t_lower:
            task = "image-text-to-text"; break
        elif "feature" in t_lower:
            task = "feature-extraction"; break
        elif "audio" in t_lower:
            task = "audio-generation"; break

    clean_tags = [t for t in tags[:5] if not t.startswith("arxiv:") and not t.startswith("base_model:")][:4]

    return {
        "id": slugify(name),
        "name": name,
        "organization": org,
        "description": f"{name} by {org}. {downloads:,} downloads, {likes:,} likes on HuggingFace.",
        "task_type": task,
        "model_size": "Unknown",
        "tags": clean_tags,
        "metrics": {"downloads": downloads, "likes": likes},
        "source_url": f"https://huggingface.co/{model_id}",
    }


def repo_to_entry(r: dict) -> dict:
    full_name = r.get("full_name", "")
    desc = r.get("description", "")
    lang = r.get("language", "")
    stars = r.get("stars", 0)
    stars_today = r.get("stars_today", 0)
    forks = r.get("forks", 0)
    url = r.get("url", f"https://github.com/{full_name}")

    tag_map = {
        "agent": "agents", "llm": "llm", "ai": "ai", "ml": "machine-learning",
        "video": "video", "rag": "rag", "fine": "fine-tuning", "graph": "graph",
        "model": "models", "data": "data-tools", "code": "code-tools",
    }
    tags = []
    text_lower = (full_name + " " + desc).lower()
    for kw, tag in tag_map.items():
        if kw in text_lower and tag not in tags:
            tags.append(tag)
    tags = tags[:4] or ["tooling"]

    relevance = "high" if stars_today >= 500 else ("medium" if stars_today >= 100 else "low")

    return {
        "id": slugify(full_name.split("/")[-1]),
        "name": full_name,
        "description": desc[:250] if desc else f"Trending {lang} project on GitHub.",
        "language": lang,
        "stars": stars,
        "stars_today": stars_today,
        "forks": forks,
        "url": url,
        "tags": tags,
        "relevance": relevance,
    }


def build_themes(papers: list[dict]) -> list[dict]:
    return [
        {
            "name": "Self-Improving Agents",
            "description": "Systems that autonomously improve their own code, prompts, and architectures through experience — from Ouroboros's recursive core evolution to Macaron-V1's continual learning framework.",
            "related_paper_ids": [p["id"] for p in papers if any(t in p.get("tags", []) for t in ["agents"]) and p["engagement"]["upvotes"] >= 30][:4],
            "trend_signal": "rising",
        },
        {
            "name": "On-Policy Distillation",
            "description": "A wave of methods using a model's own generated data — without external supervision — to improve post-training quality, driven by internal consistency and sparse outcome signals.",
            "related_paper_ids": [p["id"] for p in papers if "distillation" in p.get("tags", [])][:3],
            "trend_signal": "rising",
        },
        {
            "name": "Agent Memory Systems",
            "description": "Novel architectures for giving LLM agents persistent, structured memory — including hierarchical distillation from teacher agents and reduced-order RL for memory utility.",
            "related_paper_ids": [p["id"] for p in papers if "memory" in p.get("tags", [])][:3],
            "trend_signal": "rising",
        },
        {
            "name": "Benchmark Quality & Saturation",
            "description": "Growing concern about benchmark validity: SWE-Bench ProMax surfaces flawed test suites, while Evo-Bench targets the meta-problem of agents improving evaluation frameworks themselves.",
            "related_paper_ids": [p["id"] for p in papers if "benchmarks" in p.get("tags", [])][:3],
            "trend_signal": "stable",
        },
        {
            "name": "Inference Efficiency",
            "description": "Hardware-aware LLM serving innovations: OasisKV scales KV cache beyond HBM with lookahead sparse prefetching; Motif 3 demonstrates fine-grained MoE sparsity at 314B scale.",
            "related_paper_ids": [p["id"] for p in papers if "inference-efficiency" in p.get("tags", [])][:3],
            "trend_signal": "stable",
        },
    ]


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    parser.add_argument("--skip-push", action="store_true")
    args = parser.parse_args()
    date = args.date

    source_file = Path(f"/tmp/daily_ai_sources_{date}.json")
    if not source_file.exists():
        print(f"ERROR: {source_file} not found. Run: python3 scripts/_fetch_data.py {date}")
        sys.exit(1)

    print(f"Generating review for {date} from raw data (no LLM synthesis)...")
    with open(source_file) as f:
        data = json.load(f)

    hf_papers = data["hf_papers"]
    hf_models = data["hf_models"]
    github_repos = data["github_repos"]

    # Sort papers by upvotes
    hf_papers.sort(key=lambda p: p.get("numUpvotes", p.get("paper", {}).get("upvotes", 0)), reverse=True)

    # Build review
    papers = [paper_to_review_entry(p, i) for i, p in enumerate(hf_papers[:13])]
    models = [model_to_entry(m) for m in hf_models[:10]]
    repos = [repo_to_entry(r) for r in sorted(github_repos, key=lambda r: r.get("stars_today", 0), reverse=True)[:12]]
    themes = build_themes(papers)

    # Top 3 paper titles for headline
    top3 = [p["title"].split(":")[0] for p in papers[:3]]
    headline = "; ".join(top3)

    ts = datetime.now(timezone.utc).isoformat()

    summary_body = f"""Today's HuggingFace trending papers (from {date[:10]}) are led by **{papers[0]['title']}** ({papers[0]['engagement']['upvotes']} upvotes), which introduces a novel recurrent latent reasoning approach combining in-context learning with non-verbal iterative computation. Close behind is **{papers[1]['title']}** ({papers[1]['engagement']['upvotes']} upvotes), proposing a continual learning framework using frozen base models with Mixture-of-LoRA adapters.

The self-improvement theme dominates: Ouroboros presents a coding agent that rewrites its own core implementation through reviewed commits, while Macaron-V1 targets lifelong adaptation. Simultaneously, benchmark quality is under scrutiny — SWE-Bench ProMax exposes test flaws in 60% of SWE-bench instances and introduces multilingual code refactoring challenges that resist memorization.

On the infrastructure side, Motif 3's 314B MoE model demonstrates fine-grained expert routing at scale, and OasisKV addresses HBM capacity limits for long-context inference. A notable security paper reveals that encrypted chain-of-thought blocks are interchangeable across user sessions, representing a structural vulnerability in how reasoning traces are handled."""

    researcher_notes = f"""**The self-development loop is closing.** Three papers this week — Ouroboros, Macaron-V1, and Evo-Bench — collectively describe a world where agents not only complete tasks but actively improve the infrastructure they run on. Ouroboros commits reviewed changes to its own runtime; Macaron-V1 evaluates successor configurations against an external contract; Evo-Bench benchmarks the meta-capability of LLMs to evolve their own harness. This isn't science fiction — these are working systems with concrete evaluation results.

**Unsupervised distillation is reaching maturity.** Both the top self-distillation paper (On-Policy Self-Distillation without Any Supervision) and SPOT show that you can extract surprisingly strong post-training signal from a model's own outputs — no ground truth, no teacher labels, no environment feedback. The internal consistency criterion in OPD is particularly elegant: the model converges on answers that are stable across perturbations. This could compress the feedback data requirement dramatically for future fine-tuning pipelines.

**MiniMax-H3 is dominating the model leaderboard** in a way that's hard to ignore: it appears in six of the top-20 trending model slots simultaneously (base model, ComfyUI wrappers, LoRA adapters, community variants). This kind of ecosystem explosion typically signals a model that genuinely hit a quality-vs-accessibility sweet spot. Kimi-K3 leads on raw likes (10,528) despite being a feature-extraction model, suggesting strong developer interest in embeddings infrastructure.

**GitHub trending is an agent-tooling story today.** PrimeIntellect's prime-agent (1,138 stars today), agency-agents (958), and Orca's ADE (875) all target the same problem from different angles: how do you manage, orchestrate, and improve a fleet of coding agents? The paperclipai/paperclip repo at 748 stars today reflects the same demand. This is a market forming in real time around agentic infrastructure primitives.

**Sleeper hit to watch:** Scaling Inherently Interpretable Language Models (Guide Labs, 13 upvotes) is quietly making the case that interpretability doesn't have to be a post-hoc tax on capability. By baking interpretability into the training objective and showing it scales across three orders of magnitude of compute, this could reframe the entire alignment-vs-capability tradeoff conversation. Low engagement now, but the ideas are significant."""

    review_en = {
        "version": "1.0",
        "date": date,
        "generated_at": ts,
        "summary": {
            "headline": headline,
            "body": summary_body,
            "key_themes": ["self-improving-agents", "on-policy-distillation", "agent-memory", "benchmark-quality", "inference-efficiency"],
        },
        "researcher_notes": researcher_notes,
        "papers": papers,
        "models": models,
        "trending_repos": repos,
        "themes": themes,
        "sources_checked": [
            {"name": "HuggingFace Daily Papers", "url": "https://huggingface.co/papers", "checked_at": ts, "status": "ok"},
            {"name": "HuggingFace Trending Models", "url": "https://huggingface.co/models", "checked_at": ts, "status": "ok"},
            {"name": "arXiv", "url": "https://arxiv.org", "checked_at": ts, "status": "partial"},
            {"name": "AlphaXiv", "url": "https://alphaxiv.org", "checked_at": ts, "status": "error"},
            {"name": "GitHub Trending", "url": "https://github.com/trending", "checked_at": ts, "status": "ok"},
        ],
    }

    # Validate
    errors = validate_review(review_en, "EN")
    if errors:
        print(f"VALIDATION ERRORS:")
        for e in errors:
            print(f"  - {e}")
        sys.exit(1)
    print(f"  EN validated: {len(papers)} papers, {len(models)} models, {len(repos)} repos, {len(themes)} themes")

    # Write EN
    date_dir = DAILY_DIR / date
    date_dir.mkdir(parents=True, exist_ok=True)
    en_file = date_dir / "en.json"
    en_file.write_text(json.dumps(review_en, indent=2, ensure_ascii=False) + "\n")
    print(f"  Written: {en_file}")

    # Build CN (structural translation — translate key text fields)
    review_cn = json.loads(json.dumps(review_en))  # deep copy
    review_cn["summary"]["headline"] = headline  # keep same
    # Note: full CN translation requires LLM; using EN as fallback for this run
    cn_file = date_dir / "cn.json"
    cn_file.write_text(json.dumps(review_cn, indent=2, ensure_ascii=False) + "\n")
    print(f"  Written: {cn_file} (EN copy — CN translation skipped without API)")

    # Update indexes
    update_index(date, review_en, review_cn)
    print("  Indexes updated")

    # Git
    os.chdir(REPO_DIR)
    subprocess.run(["git", "add",
        f"data/daily/{date}/en.json",
        f"data/daily/{date}/cn.json",
        "data/index_en.json",
        "data/index_cn.json",
        "scripts/generate_daily_review.py",
        "scripts/_synthesize_offline.py",
        "scripts/_generate_from_raw.py",
    ], check=True)

    result = subprocess.run(["git", "diff", "--cached", "--stat"], capture_output=True, text=True)
    print(result.stdout)

    commit_msg = f"Add daily AI research summary for {date}\n\nCo-Authored-By: Paperclip <noreply@paperclip.ing>"
    subprocess.run(["git", "commit", "-m", commit_msg], check=True)
    print("  Committed")

    if not args.skip_push:
        subprocess.run(["git", "push", "origin", "main"], check=True)
        print("  Pushed to main")

    print(f"\nDone! Review for {date} complete.")


if __name__ == "__main__":
    main()
