import httpx
from bs4 import BeautifulSoup
import re
import logging
import json
import argparse
from typing import List, Optional
from models import RawProductRecord
from discover import fetch_soup

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_product_detail(url: str) -> Optional[RawProductRecord]:
    """
    Extracts product information from a product info page.
    """
    logger.info(f"Scraping product detail: {url}")
    soup = fetch_soup(url)
    if not soup:
        return None

    # Extract ID, Name, Describe from labels
    internal_id = None
    title = None
    description = None
    
    # The site uses a very old table-based layout. 
    # Label: Value pairs are often in adjacent cells or following siblings.
    
    id_match = soup.find(string=re.compile(r'ID[：:]'))
    if id_match:
        # Often: <td>ID：</td> <td>655730</td> or similar
        parent = id_match.parent
        next_tag = parent.find_next(['td', 'span', 'div'])
        if next_tag:
            internal_id = next_tag.get_text(strip=True)
    
    name_match = soup.find(string=re.compile(r'Name[：:]'))
    if name_match:
        parent = name_match.parent
        next_tag = parent.find_next(['td', 'span', 'div'])
        if next_tag:
            title = next_tag.get_text(strip=True)

    describe_match = soup.find(string=re.compile(r'Describe[：:]'))
    if describe_match:
        parent = describe_match.parent
        next_tag = parent.find_next(['td', 'span', 'div', 'p'])
        if next_tag:
            description = next_tag.get_text(strip=True)

    # Extract all large images (the main value)
    image_urls = []
    
    # Detail images are often in a specific section or just large images in the body
    # Looking for images in div with ID containing 'Img' or just any large image
    
    # Based on my research, they are often in 'Detail Images' area
    detail_section = soup.find(string=re.compile(r'Detail Images', re.I))
    if detail_section:
        container = detail_section.find_parent('table') or detail_section.find_parent('div')
        if container:
            for img in container.find_all('img'):
                src = img.get('src')
                if src:
                    full_src = str(httpx.URL(url).join(src))
                    image_urls.append(full_src)
    
    # Fallback: capture any reasonably sized image if image_urls is empty
    if not image_urls:
         for img in soup.find_all('img'):
            src = img.get('src')
            if src and 'upfile' in src: # 'upfile' is common in their product paths
                full_src = str(httpx.URL(url).join(src))
                image_urls.append(full_src)

    # Deduplicate images
    image_urls = sorted(list(set(image_urls)))

    # Parse category_id from URL path param
    # Example: path=0_37771_44188 -> 37771 or 44188
    category_id = None
    path_match = re.search(r'path=[\d_]+_(\d+)', url)
    if path_match:
        category_id = path_match.group(1)

    return RawProductRecord(
        product_url=url,
        category_id=category_id,
        internal_id=internal_id,
        title=title,
        description=description,
        image_urls=image_urls
    )

def main():
    parser = argparse.ArgumentParser(description="QiQiYG Product Scraper")
    parser.add_argument("url", nargs="?", help="Product info URL to scrape")
    parser.add_argument("--discover", action="store_true", help="Run discovery first")
    parser.add_argument("--limit", type=int, default=5, help="Limit number of products to scrape")
    parser.add_argument("--agent-b", action="store_true", help="Process results through Agent B")
    args = parser.parse_args()

    if args.url:
        record = extract_product_detail(args.url)
        if record:
            if args.agent_b:
                from agent_b import AgentB
                agent = AgentB()
                result = agent.process_product(record.to_json())
                print(json.dumps(result, indent=2))
            else:
                print(json.dumps(record.to_json(), indent=2))
    elif args.discover:
        from discover import discover_product_urls
        urls = discover_product_urls(limit_categories=1)
        
        results = []
        agent = None
        if args.agent_b:
            from agent_b import AgentB
            agent = AgentB()

        for i, url in enumerate(urls):
            if i >= args.limit:
                break
            record = extract_product_detail(url)
            if record:
                if agent:
                    agent_result = agent.process_product(record.to_json())
                    results.append(agent_result)
                else:
                    results.append(record.to_json())
        
        output_file = "products_results.json"
        with open(output_file, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Processed {len(results)} products. Saved to {output_file}")
    else:
        # Default smoke test
        test_url = "https://bags.qiqiyg.com/productinfoen_655730.html?path=0_37771_44188"
        record = extract_product_detail(test_url)
        if record:
            print(json.dumps(record.to_json(), indent=2))

if __name__ == "__main__":
    main()
