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
            with open(self.kg_path, 'r') as f:
                self.knowledge_graph = json.load(f)
        except Exception as e:
            print(f"Error loading Knowledge Graph: {e}")
            self.knowledge_graph = {}

    def generate_path(self, text, user_level="beginner"):
        # 1. Detect Domain
        domain, confidence = self.tfidf_engine.detect_domain(text)
        
        if not domain or domain not in self.knowledge_graph:
            return {
                "domain": "unknown",
                "confidence": 0.0,
                "nodes": [],
                "edges": [],
                "algorithms": [],
                "ai_suggestions": []
            }

        domain_data = self.knowledge_graph[domain]
        all_nodes = domain_data["nodes"]
        all_edges = domain_data["edges"]
        
        # 2. Filter by Level
        max_level = 5
        if user_level == "beginner":
            max_level = 3
        elif user_level == "intermediate":
            max_level = 4
            
        filtered_nodes = [n for n in all_nodes if n["level"] <= max_level]
        node_ids = set(n["id"] for n in filtered_nodes)
        
        filtered_edges = [
            e for e in all_edges 
            if e["from"] in node_ids and e["to"] in node_ids
        ]

        # 3. Gemini Enrichment
        ai_suggestions = self.gemini.enrich_path(domain, text, filtered_nodes)

        return {
            "domain": domain,
            "confidence": confidence,
            "nodes": filtered_nodes,
            "edges": filtered_edges,
            "algorithms": domain_data.get("algorithms", []),
            "ai_suggestions": ai_suggestions
        }
