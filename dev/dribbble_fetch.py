import urllib.request
import re

try:
    req = urllib.request.Request(
        "https://dribbble.com/shots/18841459-Learning-Platform-Dashboard",
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        match = re.search(r'<meta property="og:image"\s+content="([^"]+)"', html)
        if match:
            print(match.group(1))
        else:
            print("Image not found")
except Exception as e:
    print(f"Error: {e}")
