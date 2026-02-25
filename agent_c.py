import os
import json
import logging
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types
import httpx
from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MATCH_PROMPT = """You are Agent C: Official Match Finder in a product-matching pipeline.

Given the wholesale product data and inference data below, your job is to:
1. Search the web for the official/authentic product page that matches this wholesale item.
2. Use the search queries provided in the inference data as a starting point.
3. Find the OFFICIAL product page (brand.com, major department stores like Nordstrom, Saks, Bloomingdale's, Farfetch, Net-a-Porter). Avoid replica or wholesale sites.
4. Extract the official product details from the page you find.

Wholesale Data:
{wholesale_data}

Inference Data:
{inference_data}

IMPORTANT MATCHING RULES:
- Compare brand, shape, color, logo pattern, hardware details.
- The official product MUST be from the same brand as inferred.
- Prefer exact product matches over general brand pages.

CRITICAL - IMAGE URL EXTRACTION:
- You MUST find and return an official_main_image_url when match_found is true.
- PREFERRED image sources (their CDNs serve images without blocking):
  * Bloomingdale's: https://images.bloomingdalesassets.com/is/image/BLM/products/...
  * Saks Fifth Avenue: https://image.s5a.com/is/image/saks/...
  * Macy's: https://slimages.macysassets.com/is/image/...
  * Shopify stores: https://cdn.shopify.com/s/files/...
- AVOID image URLs from Farfetch and Revolve (they block non-browser requests).
- Search for the product on Bloomingdale's or Saks when looking for images.
- The official_main_image_url MUST be a REAL, DIRECT IMAGE URL you found in search results.
- Do NOT fabricate or construct image URLs by guessing CDN patterns.
- Do NOT set official_main_image_url to null if you found a match. Search more if needed.

Return ONLY a JSON object with exactly these fields:
{{
  "product_internal_id": "{product_id}",
  "match_found": true/false,
  "match_confidence": 0.0 to 1.0,
  "official_page_url": "string or null",
  "official_brand": "string or null",
  "official_product_name": "string or null",
  "official_sku": "string or null",
  "official_price": "string or null",
  "official_currency": "string or null",
  "official_main_image_url": "string or null - MUST be a direct image URL",
  "notes": "string explaining your matching reasoning"
}}

Confidence interpretation:
- 0.80-1.00: strong match (highly likely same product)
- 0.60-0.79: plausible match (some uncertainty)
- Below 0.60: no match found
"""


class AgentC:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("Google API Key not found.")
        self.client = genai.Client(api_key=self.api_key)

    def find_match(self, raw_data: Dict[str, Any], inference_data: Dict[str, Any], search_results: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Uses Gemini with Google Search grounding to find official product matches.
        """
        product_id = raw_data.get("product_internal_id", "unknown")
        
        prompt = MATCH_PROMPT.format(
            wholesale_data=json.dumps(raw_data, indent=2),
            inference_data=json.dumps(inference_data, indent=2),
            product_id=product_id
        )

        try:
            # Use google_search tool for grounded web search
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    tools=[types.Tool(google_search=types.GoogleSearch())],
                    temperature=0.1,
                )
            )
            
            text = response.text
            
            # Fallback: extract from candidate parts if text is None
            if not text and response.candidates:
                parts = response.candidates[0].content.parts
                text = "".join(p.text for p in parts if hasattr(p, 'text') and p.text) if parts else ""
            
            if not text:
                raise ValueError("Empty response from Gemini")
            
            logger.info(f"Agent C raw response length: {len(text)} chars")
            
            # Extract JSON from response (handle markdown fences and extra text)
            text = text.replace("```json", "").replace("```", "").strip()
            
            # Find JSON object in the response
            import re
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                text = json_match.group(0)
            
            result = json.loads(text)
            
            # Ensure product_internal_id is set
            result["product_internal_id"] = product_id
            
            # Post-process: Validate image URL and fall back to og:image scraping if needed
            if result.get("match_found") and result.get("official_page_url"):
                image_url = result.get("official_main_image_url")
                
                # Validate image URL if provided (model may hallucinate CDN URLs)
                if image_url:
                    if not self._validate_image_url(image_url):
                        logger.warning(f"Model-provided image URL is invalid (404/unreachable): {image_url}")
                        image_url = None
                
                # Fall back to og:image scraping
                if not image_url:
                    image_url = self._scrape_og_image(result["official_page_url"])
                
                result["official_main_image_url"] = image_url
            
            logger.info(f"Match found: {result.get('match_found')}, "
                       f"Confidence: {result.get('match_confidence')}, "
                       f"Brand: {result.get('official_brand')}, "
                       f"Image: {'YES' if result.get('official_main_image_url') else 'NO'}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error calling Gemini in Agent C: {e}")
            return {
                "product_internal_id": product_id,
                "match_found": False,
                "match_confidence": 0.0,
                "official_page_url": None,
                "official_brand": None,
                "official_product_name": None,
                "official_sku": None,
                "official_price": None,
                "official_currency": None,
                "official_main_image_url": None,
                "notes": f"Error during matching: {str(e)}"
            }

    def _validate_image_url(self, url: str) -> bool:
        """HEAD-checks an image URL to verify it actually exists."""
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            with httpx.Client(timeout=5.0, follow_redirects=True) as client:
                resp = client.head(url, headers=headers)
                is_valid = resp.status_code == 200
                logger.info(f"Image URL validation: {url} -> {resp.status_code} ({'VALID' if is_valid else 'INVALID'})")
                return is_valid
        except Exception as e:
            logger.warning(f"Image URL validation failed for {url}: {e}")
            return False

    def _scrape_og_image(self, url: str) -> Optional[str]:
        """Fetches a page and extracts og:image or similar meta tag."""
        try:
            logger.info(f"Scraping og:image from: {url}")
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                resp = client.get(url, headers=headers)
                resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, "html.parser")
            
            # Try og:image first (most common for e-commerce)
            og_img = soup.find("meta", property="og:image")
            if og_img and og_img.get("content"):
                logger.info(f"Found og:image: {og_img['content']}")
                return og_img["content"]
            
            # Try twitter:image
            tw_img = soup.find("meta", attrs={"name": "twitter:image"})
            if tw_img and tw_img.get("content"):
                logger.info(f"Found twitter:image: {tw_img['content']}")
                return tw_img["content"]
            
            # Try first large product image
            for img in soup.find_all("img"):
                src = img.get("src", "")
                if any(kw in src.lower() for kw in ["/product", "/media", "cdn"]) and src.startswith("http"):
                    logger.info(f"Found product image: {src}")
                    return src
            
            logger.warning(f"No og:image found at {url}")
            return None
        except Exception as e:
            logger.warning(f"Failed to scrape og:image from {url}: {e}")
            return None


if __name__ == "__main__":
    # Quick test
    print("Agent C module loaded. Using Gemini with Google Search grounding.")
    agent = AgentC()
    test_raw = {
        "product_internal_id": "test_001",
        "title": "Marc Jacobs Snapshot",
        "image_urls": []
    }
    test_inference = {
        "inferred_brand": "Marc Jacobs",
        "inferred_category": "Handbag",
        "inferred_product_name": "Marc Jacobs The Snapshot Bag",
        "search_queries": [
            "Marc Jacobs The Snapshot bag official",
            "Marc Jacobs camera bag Snapshot"
        ]
    }
    result = agent.find_match(test_raw, test_inference)
    print(json.dumps(result, indent=2))
