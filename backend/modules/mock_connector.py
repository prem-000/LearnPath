import json

class MockConnector:
    def process_request(self, topic, level, selected_node="root"):
        """Returns a simulated but realistic full learning path JSON."""
        
        mock_data = {
          "tree": {
            "title": topic.title(),
            "role": "root",
            "explanation": f"Mastering {topic} from foundational concepts to advanced techniques.",
            "children": [
              {
                "title": f"Foundations of {topic}",
                "role": "parent",
                "explanation": "Core principles and basic building blocks.",
                "children": [
                  {"title": f"Intro to {topic}", "role": "leaf", "explanation": "Basic overview.", "task": "Write a summary", "quiz": "Define it."},
                  {"title": "Basic syntax", "role": "leaf", "explanation": "Grammar and usage.", "task": "Print 'Hello'", "quiz": "What's the syntax?"},
                  {"title": "Environment setup", "role": "leaf", "explanation": "Tools and IDEs.", "task": "Install tools", "quiz": "Which IDE?"}
                ]
              },
              {
                "title": f"Intermediate {topic} Concepts",
                "role": "parent",
                "explanation": "Moving beyond basics into practical logic.",
                "children": [
                  {"title": "Data structures", "role": "leaf", "explanation": "Organizing data.", "task": "Create a list", "quiz": "Name one structure."},
                  {"title": "Control flow", "role": "leaf", "explanation": "Logics and loops.", "task": "Write a loop", "quiz": "What is 'if'?"},
                  {"title": "Functions", "role": "leaf", "explanation": "Reusable code.", "task": "Define function", "quiz": "How to call it?"}
                ]
              },
              {
                "title": f"Advanced {topic} mastery",
                "role": "parent",
                "explanation": "Professional level optimization and patterns.",
                "children": [
                  {"title": "Optimization", "role": "leaf", "explanation": "Making it fast.", "task": "Refactor code", "quiz": "What is Big O?"},
                  {"title": "Architecture", "role": "leaf", "explanation": "Large scale design.", "task": "Draw a diagram", "quiz": "Name a pattern."},
                  {"title": "Deployment", "role": "leaf", "explanation": "Going live.", "task": "Deploy app", "quiz": "What is CI/CD?"}
                ]
              }
            ]
          },
          "chatbot": {
            "message": f"[Mock Mode] Welcome to your complete {topic} roadmap! I've laid out 11 nodes for you to explore.",
            "actions": ["Start with first node", "Show path overview", "Explain goal"]
          }
        }
        return mock_data

    def get_tutor_response(self, query, node_context):
        return f"[Mock Mode] I understand you're asking about '{query}' in the context of '{node_context}'. Unfortunately, my brain is taking a break due to quota limits, but you can keep exploring the nodes!"
