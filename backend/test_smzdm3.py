import asyncio
from app.services.web_service import web_search

async def main():
    url = "https://www.smzdm.com/p/169062213/"
    # Try searching for a specific product item by its ID directly without URL
    query = "什么值得买 169062213"
    print(f"Searching: {query}")
    res = web_search(query)
    
    if res and "pageItems" in res:
        for item in res["pageItems"]:
            print(f"Found title: {item.get('title')} from URL: {item['link']}")

if __name__ == "__main__":
    asyncio.run(main())
