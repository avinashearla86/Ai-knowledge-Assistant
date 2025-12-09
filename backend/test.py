import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Testing Gemini API...")
print(f"API Key (first 10 chars): {os.getenv('GEMINI_API_KEY')[:10]}...")

# List available models
print("\nAvailable models:")
for model in genai.list_models():
    if 'generateContent' in model.supported_generation_methods:
        print(f"  - {model.name}")

# Test with a simple prompt
model_names = ['gemini-1.5-flash', 'gemini-pro', 'models/gemini-1.5-flash']

for model_name in model_names:
    try:
        print(f"\nTrying {model_name}...")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content("Say hello!")
        print(f"✅ SUCCESS with {model_name}: {response.text}")
        break
    except Exception as e:
        print(f"❌ FAILED with {model_name}: {str(e)}")