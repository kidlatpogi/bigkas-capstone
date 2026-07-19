import asyncio
import httpx
import json

SUPABASE_URL = 'https://pkshjglggqfuostxpllo.supabase.co'
SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrc2hqZ2xnZ3FmdW9zdHhwbGxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMTA0NDcsImV4cCI6MjA4Njc4NjQ0N30.JHg-amPOe03p7WN92wIFn590BJw8La9KMC7We5VZbVE'
BACKEND_URL = 'https://kidlatpogi17-capstone-bigkas-backend.hf.space/api/analyze-speech'

async def get_user_id(client, email, password):
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
    }
    data = {'email': email, 'password': password}
    try:
        response = await client.post(url, headers=headers, json=data)
        if response.status_code == 200:
            return response.json()['user']['id']
        else:
            print(f"Failed to login {email}: {response.text}")
            return None
    except Exception as e:
        print(f"Exception logging in {email}: {str(e)}")
        return None

async def simulate_session(client, user_id, index):
    print(f"[{index}] Starting session for user {user_id}")
    with open('real_sample.mp3', 'rb') as f:
        audio_data = f.read()
    
    files = {'audio_file': ('recording.mp3', audio_data, 'audio/mp3')}
    data = {
        'visual_metrics': json.dumps({"overall_score": 85, "eye_contact_score": 80, "gesture_score": 90}),
        'user_id': user_id,
        'topic': 'Load Test Topic',
        'session_origin': 'free-speech',
        'speaking_mode': 'free',
        'profiling_answers': json.dumps(['No', 'No', 'No', 'No', 'No', 'No', 'No', 'No', 'No'])
    }
    
    try:
        response = await client.post(BACKEND_URL, data=data, files=files, timeout=300.0)
        if response.status_code == 200:
            print(f"[{index}] Finished with status {response.status_code}")
        else:
            print(f"[{index}] Finished with status {response.status_code}. Response: {response.text}")
        return response.status_code
    except Exception as e:
        print(f"[{index}] Failed with error: {str(e)}")
        return str(e)

async def main():
    async with httpx.AsyncClient() as client:
        # 1. Login all users slowly to avoid Supabase Auth 429 (rate limits)
        print("Logging in 100 users slowly...")
        user_ids = []
        for i in range(1, 101):
            email = f"student{i:02d}@example.com"
            uid = await get_user_id(client, email, '@Admin321')
            if uid:
                user_ids.append(uid)
                print(f"Logged in student{i:02d}@example.com -> {uid}")
            await asyncio.sleep(2.2) # Sleep to avoid rate limiting
        
        print(f"Successfully logged in {len(user_ids)} of 100 users.")
        if not user_ids:
            print("No users logged in. Aborting test.")
            return
        
        # 2. Simulate sessions concurrently but staggered by 1.5 seconds
        print("Launching 3-minute sessions concurrently (1.5s stagger)...")
        sem = asyncio.Semaphore(50) # Allow up to 50 concurrent requests
        
        async def bounded_simulate(uid, idx):
            async with sem:
                return await simulate_session(client, uid, idx)
                
        sim_tasks = []
        for idx, uid in enumerate(user_ids):
            sim_tasks.append(bounded_simulate(uid, idx+1))
            # Stagger launch times
            await asyncio.sleep(1.5)
            
        results = await asyncio.gather(*sim_tasks)
        print("All sessions completed.")
        
        # Summary of results
        success = results.count(200)
        failed = len(results) - success
        print(f"Success: {success}, Failed: {failed}")

if __name__ == '__main__':
    asyncio.run(main())
