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
├── app/          # Next.js web application (deployed on Netlify)
├── data/         # Generated daily research reviews (JSON)
│   ├── index.json
│   └── daily/    # One JSON file per day
├── scripts/      # Automation scripts
│   ├── generate_daily_review.py
│   └── run_nightly.sh
└── README.md
```

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
