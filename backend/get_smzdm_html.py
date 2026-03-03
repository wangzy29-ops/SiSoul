import asyncio
import httpx

async def main():
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": "https://m.smzdm.com/"
    }
    url = "https://m.smzdm.com/p/169062213/"
    async with httpx.AsyncClient(timeout=20, headers=headers, follow_redirects=True) as client:
        resp = await client.get(url)
        print(resp.text[:500])
        print("Length:", len(resp.text))
        
if __name__ == "__main__":
    asyncio.run(main())
