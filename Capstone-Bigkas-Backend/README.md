---
title: Bigkas VVV Backend
emoji: "🎙️"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Bigkas VVV Backend Service

This Space runs the Bigkas FastAPI backend for speech analysis.

## Endpoint

- POST /api/analyze-speech

- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- CORS_ORIGINS

## Local Run

Install dependencies:

pip install -r requirements.txt

Run server:

uvicorn main:app --host 0.0.0.0 --port 7860 --reload
