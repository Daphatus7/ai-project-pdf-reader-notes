# @file        login_api.py
# @description 
# @author      [Peiyu Wang]
# @date        25/1/2026
# @license     © 2026 . All rights reserved.


# @file        create_user_profile.py
# @description
# @author      [Peiyu Wang]
# @date        25/1/2026
# @license     © 2026 . All rights reserved.
import os
import dotenv
import httpx

dotenv.load_dotenv()

BASE_URL = "http://localhost:8000"
response = httpx.post(
    f"{BASE_URL}/api/v1/auth/login",
    json={
        "email": os.environ.get("TEST_EMAIL"),
        "password": os.environ.get("TEST_PASSWORD")
    },
    timeout=30.0
)

print(response.status_code)
print(response.json())
