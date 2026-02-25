<p align="center">
  <strong>🔍 AutoMatch</strong><br/>
  <em>AI-powered product matching pipeline by <a href="https://github.com/deegrate">Millennium</a></em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini%202.5%20Flash-AI%20Vision-4285F4?logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Private-red" />
</p>

---

## What It Does

**AutoMatch** takes raw wholesale product listings — titles, images, prices — and automatically identifies the corresponding official retail product using AI vision and web search. It outputs a clean, enriched inventory CSV ready for import into an e-commerce platform.

**The problem it solves:** Manually matching thousands of supplier SKUs to their official product pages is tedious, error-prone, and slow. AutoMatch uses a multi-agent pipeline powered by **Gemini 2.5 Flash** to do it in seconds per product, with confidence scoring and human review flags.

---

## Architecture

AutoMatch is built as a **four-agent pipeline**, each agent specializing in one step of the matching workflow:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Agent A   │───▶│   Agent B   │───▶│   Agent C   │───▶│   Agent D   │
│  Scraper &  │    │  Vision &   │    │  Search &   │    │   Export    │
│ Normalizer  │    │ Query Gen   │    │   Matcher   │    │  Engineer   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
    discover.py        agent_b.py        agent_c.py        agent_d.py
    scraper.py                                         inventory_export.csv
```

| Agent | Module | What It Does |
|-------|--------|-------------|
| **A — Scraper** | `discover.py`, `scraper.py`, `models.py` | Crawls supplier listings, navigates pagination, and extracts product records (title, images, price, IDs) into a normalized `RawProductRecord` |
| **B — Vision & Query Gen** | `agent_b.py` | Sends product images + text to **Gemini 2.5 Flash** for visual brand recognition, category inference, and search query generation |
| **C — Search & Match** | `agent_c.py` | Uses **Gemini with Google Search grounding** to find the official retail product page, extract official name/SKU/price, and validate product images via `og:image` scraping |
| **D — Export Engineer** | `agent_d.py` | Assembles the final enriched row (brand, name, SKU, cost, compare-to price, images) and appends it to the export CSV with a review flag |

The pipeline is orchestrated by `pipeline.py`, which chains each agent in sequence with checkpointing between stages.

### Dashboard

A **Next.js 15 dashboard** (`/dashboard`) provides real-time visibility into pipeline runs:

- **Run Overview** — status, products processed, match rates
- **Product Table** — sortable/filterable view of all matched products
- **Match Inspector** — side-by-side comparison of supplier vs. official product with confidence scores

Built with React, TypeScript, Tailwind CSS, Framer Motion, Recharts, and Lucide icons.

---

## Technical Highlights

- **Gemini 2.5 Flash vision** — Agent B analyzes product images for logos, patterns (monogram, hardware), and brand cues before generating search queries
- **Google Search grounding** — Agent C leverages Gemini's built-in search to find official product pages without a separate search API
- **`og:image` extraction with fallback** — Agent C scrapes official pages for meta images, falling back to common CDN patterns (Nordstrom, Bloomingdale's, Saks, etc.)
- **Confidence-based review flags** — products below 0.8 confidence are flagged `needs_review: YES` so a human only reviews uncertain matches
- **Playwright fallback** — the scraper uses `httpx` for speed but falls back to headless Chromium via Playwright for JavaScript-rendered pages
- **Checkpoint files** — intermediate state is saved between agents so the pipeline can resume without re-scraping

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google AI API key](https://aistudio.google.com/apikey) (for Gemini)

### Pipeline

```bash
# Clone and enter
git clone https://github.com/deegrate/AutoMatch.git
cd AutoMatch

# Set up Python environment
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install httpx beautifulsoup4 google-generativeai Pillow google-genai playwright
playwright install chromium

# Set your API key
set GOOGLE_API_KEY=your-key-here        # Windows
# export GOOGLE_API_KEY=your-key-here   # macOS/Linux

# Run the pipeline (processes 3 products from a target listing)
python pipeline.py

# Or scrape a single product
python scraper.py "https://bags.qiqiyg.com/productinfoen_655730.html?path=0_37771_44188"

# Or run Agent B on a product (vision + query gen)
python scraper.py --agent-b "https://bags.qiqiyg.com/productinfoen_655730.html?path=0_37771_44188"
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
# Open http://localhost:3000
```

---

## Project Structure

```
AutoMatch/
├── discover.py          # Agent A: URL discovery & pagination
├── scraper.py           # Agent A: Product detail extraction
├── models.py            # Shared data models (RawProductRecord, OfficialMatchResult)
├── agent_b.py           # Agent B: Gemini vision + search query generation
├── agent_c.py           # Agent C: Google Search matching + image validation
├── agent_d.py           # Agent D: CSV export with review flags
├── pipeline.py          # Orchestrator: chains all agents with checkpointing
├── process_batch.py     # Batch processing utility
├── .gitignore
└── dashboard/           # Next.js 15 dashboard
    ├── src/
    │   ├── app/         # Next.js App Router (API routes + pages)
    │   ├── components/  # Dashboard, MatchInspector, ProductTable, etc.
    │   └── lib/         # CSV parsing utilities
    ├── package.json
    └── tailwind.config.ts
```

---

## Stack

| Layer | Technology |
|-------|-----------|
| AI / Vision | Gemini 2.5 Flash, Google Search grounding |
| Pipeline | Python 3.10+, httpx, BeautifulSoup4, Playwright |
| Dashboard | Next.js 15, React, TypeScript, Tailwind CSS |
| Data | CSV export, JSON checkpoints |
| Dev Tooling | Antigravity (agentic AI coding assistant) |

---

<p align="center">
  Built by <a href="https://github.com/deegrate"><strong>Damone Grate</strong></a> · <strong>Millennium</strong>
</p>
