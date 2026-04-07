# Daily AI Research Trends

Automated daily analysis of AI/ML research trends, covering trending papers and models from HuggingFace, arXiv, and AlphaXiv.

**[View Live Site](https://daily-ai-research-trends.netlify.app)**

## How It Works

A nightly automated pipeline:
1. Fetches trending papers from HuggingFace Daily Papers, arXiv, and AlphaXiv
2. Fetches trending models from HuggingFace
3. Synthesizes a structured daily research review using Claude
4. Commits the review to `data/` and pushes to this repo
5. The Netlify app fetches fresh data from GitHub at runtime — no redeployment needed

## Project Structure

```
├── app/              # Next.js web application (deployed on Netlify)
├── data/             # Generated research data (JSON)
│   ├── index_en.json         # Daily review index (English)
│   ├── index_cn.json         # Daily review index (Chinese)
│   ├── reviews-index_en.json # Literature review index (English)
│   ├── reviews-index_cn.json # Literature review index (Chinese)
│   ├── daily/                # Daily research summaries
│   │   └── YYYY-MM-DD/      # One subfolder per day
│   │       ├── en.json
│   │       ├── cn.json
│   │       └── assets/       # SVG images for this day
│   └── reviews/              # Literature reviews
│       └── YYYY-MM-DD/       # One subfolder per review
│           ├── en.json
│           ├── cn.json
│           └── assets/       # SVG images for this review
├── scripts/          # Automation scripts
│   ├── generate_daily_review.py
│   └── run_nightly.sh
└── README.md
```

Images are SVG-only to keep repository size small. Do not commit PNG, JPG, or other raster image formats.

## Local Development

### Research script
```bash
uv run python scripts/generate_daily_review.py --dry-run  # test data fetching
uv run python scripts/generate_daily_review.py             # full generation (needs ANTHROPIC_API_KEY)
```

### Web app
```bash
cd app
npm install
npm run dev
```
