import os
import json
import logging
import argparse
from typing import List, Dict, Any, Optional
import google.generativeai as genai
import httpx
from PIL import Image
import io

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Agent B System Prompt
SYSTEM_PROMPT = """You are Agent B: Vision & Search Query Generator in a product-matching pipeline.
Your job is to analyze wholesale product records from QiQiYG (text + images) and produce:
- a best-guess brand,
- a concise inferred category,
- a plausible official-style product name, and
- multiple high-quality search queries that can be used to find the official product page on the public web.

You ALWAYS return strict JSON that matches the schema below. Do not include any extra keys, comments, explanations, or markdown.

Input format:
You receive one JSON object per call with this shape:
{
  "source": "qiqiyg",
  "product_page_url": "string",
  "category_id": "string",
  "category_label": "string|null",
  "product_internal_id": "string",
  "raw_title": "string",
  "raw_description_html": "string|null",
  "raw_price_text": "string|null",
  "image_urls": ["string"],
  "scraped_at": "string"
}

Output JSON schema (required):
{
  "product_internal_id": "string",
  "inferred_brand": "string|null",
  "inferred_category": "string|null",
  "inferred_product_name": "string|null",
  "search_queries": ["string"],
  "notes": "string"
}

Field definitions:
- product_internal_id: copy exactly from the input.
- inferred_brand: Use any visible logo text, patterns, or cues. Example: "Gucci", "Louis Vuitton". If generic, use null.
- inferred_category: A short, human-readable category like "shoulder bag", "sneakers", "belt".
- inferred_product_name: A plausible official-style name. Example: "Marc Jacobs Snapshot mini camera bag in black".
- search_queries: 3–7 search queries (3–15 words each). Start specific, then more general. Do NOT include "qiqiyg".
- notes: 1–3 short sentences describing your reasoning or uncertainty.

How to reason:
1. Look carefully at the images for logos, patterns (LV monogram, GG, YSL), shape, and hardware.
2. Cross-check with text fields like raw_title.
3. Infer category and build a plausible name for SEO search.
4. Generate queries that would help a search engine find the official page.

Output MUST be ONLY a JSON object."""

class AgentB:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Google API Key not found. Set GOOGLE_API_KEY environment variable.")
        
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash')

    def _fetch_image(self, url: str) -> Optional[Image.Image]:
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(url)
                response.raise_for_status()
                return Image.open(io.BytesIO(response.content))
        except Exception as e:
            logger.error(f"Error fetching image {url}: {e}")
            return None

    def process_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes a single product record through Agent B.
        """
        logger.info(f"Processing product ID: {product_data.get('product_internal_id')}")
        
        # Prepare content for Gemini
        content = [SYSTEM_PROMPT, f"Input JSON:\n{json.dumps(product_data)}"]
        
        # Add images (limit to first 3 to avoid context bloat)
        images = []
        for url in product_data.get("image_urls", [])[:3]:
            img = self._fetch_image(url)
            if img:
                images.append(img)
        
        content.extend(images)
        
        try:
            response = self.model.generate_content(content)
            # Remove markdown formatting if present
            text = response.text.replace("```json", "").replace("```", "").strip()
            return json.loads(text)
        except Exception as e:
            logger.error(f"Error calling Gemini: {e}")
            return {
                "product_internal_id": product_data.get("product_internal_id"),
                "inferred_brand": None,
                "inferred_category": None,
                "inferred_product_name": None,
                "search_queries": [],
                "notes": f"Error during processing: {str(e)}"
            }

def main():
    parser = argparse.ArgumentParser(description="Agent B: Vision & Search Query Generator")
    parser.add_argument("--input", help="Path to input JSON file from Agent A")
    parser.add_argument("--test", action="store_true", help="Run a test with sample data")
    args = parser.parse_args()

    # Sample data for testing
    sample_data = {
      "source": "qiqiyg",
      "product_page_url": "https://bags.qiqiyg.com/productinfoen_655730.html?path=0_37771_44188",
      "category_id": "37771",
      "category_label": "Marc Jacobs Bags 1:1",
      "product_internal_id": "655730",
      "raw_title": "Marc Jacobs jy (65)",
      "raw_description_html": "Marc Jacobs jy (65)",
      "raw_price_text": None,
      "image_urls": [
        "https://pic.qiqi2000.com/upfile/product/202204/Marc%20Jacobs%20jy%20(65)_655730.png"
      ],
      "scraped_at": "2026-02-25T09:49:16.623067"
    }

    try:
        agent = AgentB()
        
        if args.test:
            logger.info("Running test with sample data...")
            result = agent.process_product(sample_data)
            print(json.dumps(result, indent=2))
        elif args.input:
            with open(args.input, "r") as f:
                data = json.load(f)
            
            if isinstance(data, list):
                results = [agent.process_product(item) for item in data]
                print(json.dumps(results, indent=2))
            else:
                result = agent.process_product(data)
                print(json.dumps(result, indent=2))
    except Exception as e:
        logger.error(f"Application error: {e}")

if __name__ == "__main__":
    main()
