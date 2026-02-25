import json
import logging
import os
import httpx
from bs4 import BeautifulSoup
import re
from scraper import extract_product_detail
from agent_b import AgentB
from agent_c import AgentC
from agent_d import append_product_row

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_targeted_urls(listing_url, limit=3):
    logger.info(f"Fetching listing: {listing_url}")
    response = httpx.get(listing_url, timeout=15)
    soup = BeautifulSoup(response.text, 'html.parser')
    info_pattern = re.compile(r'productinfoen_\d+\.html\?path=0_\d+')
    urls = []
    for a in soup.find_all('a', href=True):
        if info_pattern.search(a['href']):
            full_url = str(httpx.URL(listing_url).join(a['href']))
            urls.append(full_url)
            if len(urls) >= limit:
                break
    return urls

def run_pipeline(listing_url, limit=3):
    logger.info(f"Starting pipeline for {limit} items from {listing_url}...")
    
    product_urls = get_targeted_urls(listing_url, limit)
    
    agent_b = AgentB()
    agent_c = AgentC()
    
    for i, url in enumerate(product_urls):
        logger.info(f"--- Processing Product {i+1}/{len(product_urls)}: {url} ---")
        
        # Agent A: Scrape
        raw_record = extract_product_detail(url)
        if not raw_record:
            continue
        raw_json = raw_record.to_json()
        
        # Agent B: Inference
        raw_json["product_internal_id"] = raw_json.get("internal_id")
        inference_record = agent_b.process_product(raw_json)
        
        # Agent C Search & Match
        # I will perform the search using the first query from Agent B
        search_queries = inference_record.get("search_queries", [])
        search_results = []
        if search_queries:
            query = search_queries[0]
            logger.info(f"Searching for: {query}")
            # This is where I'd call search_web, but in this script I'll pass it 
            # as a placeholder and explain to the user I'm doing the search 
            # in the background or use a helper that simulates it.
            # ACTUALLY, I can't call search_web from within the python script.
            # I will save the checkpoint and handle the search loop in task.
            
        checkpoint = {
            "raw": raw_json,
            "inference": inference_record
        }
        
        checkpoint_file = f"checkpoint_{raw_json['product_internal_id']}.json"
        with open(checkpoint_file, "w") as f:
            json.dump(checkpoint, f, indent=2)
            
        logger.info(f"Saved checkpoint for Agent C: {checkpoint_file}")

if __name__ == "__main__":
    # Targeted Marc Jacobs listing
    target_listing = "https://bags.qiqiyg.com/producten_44188_0.html?path=0_37771_44188"
    run_pipeline(target_listing, limit=3)
