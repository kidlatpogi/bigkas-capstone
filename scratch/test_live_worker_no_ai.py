import httpx

base_url = "https://b01-ai-worker.kidlat.workers.dev"

print("Testing GET /health ...")
h_res = httpx.get(f"{base_url}/health", timeout=10.0)
print(f"Status: {h_res.status_code}, Response: {h_res.text}")

print("Testing POST /banner-message ...")
b_res = httpx.post(f"{base_url}/banner-message", json={"context": {"currentLevel": 1}}, timeout=15.0)
print(f"Status: {b_res.status_code}, Response: {b_res.text}")

print("Testing GET /random-topic ...")
t_res = httpx.get(f"{base_url}/random-topic", timeout=15.0)
print(f"Status: {t_res.status_code}, Response: {t_res.text}")
