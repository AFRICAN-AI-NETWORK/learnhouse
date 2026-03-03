"""List available Gemini models."""
import os

import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ.get("LEARNHOUSE_GEMINI_API_KEY"))

for m in genai.list_models():
    methods = m.supported_generation_methods
    if "generateContent" in methods:
        print(f"  {m.name}")
