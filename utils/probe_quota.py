import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

def probe_models():
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    # Priority list based on likelihood of having higher free tier quota
    models_to_probe = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
        "gemini-flash-latest",
        "gemini-pro-latest"
    ]
    
    print("Probing models for quota...")
    for model_id in models_to_probe:
        try:
            print(f"Testing {model_id}...", end=" ", flush=True)
            response = client.models.generate_content(
                model=model_id,
                contents="Write 'OK' if you can read this."
            )
            print(f"SUCCESS: {response.text.strip()}")
        except Exception as e:
            if "429" in str(e):
                print("FAILED: Quota Exhausted (429)")
            elif "404" in str(e):
                print("FAILED: Not Found (404)")
            else:
                print(f"FAILED: {e}")

if __name__ == "__main__":
    probe_models()
