# @file        rag_test.py
# @description Test the RAG upload pipeline
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
"""
RAG Pipeline Test

Run with: python -m src.backend.tests.rag_test
Or:       pytest src/backend/tests/rag_test.py -v
"""
import os
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

import httpx
import asyncio

# =============================================================================
# Test Configuration (based on server settings in config.py)
# =============================================================================
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
BASE_URL = os.getenv("TEST_BASE_URL", f"http://localhost:{PORT}")

# Test data
TEST_USER_ID = "test_user_rag"
TEST_PROJECT_ID = "test_project_rag"
TEST_PDF_PATH = Path(__file__).parent.parent / "services/context_provider/pdf_extractor/exam21-final.pdf"

# API endpoint
UPLOAD_ENDPOINT = f"/api/v1/process/upload/{TEST_USER_ID}/{TEST_PROJECT_ID}"


async def test_upload_pdf():
    """Test uploading a PDF file to the RAG pipeline."""
    print(f"\n{'='*60}")
    print("Testing RAG Upload Pipeline")
    print(f"{'='*60}")

    # Check if test PDF exists
    if not TEST_PDF_PATH.exists():
        print(f"[SKIP] Test PDF not found: {TEST_PDF_PATH}")
        return False

    print(f"[INFO] Test PDF: {TEST_PDF_PATH}")
    print(f"[INFO] File size: {TEST_PDF_PATH.stat().st_size / 1024:.1f} KB")
    print(f"[INFO] Target URL: {BASE_URL}{UPLOAD_ENDPOINT}")

    async with httpx.AsyncClient(timeout=180.0) as client:
        # Prepare the file
        with open(TEST_PDF_PATH, "rb") as f:
            files = {"file": ("exam21-final.pdf", f, "application/pdf")}
            data = {"source_name": "Exam 2021 Final - Test Upload"}

            print(f"\n[INFO] Uploading file...")

            try:
                response = await client.post(
                    f"{BASE_URL}{UPLOAD_ENDPOINT}",
                    files=files,
                    data=data
                )
            except httpx.ConnectError:
                print(f"[FAIL] Cannot connect to server at {BASE_URL}")
                print(f"[HINT] Make sure the server is running:")
                print(f"       uvicorn src.backend.main:app --host {HOST} --port {PORT} --reload")
                return False

    print(f"\n[INFO] Response Status: {response.status_code}")
    print(f"[INFO] Response Body:")

    try:
        result = response.json()
        for key, value in result.items():
            print(f"       {key}: {value}")
    except Exception:
        print(f"       {response.text}")

    # Validate response
    if response.status_code == 200:
        result = response.json()
        if result.get("success"):
            print(f"\n[PASS] Upload successful!")
            print(f"       source_id: {result.get('source_id')}")
            print(f"       chunk_count: {result.get('chunk_count')}")
            return True
        else:
            print(f"\n[FAIL] Upload failed: {result.get('message')}")
            return False
    else:
        print(f"\n[FAIL] HTTP Error: {response.status_code}")
        return False


async def test_invalid_file_type():
    """Test uploading a non-PDF file (should fail)."""
    print(f"\n{'='*60}")
    print("Testing Invalid File Type Rejection")
    print(f"{'='*60}")

    async with httpx.AsyncClient(timeout=30.0) as client:
        # Create a fake text file
        files = {"file": ("test.txt", b"This is not a PDF", "text/plain")}

        try:
            response = await client.post(
                f"{BASE_URL}{UPLOAD_ENDPOINT}",
                files=files
            )
        except httpx.ConnectError:
            print(f"[SKIP] Server not running at {BASE_URL}")
            return False

    print(f"[INFO] Response Status: {response.status_code}")

    if response.status_code == 400:
        print(f"[PASS] Correctly rejected invalid file type")
        return True
    else:
        print(f"[FAIL] Should have rejected with 400, got {response.status_code}")
        return False


