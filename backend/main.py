from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

from .modules.path_builder import PathBuilder

app = FastAPI(title="Neural LearnPath API")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

path_builder = PathBuilder()

class PathRequest(BaseModel):
    text: str
    level: str = "beginner"

class ProcessRequest(BaseModel):
    topic: str
    level: str = "beginner"
    selected_node: str = "root"

@app.post("/generate_path")
async def generate_path(request: PathRequest):
    try:
        # Use simple 2-level hierarchical generation for initial
        result = path_builder.gemini.process_request(request.text, request.level, "root")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process")
async def process_engine(request: ProcessRequest):
    try:
        result = path_builder.gemini.process_request(request.topic, request.level, request.selected_node)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    message: str
    topic: str
    level: str = "beginner"
    node_context: str = "root"

@app.post("/chat")
async def chat_tutor(request: ChatRequest):
    try:
        response = path_builder.gemini.get_tutor_response(
            request.message, 
            request.topic, 
            request.level, 
            request.node_context
        )
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
