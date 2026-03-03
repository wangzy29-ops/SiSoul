import asyncio
from playwright.async_api import async_playwright
import time

async def scrape_with_js(url):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # using a realistic user agent
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()
        try:
            await page.goto(url, wait_until="networkidle", timeout=15000)
            title = await page.title()
            content = await page.evaluate("() => document.body.innerText")
            return title, content
        except Exception as e:
            print(f"Error: {e}")
            return None, None
        finally:
            await browser.close()

async def main():
    url = "https://www.smzdm.com/p/169062213/"
    print(f"Scraping with Playwright: {url}")
    title, content = await scrape_with_js(url)
    print(f"Title: {title}")
    if content:
        print(f"Content snippet: {content[:200]}...")

if __name__ == "__main__":
    asyncio.run(main())
