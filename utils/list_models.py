import os
import google.genai as genai

api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    # Use the one provided by user if env not set in this context
    # But uvicorn has it. I need it here.
    # Hardcoding temporarily for the test script or assume passed via env
    pass

client = genai.Client(api_key=api_key)

try:
    print("Listing models...")
    # The new SDK might have different list syntax:
    # client.models.list()
    for m in client.models.list():
        print(f"- {m.name}")
except Exception as e:
    print(f"Error listing models: {e}")
