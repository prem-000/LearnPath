import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_ai_enrichment():
    print("\n--- Testing Live AI Enrichment ---")
    payload = {
        "text": "I want to master machine learning",
        "level": "intermediate"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/generate_path", json=payload)
        response.raise_for_status()
        data = response.json()
        
        domain = data.get("domain")
        suggestions = data.get("ai_suggestions", [])
        
        print(f"Domain Detected: {domain}")
        print(f"AI Suggestions Received: {len(suggestions)}")
        
        if not suggestions:
            print("FAILED: No suggestions received.")
            sys.exit(1)
            
        print("Suggestions:")
        for s in suggestions:
            print(f"- {s}")
            
        # Basic validation that it's not a dummy error list
        if len(suggestions) == 1 and "Error" in suggestions[0]:
            print("FAILED: API returned error message.")
            sys.exit(1)
            
        print("SUCCESS: Live AI data received.")
        
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_ai_enrichment()
