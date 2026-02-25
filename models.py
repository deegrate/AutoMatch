from dataclasses import dataclass, field, asdict
from typing import List, Optional
from datetime import datetime

@dataclass
class RawProductRecord:
    product_url: str
    category_id: Optional[str] = None
    internal_id: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[str] = None
    image_urls: List[str] = field(default_factory=list)
    scraped_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_json(self):
        return asdict(self)

@dataclass
class OfficialMatchResult:
    product_internal_id: str
    match_found: bool
    match_confidence: float
    official_page_url: Optional[str] = None
    official_brand: Optional[str] = None
    official_product_name: Optional[str] = None
    official_sku: Optional[str] = None
    official_price: Optional[str] = None
    official_currency: Optional[str] = None
    official_main_image_url: Optional[str] = None
    notes: str = ""

    def to_json(self):
        return asdict(self)
