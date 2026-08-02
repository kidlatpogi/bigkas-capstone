import httpx
import time

GEMINI_KEY = "AIzaSyCLVLB20zQ4ZA_kmh2haGqw_CdM_bVn0_0"

models_to_test = [
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-flash-latest",
    "gemini-pro-latest",
    "gemini-2.5-flash",
]

for m in models_to_test:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={GEMINI_KEY}"
    payload = {"contents": [{"parts": [{"text": "Hello"}]}]}
    res = httpx.post(url, json=payload, timeout=10.0)
    print(f"Model {m}: Status {res.status_code}")
    if res.status_code == 200:
        print(" -> SUCCESS:", res.json()['candidates'][0]['content']['parts'][0]['text'])
        break
    else:
        print(" -> Message:", res.json().get('error', {}).get('message', '')[:100])
    time.sleep(1)
