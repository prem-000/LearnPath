import os
import google.genai as genai
from google.genai import types
from pydantic import BaseModel
from .mock_connector import MockConnector

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
        
        self.mock = MockConnector()
        self.use_mock = os.environ.get("MOCK_AI", "false").lower() == "true"

    def process_request(self, topic, level, selected_node="root"):
        if not self.api_key or not self.client:
           return {"error": "Ensure API Key is set"}

        prompt = f"""
        Act as an Advanced Educational Architect. 
        Generate a complete, comprehensive, and strictly hierarchical learning path for the following:

        Student Goal/Topic: "{topic}"
        Current Proficiency Level: {level}

        ### 1. TREE STRUCTURE RULES
        - Total Nodes: Generate exactly 10 to 12 nodes in total across the entire hierarchy.
        - Hierarchical Depth: Create a balanced tree with at least 3 levels (Root -> Modules -> Subtopics).
        - No Incremental Loading: Provide the ENTIRE tree structure in this single response.
        - Node Types:
            - Root Node: The main subject.
            - Parent Nodes (Modules): Major conceptual pillars (3-4 modules).
            - Leaf Nodes (Subtopics): Specific actionable concepts branching from modules.
        
        ### 2. CONTENT QUALITY
        - Adaptation: Tailor all explanations, tasks, and quizzes to the "{level}" level.
        - Strategic Flow: Sequence nodes logically so earlier ones are prerequisites for later ones.
        - Practicality: Every node (especially leaves) must have a realistic "task" and a "quiz".

        ### 3. OUTPUT FORMAT (STRICT JSON)
        Return ONLY valid JSON with this recursive structure:
        {{
          "tree": {{
            "title": "{topic}",
            "role": "root",
            "explanation": "High-level overview of the goal.",
            "children": [
              {{
                "title": "Module Title",
                "role": "parent",
                "explanation": "Module overview.",
                "children": [
                  {{
                    "title": "Subtopic Title",
                    "role": "leaf",
                    "explanation": "Specific concept details.",
                    "task": "Specific actionable step for the student.",
                    "quiz": "Challenge question for this node."
                  }}
                ]
              }}
            ]
          }},
          "chatbot": {{
            "message": "Welcome your student to this complete {topic} roadmap. Mention the total node count and encourage them to explore.",
            "actions": ["Start with first node", "Show path overview", "Explain goal"]
          }}
        }}

        ### CRITICAL:
        - Output MUST be a single nested JSON object.
        - Total nodes in the "tree" MUST be between 10 and 12.
        """

        if self.use_mock:
            return self.mock.process_request(topic, level, selected_node)

        try:
            response = self.client.models.generate_content(
                model="gemini-flash-latest",
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json"
                )
            )
            import json
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini Error in process_request: {e}")
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                print("Quota exhausted. Falling back to Mock Mode.")
                return self.mock.process_request(topic, level, selected_node)
            return {"error": f"AI Engine Error: {str(e)}"}

    def get_tutor_response(self, query, topic, level="beginner", node_context="root"):
        if self.use_mock or not self.api_key or not self.client:
           return self.mock.get_tutor_response(query, node_context)

        prompt = f"""
        Role: Friendly AI Tutor named LearnyBot.
        Context: The student is learning about "{topic}".
        Current Focus: "{node_context}".
        Student Level: {level}
        
        Question: "{query}"

        Instructions:
        - Respond in a way that matches the "{level}" level (simpler for beginners, technically deep for advanced).
        - Be encouraging and concise.
        - If the question is about "{node_context}", provide a direct and helpful answer.
        - If the question is unrelated, gently guide them back to the topic.
        """
        try:
            response = self.client.models.generate_content(
                model="gemini-flash-latest",
                contents=prompt
            )
            return response.text
        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                return self.mock.get_tutor_response(query, node_context)
            return str(e)

    def generate_full_path(self, topic, level):
        # Legacy placeholder or for initial full structure if needed
        return self.process_request(topic, level, "root")

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
                model="gemini-flash-latest",
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
