"""List available Gemini models."""
import os
from dotenv import load_dotenv
load_dotenv()

import google.generativeai as genai
genai.configure(api_key=os.environ.get("LEARNHOUSE_GEMINI_API_KEY"))

for m in genai.list_models():
    methods = m.supported_generation_methods
    if "generateContent" in methods:
        print(f"  {m.name}")
