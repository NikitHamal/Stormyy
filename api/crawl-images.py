from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from http.client import HTTPException

def scrape_image_urls(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Get page title/headline
        title = soup.title.string if soup.title else None
        headline = None
        
        # Try different common headline selectors
        headline_selectors = ['h1', '.headline', '.article-title', '.post-title']
        for selector in headline_selectors:
            headline_elem = soup.select_one(selector)
            if headline_elem:
                headline = headline_elem.get_text().strip()
                break
                
        # Get main content
        content = ''
        content_selectors = ['article', '.article-content', '.post-content', 'main', '#content']
        for selector in content_selectors:
            content_elem = soup.select_one(selector)
            if content_elem:
                # Remove script, style, and nav elements
                for elem in content_elem.find_all(['script', 'style', 'nav', 'header', 'footer']):
                    elem.decompose()
                content = ' '.join(content_elem.stripped_strings)
                break
        
        # If no content found through selectors, get all paragraphs
        if not content:
            paragraphs = soup.find_all('p')
            content = ' '.join(p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 100)
        
        # Get images
        images = soup.find_all('img')
        image_urls = []
        for img in images:
            src = img.get('src') or img.get('data-src')
            if src:
                absolute_url = urljoin(url, src)
                if absolute_url.startswith(('http://', 'https://')):
                    image_urls.append(absolute_url)

        return {
            'title': title,
            'headline': headline,
            'content': content[:1000] if content else None,  # Limit content length
            'images': image_urls
        }

    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return {
            'title': None,
            'headline': None,
            'content': None,
            'images': []
        }

async def handler(request):
    if request.method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type, Accept",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Content-Type": "application/json"
            },
            "body": ""
        }
    
    try:
        # Parse request body
        body = await request.json()
        urls = body.get('urls', [])

        if not urls:
            return {
                "statusCode": 400,
                "headers": {
                    "Access-Control-Allow-Origin": "*",
                    "Content-Type": "application/json"
                },
                "body": json.dumps({"error": "No URLs provided"})
            }

        # Process each URL
        results = []
        for url in urls:
            try:
                result = scrape_image_urls(url)
                results.append(result)
            except Exception as e:
                print(f"Error processing {url}: {e}")
                results.append({
                    'title': None,
                    'headline': None,
                    'content': None,
                    'images': []
                })

        # Combine all images and remove duplicates
        all_images = list(set([img for result in results for img in result['images']]))
        
        # Combine content from all sources
        sources_content = []
        for url, result in zip(urls, results):
            if result['title'] or result['headline'] or result['content']:
                sources_content.append({
                    'url': url,
                    'title': result['title'],
                    'headline': result['headline'],
                    'content': result['content']
                })

        # Take only first 12 unique images
        unique_images = list(dict.fromkeys(all_images))[:12]
        
        return {
            "statusCode": 200,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                'success': True,
                'images': unique_images,
                'sources_content': sources_content,
                'total_found': len(all_images),
                'total_returned': len(unique_images)
            })
        }

    except json.JSONDecodeError:
        return {
            "statusCode": 400,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({"error": "Invalid JSON in request body"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            },
            "body": json.dumps({
                "success": False,
                "error": str(e)
            })
        } 