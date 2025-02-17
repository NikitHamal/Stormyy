from flask import Flask, request, jsonify
from flask_cors import CORS
from crawl import scrape_image_urls
import asyncio
import aiohttp
from urllib.parse import urlparse
from typing import List, Dict
import concurrent.futures
import threading

app = Flask(__name__)
CORS(app)

# Thread pool for parallel processing
thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4)
# Semaphore for limiting concurrent requests
request_semaphore = threading.Semaphore(4)

def validate_url(url: str) -> bool:
    """Validate URL format and allowed schemes."""
    try:
        result = urlparse(url)
        return all([result.scheme in ['http', 'https'], result.netloc])
    except Exception:
        return False

async def fetch_images_with_timeout(url: str, comprehensive: bool = False, timeout: int = 30) -> Dict[str, List[dict]]:
    """Fetch images with timeout and semaphore control."""
    try:
        with request_semaphore:
            result = await asyncio.wait_for(
                asyncio.to_thread(scrape_image_urls, url, comprehensive),
                timeout=timeout
            )
            # Convert ImageInfo objects to dictionaries for JSON serialization
            return {
                'relevant': [vars(img) for img in result['relevant']],
                'all': [vars(img) for img in result['all']] if comprehensive else []
            }
    except asyncio.TimeoutError:
        print(f"Timeout while fetching images from {url}")
        return {'relevant': [], 'all': []}
    except Exception as e:
        print(f"Error fetching images from {url}: {e}")
        return {'relevant': [], 'all': []}

async def crawl_multiple_sites(urls: List[str], comprehensive: bool = False) -> dict:
    """Crawl multiple sites with improved error handling and statistics."""
    valid_urls = [url for url in urls if validate_url(url)]
    if not valid_urls:
        return {
            'success': False,
            'error': 'No valid URLs provided',
            'statistics': {'total_urls': len(urls), 'valid_urls': 0}
        }

    tasks = [fetch_images_with_timeout(url, comprehensive) for url in valid_urls]
    results = await asyncio.gather(*tasks)

    # Process results
    all_relevant_images = []
    all_comprehensive_images = []
    url_statistics = {}
    
    for url, result in zip(valid_urls, results):
        relevant_images = result['relevant']
        all_images = result['all']
        url_statistics[url] = {
            'relevant_count': len(relevant_images),
            'total_count': len(all_images) if comprehensive else len(relevant_images)
        }
        all_relevant_images.extend(relevant_images)
        if comprehensive:
            all_comprehensive_images.extend(all_images)

    # Remove duplicates while preserving order
    unique_relevant = list({img['url']: img for img in all_relevant_images}.values())
    unique_all = list({img['url']: img for img in all_comprehensive_images}.values()) if comprehensive else []

    return {
        'success': True,
        'relevant_images': unique_relevant[:12] if not comprehensive else unique_relevant,
        'all_images': unique_all if comprehensive else [],
        'statistics': {
            'total_urls': len(urls),
            'valid_urls': len(valid_urls),
            'total_relevant': len(unique_relevant),
            'total_all': len(unique_all) if comprehensive else 0,
            'per_url_stats': url_statistics
        }
    }

@app.route('/crawl-images', methods=['POST'])
def crawl_images():
    try:
        data = request.get_json()
        urls = data.get('urls', [])
        comprehensive = data.get('comprehensive', False)
        
        if not urls:
            return jsonify({
                'success': False,
                'error': 'No URLs provided'
            }), 400

        # Run the async crawling
        result = asyncio.run(crawl_multiple_sites(urls, comprehensive))
        return jsonify(result)

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'statistics': {'error_type': e.__class__.__name__}
        }), 500

if __name__ == '__main__':
    app.run(port=5000, threaded=True)