import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def scrape_image_urls(url):
    try:
        print(f"Attempting to scrape content from: {url}")  # Debug log
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        print(f"Successfully fetched {url}")  # Debug log
        
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

        print(f"Found {len(image_urls)} images from {url}")  # Debug log
        
        return {
            'title': title,
            'headline': headline,
            'content': content[:1000] if content else None,  # Limit content length
            'images': image_urls
        }

    except requests.exceptions.MissingSchema:
        print(f"Error: Invalid URL format for {url}. Please include 'http://' or 'https://'.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
    except Exception as e:
        print(f"Unexpected error while scraping {url}: {e}")
    
    return {
        'title': None,
        'headline': None,
        'content': None,
        'images': []
    }

if __name__ == "__main__":
    url = input("Enter the URL: ").strip()
    
    if not url.startswith(("http://", "https://")):
        print("Invalid URL! Make sure it starts with 'http://' or 'https://'.")
    else:
        image_urls = scrape_image_urls(url)

        if image_urls['images']:
            print("\nExtracted Image URLs:")
            for img_url in image_urls['images']:
                print(img_url)
        else:
            print("No images found or failed to retrieve the page.")
