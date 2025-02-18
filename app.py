from flask import Flask, request, jsonify
from flask_cors import CORS
from crawl import scrape_image_urls
import asyncio
import aiohttp

app = Flask(__name__)
CORS(app, resources={r"/crawl-images": {"origins": "*"}})

async def fetch_images(session, url):
    try:
        result = await asyncio.create_task(
            asyncio.to_thread(scrape_image_urls, url)
        )
        return result
    except Exception as e:
        print(f"Error fetching content from {url}: {e}")
        return {
            'title': None,
            'headline': None,
            'content': None,
            'images': []
        }

async def crawl_multiple_sites(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [fetch_images(session, url) for url in urls]
        results = await asyncio.gather(*tasks)
        
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
        
        return {
            'images': all_images,
            'sources_content': sources_content
        }

@app.route('/crawl-images', methods=['POST'])
def crawl_images():
    try:
        data = request.get_json()
        urls = data.get('urls', [])

        print(f"Received request to crawl URLs: {urls}")  # Debug log

        if not urls:
            return jsonify({'error': 'No URLs provided'}), 400

        # Run the async crawling
        results = asyncio.run(crawl_multiple_sites(urls))
        images = results['images']
        sources_content = results['sources_content']
        
        print(f"Found total of {len(images)} images")  # Debug log
        
        # Take only first 12 unique images
        unique_images = list(dict.fromkeys(images))[:12]
        
        return jsonify({
            'success': True,
            'images': unique_images,
            'sources_content': sources_content,
            'total_found': len(images),
            'total_returned': len(unique_images)
        })

    except Exception as e:
        print(f"Error in crawl_images endpoint: {e}")  # Debug log
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(port=5000) 