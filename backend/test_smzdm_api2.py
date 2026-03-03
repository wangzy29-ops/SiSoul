import asyncio
import httpx
import json

async def main():
    pid = "169062213"
    # Try smzdm API for article details if it exists
    url = f"https://api.smzdm.com/v1/detail?article_id={pid}"
    headers = {
        "User-Agent": "smzdm_android_V10.7.3 rv:907 (Redmi Note 8 Pro;Android11;zh)smzdmapp",
    }
    async with httpx.AsyncClient(timeout=20, headers=headers) as client:
        resp = await client.get(url)
        print("API Status:", resp.status_code)
        if resp.status_code == 200:
            try:
                data = resp.json()
                print("Title:", data.get('data', {}).get('article_title'))
                print("Price:", data.get('data', {}).get('article_price'))
            except Exception as e:
                print("JSON error:", e)
                print(resp.text[:200])

if __name__ == "__main__":
    asyncio.run(main())
