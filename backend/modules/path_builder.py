import json
import os
from .tfidf_engine import TFIDFEngine
from .gemini_connector import GeminiConnector

class PathBuilder:
    def __init__(self, kg_path="backend/data/knowledge_graph.json"):
        self.kg_path = kg_path
        self.tfidf_engine = TFIDFEngine()
        self.gemini = GeminiConnector()
        self.load_kg()

    def load_kg(self):
        try:
            with open(self.kg_path, 'r', encoding='utf-8') as f:
                self.knowledge_graph = json.load(f)
        except Exception as e:
            print(f"Error loading Knowledge Graph: {e}")
            self.knowledge_graph = {}

    def process_request(self, topic, level, selected_node="root"):
        print(f"Processing context: Topic={topic}, Level={level}, Node={selected_node}")
        return self.gemini.process_request(topic, level, selected_node)

    def generate_path(self, text, user_level="beginner"):
        # Backwards compatibility for initial generate call
        return self.process_request(text, user_level, "root")

