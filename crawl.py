import requests
from bs4 import BeautifulSoup, Tag
from urllib.parse import urljoin, urlparse
from PIL import Image
import io
import re
from dataclasses import dataclass
from typing import List, Set, Dict, Optional, Tuple
import time
from functools import lru_cache
import random

# Cache of recently crawled URLs
URL_CACHE = {}
CACHE_DURATION = 300  # 5 minutes

# Rate limiting settings
MIN_REQUEST_INTERVAL = 1.0  # seconds
last_request_time = 0

USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
]

@dataclass
class ImageInfo:
    url: str
    alt_text: str = ""
    title: str = ""
    width: int = 0
    height: int = 0
    dom_depth: int = 0
    context_score: float = 0.0
    is_hero: bool = False
    file_size: int = 0

def is_valid_image_url(url: str) -> bool:
    """Validate image URL and extension."""
    valid_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp'}
    parsed = urlparse(url)
    return (
        parsed.scheme in {'http', 'https'} and
        any(parsed.path.lower().endswith(ext) for ext in valid_extensions)
    )

def rate_limit_request():
    """Implement rate limiting between requests."""
    global last_request_time
    current_time = time.time()
    time_since_last_request = current_time - last_request_time
    if time_since_last_request < MIN_REQUEST_INTERVAL:
        time.sleep(MIN_REQUEST_INTERVAL - time_since_last_request)
    last_request_time = time.time()

@lru_cache(maxsize=100)
def get_cached_results(url: str) -> List[str]:
    """Get cached results if they exist and are fresh."""
    if url in URL_CACHE:
        timestamp, results = URL_CACHE[url]
        if time.time() - timestamp < CACHE_DURATION:
            return results
        del URL_CACHE[url]
    return None

def get_image_dimensions(image_url: str, session: requests.Session) -> Tuple[int, int]:
    """Get image dimensions without downloading entire file."""
    try:
        response = session.get(image_url, stream=True)
        image = Image.open(io.BytesIO(response.content))
        return image.size
    except:
        return (0, 0)

def calculate_context_score(element: Tag) -> float:
    """Calculate relevancy score based on surrounding text."""
    score = 0.0
    
    # Check parent elements for relevant sections
    for parent in element.parents:
        if parent.get('id', '').lower() in ['main', 'content', 'article']:
            score += 2.0
        if parent.name in ['article', 'main', 'figure']:
            score += 1.0
    
    # Check for hero image indicators
    if element.get('id', '').lower() in ['hero', 'banner', 'header-image']:
        score += 3.0
    
    # Score based on image attributes
    alt_text = element.get('alt', '')
    if alt_text and len(alt_text) > 10:
        score += 1.0
    
    return score

def advanced_scrape_images(url: str, comprehensive: bool = False) -> Dict[str, List[ImageInfo]]:
    """
    Advanced image scraper with relevancy scoring and comprehensive mode.
    Returns both relevant and all images.
    """
    try:
        cached_results = get_cached_results(url)
        if cached_results:
            return cached_results

        print(f"Advanced scraping of {url}")
        rate_limit_request()
        
        headers = {'User-Agent': random.choice(USER_AGENTS)}
        with requests.Session() as session:
            session.headers.update(headers)
            response = session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            all_images: List[ImageInfo] = []
            
            # Process standard img tags
            for img in soup.find_all('img'):
                for attr in ['src', 'data-src', 'data-original', 'data-lazy-src']:
                    src = img.get(attr)
                    if src:
                        absolute_url = urljoin(url, src)
                        if is_valid_image_url(absolute_url):
                            width, height = get_image_dimensions(absolute_url, session)
                            
                            image_info = ImageInfo(
                                url=absolute_url,
                                alt_text=img.get('alt', ''),
                                title=img.get('title', ''),
                                width=width,
                                height=height,
                                dom_depth=len(list(img.parents)),
                                context_score=calculate_context_score(img),
                                is_hero='hero' in str(img.get('class', '')).lower()
                            )
                            all_images.append(image_info)

            # Process background images if in comprehensive mode
            if comprehensive:
                for elem in soup.find_all(style=True):
                    style = elem['style']
                    urls = re.findall(r'url\(["\']?(.*?)["\']?\)', style)
                    for src in urls:
                        absolute_url = urljoin(url, src)
                        if is_valid_image_url(absolute_url):
                            width, height = get_image_dimensions(absolute_url, session)
                            
                            image_info = ImageInfo(
                                url=absolute_url,
                                width=width,
                                height=height,
                                dom_depth=len(list(elem.parents)),
                                context_score=calculate_context_score(elem)
                            )
                            all_images.append(image_info)

            # Sort images by relevancy score
            sorted_images = sorted(
                all_images,
                key=lambda x: (
                    x.is_hero,
                    x.context_score,
                    x.width * x.height if x.width and x.height else 0,
                    -x.dom_depth
                ),
                reverse=True
            )

            # Split into relevant and all images
            relevant_images = [img for img in sorted_images if img.context_score > 1.0]
            
            result = {
                'relevant': relevant_images[:12] if not comprehensive else relevant_images,
                'all': sorted_images
            }
            
            # Cache the results
            URL_CACHE[url] = (time.time(), result)
            
            print(f"Found {len(relevant_images)} relevant and {len(sorted_images)} total images")
            return result

    except Exception as e:
        print(f"Error in advanced scraping of {url}: {str(e)}")
        return {'relevant': [], 'all': []}

# Keep the original scrape_image_urls for backward compatibility
def scrape_image_urls(url: str) -> List[str]:
    """Legacy wrapper for compatibility."""
    result = advanced_scrape_images(url)
    return [img.url for img in result['relevant']]

if __name__ == "__main__":
    url = input("Enter the URL: ").strip()
    
    if not url.startswith(("http://", "https://")):
        print("Invalid URL! Make sure it starts with 'http://' or 'https://'.")
    else:
        image_urls = scrape_image_urls(url)

        if image_urls:
            print("\nExtracted Image URLs:")
            for img_url in image_urls:
                print(img_url)
        else:
            print("No images found or failed to retrieve the page.")