async def run_all_tests():
    """Run all tests."""
    print("\n" + "="*60)
    print(" RAG Pipeline Tests")
    print("="*60)
    print(f" Server: {BASE_URL}")
    print(f" Endpoint: {UPLOAD_ENDPOINT}")
    print(f" Test PDF: {TEST_PDF_PATH.name}")
    print("="*60)

    results = []

    # Test 1: Valid PDF upload
    results.append(("Upload PDF", await test_upload_pdf()))

    # Test 2: Invalid file type
    results.append(("Invalid File Type", await test_invalid_file_type()))

    # Summary
    print(f"\n{'='*60}")
    print(" Test Summary")
    print(f"{'='*60}")

    passed = sum(1 for _, r in results if r)
    total = len(results)

    for name, result in results:
        status = "[PASS]" if result else "[FAIL]"
        print(f"  {status} {name}")

    print(f"\n  Total: {passed}/{total} passed")
    print(f"{'='*60}\n")

    return passed == total


# =============================================================================
# Direct Service Test (no server required, but needs env vars)
# =============================================================================
def test_service_direct():
    """
    Test RagService directly without HTTP server.
    Requires: SUPABASE_URL, SUPABASE_KEY, OPENAI_API_KEY
    """
    print(f"\n{'='*60}")
    print("Testing RagService Directly (no server)")
    print(f"{'='*60}")

    # Check environment variables
    required_vars = ["SUPABASE_URL", "SUPABASE_KEY", "OPENAI_API_KEY"]
    missing = [v for v in required_vars if not os.getenv(v)]

    if missing:
        print(f"[SKIP] Missing env vars: {', '.join(missing)}")
        return False

    if not TEST_PDF_PATH.exists():
        print(f"[SKIP] Test PDF not found: {TEST_PDF_PATH}")
        return False

    try:
        from src.backend.schemas.rag import RagRequest
        from src.backend.services.context_provider.rag_service import RagService

        print("[INFO] Initializing RagService...")
        service = RagService()
        service.start()
        print("[OK] RagService started")

        req = RagRequest(
            user_id=TEST_USER_ID,
            project_id=TEST_PROJECT_ID,
            source_name="exam21-final-direct-test",
            file_dir=str(TEST_PDF_PATH)
        )

        print(f"[INFO] Processing {TEST_PDF_PATH.name}...")
        result = service.process(req)

        print(f"\n[INFO] Result:")
        print(f"       success: {result.success}")
        print(f"       source_id: {result.source_id}")
        print(f"       chunk_count: {result.chunk_count}")
        print(f"       message: {result.message}")

        if result.success:
            print(f"\n[PASS] Direct service test successful!")
            return True
        else:
            print(f"\n[FAIL] {result.message}")
            return False

    except Exception as e:
        print(f"[FAIL] Exception: {e}")
        return False


# Pytest compatibility
def test_rag_upload():
    """Pytest entry point for upload test."""
    result = asyncio.run(test_upload_pdf())
    assert result, "RAG upload test failed"


def test_rag_invalid_type():
    """Pytest entry point for invalid type test."""
    result = asyncio.run(test_invalid_file_type())
    assert result, "Invalid file type test failed"


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="RAG Pipeline Tests")
    parser.add_argument("--direct", action="store_true", help="Run direct service test (no server)")
    parser.add_argument("--api", action="store_true", help="Run API tests (requires server)")
    args = parser.parse_args()

    if args.direct:
        success = test_service_direct()
    elif args.api:
        success = asyncio.run(run_all_tests())
    else:
        # Default: run all
        print("\nUsage:")
        print("  python -m src.backend.tests.rag_test --direct  # Test service directly")
        print("  python -m src.backend.tests.rag_test --api     # Test via API (needs server)")
        print("\nRunning API tests by default...\n")
        success = asyncio.run(run_all_tests())

    sys.exit(0 if success else 1)
