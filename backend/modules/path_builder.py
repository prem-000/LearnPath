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

    def generate_path(self, text, user_level="beginner"):
        # Detect Domain for metadata/logging
        domain, confidence = self.tfidf_engine.detect_domain(text)
        
        # New Hierarchical Generation via Gemini
        print(f"Generating hierarchical path for Topic: {text}, Level: {user_level}")
        result = self.gemini.generate_full_path(text, user_level)
        
        # Add metadata
        if isinstance(result, dict) and "error" not in result:
            result["domain_metadata"] = {
                "detected_domain": domain,
                "confidence": confidence
            }
            return result
        
        # Fallback to Knowledge Graph if AI fails
        print("Fallback to Knowledge Graph triggered")
        if not domain or domain not in self.knowledge_graph:
            return {"error": "Could not generate path and no fallback available."}

        domain_data = self.knowledge_graph[domain]
        all_nodes = domain_data["nodes"]
        all_edges = domain_data["edges"]
        
        max_level = 5 if user_level == "advanced" else (4 if user_level == "intermediate" else 3)
        filtered_nodes = [n for n in all_nodes if n.get("level", 0) <= max_level]
        node_ids = set(n["id"] for n in filtered_nodes)
        filtered_edges = [e for e in all_edges if e["from"] in node_ids and e["to"] in node_ids]

        return {
            "title": f"Learning {text.capitalize()}",
            "description": f"A curated path for {text} from our knowledge graph.",
            "modules": [
                {
                    "id": "module_static",
                    "title": "Core Concepts",
                    "description": "Fundamental topics from our database",
                    "subtopics": filtered_nodes
                }
            ],
            "domain_metadata": {"detected_domain": domain, "confidence": confidence}
        }

