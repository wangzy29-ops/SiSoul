import asyncio
from app.services.web_service import scrape_page, web_search
import re

async def main():
    url = "https://www.smzdm.com/p/169062213/"
    # Try searching for the URL directly on smzdm
    query = f"{url}"
    print(f"Searching: {query}")
    res = web_search(query)
    
    # Try parsing title from the best match
    title = ""
    if res and "pageItems" in res:
        for item in res["pageItems"]:
            if str(item.get("link", "")).startswith("https://www.smzdm.com/p/"):
                title = item.get("title", "")
                print(f"Found title: {title} from URL: {item['link']}")
                break
if __name__ == "__main__":
    asyncio.run(main())
