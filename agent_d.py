import csv
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

CSV_PATH = Path("inventory_export.csv")

HEADERS = [
    "category_id",
    "product_internal_id",
    "brand",
    "product_name",
    "product_sku",
    "product_description",
    "product_supplier",
    "product_supplier_url",
    "product_cost_price",
    "product_compare_to_price",
    "product_price",
    "product_media_main_image_url",
    "product_media_gallery_image_url_1",
    "product_media_gallery_image_url_2",
    "product_media_gallery_image_url_3",
    "product_media_gallery_image_url_4",
    "product_media_gallery_image_url_5",
    "product_media_gallery_image_url_6",
    "product_media_gallery_image_url_7",
    "product_media_gallery_image_url_8",
    "product_media_gallery_image_url_9",
    "needs_review"  # Added review signal
]

def ensure_csv_headers() -> None:
    if not CSV_PATH.exists() or CSV_PATH.stat().st_size == 0:
        with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(HEADERS)

def normalize_price_text(price_text: Optional[str]) -> str:
    if not price_text:
        return ""
    # Strip common currency symbols and whitespace
    cleaned = str(price_text).replace("$", "").replace("€", "").replace("£", "")
    cleaned = cleaned.replace(",", "").strip()
    return cleaned

def append_product_row(
    raw: Dict[str, Any],
    match: Dict[str, Any],
    inference: Optional[Dict[str, Any]] = None,
    supplier_name: str = "QiQiYG",
) -> str:
    ensure_csv_headers()

    images: List[str] = raw.get("image_urls") or []
    
    # Pick a better main image by skipping logos if possible
    main_image = ""
    if images:
        main_image = next((img for img in images if "logo" not in img.lower()), images[0])
    
    # Filter gallery to exclude the selected main image
    gallery_pool = [img for img in images if img != main_image]
    gallery = gallery_pool[:9]
    if len(gallery) < 9:
        gallery += [""] * (9 - len(gallery))

    inferred_brand = None
    if inference is not None:
        inferred_brand = inference.get("inferred_brand")

    brand = match.get("official_brand") or inferred_brand or ""
    product_name = match.get("official_product_name") or raw.get("raw_title", "")
    product_sku = match.get("official_sku") or ""

    # Description fallback
    raw_description = raw.get("raw_description_html") or ""
    if not raw_description:
        raw_description = raw.get("raw_title", "")
    product_description = raw_description

    # Cost price (from supplier)
    product_cost_price = normalize_price_text(raw.get("raw_price_text"))

    # Compare-to price (official)
    official_price_text = match.get("official_price")
    product_compare_to_price = normalize_price_text(official_price_text)

    # For now, mirror cost
    product_price = product_cost_price

    # Review Signal
    match_found = match.get("match_found", False)
    match_confidence = match.get("match_confidence", 0.0)
    needs_review = "YES" if (not match_found or match_confidence < 0.8) else "NO"

    row = [
        raw.get("category_id", ""),
        raw.get("product_internal_id", ""),
        brand,
        product_name,
        product_sku,
        product_description,
        supplier_name,
        raw.get("product_page_url", ""),
        product_cost_price,
        product_compare_to_price,
        product_price,
        main_image,
        *gallery,
        needs_review
    ]

    with CSV_PATH.open("a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(row)
    logger.info(f"Appended row for {raw.get('product_internal_id')} (Review: {needs_review})")
    return needs_review

if __name__ == "__main__":
    print("Agent D module loaded.")
