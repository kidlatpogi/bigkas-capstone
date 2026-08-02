import httpx
import json

GEMINI_KEY = "AIzaSyCLVLB20zQ4ZA_kmh2haGqw_CdM_bVn0_0"

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={GEMINI_KEY}"

prompt = """Analyze this transcript for a public speaking app.
Topic: "General Speaking"
Transcript: "Hello everyone, thank you for listening to my speech today."

Return ONLY valid JSON:
{
  "transcript": "Hello everyone, thank you for listening to my speech today.",
  "relevance_score": 5.0,
  "recommendations": ["Great delivery", "Good eye contact"],
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
    print("Response 200 OK SUCCESS!")
    print(res.json()['candidates'][0]['content']['parts'][0]['text'])
else:
    print("Error:", res.text)
