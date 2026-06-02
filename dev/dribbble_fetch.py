import re
import requests

try:
    response = requests.get(
        "https://dribbble.com/shots/18841459-Learning-Platform-Dashboard",
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        timeout=30,
    )
    response.raise_for_status()
    match = re.search(r'<meta property="og:image"\s+content="([^"]+)"', response.text)
    if match:
        print(match.group(1))
    else:
        print("Image not found")
except Exception as e:
    print(f"Error: {e}")
