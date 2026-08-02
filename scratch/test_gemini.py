import httpx

GEMINI_KEY = "AIzaSyCLVLB20zQ4ZA_kmh2haGqw_CdM_bVn0_0"

url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_KEY}"
payload = {
    "contents": [
        {
            "parts": [
                {"text": "Respond with '200 OK SUCCESS' if you receive this message."}
            ]
        }
    ]
}

res = httpx.post(url, json=payload, timeout=10.0)
print("Status Code:", res.status_code)
if res.status_code == 200:
    print("Response text:", res.json()['candidates'][0]['content']['parts'][0]['text'])
else:
    print("Error:", res.text)
