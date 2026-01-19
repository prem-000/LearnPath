import os
import google.genai as genai
from google.genai import types
from pydantic import BaseModel

class GeminiConnector:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if not self.api_key:
            print("Warning: GEMINI_API_KEY not found in environment variables.")
        if self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                print(f"Failed to initialize Gemini Client: {e}")
                self.client = None
        else:
            self.client = None

    def enrich_path(self, domain, goal, current_nodes):
        if not self.api_key:
           return ["Ensure API Key is set"]

        prompt = f"""
        Domain: {domain}
        User Goal: {goal}
        Current Topics: {', '.join([n['id'] for n in current_nodes])}
        
        Suggest 3-5 additional, relevant subtopics or niche libraries that would complement this learning path.
        Return ONLY a JSON array of strings. Example: ["advanced_topic_1", "niche_library_2"]
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-flash-latest",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            text = response.text
            # Clean possible markdown blocks
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            result = json.loads(text)
            if not isinstance(result, list):
                if result is None:
                    return ["No suggestions available (Null response)"]
                return [str(result)]
            return result
        except Exception as e:
            print(f"Gemini Error: {e}")
            return [f"Error: {str(e)}"]
