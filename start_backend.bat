@echo off
cd "c:/Users/ADMIN/python/learn path"
call .venv\Scripts\activate
uvicorn backend.main:app --reload
pause
