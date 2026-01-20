import os
import google.genai as genai
from dotenv import load_dotenv

load_dotenv()

def find_working_model():
    api_key = os.environ.get("GEMINI_API_KEY")
    client = genai.Client(api_key=api_key)
    print("Testing models...")
    try:
        models = list(client.models.list())
        for model in models:
            m_id = model.name.replace("models/", "")
            try:
                # Try a very simple call
                client.models.generate_content(
                    model=m_id,
                    contents="hi"
                )
                print(f"SUCCESS: {m_id}")
                return m_id
            except Exception as e:
                # If it's a 429 (quota), it's technically "working" (found)
                if "429" in str(e) or "QUOTA" in str(e).upper():
                    print(f"QUOTA LIMIT (but found): {m_id}")
                    return m_id
                print(f"FAILED: {m_id} - {str(e)[:100]}")
    except Exception as e:
        print(f"Error listing: {e}")
    return None

if __name__ == "__main__":
    find_working_model()
