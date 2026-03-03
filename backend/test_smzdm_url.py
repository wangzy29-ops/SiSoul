import re

url = "https://www.smzdm.com/p/169062213/#hfeeds"
match = re.search(r'smzdm\.com/p/(\d+)', url)
print(match.group(1))
