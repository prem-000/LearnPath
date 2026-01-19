import json
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class TFIDFEngine:
    def __init__(self, data_path="backend/data/domains.json"):
        self.data_path = data_path
        self.domains = {}
        self.vectorizer = TfidfVectorizer()
        self.load_data()
        self.train_vectorizer()

    def load_data(self):
        try:
            with open(self.data_path, 'r') as f:
                self.domains = json.load(f)
        except Exception as e:
            print(f"Error loading domain data: {e}")
            self.domains = {}

    def train_vectorizer(self):
        if not self.domains:
            return
        
        # Create a corpus where each document corresponds to a domain
        self.domain_names = list(self.domains.keys())
        self.corpus = [" ".join(keywords) for keywords in self.domains.values()]
        
        # Fit the vectorizer on the domain corpus
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus)

    def detect_domain(self, text):
        if not self.domains:
            return None, 0.0

        # Transform user input
        input_vector = self.vectorizer.transform([text])
        
        # Calculate cosine similarity
        similarities = cosine_similarity(input_vector, self.tfidf_matrix)
        
        # Get the index of the highest score
        best_match_idx = np.argmax(similarities)
        best_score = similarities[0, best_match_idx]
        
        return self.domain_names[best_match_idx], float(best_score)

# Singleton instance or helper function could be used
