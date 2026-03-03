import subprocess
import re

url = "https://www.smzdm.com/p/169062213/"
# Use a curl with typical browser headers to see if it bypasses
cmd = [
    "curl", "-s",
    "-A", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "-H", "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "-H", "Accept-Language: zh-CN,zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2",
    "-H", "Connection: keep-alive",
    "-H", "Upgrade-Insecure-Requests: 1",
    url
]
result = subprocess.run(cmd, capture_output=True, text=True)
html = result.stdout
print(f"Length: {len(html)}")
title_match = re.search(r'<title>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
if title_match:
    print(f"Title: {title_match.group(1)}")
else:
    print("probe returned:", html[:200])
