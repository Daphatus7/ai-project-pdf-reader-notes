import asyncio
import json
import os

import httpx
from dotenv import load_dotenv

TESLA_10_Q_PDF_URL = "https://ir.tesla.com/_flysystem/s3/sec/000162828025045968/tsla-20250930-gen.pdf"
TESLA_10_K_PDF_URL = "https://ir.tesla.com/_flysystem/s3/sec/000162828025003063/tsla-20241231-gen.pdf"


async def upload_document(
    management_api_key: str,
    url: str,
    name: str,
    collection_id: str,
) -> None:
    try:
        # Download PDF bytes from remote URL
        print(f"Downloading {name}...")
        async with httpx.AsyncClient() as http:
            resp = await http.get(url, timeout=60.0, follow_redirects=True)
        pdf_content = resp.content
        print(f"Downloaded {name} ({len(pdf_content)} bytes)")

        # Upload file to collection via Management API (multipart form)
        print(f"Uploading {name} to collection...")
        async with httpx.AsyncClient() as http:
            response = await http.post(
                f"https://management-api.x.ai/v1/collections/{collection_id}/documents",
                headers={"Authorization": f"Bearer {management_api_key}"},
                files={
                    "name": (None, name),
                    "data": (name, pdf_content, "application/pdf"),
                    "content_type": (None, "application/pdf"),
                },
                timeout=3600.0,
            )
        print(f"Uploaded {name}: {json.dumps(response.json(), indent=2)}")

    except Exception as e:
        print(f"upload_document ERROR [{name}]: {type(e).__name__}: {e}")


async def search_collection(api_key: str, collection_id: str, query: str) -> None:
    # Search documents in a collection via REST API
    async with httpx.AsyncClient() as http:
        response = await http.post(
            "https://api.x.ai/v1/documents/search",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json={
                "query": query,
                "source": {
                    "collection_ids": [collection_id],
                },
            },
            timeout=30.0,
        )
    print(json.dumps(response.json(), indent=2))


async def main():
    load_dotenv()
    management_api_key = os.getenv("XAI_MANAGEMENT_API_KEY")

    collection_id = "collection_977a9697-4c8d-44f9-91c6-8ba5974acb03"

    # Upload documents to collection sequentially
    await upload_document(management_api_key, TESLA_10_Q_PDF_URL, "tesla-10-Q-2024.pdf", collection_id)


if __name__ == "__main__":
    asyncio.run(main())
