import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def scrape_image_urls(url):
    try:
        print(f"Attempting to scrape images from: {url}")  # Debug log
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        print(f"Successfully fetched {url}")  # Debug log
        
        soup = BeautifulSoup(response.text, 'html.parser')
        images = soup.find_all('img')

        image_urls = []
        for img in images:
            # Check for both src and data-src attributes
            src = img.get('src') or img.get('data-src')
            if src:
                absolute_url = urljoin(url, src)
                # Only include http(s) URLs
                if absolute_url.startswith(('http://', 'https://')):
                    image_urls.append(absolute_url)

        print(f"Found {len(image_urls)} images from {url}")  # Debug log
        return image_urls

    except requests.exceptions.MissingSchema:
        print(f"Error: Invalid URL format for {url}. Please include 'http://' or 'https://'.")
    except requests.exceptions.RequestException as e:
        print(f"Error fetching {url}: {e}")
    except Exception as e:
        print(f"Unexpected error while scraping {url}: {e}")
    
    return []

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
