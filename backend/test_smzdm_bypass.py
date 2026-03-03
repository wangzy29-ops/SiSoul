import asyncio
import httpx
import re

async def main():
    url = "https://www.smzdm.com/p/169062213/#hfeeds"
    # To bypass basic smzdm check, trying m.smzdm.com with googlebot UA
    bot_headers = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept-Language": "zh-CN,zh;q=0.9",
    }
    async with httpx.AsyncClient(timeout=20, headers=bot_headers, follow_redirects=True) as client:
        resp = await client.get(url)
        html = resp.text
        print(f"Length with Googlebot UA: {len(html)}")
        title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if title_match:
            print(f"Title: {title_match.group(1).strip()}")
        else:
            print("probe returned:", html[:200])

if __name__ == "__main__":
    asyncio.run(main())
