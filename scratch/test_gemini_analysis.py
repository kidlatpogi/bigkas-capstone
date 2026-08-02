import httpx
import json

GEMINI_KEY = "AIzaSyCLVLB20zQ4ZA_kmh2haGqw_CdM_bVn0_0"

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_KEY}"

prompt = """Analyze this transcript for a public speaking app.
Transcript: "Good morning everyone, today I want to talk about my project."
Topic: "Public Speaking Intro"

Return ONLY a JSON object:
{
  "relevance_score": 5.0,
  "recommendations": ["Great enthusiasm", "Keep steady pace"],
  "mispronunciations": []
}"""

payload = {
    "contents": [
        {
            "parts": [
                {"text": prompt}
            ]
        }
    ]
}

res = httpx.post(url, json=payload, timeout=10.0)
print("Status Code:", res.status_code)
if res.status_code == 200:
    text = res.json()['candidates'][0]['content']['parts'][0]['text']
    print("Response text:\n", text)
else:
    print("Error:", res.text)
