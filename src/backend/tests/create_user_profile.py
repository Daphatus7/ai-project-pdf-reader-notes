# @file        create_user_profile.py
# @description
# @author      [Peiyu Wang]
# @date        25/1/2026
# @license     © 2026 . All rights reserved.
import json
import os
import dotenv
import httpx

dotenv.load_dotenv()

#login
BASE_URL = "http://localhost:8000"
login_response = httpx.post(
    f"{BASE_URL}/api/v1/auth/login",
    json={
        "email": os.environ.get("TEST_EMAIL"),
        "password": os.environ.get("TEST_PASSWORD")
    },
    timeout=30.0
)
#store response to json

with open("login_response.json", "w") as f:
    json.dump(
    login_response.json(),
    f,
        indent=2
    )

access_token = login_response.json()["session"]["access_token"]

creating_profile_response = httpx.post(
    f"{BASE_URL}/api/v1/auth/create-profile",
    headers=({"Authorization": f"Bearer {access_token}"}),
    json={
        "display_name": "Test User",
    },
    timeout=30.0
)

print(creating_profile_response)
#create profile, should be done after register
