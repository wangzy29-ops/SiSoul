import asyncio
from app.services.web_service import web_search

async def main():
    pid = "169062213"
    # Search the title explicitly without "site:" limiter since aliyun might not support it
    query = "什么值得买 " + pid
    print(f"Searching: {query}")
    res = web_search(query)
    
    if res and "pageItems" in res:
        for item in res["pageItems"]:
            print(f"Found title: {item.get('title')} from URL: {item['link']}")

if __name__ == "__main__":
    asyncio.run(main())
