---
title: Bigkas VVV Backend
emoji: "🎙️"
colorFrom: blue
colorTo: green
sdk: docker
app_port: 8000
pinned: false
---

# Bigkas VVV Backend Service

This Space runs the Bigkas FastAPI backend for speech analysis.

## Endpoint

- POST /api/analyze-speech

## Required Space Secrets

Set these in your Hugging Face Space Settings -> Variables and secrets:

- GEMINI_API_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

## Local Run

Install dependencies:

pip install -r requirements.txt

Run server:

uvicorn main:app --host 0.0.0.0 --port 8000 --reload
