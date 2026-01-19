import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_scenario(name, payload, checks):
    print(f"\n--- Testing Scenario: {name} ---")
    try:
        response = requests.post(f"{BASE_URL}/generate_path", json=payload)
        response.raise_for_status()
        data = response.json()
        
        print(f"Status: {response.status_code}")
        print(f"Domain: {data.get('domain')}")
        print(f"Confidence: {data.get('confidence')}")
        print(f"Nodes Count: {len(data.get('nodes', []))}")
        
        # Run checks
        for description, check_func in checks.items():
            result = check_func(data)
            status = "PASS" if result else "FAIL"
            print(f"Check '{description}': {status}")
            if not result:
                sys.exit(1)
                
    except Exception as e:
        print(f"FAILED: {e}")
        sys.exit(1)

def run_tests():
    # Scenario 1: Domain Detection
    test_scenario(
        "Domain Detection (Web Dev)",
        {"text": "I want to learn javascript and react", "level": "beginner"},
        {
            "Domain is web_development": lambda d: d["domain"] == "web_development",
            "Confidence > 0": lambda d: d["confidence"] > 0
        }
    )

    # Scenario 2: Level Filtering (Beginner)
    test_scenario(
        "Level Filtering (Beginner)",
        {"text": "machine learning basics", "level": "beginner"},
        {
            "Domain is machine_learning": lambda d: d["domain"] == "machine_learning",
            "All nodes <= Level 3": lambda d: all(n["level"] <= 3 for n in d["nodes"]),
            "Core nodes present": lambda d: len(d["nodes"]) > 0
        }
    )

    # Scenario 3: AI Structure
    test_scenario(
        "AI Structure Check",
        {"text": "python for data science", "level": "intermediate"},
        {
            "AI Suggestions field exists": lambda d: "ai_suggestions" in d,
            "Is list": lambda d: isinstance(d["ai_suggestions"], list)
        }
    )

if __name__ == "__main__":
    try:
        # Health check first
        r = requests.get(f"{BASE_URL}/health")
        if r.status_code == 200:
            print("Backend is HEALTHY")
            run_tests()
        else:
            print("Backend is UNHEALTHY")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("Backend is NOT RUNNING. Please start the backend service.")
        sys.exit(1)
