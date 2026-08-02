import httpx

GEMINI_KEY = "AIzaSyDOWyFW52bvvW8SqzFuxBXa7Vch3RatcfM"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={GEMINI_KEY}"

res = httpx.get(url, timeout=10.0)
print("Status Code:", res.status_code)
if res.status_code == 200:
    models = res.json().get("models", [])
    for m in models:
        if "generateContent" in m.get("supportedGenerationMethods", []):
            print(m.get("name"))
else:
    print(res.text)
