@echo off
cd "c:/Users/ADMIN/python/learn path"
set GEMINI_API_KEY=AIzaSyAfWaUzBby8oNDZVlVyqOSk0YJBuWva1v8
call .venv\Scripts\activate
uvicorn backend.main:app --reload
pause
