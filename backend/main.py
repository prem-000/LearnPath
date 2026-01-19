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

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.post("/generate_path")
async def generate_path(request: PathRequest):
    try:
        result = path_builder.generate_path(request.text, request.level)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
