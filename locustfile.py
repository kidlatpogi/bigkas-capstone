import json
import struct
import os
import random
import requests
from dotenv import load_dotenv
from locust import HttpUser, task, between

load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

def get_dummy_wav(duration_sec):
    # Generate silent 16kHz 16-bit mono WAV data
    num_samples = 16000 * duration_sec
    raw_data = struct.pack("<" + "h" * num_samples, *([0] * num_samples))
    
    header = b"RIFF"
    header += struct.pack("<I", 36 + len(raw_data))
    header += b"WAVEfmt "
    header += struct.pack("<IHHIIHH", 16, 1, 1, 16000, 32000, 2, 16)
    header += b"data"
    header += struct.pack("<I", len(raw_data))
    return header + raw_data

class BigkasStudent(HttpUser):
    # Simulate a student spending between 10 to 30 seconds reading feedback before trying again
    wait_time = between(10, 30)

    def on_start(self):
        # Pick a random student from 1 to 50
        student_id = random.randint(1, 50)
        self.email = f"student{student_id:02d}@example.com"
        self.password = "@Admin321"
        self.user_id = None
        self.access_token = None

        if SUPABASE_URL and SUPABASE_ANON_KEY:
            url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
            headers = {
                "apikey": SUPABASE_ANON_KEY,
                "Content-Type": "application/json"
            }
            data = {
                "email": self.email,
                "password": self.password
            }
            try:
                res = requests.post(url, headers=headers, json=data, timeout=10)
                if res.status_code == 200:
                    body = res.json()
                    self.access_token = body.get("access_token")
                    self.user_id = body.get("user").get("id")
                    print(f"Logged in successfully as {self.email} ({self.user_id})")
                else:
                    print(f"Failed to login {self.email}: {res.text}")
            except Exception as e:
                print(f"Error logging in {self.email}: {e}")

        # Fallback if login fails or env vars missing (will fail DB FK constraints)
        if not self.user_id:
            self.user_id = "dummy-stress-test-user"

    @task
    def submit_recording(self):
        duration_sec = int(os.getenv("AUDIO_DURATION_SEC", 180)) # Default to 3 mins
        audio_bytes = get_dummy_wav(duration_sec)
        
        # Form fields required by FastAPI /api/analyze-speech
        payload = {
            "user_id": self.user_id,
            "topic": f"Locust {duration_sec}-Second Concurrency Stress Test",
            "session_origin": "practice",
            "speaking_mode": "free",
            "profiling_answers": json.dumps(["No"] * 9),
            "visual_metrics": json.dumps({
                "eye_contact_score": 85,
                "gesture_score": 80,
                "face_detection_count": duration_sec * 30
            })
        }
        
        files = {
            "audio_file": ("recording.wav", audio_bytes, "audio/wav")
        }

        headers = {}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"

        # POST request to endpoint
        with self.client.post("/api/analyze-speech", headers=headers, data=payload, files=files, catch_response=True) as response:
            if response.status_code == 200:
                try:
                    res_data = response.json()
                    if "job_id" in res_data:
                        response.success()
                    else:
                        response.failure(f"Missing job_id in response: {res_data}")
                except Exception as e:
                    response.failure(f"Failed to parse JSON response: {e}")
            else:
                response.failure(f"Vocal analysis failed with status: {response.status_code}")
