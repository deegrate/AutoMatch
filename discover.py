import httpx
from bs4 import BeautifulSoup
import re
import logging
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BASE_URL = "https://bags.qiqiyg.com/"

import asyncio
from playwright.async_api import async_playwright

async def fetch_soup_browser(url: str) -> BeautifulSoup:
    """
    Fallback browser fetch with strictly 15s timeout and specific wait logic.
    """
    logger.info(f"Fallback: Fetching {url} via Playwright")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        try:
            # User requirement: 15s timeout
            await page.goto(url, wait_until="domcontentloaded", timeout=15000)
            
            # User requirement: Wait for product container (e.g. any image or product link)
            try:
                await page.wait_for_selector("img", timeout=15000)
            except:
                pass 
                
            content = await page.content()
            return BeautifulSoup(content, 'html.parser')
        except Exception as e:
            logger.error(f"Browser fetch failed for {url}: {e}")
            return None
        finally:
            await browser.close()

def fetch_soup(url: str, use_browser: bool = False) -> BeautifulSoup:
    if use_browser:
        return asyncio.run(fetch_soup_browser(url))
        
    try:
        with httpx.Client(timeout=15.0, follow_redirects=True) as client:
            response = client.get(url)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
        return None

def discover_product_urls(limit_categories: int = None, start_category_url: str = None) -> List[str]:
    """
    Orchestrates discovery: Home -> Category -> Product List -> Product Info URLs.
    """
    if start_category_url:
        category_links = [start_category_url]
    else:
        logger.info(f"Starting discovery from {BASE_URL}")
        soup = fetch_soup(BASE_URL)
        if not soup:
            return []

        # 1. Discover Categories
        category_pattern = re.compile(r'categoryen_\d+\.html\?path=0_\d+')
        category_links = []
        for a in soup.find_all('a', href=True):
            if category_pattern.search(a['href']):
                full_url = str(httpx.URL(BASE_URL).join(a['href']))
                category_links.append(full_url)
        
        category_links = sorted(list(set(category_links)))
        if limit_categories:
            category_links = category_links[:limit_categories]
    
    logger.info(f"Using {len(category_links)} category seeds.")

    product_info_urls = []
    visited_urls = set()

    def explore_page(url: str, depth: int = 0):
        if depth > 3 or url in visited_urls:
            return
        visited_urls.add(url)
        
        logger.info(f"Exploring: {url} (Depth {depth})")
        soup = fetch_soup(url)
        
        # Check if we found anything. If not, try browser fallback for depth 0 or 1
        if soup:
             info_links = soup.find_all('a', href=re.compile(r'productinfoen_'))
             sub_links = soup.find_all('a', href=re.compile(r'(categoryen|producten)_\d+.*path=0_'))
             
             if not info_links and not sub_links and depth < 2:
                 logger.info(f"No links found via httpx for {url}, retrying with browser...")
                 soup = fetch_soup(url, use_browser=True)
        else:
            logger.info(f"Failed to fetch {url} via httpx, retrying with browser...")
            soup = fetch_soup(url, use_browser=True)
            
        if not soup:
            return
        
        # Look for product info links (the goal)
        info_links = soup.find_all('a', href=re.compile(r'productinfoen_'))
        if info_links:
            for a in info_links:
                full_url = str(httpx.URL(url).join(a['href']))
                product_info_urls.append(full_url)
        
        # Look for more listing/category links to dive deeper
        sub_links = soup.find_all('a', href=re.compile(r'(categoryen|producten)_\d+.*path=0_'))
        for a in sub_links:
            full_url = str(httpx.URL(url).join(a['href']))
            explore_page(full_url, depth + 1)

    for cat_url in category_links:
        explore_page(cat_url)
    
    unique_product_urls = sorted(list(set(product_info_urls)))
    logger.info(f"Total product info URLs discovered: {len(unique_product_urls)}")
    return unique_product_urls

if __name__ == "__main__":
    # Test with a known active category
    urls = discover_product_urls(start_category_url="https://bags.qiqiyg.com/categoryen_37771.html?path=0_37771")
    for url in urls[:10]:
        print(url)
