import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

def test_model(model_id):
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    try:
        response = client.models.generate_content(
            model=model_id,
            contents="test"
        )
        print(f"SUCCESS: {model_id}")
        return True
    except Exception as e:
        print(f"FAILED: {model_id} - {e}")
        return False

if __name__ == "__main__":
    models_to_try = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp"
    ]
    for mid in models_to_try:
        if test_model(mid):
            break
