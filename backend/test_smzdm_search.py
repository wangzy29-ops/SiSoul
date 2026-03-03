import asyncio
from app.services.web_service import web_search
import re

async def main():
    url = "https://www.smzdm.com/p/169062213/"
    
    # Extract product ID if it's a smzdm url
    pid_match = re.search(r'smzdm\.com/p/(\d+)', url)
    if pid_match:
        pid = pid_match.group(1)
        # Search for the specific product ID on smzdm using site operator
        query = f"site:smzdm.com/p/{pid}"
        print(f"Searching: {query}")
        res = web_search(query)
        print(res)

if __name__ == "__main__":
    asyncio.run(main())
