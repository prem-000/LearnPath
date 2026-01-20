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

    def generate_full_path(self, topic, level):
        if not self.api_key or not self.client:
           return {"error": "Ensure API Key is set"}

        prompt = f"""
        Act as an expert educational architect. Generate a comprehensive, hierarchical learning path for the topic: "{topic}" at a {level} level.
        
        The structure MUST follow this JSON format exactly:
        {{
            "title": "Main Topic Title",
            "description": "Short overview",
            "modules": [
                {{
                    "id": "module_1",
                    "title": "Module Title",
                    "description": "What this module covers",
                    "tasks": ["Task 1", "Task 2"],
                    "subtopics": [
                        {{
                            "id": "sub_1",
                            "title": "Subtopic Title",
                            "description": "Detailed explanation of subtopic",
                            "prerequisites": []
                        }}
                    ]
                }}
            ]
        }}

        Constraints:
        1. Ensure logical progression from foundational to advanced.
        2. Provide 4-6 primary modules.
        3. Each module should have 2-4 subtopics.
        4. Descriptions should be engaging and educational.
        5. Return ONLY valid JSON.
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini Error in generate_full_path: {e}")
            return {"error": str(e)}

    def enrich_path(self, domain, goal, current_nodes):
        # Keeping this for legacy support or specific enrichment if needed
        if not self.api_key or not self.client:
           return ["Ensure API Key is set"]

        prompt = f"""
        Domain: {domain}
        User Goal: {goal}
        Current Topics: {', '.join([n['id'] if isinstance(n, dict) and 'id' in n else str(n) for n in current_nodes])}
        
        Suggest 3-5 additional, relevant subtopics or niche libraries that would complement this learning path.
        Return ONLY a JSON array of strings.
        """
        
        try:
            response = self.client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini Error: {e}")
            return [f"Error: {str(e)}"]
